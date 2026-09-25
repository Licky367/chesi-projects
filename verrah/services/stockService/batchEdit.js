// ==========================================================
// services/stockService/batchEdit.js
//
// STOCK FIFO BATCH SERVICE
// VERRAH COSMETICS
//
// STAFF:
//     Works with Product.fifoBatches.
//
//     Can only access batches where:
//
//     batch.StaffFIFOsubstation === user.assignedSubstation
//
// ADMIN / NON-STAFF:
//     Works with Stock.purchaseBatches.
//
// IMPORTANT:
//     Staff operations do not modify Stock.
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
    weightedProductBuyPrice,
    sortProductFifo,
    sortFifoBatches,
    calculateUnitBuyPrice
} = require("./helpers");


// ==========================================================
// HELPERS
// ==========================================================


// ==========================================================
// VALIDATE OBJECT ID
// ==========================================================

function isValidObjectId(id) {

    return mongoose.Types.ObjectId.isValid(
        id
    );

}


// ==========================================================
// CHECK STAFF ROLE
// ==========================================================

function isStaff(user) {

    return Boolean(
        user &&
        user.role === "staff"
    );

}


// ==========================================================
// GET STAFF ASSIGNED SUBSTATION
// ==========================================================

function getStaffSubstationId(user) {

    if (!isStaff(user)) {

        throw new Error(
            "This operation requires a staff account."
        );

    }

    const substationId =
        user.assignedSubstation?._id ||
        user.assignedSubstation;

    if (
        !substationId ||
        !isValidObjectId(substationId)
    ) {

        throw new Error(
            "Staff member has no valid assigned substation."
        );

    }

    return substationId;

}


// ==========================================================
// CHECK FIFO BATCH OWNERSHIP
// ==========================================================
//
// A batch belongs to the staff member's assigned
// substation only when StaffFIFOsubstation matches.
//
// Missing ownership does not grant access.
//
// ==========================================================

function belongsToStaffSubstation(
    batch,
    assignedSubstation
) {

    if (
        !batch ||
        !batch.StaffFIFOsubstation
    ) {

        return false;

    }

    const batchSubstationId =
        batch.StaffFIFOsubstation?._id ||
        batch.StaffFIFOsubstation;

    return (
        String(batchSubstationId) ===
        String(assignedSubstation)
    );

}


// ==========================================================
// CALCULATE TOTAL FIFO UNITS
// ==========================================================

function calculateFifoUnits(batches) {

    let totalUnits =
        0;

    for (const batch of batches) {

        const units =
            Number(batch.units);

        if (
            Number.isFinite(units) &&
            units > 0
        ) {

            totalUnits +=
                units;

        }

    }

    return totalUnits;

}


// ==========================================================
// GET FIFO BATCHES
// ==========================================================
//
// STAFF:
//
//     Product.fifoBatches
//
//     Only returns batches belonging to:
//
//     user.assignedSubstation
//
// OTHER USERS:
//
//     Stock.purchaseBatches
//
// ==========================================================

