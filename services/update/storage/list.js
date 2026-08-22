// ==========================================================
// services/update/storage/list.js
// AGROSTORE INVENTORY LIST SERVICE
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
// parentId
//     = _id of parent Dairy Farm
//
// roomNumber
//     = roomNumber of AgroStore
//
// Relationship:
//
// Parent Farm
//     _id
//     code
//
//        ↓
//
// AgroStore
//     assetCode = parentFarm.code
//     roomNumber = requested roomNumber
//
//        ↓
//
// Inventory
//     assetCode = parentFarm.code
//     dwellNumber = AgroStore.roomNumber
//
// ==========================================================

async function list({
    parentId,
    roomNumber
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
    // NORMALIZE ROOM NUMBER
    // ======================================================

    const storeNumber =
        Number(roomNumber);


    // ======================================================
    // AGROSTORE MUST HAVE NEGATIVE ROOM NUMBER
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
    // PARENT FARM CODE
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
    // FIND AGROSTORE
    // ======================================================
    //
    // The AgroStore MUST:
    //
    // 1. Be a structure
    // 2. Be type agroStore
    // 3. Belong to this farm
    // 4. Have the requested roomNumber
    //
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
    // FIND INVENTORY
    // ======================================================
    //
    // THIS IS THE IMPORTANT PART.
    //
    // We do NOT search by the AgroStore _id.
    //
    // Inventory is identified by:
    //
    //     assetCode
    //         +
    //     dwellNumber
    //
    // ======================================================

    const inventory =
        await Dairy.find({

            assetCode: farmCode,

            dwellNumber:
                agroStore.roomNumber,

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