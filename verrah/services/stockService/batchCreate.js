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
//     - Product.fifoBatches receives a NEW batch.
//     - StaffFIFOsubstation is saved as the staff user's
//       assigned substation.
//     - Product.units is increased.
//     - The staff user's assigned substation inventory
//       is increased.
//
// OTHER USERS:
//     - Existing Stock FIFO behavior remains unchanged.
//
// Expected body:
//
//     {
//         units,
//         totalBuyingPrice,
//         purchasedAt
//     }
//
// IMPORTANT:
//     StaffFIFOsubstation is NEVER read from req.body.
//     It is always taken from user.assignedSubstation.
//
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
    productFifoValue,
    productFifoUnits,
    sortProductFifo
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
    // READ TOTAL BUYING PRICE
    // ======================================================

    const totalBuyingPrice =
        Number(
            body.totalBuyingPrice
        );


    if (
        !Number.isFinite(
            totalBuyingPrice
        ) ||
        totalBuyingPrice < 0
    ) {

        throw new Error(
            "Total buying price must be a valid number greater than or equal to 0."
        );
    }


    // ======================================================
    // CALCULATE BUY PRICE PER UNIT
    // ======================================================

    const buyPrice =
        totalBuyingPrice /
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
                    // STORE STAFF SUBSTATION ID
                    // ======================================
                    //
                    // IMPORTANT:
                    //
                    // This value is taken from the authenticated
                    // staff user.
                    //
                    // It is NOT taken from body.StaffFIFOsubstation.
                    //
                    // ======================================

                    const StaffFIFOsubstation =
                        new mongoose.Types.ObjectId(
                            user.assignedSubstation
                        );


                    // ======================================
                    // FIND ASSIGNED SUBSTATION
                    // ======================================

                    const substation =
                        await Substation.findById(
                            StaffFIFOsubstation
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
                    // FIND LINKED PRODUCT
                    // ======================================
                    //
                    // Product.stock links the Product
                    // to this Stock record.
                    //
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
                    //
                    // StaffFIFOsubstation records which
                    // substation owns this FIFO batch.
                    //
                    // ======================================

                    product.fifoBatches.push({

                        units,

                        buyPrice,

                        receivedAt:
                            purchasedAt,

                        StaffFIFOsubstation

                    });


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

                    product.fifoBatches =
                        sortProductFifo(
                            product.fifoBatches
                        );

                    const productFifoTotalUnits =
                        productFifoUnits(
                            product
                        );

                    const productFifoValueTotal =
                        productFifoValue(
                            product
                        );

                    product.units =
                        productFifoTotalUnits;

                    product.unitBuyPrice =
                        productFifoTotalUnits > 0
                            ? productFifoValueTotal /
                                productFifoTotalUnits
                            : 0;

                    product.buyPrice =
                        product.unitBuyPrice;


                    // ======================================
                    // SAVE PRODUCT
                    // ======================================

                    await product.save({
                        session
                    });


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


                    updatedStock =
                        stock;

                    return;
                }


                // ==================================================
                // NON-STAFF
                // EXISTING BEHAVIOR
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

                    buyPrice,

                    purchasedAt

                });


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