// ==========================================================
// services/storage/add.js
// ADD STORAGE SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Creates a storage facility belonging to a specific
// Dairy Farm.
//
// ROUTE:
//
//     /storage/:id/add
//
// :id = Dairy._id
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
// SERVER GENERATED:
//
//     farmCode
//     roomNumber
//
// NUMBERING:
//
//     Room:
//
//         first  = 1
//         next   = 2
//         next   = 3
//         ...
//
//     AgroStore:
//
//         first  = -1
//         next   = -2
//         next   = -3
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


        error.status =
            400;


        throw error;

    }

}


// ==========================================================
// GET PARENT DAIRY
// ==========================================================
//
// dairyId is:
//
//     Dairy._id
//
// NOT:
//
//     Dairy.code
//
// ==========================================================

async function getParentDairy(
    dairyId
) {

    validateDairyId(
        dairyId
    );


    // ======================================================
    // FIND BY MONGODB _ID
    // ======================================================

    const dairy =
        await Dairy
            .findById(
                dairyId
            )
            .lean();


    // ======================================================
    // NOT FOUND
    // ======================================================

    if (!dairy) {

        const error =
            new Error(
                "Dairy farm not found."
            );


        error.status =
            404;


        throw error;

    }


    // ======================================================
    // VERIFY THIS IS A FARM
    // ======================================================
    //
    // dairy.js defines:
    //
    //     code < 0 = Dairy Farm
    //
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


        error.status =
            422;


        throw error;

    }


    return dairy;

}


// ==========================================================
// GET NEXT ROOM NUMBER
// ==========================================================
//
// ROOM NUMBERING:
//
//     first room = 1
//
//     existing:
//
//         1
//         2
//         3
//
//     next:
//
//         4
//
// ==========================================================

async function getNextRoomNumber(
    farmCode
) {

    const lastRoom =
        await DairyStorage
            .findOne({

                farmCode,

                type:
                    "room",

                status:
                    "active"

            })
            .sort({

                roomNumber:
                    -1

            })
            .select(
                "roomNumber"
            )
            .lean();


    // ======================================================
    // NO ROOM YET
    // ======================================================

    if (
        !lastRoom
    ) {

        return 1;

    }


    const currentNumber =
        Number(
            lastRoom.roomNumber
        );


    // ======================================================
    // SAFETY
    // ======================================================

    if (
        !Number.isInteger(
            currentNumber
        ) ||
        currentNumber < 1
    ) {

        return 1;

    }


    return (
        currentNumber + 1
    );

}


// ==========================================================
// GET NEXT AGROSTORE NUMBER
// ==========================================================
//
// AGROSTORE NUMBERING:
//
//     first = -1
//
//     existing:
//
//         -1
//         -2
//         -3
//
//     next:
//
//         -4
//
// ==========================================================

async function getNextAgroStoreNumber(
    farmCode
) {

    const lastAgroStore =
        await DairyStorage
            .findOne({

                farmCode,

                type:
                    "agroStore",

                status:
                    "active"

            })
            .sort({

                roomNumber:
                    1

            })
            .select(
                "roomNumber"
            )
            .lean();


    // ======================================================
    // NO AGROSTORE YET
    // ======================================================

    if (
        !lastAgroStore
    ) {

        return -1;

    }


    const currentNumber =
        Number(
            lastAgroStore.roomNumber
        );


    // ======================================================
    // SAFETY
    // ======================================================

    if (
        !Number.isInteger(
            currentNumber
        ) ||
        currentNumber >= 0
    ) {

        return -1;

    }


    return (
        currentNumber - 1
    );

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
// CHECK NAME
// ==========================================================
//
// A storage name must be unique within the parent farm.
//
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


        error.status =
            409;


        throw error;

    }

}


// ==========================================================
// CREATE STORAGE
// ==========================================================

async function createStorage(
    options = {}
) {

    const dairyId =
        options.dairyId;


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

    const dairy =
        await getParentDairy(
            dairyId
        );


    // ======================================================
    // GET FARM CODE FROM PARENT FARM
    // ======================================================
    //
    // THIS IS THE IMPORTANT PART.
    //
    // The URL contains:
    //
    //     Dairy._id
    //
    // We find the Dairy and obtain:
    //
    //     dairy.code
    //
    // That becomes:
    //
    //     DairyStorage.farmCode
    //
    // ======================================================

    const farmCode =
        Number(
            dairy.code
        );


    // ======================================================
    // VALIDATE NAME
    // ======================================================

    if (!name) {

        const error =
            new Error(
                "Storage name is required."
            );


        error.status =
            400;


        throw error;

    }


    if (
        name.length > 200
    ) {

        const error =
            new Error(
                "Storage name cannot exceed 200 characters."
            );


        error.status =
            400;


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


        error.status =
            400;


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

        // ----------------------------------------------
        // First room:
        //
        //     1
        //
        // Then:
        //
        //     2
        //     3
        //     4
        // ----------------------------------------------

        roomNumber =
            await getNextRoomNumber(
                farmCode
            );

    } else {

        // ----------------------------------------------
        // First AgroStore:
        //
        //     -1
        //
        // Then:
        //
        //     -2
        //     -3
        //     -4
        // ----------------------------------------------

        roomNumber =
            await getNextAgroStoreNumber(
                farmCode
            );

    }


    // ======================================================
    // CREATE DOCUMENT
    // ======================================================

    const storage =
        await DairyStorage.create({

            // ----------------------------------------------
            // AUTOMATICALLY OBTAINED FROM Dairy.code
            // ----------------------------------------------

            farmCode,


            // ----------------------------------------------
            // USER INPUT
            // ----------------------------------------------

            name,


            // ----------------------------------------------
            // USER SELECTED
            // ----------------------------------------------

            type,


            // ----------------------------------------------
            // SERVER GENERATED
            // ----------------------------------------------

            roomNumber,


            // ----------------------------------------------
            // NEW STORAGE IS ACTIVE
            // ----------------------------------------------

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

    createStorage

};