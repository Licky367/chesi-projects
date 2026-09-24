// ==========================================================
// services/stockService/createFifoBatch.js
// STOCK FIFO BATCH SERVICE
// VERRAH COSMETICS
// ==========================================================
//
// Creates a NEW FIFO purchase batch.
//
// STAFF:
//     - Stock.purchaseBatches is NOT increased.
//     - Stock.units remains 0.
//     - A matching Product.fifoBatches entry is created.
//     - Product.units is increased.
//     - Product buy price is recalculated from Product FIFO.
//     - The staff user's assigned substation inventory is increased.
//
// OTHER USERS:
//     - Existing Stock FIFO behavior remains unchanged.
//
// Expected body:
//
//     {
//         units,
//         buyPrice,
//         purchasedAt
//     }
//
// IMPORTANT:
//     buyPrice from the form is the TOTAL purchase cost
//     of the new FIFO batch.
//
//     FIFO buyPrice stored in Stock.purchaseBatches and
//     Product.fifoBatches is the PER-UNIT buy price.
// ==========================================================

const mongoose =
    require("mongoose");

const Stock =
    require("../../models/stock");

const Product =
    require("../../models/products");

const Substation =
    require("../../models/substations");

const {
    weightedProductBuyPrice,
    sortProductFifo,
    sortFifoBatches,
    calculateUnitBuyPrice
} = require("./helpers");

// ==========================================================
// CREATE FIFO BATCH
// ==========================================================

