// ==========================================================
// services/storage/contents.js
// STORAGE CONTENTS SERVICE
// ==========================================================
//
// PURPOSE:
//
//     Find everything physically allocated inside a
//     Room or AgroStore.
//
// ==========================================================
//
// ALLOCATION RULE
// ----------------------------------------------------------
//
// Both Rooms and AgroStores use EXACTLY the same rule:
//
//     Dairy.assetCode
//         ===
/*      parent Dairy.code */
//
// AND
//
//     Dairy.dwellNumber
//         ===
//     DairyStorage.roomNumber
//
// There is NO separate allocation rule for AgroStores.
//
// ==========================================================

const mongoose =
    require("mongoose");

const Dairy =
    require("../../models/dairy");

const DairyStorage =
    require("../../models/dairyStorage");


// ==========================================================
// ERROR HELPER
// ==========================================================

function createError(
    message,
    statusCode = 400
) {

    const error =
        new Error(message);

    error.status =
        statusCode;

    return error;

}


// ==========================================================
// OBJECT ID VALIDATION
// ==========================================================

function isValidObjectId(
    value
) {

    return mongoose.Types.ObjectId.isValid(
        value
    );

}


// ==========================================================
// GET STORAGE CONTENTS
// ==========================================================
//
// PARAMETERS:
//
//     dairyId
//         Parent Dairy._id
//
//     storageId
//         DairyStorage._id
//
// RETURNS:
//
//     {
//         dairy,
//         storage,
//         items
//     }
//
// ==========================================================

async function getStorageContents({

    dairyId,

    storageId

}) {

    // ======================================================
    // VALIDATE FARM ID
    // ======================================================

    if (
        !isValidObjectId(
            dairyId
        )
    ) {

        throw createError(
            "Invalid Dairy Farm ID.",
            400
        );

    }


    // ======================================================
    // VALIDATE STORAGE ID
    // ======================================================

    if (
        !isValidObjectId(
            storageId
        )
    ) {

        throw createError(
            "Invalid storage facility ID.",
            400
        );

    }


    // ======================================================
    // FIND PARENT FARM
    // ======================================================

    const dairy =
        await Dairy.findById(
            dairyId
        );


    if (!dairy) {

        throw createError(
            "Dairy Farm not found.",
            404
        );

    }


    // ======================================================
    // VERIFY PARENT IS ACTUALLY A FARM
    // ======================================================

    if (

        dairy.code === null ||

        dairy.code === undefined ||

        Number(dairy.code) >= 0

    ) {

        throw createError(
            "The selected Dairy record is not a Dairy Farm.",
            400
        );

    }


    // ======================================================
    // FIND STORAGE FACILITY
    // ======================================================
    //
    // The storage must belong to this farm.
    //
    // ======================================================

    const storage =
        await DairyStorage.findOne({

            _id:
                storageId,

            farmCode:
                dairy.code

        });


    if (!storage) {

        throw createError(
            "Storage facility not found for this Dairy Farm.",
            404
        );

    }


    // ======================================================
    // FIND CONTENTS
    // ======================================================
    //
    // IMPORTANT:
    //
    // Room and AgroStore use exactly the same allocation
    // mechanism.
    //
    //     assetCode   = farm.code
    //     dwellNumber = storage.roomNumber
    //
    // ======================================================

    const items =
        await Dairy.find({

            assetCode:
                dairy.code,

            dwellNumber:
                storage.roomNumber

        })
        .sort({

            code: 1,

            name: 1

        });


    // ======================================================
    // RETURN
    // ======================================================

    return {

        dairy,

        storage,

        items

    };

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getStorageContents

};