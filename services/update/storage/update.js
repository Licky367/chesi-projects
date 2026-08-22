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
// ==========================================================
//
// AGROSTORE ID CONTRACT
// ----------------------------------------------------------
//
// The application-level AgroStore ID is:
//
//     AgroStore.roomNumber
//
// Examples:
//
//     -1
//     -2
//     -3
//
// IMPORTANT:
//
//     agroStoreId MUST be the AgroStore.roomNumber.
//
// DO NOT treat agroStoreId as:
//
//     AgroStore._id
//
// MongoDB _id exists internally on the AgroStore document,
// but it is NOT the AgroStore identifier supplied to this
// service.
//
// ==========================================================
//
// OWNERSHIP CONTRACT
// ----------------------------------------------------------
//
// Dairy Farm:
//
//     recordType = "farm"
//     code       = negative farm code
//     assetCode  = null
//
// AgroStore:
//
//     recordType = "structure"
//     type       = "agroStore"
//     assetCode  = negative code of parent Dairy Farm
//     roomNumber = negative AgroStore number
//
// Inventory:
//
//     assetCode   = parent Dairy Farm code
//     dwellNumber = AgroStore.roomNumber
//
// ==========================================================
//
// RESOLUTION:
//
//     agroStoreId
//          ↓
//     AgroStore.roomNumber
//          ↓
//     AgroStore.assetCode
//          ↓
//     parent Dairy Farm.code
//          ↓
//     parent Dairy Farm._id
//
// ==========================================================


const mongoose =
    require("mongoose");

