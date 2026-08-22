// ==========================================================
// services/update/storage/list.js
// AGROSTORE INVENTORY LIST SERVICE
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
//     dwellNumber = AgroStore roomNumber
//
// IMPORTANT:
//
// The parent Dairy Farm is NOT supplied as parentId.
//
// It is determined from:
//
//     AgroStore.assetCode
//
// The AgroStore roomNumber is NOT supplied separately.
//
// The authoritative roomNumber comes from the AgroStore document.
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
// LIST AGROSTORE INVENTORY
// ==========================================================
//
// INPUT:
//
//     agroStoreId
//
// PROCESS:
//
//     1. Find AgroStore by _id
//     2. Read AgroStore.assetCode
//     3. Find parent Dairy Farm by code
//     4. Read AgroStore.roomNumber
//     5. Find inventory using:
//
//            assetCode
//            dwellNumber
//
// ==========================================================

async function list({

    agroStoreId

}) {

    // ======================================================
    // VALIDATE AGROSTORE ID
    // ======================================================

    if (
        !isValidObjectId(
            agroStoreId
        )
    ) {

        const error =
            new Error(
                "Invalid AgroStore ID."
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
    // GET PARENT FARM CODE
    // ======================================================
    //
    // According to dairy.js:
    //
    //     assetCode = negative parent Dairy Farm code
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
    // FIND PARENT DAIRY FARM
    // ======================================================
    //
    // This is where the correct parent _id is determined.
    //
    //     agroStore.assetCode
    //             ↓
    //        parentDairy.code
    //             ↓
    //        parentDairy._id
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
    // VERIFY PARENT FARM CODE
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
    // VERIFY AGROSTORE OWNERSHIP
    // ======================================================

    if (
        Number(parentDairy.code) !==
        Number(agroStore.assetCode)
    ) {

        const error =
            new Error(
                "The AgroStore does not belong to the resolved parent Dairy Farm."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // GET AGROSTORE NUMBER
    // ======================================================
    //
    // roomNumber belongs to the AgroStore.
    //
    // We do NOT accept it independently from the caller.
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
    // FIND INVENTORY
    // ======================================================
    //
    // Inventory belongs to this AgroStore through:
    //
    //     assetCode
    //         =
    //     parent Dairy Farm code
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

            recordType: "structure",

            assetCode: farmCode,

            dwellNumber: storeNumber,

            status: "active"

        })
        .sort({

            updatedAt: -1

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