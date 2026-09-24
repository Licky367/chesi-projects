const mongoose = require("mongoose");

const Stock = require("../../models/stock");
const Product = require("../../models/products");
const Substation = require("../../models/substations");

const {
    batchUnits,
    wholeNumber,
    weightedProductBuyPrice,
    addLayersToProductFifo
} = require("./helpers");

async function createFifoBatch(stockId, body, user) {

    // ---------------------------------------------------------
    // VALIDATE STOCK ID
    // ---------------------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(stockId)) {
        throw new Error("Invalid stock ID.");
    }

    body = body || {};

    // ---------------------------------------------------------
    // VALIDATE UNITS
    // ---------------------------------------------------------

    const units = wholeNumber(
        body.units,
        "Units"
    );

    if (units <= 0) {
        throw new Error("Units must be a whole number greater than 0.");
    }

    // ---------------------------------------------------------
    // VALIDATE BUYING PRICE
    // ---------------------------------------------------------

    const totalBuyingPrice = Number(body.totalBuyingPrice);

    if (
        !Number.isFinite(totalBuyingPrice) ||
        totalBuyingPrice < 0
    ) {
        throw new Error(
            "Total buying price must be a valid number greater than or equal to 0."
        );
    }

    const buyPrice = totalBuyingPrice / units;

    if (!Number.isFinite(buyPrice)) {
        throw new Error(
            "Unable to calculate buy price per unit."
        );
    }

    // ---------------------------------------------------------
    // PURCHASE DATE
    // ---------------------------------------------------------

    const purchasedAt = body.purchasedAt
        ? new Date(body.purchasedAt)
        : new Date();

    if (Number.isNaN(purchasedAt.getTime())) {
        throw new Error("Invalid purchase date.");
    }

    // ---------------------------------------------------------
    // SESSION
    // ---------------------------------------------------------

    const session = await mongoose.startSession();

    try {

        let updatedStock;

        await session.withTransaction(async () => {

            // -------------------------------------------------
            // GET STOCK
            // -------------------------------------------------

            const stock = await Stock.findOne({
                _id: stockId,
                isActive: { $ne: false }
            }).session(session);

            if (!stock) {
                throw new Error("Stock not found.");
            }

            // =================================================
            // STAFF
            // =================================================
            //
            // Staff stock creation goes directly into:
            //
            // Product.fifoBatches
            // Product.units
            // Substation.productInventory.units
            //
            // Stock itself is NOT changed.
            // =================================================

            if (user && user.role === "staff") {

                // ---------------------------------------------
                // VALIDATE ASSIGNED SUBSTATION
                // ---------------------------------------------

                if (
                    !user.assignedSubstation ||
                    !mongoose.Types.ObjectId.isValid(
                        user.assignedSubstation
                    )
                ) {
                    throw new Error(
                        "Staff member has no valid assigned substation."
                    );
                }

                // ---------------------------------------------
                // FIND PRODUCT LINKED TO STOCK
                // ---------------------------------------------

                const product = await Product.findOne({
                    stock: stock._id
                }).session(session);

                if (!product) {
                    throw new Error(
                        "Product linked to this stock was not found."
                    );
                }

                // ---------------------------------------------
                // ADD FIFO LAYER
                // ---------------------------------------------

                addLayersToProductFifo(product, [
                    {
                        units,
                        buyPrice,
                        receivedAt: purchasedAt
                    }
                ]);

                // ---------------------------------------------
                // RECALCULATE PRODUCT UNITS
                // ---------------------------------------------

                const productUnits = product.fifoBatches.reduce(
                    (total, batch) => {
                        return total + batchUnits(batch);
                    },
                    0
                );

                product.units = productUnits;

                // ---------------------------------------------
                // RECALCULATE PRODUCT BUY PRICE
                // ---------------------------------------------

                const unitBuyPrice =
                    weightedProductBuyPrice(product);

                product.unitBuyPrice = unitBuyPrice;
                product.buyPrice = unitBuyPrice;

                // ---------------------------------------------
                // SAVE PRODUCT
                // ---------------------------------------------

                await product.save({ session });

                // ---------------------------------------------
                // GET ASSIGNED SUBSTATION
                // ---------------------------------------------

                const substation = await Substation.findById(
                    user.assignedSubstation
                ).session(session);

                if (!substation) {
                    throw new Error(
                        "Assigned substation not found."
                    );
                }

                // ---------------------------------------------
                // ENSURE INVENTORY ARRAY
                // ---------------------------------------------

                if (!Array.isArray(substation.productInventory)) {
                    substation.productInventory = [];
                }

                // ---------------------------------------------
                // FIND PRODUCT INVENTORY
                // ---------------------------------------------

                const inventory =
                    substation.productInventory.find(
                        item =>
                            String(item.productId) ===
                            String(product._id)
                    );

                // ---------------------------------------------
                // UPDATE EXISTING INVENTORY
                // ---------------------------------------------

                if (inventory) {

                    inventory.units =
                        Number(inventory.units || 0) + units;

                    inventory.productName = product.name;
                    inventory.category = product.category;
                    inventory.subcategory = product.subcategory;
                    inventory.updatedAt = new Date();

                }

                // ---------------------------------------------
                // CREATE INVENTORY ENTRY
                // ---------------------------------------------

                else {

                    substation.productInventory.push({
                        productId: product._id,
                        productName: product.name,
                        category: product.category,
                        subcategory: product.subcategory,
                        units,
                        updatedAt: new Date()
                    });

                }

                // ---------------------------------------------
                // SAVE SUBSTATION
                // ---------------------------------------------

                await substation.save({ session });

                // ---------------------------------------------
                // STOCK REMAINS UNTOUCHED
                // ---------------------------------------------

                updatedStock = stock;

                return;
            }

            // =================================================
            // ADMIN / NON-STAFF
            // =================================================
            //
            // Preserve normal warehouse Stock FIFO behavior.
            // =================================================

            if (!Array.isArray(stock.purchaseBatches)) {
                stock.purchaseBatches = [];
            }

            stock.purchaseBatches.push({
                units,
                buyPrice,
                purchasedAt
            });

            // ---------------------------------------------
            // RECALCULATE STOCK UNITS
            // ---------------------------------------------

            let totalUnits = 0;

            for (const batch of stock.purchaseBatches) {

                const batchUnitCount = Number(batch.units);

                if (
                    Number.isFinite(batchUnitCount) &&
                    batchUnitCount > 0
                ) {
                    totalUnits += batchUnitCount;
                }
            }

            stock.units = totalUnits;

            // ---------------------------------------------
            // SAVE STOCK
            // ---------------------------------------------

            await stock.save({ session });

            updatedStock = stock;
        });

        return updatedStock;

    } finally {

        await session.endSession();

    }
}

module.exports = {
    createFifoBatch
};