// ==========================================================
// services/update/storage/update.js
// AGROSTORE INVENTORY UPDATE SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Updates an inventory record belonging to an AgroStore.
//
// OWNERSHIP CONTRACT
// ----------------------------------------------------------
//
// AgroStore:
//     recordType = "structure"
//     type       = "agroStore"
//     assetCode  = negative code of parent Dairy Farm
//     roomNumber = negative AgroStore number
//
// Dairy Farm:
//     recordType = "farm"
//     code       = negative farm code
//     assetCode  = null
//
// Therefore:
//
//     agroStore.assetCode
//             ↓
//     parent farm.code
//             ↓
//     parent farm._id
//
// IMPORTANT:
// ----------------------------------------------------------
//
// The parent farm is NOT determined from roomNumber.
//
// roomNumber identifies the AgroStore.
//
// assetCode identifies the parent Dairy Farm.
//
// The service therefore derives the parent farm from the
// AgroStore itself.
//
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
//
// REQUIRED INPUT:
//
//     agroStoreId
//     inventoryId
//     quantity
//     stockUpdateNote
//
// The parent Dairy Farm ID is NOT supplied.
//
// It is determined from:
//
//     AgroStore.assetCode
//
// ==========================================================

async function update({

    agroStoreId,

    inventoryId,

    quantity,

    stockUpdateNote

}) {

    // ======================================================
    // VALIDATE AGROSTORE ID
    // ======================================================

    if (
        !isValidObjectId(agroStoreId)
    ) {

        const error =
            new Error(
                "Invalid AgroStore ID."
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
    // FIND AGROSTORE
    // ======================================================
    //
    // The AgroStore is the starting point.
    //
    // We intentionally do NOT start with parentId.
    //
    // The AgroStore contains:
    //
    //     assetCode
    //         = negative parent farm code
    //
    //     roomNumber
    //         = negative AgroStore number
    //
    // ======================================================

    const agroStore =
        await Dairy.findOne({

            _id: agroStoreId,

            recordType: "structure",

            type: "agroStore",

            status: "active"

        });


    if (!agroStore) {

        const error =
            new Error(
                "The requested AgroStore was not found."
            );

        error.status = 404;

        throw error;

    }


    // ======================================================
    // VALIDATE AGROSTORE PARENT FARM CODE
    // ======================================================
    //
    // According to dairy.js:
    //
    //     assetCode = negative code of parent Dairy Farm
    //
    // ======================================================

    const farmCode =
        Number(
            agroStore.assetCode
        );


    if (
        !Number.isInteger(farmCode) ||
        farmCode >= 0
    ) {

        const error =
            new Error(
                "The AgroStore has an invalid parent Dairy Farm code."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // VALIDATE AGROSTORE ROOM NUMBER
    // ======================================================
    //
    // According to dairy.js:
    //
    //     AgroStore roomNumber must be negative.
    //
    // ======================================================

    const storeNumber =
        Number(
            agroStore.roomNumber
        );


    if (
        !Number.isInteger(storeNumber) ||
        storeNumber >= 0
    ) {

        const error =
            new Error(
                "The AgroStore has an invalid roomNumber."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // FIND PARENT DAIRY FARM
    // ======================================================
    //
    // THIS IS THE IMPORTANT PART.
    //
    // We now determine the parent farm using:
    //
    //     agroStore.assetCode
    //
    // which must equal:
    //
    //     parentDairy.code
    //
    // The resulting document gives us:
    //
    //     parentDairy._id
    //
    // ======================================================

    const parentDairy =
        await Dairy.findOne({

            recordType: "farm",

            code: farmCode,

            status: "active"

        });


    if (!parentDairy) {

        const error =
            new Error(
                "The parent Dairy Farm associated with this AgroStore was not found."
            );

        error.status = 404;

        throw error;

    }


    // ======================================================
    // FINAL PARENT FARM VALIDATION
    // ======================================================
    //
    // The model guarantees farms have negative codes.
    //
    // We verify it here as an additional service-level
    // protection.
    //
    // ======================================================

    if (
        !Number.isInteger(
            Number(parentDairy.code)
        ) ||
        Number(parentDairy.code) >= 0
    ) {

        const error =
            new Error(
                "The parent Dairy Farm has an invalid farm code."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // VERIFY AGROSTORE / PARENT RELATIONSHIP
    // ======================================================
    //
    // This confirms that:
    //
    //     AgroStore.assetCode
    //
    // actually points to:
    //
    //     parentDairy.code
    //
    // ======================================================

    if (
        Number(agroStore.assetCode) !==
        Number(parentDairy.code)
    ) {

        const error =
            new Error(
                "The AgroStore does not belong to the resolved parent Dairy Farm."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // FIND INVENTORY RECORD
    // ======================================================
    //
    // The inventory must belong to:
    //
    //     1. This exact inventory _id
    //     2. This parent farm
    //     3. This exact AgroStore
    //
    // Parent farm:
    //
    //     assetCode = farmCode
    //
    // AgroStore:
    //
    //     dwellNumber = agroStore.roomNumber
    //
    // ======================================================

    const inventory =
        await Dairy.findOne({

            _id: inventoryId,

            recordType: "structure",

            assetCode: farmCode,

            dwellNumber: storeNumber,

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
    // VERIFY INVENTORY IS AGROSTORE CONTENT
    // ======================================================
    //
    // An AgroStore inventory record must have:
    //
    //     dwellNumber < 0
    //
    // ======================================================

    if (
        !Number.isInteger(
            Number(inventory.dwellNumber)
        ) ||
        Number(inventory.dwellNumber) >= 0
    ) {

        const error =
            new Error(
                "The inventory record is not valid AgroStore content."
            );

        error.status = 400;

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
        Number(
            quantity
        );


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
    // dairy.js uses:
    //
    //     timestamps: true
    //
    // Therefore save() updates:
    //
    //     updatedAt
    //
    // ======================================================

    await inventory.save();


    // ======================================================
    // RETURN UPDATED RECORD
    // ======================================================

    return {

        inventory,

        agroStore,

        parentDairy

    };

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    update;