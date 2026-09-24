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


// ==========================================================
// GET FIFO BATCHES
// ==========================================================

async function getFifoBatches(
    stockId
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


    const batches =
        Array.isArray(
            stock.purchaseBatches
        )
            ? [...stock.purchaseBatches]
            : [];


    batches.sort(
        (
            a,
            b
        ) => {

            const aTime =
                a.purchasedAt
                    ? new Date(
                        a.purchasedAt
                    ).getTime()
                    : 0;

            const bTime =
                b.purchasedAt
                    ? new Date(
                        b.purchasedAt
                    ).getTime()
                    : 0;

            return (
                aTime -
                bTime
            );
        }
    );


    return {
        stock,
        batches
    };
}


// ==========================================================
// EDIT FIFO BATCH
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


                if (
                    !Array.isArray(
                        stock.purchaseBatches
                    )
                ) {

                    throw new Error(
                        "Stock has no FIFO batches."
                    );
                }


                // ==========================================
                // FIND STOCK BATCH
                // ==========================================

                const batch =
                    stock.purchaseBatches.id(
                        batchId
                    );


                if (!batch) {

                    throw new Error(
                        "FIFO batch not found."
                    );
                }


                // ==================================================
                // STAFF
                // ==================================================
                //
                // Staff do NOT modify:
                //
                //     Stock.purchaseBatches
                //     Stock.units
                //
                // Instead:
                //
                //     Product.fifoBatches
                //     Product.units
                //     assigned Substation.productInventory.units
                //
                // are updated.
                //
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
                            stock: stock._id
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
                    // FIND CORRESPONDING PRODUCT FIFO
                    // ======================================
                    //
                    // Product FIFO batches follow the same
                    // FIFO sequence as the stock batches.
                    //
                    // Find the position of the stock batch
                    // and use that position on Product FIFO.
                    //
                    // ======================================

                    const stockBatchIndex =
                        stock.purchaseBatches.findIndex(
                            currentBatch =>
                                String(
                                    currentBatch._id
                                ) ===
                                String(
                                    batchId
                                )
                        );


                    if (
                        stockBatchIndex < 0
                    ) {

                        throw new Error(
                            "Unable to locate FIFO batch position."
                        );
                    }


                    const productBatch =
                        product.fifoBatches[
                            stockBatchIndex
                        ];


                    if (!productBatch) {

                        throw new Error(
                            "Corresponding product FIFO batch was not found."
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
                    // UPDATE PRODUCT TOTAL UNITS
                    // ======================================
                    //
                    // Product.units represents the total
                    // units across its FIFO batches.
                    //
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
                    // REMOVE ZERO PRODUCT FIFO BATCH
                    // ======================================

                    product.fifoBatches =
                        product.fifoBatches.filter(
                            currentBatch =>
                                Number(
                                    currentBatch.units
                                ) > 0
                        );


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
                    // FIND PRODUCT INVENTORY
                    // ======================================

                    if (
                        !Array.isArray(
                            substation.productInventory
                        )
                    ) {

                        substation.productInventory =
                            [];
                    }


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
                    // UPDATE SUBSTATION UNITS
                    // ======================================
                    //
                    // Only apply the difference between the
                    // old and new product FIFO batch.
                    //
                    // Example:
                    //
                    // Old batch = 100
                    // New batch = 80
                    //
                    // Difference = -20
                    //
                    // Substation inventory decreases by 20.
                    //
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


                    inventory.units =
                        newInventoryUnits;

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
                    // STOCK IS NOT UPDATED FOR STAFF
                    // ======================================

                    updatedStock =
                        stock;

                    return;
                }


                // ==================================================
                // NON-STAFF
                // EXISTING BEHAVIOR
                // ==================================================

                // ==============================================
                // UPDATE STOCK BATCH
                // ==============================================

                batch.units =
                    units;

                batch.buyPrice =
                    buyPrice;


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