async function createFifoBatch(
    stockId,
    body,
    user
) {

    // ======================================================
    // VALIDATE STOCK ID
    // ======================================================

    if (
        !mongoose.Types.ObjectId.isValid(
            stockId
        )
    ) {

        throw new Error(
            "Invalid stock ID."
        );

    }

    // ======================================================
    // SAFELY READ BODY
    // ======================================================

    body =
        body || {};

    // ======================================================
    // READ UNITS
    // ======================================================

    const units =
        Number(
            body.units
        );

    if (
        !Number.isFinite(
            units
        ) ||
        !Number.isInteger(
            units
        ) ||
        units <= 0
    ) {

        throw new Error(
            "Units must be a whole number greater than 0."
        );

    }

    // ======================================================
    // READ TOTAL BUY PRICE
    //
    // Form field:
    //     buyPrice = TOTAL purchase cost
    //
    // FIFO field:
    //     buyPrice = PER-UNIT purchase cost
    // ======================================================

    const totalPurchaseCost =
        Number(
            body.buyPrice
        );

    if (
        !Number.isFinite(
            totalPurchaseCost
        ) ||
        totalPurchaseCost < 0
    ) {

        throw new Error(
            "Buy price must be a valid number greater than or equal to 0."
        );

    }

    // ======================================================
    // CALCULATE BUY PRICE PER UNIT
    // ======================================================

    const buyPrice =
        totalPurchaseCost /
        units;

    if (
        !Number.isFinite(
            buyPrice
        )
    ) {

        throw new Error(
            "Unable to calculate buy price per unit."
        );

    }

    // ======================================================
    // READ PURCHASE DATE
    // ======================================================

    let purchasedAt =
        body.purchasedAt
            ? new Date(
                body.purchasedAt
            )
            : new Date();

    if (
        Number.isNaN(
            purchasedAt.getTime()
        )
    ) {

        throw new Error(
            "Invalid purchase date."
        );

    }

    // ======================================================
    // START TRANSACTION
    // ======================================================

    const session =
        await mongoose.startSession();

    try {

        let updatedStock;

        await session.withTransaction(
            async () => {

                // ==========================================
                // LOAD ACTIVE STOCK
                // ==========================================

                const stock =
                    await Stock.findOne({
                        _id: stockId,
                        isActive: {
                            $ne: false
                        }
                    })
                    .session(
                        session
                    );

                if (!stock) {

                    throw new Error(
                        "Stock not found."
                    );

                }

                // ==========================================
                // STAFF
                // ==========================================

                if (
                    user &&
                    user.role === "staff"
                ) {

                    // ======================================
                    // VALIDATE ASSIGNED SUBSTATION
                    // ======================================

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

                    // ======================================
                    // FIND LINKED PRODUCT
                    // ======================================

                    const product =
                        await Product.findOne({
                            stock: stock._id,
                            isActive: true
                        })
                        .session(
                            session
                        );

                    if (!product) {

                        throw new Error(
                            "Product linked to this stock was not found."
                        );

                    }

                    // ======================================
                    // ENSURE PRODUCT FIFO ARRAY
                    // ======================================

                    if (
                        !Array.isArray(
                            product.fifoBatches
                        )
                    ) {

                        product.fifoBatches =
                            [];

                    }

                    // ======================================
                    // CREATE PRODUCT FIFO BATCH
                    // ======================================

                    product.fifoBatches.push({

                        units,

                        // PER-UNIT FIFO BUY PRICE
                        buyPrice,

                        receivedAt:
                            purchasedAt

                    });

                    // ======================================
                    // KEEP PRODUCT FIFO ORDER
                    // ======================================

                    product.fifoBatches =
                        sortProductFifo(
                            product.fifoBatches
                        );

                    // ======================================
                    // RECALCULATE PRODUCT UNITS
                    // ======================================

                    let productUnits =
                        0;

                    for (
                        const batch
                        of product.fifoBatches
                    ) {

                        const batchUnits =
                            Number(
                                batch.units
                            );

                        if (
                            Number.isFinite(
                                batchUnits
                            ) &&
                            batchUnits > 0
                        ) {

                            productUnits +=
                                batchUnits;

                        }

                    }

                    // ======================================
                    // UPDATE PRODUCT UNITS
                    // ======================================

                    product.units =
                        productUnits;

                    // ======================================
                    // RECALCULATE PRODUCT BUY PRICE
                    // FROM PRODUCT FIFO
                    // ======================================

                    const unitBuyPrice =
                        weightedProductBuyPrice(
                            product
                        );

                    product.unitBuyPrice =
                        unitBuyPrice;

                    product.buyPrice =
                        unitBuyPrice;

                    // ======================================
                    // SAVE PRODUCT
                    // ======================================

                    await product.save({
                        session
                    });

                    // ======================================
                    // UPDATE ASSIGNED SUBSTATION
                    // ======================================

                    const substation =
                        await Substation.findById(
                            user.assignedSubstation
                        )
                        .session(
                            session
                        );

                    if (!substation) {

                        throw new Error(
                            "Assigned substation not found."
                        );

                    }

                    // ======================================
                    // ENSURE INVENTORY ARRAY
                    // ======================================

                    if (
                        !Array.isArray(
                            substation.productInventory
                        )
                    ) {

                        substation.productInventory =
                            [];

                    }

                    // ======================================
                    // FIND PRODUCT INVENTORY ENTRY
                    // ======================================

                    const inventory =
                        substation.productInventory
                            .find(
                                item =>
                                    String(
                                        item.productId
                                    ) ===
                                    String(
                                        product._id
                                    )
                            );

                    // ======================================
                    // UPDATE EXISTING INVENTORY
                    // ======================================

                    if (inventory) {

                        inventory.units =
                            Number(
                                inventory.units || 0
                            ) +
                            units;

                        inventory.productName =
                            product.name;

                        inventory.category =
                            product.category;

                        inventory.subcategory =
                            product.subcategory;

                        inventory.updatedAt =
                            new Date();

                    }

                    // ======================================
                    // CREATE NEW INVENTORY ENTRY
                    // ======================================

                    else {

                        substation.productInventory
                            .push({

                                productId:
                                    product._id,

                                productName:
                                    product.name,

                                category:
                                    product.category,

                                subcategory:
                                    product.subcategory,

                                units,

                                updatedAt:
                                    new Date()

                            });

                    }

                    // ======================================
                    // SAVE SUBSTATION
                    // ======================================

                    await substation.save({
                        session
                    });

                    // ======================================
                    // STAFF STOCK REMAINS ZERO
                    // ======================================

                    stock.units =
                        0;

                    stock.buyPrice =
                        0;

                    stock.unitBuyPrice =
                        0;

                    stock.purchaseBatches =
                        [];

                    await stock.save({
                        session
                    });

                    updatedStock =
                        stock;

                    return;
                }

                // ==================================================
                // NON-STAFF
                // EXISTING WAREHOUSE FIFO BEHAVIOR
                // ==================================================

                if (
                    !Array.isArray(
                        stock.purchaseBatches
                    )
                ) {

                    stock.purchaseBatches =
                        [];

                }

                // ==============================================
                // CREATE STOCK FIFO BATCH
                // ==============================================

                stock.purchaseBatches.push({

                    units,

                    // PER-UNIT FIFO BUY PRICE
                    buyPrice,

                    purchasedAt

                });

                // ==============================================
                // KEEP STOCK FIFO ORDER
                // ==============================================

                stock.purchaseBatches =
                    sortFifoBatches(
                        stock.purchaseBatches
                    );

                // ==============================================
                // RECALCULATE TOTAL STOCK UNITS
                // ==============================================

                let totalUnits =
                    0;

                for (
                    const batch
                    of stock.purchaseBatches
                ) {

                    const batchUnits =
                        Number(
                            batch.units
                        );

                    if (
                        Number.isFinite(
                            batchUnits
                        ) &&
                        batchUnits > 0
                    ) {

                        totalUnits +=
                            batchUnits;

                    }

                }

                // ==============================================
                // UPDATE STOCK TOTAL
                // ==============================================

                stock.units =
                    totalUnits;

                // ==============================================
                // RECALCULATE WEIGHTED STOCK BUY PRICE
                // ==============================================

                stock.unitBuyPrice =
                    calculateUnitBuyPrice(
                        stock
                    );

                stock.buyPrice =
                    stock.unitBuyPrice;

                // ==============================================
                // SAVE STOCK
                // ==============================================

                await stock.save({
                    session
                });

                updatedStock =
                    stock;

            }
        );

        // ==================================================
        // RETURN UPDATED STOCK
        // ==================================================

        return updatedStock;

    } finally {

        await session.endSession();

    }
}

// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    createFifoBatch

};