const mongoose = require("mongoose");
const Stock = require("../../models/stock");
const Product = require("../../models/products");
const Substation = require("../../models/substations");

const {
    weightedProductBuyPrice,
    sortProductFifo
} = require("./helpers");

async function createFifoBatch(stockId, body, user) {

    if (!mongoose.Types.ObjectId.isValid(stockId)) {
        throw new Error("Invalid stock ID.");
    }

    body = body || {};

    const units = Number(body.units);

    if (!Number.isFinite(units) || !Number.isInteger(units) || units <= 0) {
        throw new Error("Units must be a whole number greater than 0.");
    }

    const totalBuyingPrice = Number(body.totalBuyingPrice);

    if (!Number.isFinite(totalBuyingPrice) || totalBuyingPrice < 0) {
        throw new Error("Total buying price must be a valid number greater than or equal to 0.");
    }

    const buyPrice = totalBuyingPrice / units;

    if (!Number.isFinite(buyPrice)) {
        throw new Error("Unable to calculate buy price per unit.");
    }

    let purchasedAt = body.purchasedAt
        ? new Date(body.purchasedAt)
        : new Date();

    if (Number.isNaN(purchasedAt.getTime())) {
        throw new Error("Invalid purchase date.");
    }

    const session = await mongoose.startSession();

    try {

        let updatedStock;

        await session.withTransaction(async () => {

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

            if (user && user.role === "staff") {

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

                // -------------------------------------------------
                // FIND PRODUCT LINKED TO THIS STOCK
                // -------------------------------------------------

                const product = await Product.findOne({
                    stock: stock._id
                }).session(session);

                if (!product) {
                    throw new Error(
                        "Product linked to this stock was not found."
                    );
                }

                // -------------------------------------------------
                // ADD NEW PRODUCT FIFO BATCH
                // -------------------------------------------------

                if (!Array.isArray(product.fifoBatches)) {
                    product.fifoBatches = [];
                }

                product.fifoBatches.push({
                    units,
                    buyPrice,
                    receivedAt: purchasedAt
                });

                // -------------------------------------------------
                // SORT PRODUCT FIFO
                // -------------------------------------------------

                product.fifoBatches = sortProductFifo(
                    product.fifoBatches
                );

                // -------------------------------------------------
                // PRODUCT UNITS = FIFO UNITS
                // -------------------------------------------------

                let productUnits = 0;

                for (const batch of product.fifoBatches) {

                    const batchUnits = Number(batch.units);

                    if (
                        Number.isFinite(batchUnits) &&
                        batchUnits > 0
                    ) {
                        productUnits += batchUnits;
                    }
                }

                product.units = productUnits;

                // -------------------------------------------------
                // UPDATE PRODUCT BUY PRICE FROM FIFO
                // -------------------------------------------------

                const unitBuyPrice =
                    weightedProductBuyPrice(product);

                product.unitBuyPrice = unitBuyPrice;
                product.buyPrice = unitBuyPrice;

                // -------------------------------------------------
                // SAVE PRODUCT
                // -------------------------------------------------

                await product.save({ session });

                // -------------------------------------------------
                // FIND ASSIGNED SUBSTATION
                // -------------------------------------------------

                const substation = await Substation.findById(
                    user.assignedSubstation
                ).session(session);

                if (!substation) {
                    throw new Error(
                        "Assigned substation not found."
                    );
                }

                // -------------------------------------------------
                // ENSURE PRODUCT INVENTORY
                // -------------------------------------------------

                if (!Array.isArray(substation.productInventory)) {
                    substation.productInventory = [];
                }

                // -------------------------------------------------
                // FIND PRODUCT INVENTORY
                // -------------------------------------------------

                const inventory =
                    substation.productInventory.find(
                        item =>
                            String(item.productId) ===
                            String(product._id)
                    );

                // -------------------------------------------------
                // UPDATE EXISTING INVENTORY
                // -------------------------------------------------

                if (inventory) {

                    inventory.units =
                        Number(inventory.units || 0) + units;

                    inventory.productName = product.name;
                    inventory.category = product.category;
                    inventory.subcategory = product.subcategory;
                    inventory.updatedAt = new Date();

                } else {

                    // -------------------------------------------------
                    // CREATE INVENTORY ENTRY
                    // -------------------------------------------------

                    substation.productInventory.push({
                        productId: product._id,
                        productName: product.name,
                        category: product.category,
                        subcategory: product.subcategory,
                        units,
                        updatedAt: new Date()
                    });

                }

                // -------------------------------------------------
                // SAVE SUBSTATION
                // -------------------------------------------------

                await substation.save({ session });

                // -------------------------------------------------
                // IMPORTANT:
                // STOCK IS NOT MODIFIED FOR STAFF
                // -------------------------------------------------

                updatedStock = stock;

                return;
            }

            // =================================================
            // ADMIN / NON-STAFF
            // ORIGINAL STOCK FIFO LOGIC
            // =================================================

            if (!Array.isArray(stock.purchaseBatches)) {
                stock.purchaseBatches = [];
            }

            stock.purchaseBatches.push({
                units,
                buyPrice,
                purchasedAt
            });

            let totalUnits = 0;

            for (const batch of stock.purchaseBatches) {

                const batchUnits = Number(batch.units);

                if (
                    Number.isFinite(batchUnits) &&
                    batchUnits > 0
                ) {
                    totalUnits += batchUnits;
                }
            }

            stock.units = totalUnits;

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