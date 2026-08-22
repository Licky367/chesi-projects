// ==========================================================
// services/update/storage/update.js
// AGROSTORE INVENTORY UPDATE SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Update an inventory record belonging to a specific
// AgroStore within a specific Dairy Farm.
//
// URL CONTRACT:
//
//     /dairy/:parentId/agroStore/:roomNumber/inventory/:inventoryId/update
//
// ID RELATIONSHIP:
//
//     parentId
//         ↓
//     Dairy Farm._id
//         ↓
//     Dairy Farm.code
//         ↓
//     AgroStore.assetCode
//
//     roomNumber
//         ↓
//     AgroStore.roomNumber
//         ↓
//     Inventory.dwellNumber
//
//     inventoryId
//         ↓
//     Inventory._id
//
// ==========================================================

const mongoose =
    require("mongoose");

const Dairy =
    require("../../../models/dairy");


// ==========================================================
// UPDATE AGROSTORE INVENTORY
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
    // NORMALIZE ROOM NUMBER
    // ======================================================

    const storeNumber =
        Number(roomNumber);


    // ======================================================
    // VALIDATE ROOM NUMBER
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

    if (
        !mongoose.isValidObjectId(
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
    // GET FARM CODE
    // ======================================================

    const farmCode =
        Number(parentDairy.code);


    // ======================================================
    // VALIDATE FARM CODE
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
    // The AgroStore must belong to this exact parent farm
    // AND have the supplied roomNumber.
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
    // VERIFY AGROSTORE ROOM NUMBER
    // ======================================================

    const authoritativeStoreNumber =
        Number(agroStore.roomNumber);


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

    const agroStoreFarmCode =
        Number(agroStore.assetCode);


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
    // FIND EXACT INVENTORY RECORD
    // ======================================================
    //
    // Three identities are enforced:
    //
    //     inventory._id
    //     inventory.assetCode
    //     inventory.dwellNumber
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
    // VERIFY INVENTORY DWELL NUMBER
    // ======================================================

    const inventoryDwellNumber =
        Number(inventory.dwellNumber);


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
    // VERIFY INVENTORY BELONGS TO AGROSTORE
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
    // VERIFY INVENTORY BELONGS TO FARM
    // ======================================================

    const inventoryFarmCode =
        Number(inventory.assetCode);


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
    // VALIDATE CURRENT QUANTITY
    // ======================================================

    const currentQuantity =
        Number(inventory.quantity);


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
        Number(quantity);


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
    // NO NEGATIVE QUANTITY
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
    // QUANTITY MAY ONLY DECREASE
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
    // RETURN
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