// ==========================================================
// services/storage/add.js
// ADD STORAGE SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Creates storage belonging to a parent Dairy Farm.
//
// ROUTE:
//
//     /storage/:id/add
//
// :id = parent Dairy._id
//
// RELATION:
//
//     Dairy._id
//          ↓
//     Dairy.code
//          ↓
//     DairyStorage.farmCode
//
// USER INPUT:
//
//     name
//     type
//
// SERVER GENERATES:
//
//     farmCode
//     roomNumber
//
// NUMBERING:
//
//     room:
//
//         1
//         2
//         3
//         ...
//
//     agroStore:
//
//         -1
//         -2
//         -3
//         ...
//
// ==========================================================

const mongoose =
    require("mongoose");

const Dairy =
    require("../../models/dairy");

const DairyStorage =
    require("../../models/dairyStorage");


// ==========================================================
// VALIDATE DAIRY ID
// ==========================================================

function validateDairyId(
    dairyId
) {

    if (
        !mongoose.Types.ObjectId.isValid(
            dairyId
        )
    ) {

        const error =
            new Error(
                "Invalid dairy ID."
            );

        error.status = 400;

        throw error;

    }

}


// ==========================================================
// GET PARENT DAIRY
// ==========================================================
//
// IMPORTANT:
//
// dairyId is ALWAYS Dairy._id.
//
// farmCode is obtained from dairy.code.
//
// ==========================================================

async function getParentDairy(
    dairyId
) {

    validateDairyId(
        dairyId
    );


    const dairy =
        await Dairy
            .findById(dairyId)
            .lean();


    if (!dairy) {

        const error =
            new Error(
                "Dairy farm not found."
            );

        error.status = 404;

        throw error;

    }


    // ======================================================
    // PARENT MUST BE A DAIRY FARM
    // ======================================================

    const farmCode =
        Number(
            dairy.code
        );


    if (
        !Number.isInteger(farmCode) ||
        farmCode >= 0
    ) {

        const error =
            new Error(
                "The selected Dairy is not a Dairy Farm."
            );

        error.status = 422;

        throw error;

    }


    return {

        dairy,

        farmCode

    };

}


// ==========================================================
// GET NEXT ROOM NUMBER
// ==========================================================
//
// First room:
//
//     1
//
// Existing:
//
//     1, 2, 3
//
// Next:
//
//     4
//
// ==========================================================

async function getNextRoomNumber(
    farmCode
) {

    const rooms =
        await DairyStorage
            .find({

                farmCode,

                type:
                    "room",

                status:
                    "active"

            })
            .select(
                "roomNumber"
            )
            .lean();


    const numbers =
        rooms
            .map(
                item =>
                    Number(
                        item.roomNumber
                    )
            )
            .filter(
                number =>
                    Number.isInteger(number) &&
                    number > 0
            );


    if (
        numbers.length === 0
    ) {

        return 1;

    }


    return (
        Math.max(
            ...numbers
        ) + 1
    );

}


// ==========================================================
// GET NEXT AGROSTORE NUMBER
// ==========================================================
//
// First:
//
//     -1
//
// Existing:
//
//     -1, -2, -3
//
// Next:
//
//     -4
//
// ==========================================================

async function getNextAgroStoreNumber(
    farmCode
) {

    const stores =
        await DairyStorage
            .find({

                farmCode,

                type:
                    "agroStore",

                status:
                    "active"

            })
            .select(
                "roomNumber"
            )
            .lean();


    const numbers =
        stores
            .map(
                item =>
                    Number(
                        item.roomNumber
                    )
            )
            .filter(
                number =>
                    Number.isInteger(number) &&
                    number < 0
            );


    if (
        numbers.length === 0
    ) {

        return -1;

    }


    return (
        Math.min(
            ...numbers
        ) - 1
    );

}


// ==========================================================
// CHECK NAME AVAILABILITY
// ==========================================================

async function ensureNameAvailable(
    farmCode,
    name
) {

    const existing =
        await DairyStorage
            .findOne({

                farmCode,

                name: {

                    $regex:
                        `^${escapeRegExp(name)}$`,

                    $options:
                        "i"

                },

                status:
                    "active"

            })
            .select(
                "_id"
            )
            .lean();


    if (existing) {

        const error =
            new Error(
                "A storage facility with this name already exists on this Dairy Farm."
            );

        error.status = 409;

        throw error;

    }

}


// ==========================================================
// ESCAPE REGEXP
// ==========================================================

function escapeRegExp(
    value
) {

    return String(
        value
    ).replace(

        /[.*+?^${}()|[\]\\]/g,

        "\\$&"

    );

}


// ==========================================================
// GET ADD PAGE DATA
// ==========================================================
//
// THIS FUNCTION WAS MISSING.
//
// The controller calls:
//
//     getAddPageData(dairyId)
//
// Therefore it MUST be exported.
//
// ==========================================================

async function getAddPageData(
    dairyId
) {

    const {

        dairy,

        farmCode

    } =
        await getParentDairy(
            dairyId
        );


    return {

        dairy,

        farmCode

    };

}


// ==========================================================
// CREATE STORAGE
// ==========================================================

async function createStorage(
    options = {}
) {

    const dairyId =
        String(
            options.dairyId || ""
        ).trim();


    const name =
        String(
            options.name || ""
        ).trim();


    const type =
        String(
            options.type || ""
        ).trim();


    // ======================================================
    // GET PARENT FARM
    // ======================================================

    const {

        dairy,

        farmCode

    } =
        await getParentDairy(
            dairyId
        );


    // ======================================================
    // VALIDATE NAME
    // ======================================================

    if (!name) {

        const error =
            new Error(
                "Storage name is required."
            );

        error.status = 400;

        throw error;

    }


    if (
        name.length > 200
    ) {

        const error =
            new Error(
                "Storage name cannot exceed 200 characters."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // VALIDATE TYPE
    // ======================================================

    if (
        ![
            "room",
            "agroStore"
        ].includes(type)
    ) {

        const error =
            new Error(
                "Storage type must be either room or agroStore."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // CHECK NAME
    // ======================================================

    await ensureNameAvailable(
        farmCode,
        name
    );


    // ======================================================
    // GENERATE ROOM NUMBER
    // ======================================================

    let roomNumber;


    if (
        type === "room"
    ) {

        roomNumber =
            await getNextRoomNumber(
                farmCode
            );

    } else {

        roomNumber =
            await getNextAgroStoreNumber(
                farmCode
            );

    }


    // ======================================================
    // CREATE STORAGE DOCUMENT
    // ======================================================

    const storage =
        await DairyStorage.create({

            farmCode,

            name,

            type,

            roomNumber,

            status:
                "active"

        });


    // ======================================================
    // RETURN
    // ======================================================

    return {

        dairy,

        farmCode,

        roomNumber,

        storage

    };

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getParentDairy,

    getAddPageData,

    createStorage

};