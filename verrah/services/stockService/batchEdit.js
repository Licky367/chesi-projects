// ==========================================================
// services/stockService/batchEdit.js
// STOCK FIFO BATCH SERVICE
// VERRAH COSMETICS
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
// GET FIFO BATCHES
// ==========================================================
//
// STAFF:
//     Returns Product.fifoBatches.
//
// OTHER USERS:
//     Returns Stock.purchaseBatches.
//
// ==========================================================

async function getFifoBatches(
    stockId,
    user
) {

    if (
        !mongoose.Types.ObjectId.isValid(
            stockId
        )
    ) {

        throw new Error(
            "Invalid stock ID."
        );
    }

    const stock =
        await Stock.findOne({
            _id: stockId,
            isActive: {
                $ne: false
            }
        });

    if (!stock) {

        throw new Error(
            "Stock not found."
        );
    }

    // ======================================================
    // STAFF
    // ======================================================

    if (
        user &&
        user.role === "staff"
    ) {

        const product =
            await Product.findOne({
                stock: stock._id,
                isActive: true
            });

        if (!product) {

            throw new Error(
                "Product linked to this stock was not found."
            );
        }

        const batches =
            Array.isArray(
                product.fifoBatches
            )
                ? sortProductFifo(
                    [...product.fifoBatches]
                )
                : [];

        return {
            stock,
            batches
        };
    }

    // ======================================================
    // ADMIN / OTHER USERS
    // ======================================================

    const batches =
        Array.isArray(
            stock.purchaseBatches
        )
            ? sortFifoBatches(
                [...stock.purchaseBatches]
            )
            : [];

    return {
        stock,
        batches
    };
}

// ==========================================================
// EDIT FIFO BATCH
// ==========================================================
//
// STAFF:
//     batchId refers to Product.fifoBatches._id.
//
//     Updates:
//         Product.fifoBatches
//         Product.units
//         Product.unitBuyPrice
//         Product.buyPrice
//         assigned Substation.productInventory.units
//
//     Does NOT update:
//         Stock.purchaseBatches
//         Stock.units
//         Stock.buyPrice
//         Stock.unitBuyPrice
//
// OTHER USERS:
//     batchId refers to Stock.purchaseBatches._id.
//
// ==========================================================

