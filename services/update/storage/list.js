// ==========================================================
// services/update/storage/list.js
// AGROSTORE INVENTORY LIST SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Load inventory belonging to a specific AgroStore.
//
// URL CONTRACT:
//
//     /dairy/:parentId/agroStore/:roomNumber
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
// ==========================================================

const mongoose =
    require("mongoose");

const Dairy =
    require("../../../models/dairy");


// ==========================================================
// LIST AGROSTORE INVENTORY
// ==========================================================

async function list({

    parentId,

    roomNumber

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
    //
    // AgroStore roomNumber must be a negative integer.
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
    // BOTH relationships are required:
    //
    //     AgroStore.assetCode
    //         ===
    //     parentDairy.code
    //
    // AND:
    //
    //     AgroStore.roomNumber
    //         ===
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
    // VERIFY ROOM NUMBER MATCH
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
    // VERIFY AGROSTORE FARM CODE
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
    // FIND INVENTORY
    // ======================================================
    //
    // Inventory belongs to this AgroStore through:
    //
    //     Inventory.assetCode
    //         ===
    //     parentDairy.code
    //
    // AND:
    //
    //     Inventory.dwellNumber
    //         ===
    //     AgroStore.roomNumber
    //
    // ======================================================

    const inventory =
        await Dairy.find({

            recordType:
                "structure",

            assetCode:
                farmCode,

            dwellNumber:
                authoritativeStoreNumber,

            status:
                "active"

        })
        .sort({
            updatedAt:
                -1
        });


    // ======================================================
    // RETURN
    // ======================================================

    return {

        parentDairy,

        agroStore,

        inventory

    };

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    list;