async function getFifoBatches(
    stockId,
    user
) {

    // ======================================================
    // VALIDATE STOCK ID
    // ======================================================

    if (
        !isValidObjectId(stockId)
    ) {

        throw new Error(
            "Invalid stock ID."
        );

    }

    // ======================================================
    // LOAD STOCK
    // ======================================================

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

    if (isStaff(user)) {

        // ==================================================
        // VALIDATE ASSIGNED SUBSTATION
        // ==================================================

        const assignedSubstation =
            getStaffSubstationId(user);

        // ==================================================
        // FIND LINKED PRODUCT
        // ==================================================

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

        // ==================================================
        // GET PRODUCT FIFO BATCHES
        // ==================================================

        const productBatches =
            Array.isArray(
                product.fifoBatches
            )
                ? product.fifoBatches
                : [];

        // ==================================================
        // FILTER BY STAFF ASSIGNED SUBSTATION
        //
        // IMPORTANT:
        //
        // Do not return batches belonging to another
        // substation.
        //
        // Batches without StaffFIFOsubstation are
        // also excluded.
        // ==================================================

        const staffBatches =
            productBatches.filter(
                batch =>

                    belongsToStaffSubstation(
                        batch,
                        assignedSubstation
                    )

            );

        // ==================================================
        // SORT FILTERED PRODUCT FIFO
        // ==================================================

        const batches =
            sortProductFifo(
                [...staffBatches]
            );

        // ==================================================
        // RETURN
        // ==================================================

        return {

            stock,

            product,

            batches

        };

    }

    // ======================================================
    // ADMIN / NON-STAFF
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
//
//     batchId = Product.fifoBatches._id
//
//     Ownership:
//
//     batch.StaffFIFOsubstation must equal
//     user.assignedSubstation.
//
//     Updates:
//
//         Product.fifoBatches
//         Product.units
//         Product.unitBuyPrice
//         Product.buyPrice
//
//         Assigned Substation.productInventory.units
//
//     Does NOT update:
//
//         Stock.purchaseBatches
//         Stock.units
//         Stock.buyPrice
//         Stock.unitBuyPrice
//
// OTHER USERS:
//
//     batchId = Stock.purchaseBatches._id
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
        !isValidObjectId(stockId)
    ) {

        throw new Error(
            "Invalid stock ID."
        );

    }

    // ======================================================
    // VALIDATE BATCH ID
    // ======================================================

    if (
        !isValidObjectId(batchId)
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
    // VALIDATE UNITS
    // ======================================================

    const units =
        Number(body.units);

    if (
        body.units === undefined ||
        body.units === null ||
        body.units === "" ||
        !Number.isFinite(units) ||
        !Number.isInteger(units) ||
        units < 0
    ) {

        throw new Error(
            "Units must be a whole number greater than or equal to 0."
        );

    }

    // ======================================================
    // VALIDATE BUY PRICE
    //
    // FIFO batch buyPrice is PER-UNIT buy price.
    //
    // ======================================================

    const buyPrice =
        Number(body.buyPrice);

    if (
        body.buyPrice === undefined ||
        body.buyPrice === null ||
        body.buyPrice === "" ||
        !Number.isFinite(buyPrice) ||
        buyPrice < 0
    ) {

        throw new Error(
            "Buy price must be a valid number greater than or equal to 0."
        );

    }

    // ======================================================
    // VALIDATE STAFF ASSIGNMENT
    // ======================================================

    const assignedSubstation =
        isStaff(user)
            ? getStaffSubstationId(user)
            : null;

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

                    }).session(session);

                if (!stock) {

                    throw new Error(
                        "Stock not found."
                    );

                }

                // ==================================================
                // STAFF
                // ==================================================

                if (isStaff(user)) {

                    // ==============================================
                    // FIND LINKED PRODUCT
                    // ==============================================

                    const product =
                        await Product.findOne({

                            stock: stock._id,

                            isActive: true

                        }).session(session);

                    if (!product) {

                        throw new Error(
                            "Product linked to this stock was not found."
                        );

                    }

                    // ==============================================
                    // ENSURE PRODUCT FIFO ARRAY
                    // ==============================================

                    if (
                        !Array.isArray(
                            product.fifoBatches
                        )
                    ) {

                        product.fifoBatches =
                            [];

                    }

                    // ==============================================
                    // FIND PRODUCT FIFO BATCH
                    //
                    // batchId belongs to Product.fifoBatches.
                    //
                    // Never map it to Stock.purchaseBatches.
                    // ==============================================

                    const productBatch =
                        product.fifoBatches.id(
                            batchId
                        );

                    if (!productBatch) {

                        throw new Error(
                            "FIFO batch not found."
                        );

                    }

                    // ==============================================
                    // VERIFY BATCH OWNERSHIP
                    //
                    // SECURITY:
                    //
                    // A staff member cannot edit a batch
                    // belonging to another substation.
                    //
                    // This check is performed inside the
                    // transaction before modifying anything.
                    // ==============================================

                    if (
                        !belongsToStaffSubstation(
                            productBatch,
                            assignedSubstation
                        )
                    ) {

                        throw new Error(
                            "You are not authorized to edit this FIFO batch."
                        );

                    }

                    // ==============================================
                    // LOAD ASSIGNED SUBSTATION
                    // ==============================================

                    const substation =
                        await Substation.findById(
                            assignedSubstation
                        ).session(session);

                    if (!substation) {

                        throw new Error(
                            "Assigned substation not found."
                        );

                    }

                    // ==============================================
                    // ENSURE INVENTORY ARRAY
                    // ==============================================

                    if (
                        !Array.isArray(
                            substation.productInventory
                        )
                    ) {

                        substation.productInventory =
                            [];

                    }

                    // ==============================================
                    // FIND PRODUCT INVENTORY
                    // ==============================================

                    const inventory =
                        substation.productInventory.find(
                            item =>

                                String(
                                    item.productId?._id ||
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

                    // ==============================================
                    // GET OLD BATCH UNITS
                    // ==============================================

                    const oldUnits =
                        Number(
                            productBatch.units || 0
                        );

                    if (
                        !Number.isFinite(oldUnits) ||
                        oldUnits < 0
                    ) {

                        throw new Error(
                            "Existing FIFO batch units are invalid."
                        );

                    }

                    // ==============================================
                    // CALCULATE UNIT DIFFERENCE
                    //
                    // Example:
                    //
                    // Old batch = 10
                    // New batch = 15
                    //
                    // Difference = +5
                    //
                    // Assigned substation receives +5.
                    // ==============================================

                    const unitDifference =
                        units -
                        oldUnits;

                    // ==============================================
                    // GET CURRENT SUBSTATION UNITS
                    // ==============================================

                    const currentInventoryUnits =
                        Number(
                            inventory.units || 0
                        );

                    if (
                        !Number.isFinite(
                            currentInventoryUnits
                        ) ||
                        currentInventoryUnits < 0
                    ) {

                        throw new Error(
                            "Existing substation inventory units are invalid."
                        );

                    }

                    // ==============================================
                    // CALCULATE NEW SUBSTATION UNITS
                    // ==============================================

                    const newInventoryUnits =
                        currentInventoryUnits +
                        unitDifference;

                    if (
                        !Number.isFinite(
                            newInventoryUnits
                        ) ||
                        !Number.isInteger(
                            newInventoryUnits
                        ) ||
                        newInventoryUnits < 0
                    ) {

                        throw new Error(
                            "Substation inventory cannot become negative."
                        );

                    }

                    // ==============================================
                    // UPDATE PRODUCT FIFO BATCH
                    // ==============================================

                    productBatch.units =
                        units;

                    productBatch.buyPrice =
                        buyPrice;

                    // ==============================================
                    // PRESERVE BATCH OWNERSHIP
                    //
                    // Do not accept StaffFIFOsubstation
                    // from the submitted form.
                    //
                    // The existing ownership remains unchanged.
                    // ==============================================

                    productBatch.StaffFIFOsubstation =
                        assignedSubstation;

                    // ==============================================
                    // REMOVE ZERO-UNIT BATCHES
                    // ==============================================

                    product.fifoBatches =
                        product.fifoBatches.filter(
                            currentBatch =>

                                Number(
                                    currentBatch.units
                                ) > 0

                        );

                    // ==============================================
                    // SORT ALL PRODUCT FIFO BATCHES
                    //
                    // IMPORTANT:
                    //
                    // Sort the complete product FIFO array,
                    // not only the staff-owned batches.
                    //
                    // Other substations' batches are preserved.
                    // ==============================================

                    product.fifoBatches =
                        sortProductFifo(
                            product.fifoBatches
                        );

                    // ==============================================
                    // RECALCULATE TOTAL PRODUCT UNITS
                    //
                    // Includes batches belonging to ALL
                    // substations.
                    // ==============================================

                    product.units =
                        calculateFifoUnits(
                            product.fifoBatches
                        );

                    // ==============================================
                    // RECALCULATE PRODUCT BUY PRICE
                    //
                    // Uses ALL remaining Product FIFO batches.
                    // ==============================================

                    const unitBuyPrice =
                        weightedProductBuyPrice(
                            product
                        );

                    product.unitBuyPrice =
                        unitBuyPrice;

                    product.buyPrice =
                        unitBuyPrice;

                    // ==============================================
                    // UPDATE ASSIGNED SUBSTATION INVENTORY
                    // ==============================================

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

                    // ==============================================
                    // SAVE PRODUCT
                    // ==============================================

                    await product.save({
                        session
                    });

                    // ==============================================
                    // SAVE ASSIGNED SUBSTATION
                    // ==============================================

                    await substation.save({
                        session
                    });

                    // ==============================================
                    // STOCK IS NOT MODIFIED FOR STAFF
                    // ==============================================

                    updatedStock =
                        stock;

                    return;

                }

                // ==================================================
                // NON-STAFF
                //
                // EXISTING STOCK FIFO BEHAVIOR
                // ==================================================

                // ==============================================
                // ENSURE STOCK FIFO ARRAY
                // ==============================================

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
                // UPDATE STOCK FIFO BATCH
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
                // SORT STOCK FIFO BATCHES
                // ==============================================

                stock.purchaseBatches =
                    sortFifoBatches(
                        stock.purchaseBatches
                    );

                // ==============================================
                // RECALCULATE STOCK UNITS
                // ==============================================

                stock.units =
                    calculateFifoUnits(
                        stock.purchaseBatches
                    );

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

        // ==================================================
        // RETURN UPDATED STOCK
        // ==================================================

        return updatedStock;

    } finally {

        // ==================================================
        // END SESSION
        // ==================================================

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