async function editFifoBatch(
    stockId,
    batchId,
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
    // VALIDATE BATCH ID
    // ======================================================

    if (
        !mongoose.Types.ObjectId.isValid(
            batchId
        )
    ) {

        throw new Error(
            "Invalid FIFO batch ID."
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
        units < 0
    ) {

        throw new Error(
            "Units must be a whole number greater than or equal to 0."
        );
    }

    // ======================================================
    // READ BUY PRICE
    //
    // IMPORTANT:
    //
    // For FIFO batch editing, buyPrice is the
    // PER-UNIT buy price stored on the FIFO batch.
    //
    // ======================================================

    const buyPrice =
        Number(
            body.buyPrice
        );

    if (
        !Number.isFinite(
            buyPrice
        ) ||
        buyPrice < 0
    ) {

        throw new Error(
            "Buy price must be a valid number greater than or equal to 0."
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
                // LOAD STOCK
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

                // ==================================================
                // STAFF
                // ==================================================

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
                    // FIND PRODUCT FIFO BATCH DIRECTLY
                    //
                    // IMPORTANT:
                    //
                    // Staff FIFO batches belong to Product.
                    // Therefore batchId is the Product FIFO
                    // subdocument _id.
                    //
                    // Do NOT map by array index to Stock.
                    // ======================================

                    const productBatch =
                        product.fifoBatches.id(
                            batchId
                        );

                    if (!productBatch) {

                        throw new Error(
                            "FIFO batch not found."
                        );
                    }

                    // ======================================
                    // OLD PRODUCT BATCH UNITS
                    // ======================================

                    const oldUnits =
                        Number(
                            productBatch.units || 0
                        );

                    // ======================================
                    // CALCULATE UNIT DIFFERENCE
                    // ======================================

                    const unitDifference =
                        units -
                        oldUnits;

                    // ======================================
                    // UPDATE PRODUCT FIFO BATCH
                    // ======================================

                    productBatch.units =
                        units;

                    productBatch.buyPrice =
                        buyPrice;

                    // ======================================
                    // REMOVE ZERO-UNIT BATCHES
                    // ======================================

                    product.fifoBatches =
                        product.fifoBatches.filter(
                            currentBatch =>
                                Number(
                                    currentBatch.units
                                ) > 0
                        );

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
                        const currentBatch
                        of product.fifoBatches
                    ) {

                        const currentUnits =
                            Number(
                                currentBatch.units
                            );

                        if (
                            Number.isFinite(
                                currentUnits
                            ) &&
                            currentUnits > 0
                        ) {

                            productUnits +=
                                currentUnits;

                        }

                    }

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
                    // LOAD ASSIGNED SUBSTATION
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
                    // FIND PRODUCT INVENTORY
                    // ======================================

                    const inventory =
                        substation.productInventory.find(
                            item =>
                                String(
                                    item.productId
                                ) ===
                                String(
                                    product._id
                                )
                        );

                    if (!inventory) {

                        throw new Error(
                            "Product inventory was not found in the assigned substation."
                        );
                    }

                    // ======================================
                    // CALCULATE NEW INVENTORY UNITS
                    // ======================================

                    const currentInventoryUnits =
                        Number(
                            inventory.units || 0
                        );

                    const newInventoryUnits =
                        currentInventoryUnits +
                        unitDifference;

                    if (
                        newInventoryUnits < 0
                    ) {

                        throw new Error(
                            "Substation inventory cannot become negative."
                        );
                    }

                    // ======================================
                    // UPDATE SUBSTATION INVENTORY
                    // ======================================

                    inventory.units =
                        newInventoryUnits;

                    inventory.productName =
                        product.name;

                    inventory.category =
                        product.category;

                    inventory.subcategory =
                        product.subcategory;

                    inventory.updatedAt =
                        new Date();

                    // ======================================
                    // SAVE SUBSTATION
                    // ======================================

                    await substation.save({
                        session
                    });

                    // ======================================
                    // IMPORTANT:
                    // STOCK IS NOT MODIFIED FOR STAFF
                    // ======================================

                    updatedStock =
                        stock;

                    return;
                }

                // ==================================================
                // NON-STAFF
                // EXISTING STOCK FIFO BEHAVIOR
                // ==================================================

                if (
                    !Array.isArray(
                        stock.purchaseBatches
                    )
                ) {

                    throw new Error(
                        "Stock has no FIFO batches."
                    );
                }

                // ==============================================
                // FIND STOCK FIFO BATCH
                // ==============================================

                const batch =
                    stock.purchaseBatches.id(
                        batchId
                    );

                if (!batch) {

                    throw new Error(
                        "FIFO batch not found."
                    );
                }

                // ==============================================
                // UPDATE STOCK BATCH
                // ==============================================

                batch.units =
                    units;

                batch.buyPrice =
                    buyPrice;

                // ==============================================
                // REMOVE ZERO-UNIT BATCHES
                // ==============================================

                stock.purchaseBatches =
                    stock.purchaseBatches.filter(
                        currentBatch =>
                            Number(
                                currentBatch.units
                            ) > 0
                    );

                // ==============================================
                // KEEP STOCK FIFO ORDER
                // ==============================================

                stock.purchaseBatches =
                    sortFifoBatches(
                        stock.purchaseBatches
                    );

                // ==============================================
                // RECALCULATE STOCK UNITS
                // ==============================================

                let totalUnits =
                    0;

                for (
                    const currentBatch
                    of stock.purchaseBatches
                ) {

                    const currentUnits =
                        Number(
                            currentBatch.units
                        );

                    if (
                        Number.isFinite(
                            currentUnits
                        ) &&
                        currentUnits > 0
                    ) {

                        totalUnits +=
                            currentUnits;

                    }

                }

                stock.units =
                    totalUnits;

                // ==============================================
                // RECALCULATE STOCK UNIT BUY PRICE
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

        return updatedStock;

    } finally {

        await session.endSession();

    }
}

// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getFifoBatches,

    editFifoBatch

};