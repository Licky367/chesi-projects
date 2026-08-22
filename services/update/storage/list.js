// ==========================================================
// services/update/storage/list.js
// AGROSTORE INVENTORY LIST SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Load the inventory belonging to a specific AgroStore.
//
// URL CONTRACT:
//
//     /dairy/:parentId/agroStore/:roomNumber
//
// Therefore:
//
//     parentId
//         = parent Dairy Farm MongoDB _id
//
//     roomNumber
//         = AgroStore.roomNumber
//
// RELATIONSHIP:
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
    // FIND PARENT DAIRY FARM
    // ======================================================
    //
    // parentId is the actual MongoDB _id supplied
    // by the URL.
    //
    // We therefore do NOT try to guess the parent
    // from AgroStore.roomNumber.
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
    // VALIDATE PARENT FARM CODE
    // ======================================================
    //
    // A Dairy Farm's code is the value used by its
    // child AgroStore as assetCode.
    //
    // ======================================================

    const farmCode =
        Number(
            parentDairy.code
        );


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
    // The AgroStore MUST satisfy BOTH relationships:
    //
    //     assetCode
    //         =
    //     parentDairy.code
    //
    // AND
    //
    //     roomNumber
    //         =
    //     supplied roomNumber
    //
    // This is important because AgroStore roomNumber
    // is unique only within a parent farm.
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
    // VERIFY AGROSTORE ROOM NUMBER MATCH
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
    // AgroStore.assetCode MUST equal the parent
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
    // FIND INVENTORY
    // ======================================================
    //
    // Inventory belongs to this AgroStore through:
    //
    //     assetCode
    //         =
    //     parent Dairy Farm.code
    //
    // AND
    //
    //     dwellNumber
    //         =
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