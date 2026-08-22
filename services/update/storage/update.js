// ==========================================================
// services/update/storage/update.js
// AGROSTORE INVENTORY UPDATE SERVICE
// ==========================================================

const mongoose =
    require("mongoose");

const Dairy =
    require("../../../models/dairy");


// ==========================================================
// HELPER: VALID OBJECT ID
// ==========================================================

function isValidObjectId(value) {

    return mongoose.Types.ObjectId.isValid(
        value
    );

}


// ==========================================================
// UPDATE AGROSTORE INVENTORY
// ==========================================================
//
// Quantity:
//
//     old = 250
//     new = 200
//         → allowed
//
//     old = 250
//     new = 250
//         → allowed
//
//     old = 250
//     new = 300
//         → rejected
//
// ==========================================================

async function update({

    parentId,

    roomNumber,

    inventoryId,

    quantity,

    stockUpdateNote

}) {

    // ======================================================
    // VALIDATE PARENT ID
    // ======================================================

    if (
        !isValidObjectId(parentId)
    ) {

        const error =
            new Error(
                "Invalid parent Dairy Farm ID."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // VALIDATE INVENTORY ID
    // ======================================================

    if (
        !isValidObjectId(inventoryId)
    ) {

        const error =
            new Error(
                "Invalid inventory record ID."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // NORMALIZE ROOM NUMBER
    // ======================================================

    const storeNumber =
        Number(roomNumber);


    if (
        !Number.isInteger(storeNumber) ||
        storeNumber >= 0
    ) {

        const error =
            new Error(
                "Invalid AgroStore roomNumber."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // FIND PARENT DAIRY FARM
    // ======================================================

    const parentDairy =
        await Dairy.findOne({

            _id: parentId,

            recordType: "farm",

            status: "active"

        });


    if (!parentDairy) {

        const error =
            new Error(
                "Parent Dairy Farm was not found."
            );

        error.status = 404;

        throw error;

    }


    // ======================================================
    // FARM CODE
    // ======================================================

    const farmCode =
        Number(parentDairy.code);


    if (
        !Number.isInteger(farmCode) ||
        farmCode >= 0
    ) {

        const error =
            new Error(
                "The parent Dairy Farm has an invalid farm code."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // VERIFY AGROSTORE
    // ======================================================

    const agroStore =
        await Dairy.findOne({

            recordType: "structure",

            type: "agroStore",

            assetCode: farmCode,

            roomNumber: storeNumber,

            status: "active"

        });


    if (!agroStore) {

        const error =
            new Error(
                "The requested AgroStore was not found in this Dairy Farm."
            );

        error.status = 404;

        throw error;

    }


    // ======================================================
    // FIND INVENTORY RECORD
    // ======================================================
    //
    // Notice that the inventory must satisfy ALL THREE:
    //
    //     _id
    //     assetCode
    //     dwellNumber
    //
    // This prevents cross-farm / cross-store updates.
    //
    // ======================================================

    const inventory =
        await Dairy.findOne({

            _id: inventoryId,

            assetCode: farmCode,

            dwellNumber:
                agroStore.roomNumber,

            status: "active"

        });


    if (!inventory) {

        const error =
            new Error(
                "The inventory item was not found in this AgroStore."
            );

        error.status = 404;

        throw error;

    }


    // ======================================================
    // INVENTORY MUST HAVE QUANTITY
    // ======================================================

    const currentQuantity =
        Number(
            inventory.quantity
        );


    if (
        !Number.isFinite(
            currentQuantity
        ) ||
        currentQuantity < 0
    ) {

        const error =
            new Error(
                "This inventory item does not have a valid quantity."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // NEW QUANTITY
    // ======================================================

    const newQuantity =
        Number(quantity);


    // ======================================================
    // VALIDATE NEW QUANTITY
    // ======================================================

    if (
        quantity === "" ||
        quantity === null ||
        quantity === undefined ||
        !Number.isFinite(
            newQuantity
        )
    ) {

        const error =
            new Error(
                "Please enter a valid quantity."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // NO NEGATIVE STOCK
    // ======================================================

    if (
        newQuantity < 0
    ) {

        const error =
            new Error(
                "Quantity cannot be negative."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // QUANTITY MAY ONLY REDUCE
    // ======================================================

    if (
        newQuantity > currentQuantity
    ) {

        const error =
            new Error(
                `Quantity can only be reduced. Current quantity is ${currentQuantity}.`
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // UPDATE QUANTITY
    // ======================================================

    inventory.quantity =
        newQuantity;


    // ======================================================
    // STOCK UPDATE NOTE
    // ======================================================

    if (
        stockUpdateNote === null ||
        stockUpdateNote === undefined
    ) {

        inventory.stockUpdateNote = "";

    } else {

        inventory.stockUpdateNote =
            String(
                stockUpdateNote
            ).trim();

    }


    // ======================================================
    // SAVE
    // ======================================================
    //
    // Your Dairy model has:
    //
    //     timestamps: true
    //
    // Therefore save() automatically updates:
    //
    //     updatedAt
    //
    // which becomes the "Last updated" date shown by
    // the inventory card.
    //
    // ======================================================

    await inventory.save();


    // ======================================================
    // RETURN UPDATED RECORD
    // ======================================================

    return inventory;

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    update;