const Dairy =
    require("../../../models/dairy");


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
// IMPORTANT:
//
//     agroStoreId
//         = AgroStore.roomNumber
//
//     inventoryId
//         = inventory MongoDB _id
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
    // NORMALIZE AGROSTORE ROOM NUMBER
    // ======================================================
    //
    // agroStoreId is NOT a MongoDB ObjectId.
    //
    // It is the AgroStore.roomNumber.
    //
    // Example:
    //
    //     agroStoreId = "-2"
    //
    // becomes:
    //
    //     storeNumber = -2
    //
    // ======================================================

    const storeNumber =
        Number(
            agroStoreId
        );


    // ======================================================
    // VALIDATE AGROSTORE ROOM NUMBER
    // ======================================================
    //
    // AgroStore roomNumber MUST be:
    //
    //     negative integer
    //
    // ======================================================

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
    // VALIDATE INVENTORY ID
    // ======================================================
    //
    // inventoryId IS a MongoDB _id.
    //
    // This is different from agroStoreId.
    //
    // ======================================================

    if (
        !mongoose.Types.ObjectId.isValid(
            inventoryId
        )
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
    // IMPORTANT:
    //
    // We DO NOT search:
    //
    //     _id: agroStoreId
    //
    // because agroStoreId is roomNumber.
    //
    // We search by:
    //
    //     recordType
    //     type
    //     roomNumber
    //     status
    //
    // ======================================================

    const agroStores =
        await Dairy.find({

            recordType: "structure",

            type: "agroStore",

            roomNumber: storeNumber,

            status: "active"

        });


    // ======================================================
    // AGROSTORE NOT FOUND
    // ======================================================

    if (
        !agroStores.length
    ) {

        const error =
            new Error(
                "The requested AgroStore was not found."
            );

        error.status = 404;

        throw error;

    }


    // ======================================================
    // CHECK FOR AMBIGUOUS AGROSTORE ROOM NUMBER
    // ======================================================
    //
    // roomNumber is unique only within a parent farm.
    //
    // Therefore:
    //
    //     Farm -5  → AgroStore -1
    //     Farm -8  → AgroStore -1
    //
    // are both valid.
    //
    // If only "-1" is supplied, the service cannot safely
    // determine which farm was intended.
    //
    // NEVER randomly choose one.
    //
    // ======================================================

    if (
        agroStores.length > 1
    ) {

        const error =
            new Error(
                `AgroStore roomNumber ${storeNumber} is ambiguous because it exists in multiple active Dairy Farms.`
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // RESOLVED AGROSTORE
    // ======================================================

    const agroStore =
        agroStores[0];


    // ======================================================
    // VALIDATE AGROSTORE ROOM NUMBER
    // ======================================================
    //
    // The value supplied by the caller and the value stored
    // on the AgroStore must agree.
    //
    // roomNumber remains the authoritative AgroStore ID.
    //
    // ======================================================

    const authoritativeStoreNumber =
        Number(
            agroStore.roomNumber
        );


    if (
        !Number.isInteger(
            authoritativeStoreNumber
        ) ||
        authoritativeStoreNumber >= 0
    ) {

        const error =
            new Error(
                "The AgroStore has an invalid roomNumber."
            );

        error.status = 400;

        throw error;

    }


    if (
        authoritativeStoreNumber !==
        storeNumber
    ) {

        const error =
            new Error(
                "The supplied AgroStore roomNumber does not match the AgroStore record."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // GET PARENT FARM CODE
    // ======================================================
    //
    // According to dairy.js:
    //
    //     AgroStore.assetCode
    //             =
    //     negative code of parent Dairy Farm
    //
    // ======================================================

    const farmCode =
        Number(
            agroStore.assetCode
        );


    // ======================================================
    // VALIDATE PARENT FARM CODE
    // ======================================================

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
    // FIND PARENT DAIRY FARM
    // ======================================================
    //
    // The parent farm is NOT determined by roomNumber.
    //
    // roomNumber identifies the AgroStore.
    //
    // assetCode identifies the parent farm.
    //
    // Therefore:
    //
    //     AgroStore.assetCode
    //             ↓
    //     Dairy Farm.code
    //             ↓
    //     parentDairy._id
    //
    // ======================================================

    const parentDairy =
        await Dairy.findOne({

            recordType: "farm",

            code: farmCode,

            status: "active"

        });


    // ======================================================
    // PARENT FARM NOT FOUND
    // ======================================================

    if (!parentDairy) {

        const error =
            new Error(
                "The parent Dairy Farm associated with this AgroStore was not found."
            );

        error.status = 404;

        throw error;

    }


    // ======================================================
    // VALIDATE PARENT FARM CODE
    // ======================================================

    const parentFarmCode =
        Number(
            parentDairy.code
        );


    if (
        !Number.isInteger(parentFarmCode) ||
        parentFarmCode >= 0
    ) {

        const error =
            new Error(
                "The parent Dairy Farm has an invalid farm code."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // VERIFY AGROSTORE OWNERSHIP
    // ======================================================
    //
    // AgroStore.assetCode MUST equal parentDairy.code.
    //
    // ======================================================

    if (
        parentFarmCode !==
        farmCode
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
    //     2. This parent Dairy Farm
    //     3. This exact AgroStore
    //
    // Parent farm:
    //
    //     assetCode = farmCode
    //
    // AgroStore:
    //
    //     dwellNumber = AgroStore.roomNumber
    //
    // ======================================================

    const inventory =
        await Dairy.findOne({

            _id: inventoryId,

            recordType: "structure",

            assetCode: farmCode,

            dwellNumber:
                authoritativeStoreNumber,

            status: "active"

        });


    // ======================================================
    // INVENTORY NOT FOUND
    // ======================================================

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
    // Inventory belonging to an AgroStore must have:
    //
    //     dwellNumber < 0
    //
    // ======================================================

    const inventoryDwellNumber =
        Number(
            inventory.dwellNumber
        );


    if (
        !Number.isInteger(
            inventoryDwellNumber
        ) ||
        inventoryDwellNumber >= 0
    ) {

        const error =
            new Error(
                "The inventory record is not valid AgroStore content."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // VERIFY INVENTORY ROOM NUMBER
    // ======================================================
    //
    // The inventory dwellNumber MUST equal the resolved
    // AgroStore.roomNumber.
    //
    // ======================================================

    if (
        inventoryDwellNumber !==
        authoritativeStoreNumber
    ) {

        const error =
            new Error(
                "The inventory record does not belong to this AgroStore."
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
        !Number.isFinite(newQuantity)
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
        newQuantity >
        currentQuantity
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

        inventory.stockUpdateNote =
            "";

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