// ==========================================================
// services/update/storage/update.js
// AGROSTORE INVENTORY UPDATE SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Updates an inventory record belonging to a specific
// AgroStore within a specific Dairy Farm.
//
// URL CONTRACT:
//
//     /dairy/:parentId/agroStore/:roomNumber/inventory/:inventoryId/update
//
// Therefore:
//
//     parentId
//         = parent Dairy Farm MongoDB _id
//
//     roomNumber
//         = AgroStore.roomNumber
//
//     inventoryId
//         = Inventory MongoDB _id
//
// ==========================================================
//
// RELATIONSHIP
// ----------------------------------------------------------
//
//     parentId
//         ↓
//     Dairy Farm._id
//         ↓
//     Dairy Farm.code
//         ↓
//     AgroStore.assetCode
//
// AND:
//
//     AgroStore.roomNumber
//         ↓
//     Inventory.dwellNumber
//
// Therefore an inventory record belongs to the requested
// AgroStore only when:
//
//     inventory.assetCode
//         ===
//     parentDairy.code
//
// AND:
//
//     inventory.dwellNumber
//         ===
//     agroStore.roomNumber
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
//     parentId
//     roomNumber
//     inventoryId
//     quantity
//     stockUpdateNote
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
    // VALIDATE PARENT DAIRY ID
    // ======================================================

    if (
        !parentId ||
        !mongoose.isValidObjectId(parentId)
    ) {

        const error =
            new Error(
                "Invalid parent Dairy Farm ID."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // NORMALIZE AGROSTORE ROOM NUMBER
    // ======================================================

    const storeNumber =
        Number(
            roomNumber
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
    // This is different from roomNumber.
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
    // FIND PARENT DAIRY FARM
    // ======================================================
    //
    // parentId is the actual MongoDB _id supplied by
    // the URL.
    //
    // ======================================================

    const parentDairy =
        await Dairy.findOne({

            _id:
                parentId,

            recordType:
                "farm",

            status:
                "active"

        });


    // ======================================================
    // PARENT FARM NOT FOUND
    // ======================================================

    if (
        !parentDairy
    ) {

        const error =
            new Error(
                "The parent Dairy Farm associated with this AgroStore was not found."
            );

        error.status = 404;

        throw error;

    }


    // ======================================================
    // GET PARENT FARM CODE
    // ======================================================

    const farmCode =
        Number(
            parentDairy.code
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
                "The parent Dairy Farm has an invalid farm code."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // FIND AGROSTORE
    // ======================================================
    //
    // The AgroStore must belong to THIS parent farm.
    //
    // Therefore both relationships are required:
    //
    //     assetCode
    //         =
    //     parentDairy.code
    //
    // AND:
    //
    //     roomNumber
    //         =
    //     supplied roomNumber
    //
    // ======================================================

    const agroStore =
        await Dairy.findOne({

            recordType:
                "structure",

            type:
                "agroStore",

            assetCode:
                farmCode,

            roomNumber:
                storeNumber,

            status:
                "active"

        });


    // ======================================================
    // AGROSTORE NOT FOUND
    // ======================================================

    if (
        !agroStore
    ) {

        const error =
            new Error(
                "The requested AgroStore was not found in this Dairy Farm."
            );

        error.status = 404;

        throw error;

    }


    // ======================================================
    // VALIDATE AGROSTORE ROOM NUMBER
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


    // ======================================================
    // VERIFY ROOM NUMBER
    // ======================================================

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
    // VERIFY AGROSTORE OWNERSHIP
    // ======================================================
    //
    // The AgroStore's assetCode MUST equal the parent
    // Dairy Farm's code.
    //
    // ======================================================

    const agroStoreFarmCode =
        Number(
            agroStore.assetCode
        );


    if (
        !Number.isInteger(
            agroStoreFarmCode
        ) ||
        agroStoreFarmCode !== farmCode
    ) {

        const error =
            new Error(
                "The AgroStore does not belong to the requested parent Dairy Farm."
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
    // ======================================================

    const inventory =
        await Dairy.findOne({

            _id:
                inventoryId,

            recordType:
                "structure",

            assetCode:
                farmCode,

            dwellNumber:
                authoritativeStoreNumber,

            status:
                "active"

        });


    // ======================================================
    // INVENTORY NOT FOUND
    // ======================================================

    if (
        !inventory
    ) {

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
    // AgroStore inventory must have:
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
    // Inventory.dwellNumber MUST equal the AgroStore's
    // roomNumber.
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
    // VERIFY INVENTORY PARENT FARM
    // ======================================================
    //
    // Inventory.assetCode MUST equal the parent farm code.
    //
    // ======================================================

    const inventoryFarmCode =
        Number(
            inventory.assetCode
        );


    if (
        !Number.isInteger(
            inventoryFarmCode
        ) ||
        inventoryFarmCode !== farmCode
    ) {

        const error =
            new Error(
                "The inventory record does not belong to this Dairy Farm."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // INVENTORY MUST HAVE VALID QUANTITY
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
    // NORMALIZE NEW QUANTITY
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
    // UPDATE STOCK NOTE
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

    await inventory.save();


    // ======================================================
    // RETURN UPDATED DATA
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