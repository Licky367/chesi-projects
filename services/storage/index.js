// ==========================================================
// services/storage/index.js
// STORAGE SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Handles storage belonging to ONE specific Dairy.
//
// Route:
//
//     /storage/:id
//
// Where:
//
//     :id = Dairy._id
//
// The Dairy's:
//
//     Dairy.code
//
// corresponds to:
//
//     DairyStorage.farmCode
//
// ==========================================================


const mongoose =
    require("mongoose");

const Dairy =
    require("../../models/dairy");

const DairyStorage =
    require("../../models/dairyStorage");


// ==========================================================
// NORMALIZE STORAGE TYPE
// ==========================================================
//
// Allowed:
//
//     all
//     room
//     agroStore
//
// Anything else becomes:
//
//     all
//
// ==========================================================

function normalizeType(
    type
) {

    const value =

        String(
            type || "all"
        )
        .trim();


    if (
        value === "room"
    ) {

        return "room";

    }


    if (
        value === "agroStore"
    ) {

        return "agroStore";

    }


    return "all";

}


// ==========================================================
// VALIDATE DAIRY ID
// ==========================================================

function isValidDairyId(
    id
) {

    return mongoose.Types.ObjectId.isValid(
        id
    );

}


// ==========================================================
// SORT STORAGE
// ==========================================================
//
// Storage belongs to ONE dairy, therefore farmCode is no
// longer needed as the primary sorting criterion.
//
// Sorting:
//
//     Normal Rooms:
//         0
//         1
//         2
//         3
//
//     AgroStores:
//         -1
//         -2
//         -3
//
// Since AgroStores use negative roomNumber values, numeric
// sorting naturally places them before normal rooms.
//
// Example:
//
//     -3
//     -2
//     -1
//      0
//      1
//      2
//
// ==========================================================

function sortStorage(
    storage
) {

    return storage.sort(

        (a, b) => {

            return (

                Number(a.roomNumber) -
                Number(b.roomNumber)

            );

        }

    );

}


// ==========================================================
// GET DAIRY
// ==========================================================
//
// Finds the Dairy using:
//
//     Dairy._id
//
// The Dairy code is then used to locate its storage.
//
// ==========================================================

async function getDairyById(
    id
) {

    if (
        !isValidDairyId(id)
    ) {

        const error =
            new Error(
                "Invalid dairy ID."
            );


        error.status =
            400;


        throw error;

    }


    const dairy =

        await Dairy
            .findById(id)
            .lean();


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
    // DAIRY CODE VALIDATION
    // ======================================================

    if (
        dairy.code === undefined ||
        dairy.code === null
    ) {

        const error =
            new Error(
                "The dairy does not have a valid farm code."
            );


        error.status =
            422;


        throw error;

    }


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
                "The dairy farm code must be a negative integer."
            );


        error.status =
            422;


        throw error;

    }


    return {

        dairy,

        farmCode

    };

}


// ==========================================================
// GET STORAGE
// ==========================================================
//
// Returns active storage belonging ONLY to the Dairy
// represented by :id.
//
// options:
//
//     {
//         id: dairy._id,
//         type: "all"
//     }
//
// or:
//
//     {
//         id: dairy._id,
//         type: "room"
//     }
//
// or:
//
//     {
//         id: dairy._id,
//         type: "agroStore"
//     }
//
// ==========================================================

async function getStorage(
    options = {}
) {

    const id =
        options.id;


    // ======================================================
    // FIND DAIRY
    // ======================================================

    const {

        dairy,

        farmCode

    } =

        await getDairyById(
            id
        );


    // ======================================================
    // NORMALIZE TYPE
    // ======================================================

    const type =
        normalizeType(
            options.type
        );


    // ======================================================
    // BASE QUERY
    // ======================================================
//
// IMPORTANT:
//
// We filter by:
//
//     farmCode
//
// obtained from:
//
//     Dairy.code
//
// This prevents storage belonging to other farms from
// appearing on this dairy's storage page.
//
// ======================================================

    const query = {

        farmCode,

        status:
            "active"

    };


    // ======================================================
    // TYPE FILTER
    // ======================================================

    if (
        type === "room"
    ) {

        query.type =
            "room";

    }


    if (
        type === "agroStore"
    ) {

        query.type =
            "agroStore";

    }


    // ======================================================
    // FETCH STORAGE
    // ======================================================

    const storage =

        await DairyStorage
            .find(query)
            .lean();


    // ======================================================
    // SORT
    // ======================================================

    sortStorage(
        storage
    );


    // ======================================================
    // RETURN
    // ======================================================

    return {

        dairy,

        farmCode,

        storage,

        type

    };

}


// ==========================================================
// GET ALL STORAGE FOR DAIRY
// ==========================================================

async function getAllStorage(
    id
) {

    return getStorage({

        id,

        type:
            "all"

    });

}


// ==========================================================
// GET ROOMS FOR DAIRY
// ==========================================================

async function getRooms(
    id
) {

    return getStorage({

        id,

        type:
            "room"

    });

}


// ==========================================================
// GET AGROSTORES FOR DAIRY
// ==========================================================

async function getAgroStores(
    id
) {

    return getStorage({

        id,

        type:
            "agroStore"

    });

}


// ==========================================================
// GET ONE STORAGE FACILITY
// ==========================================================
//
// Useful later for:
//
//     /storage/:id/room/:roomNumber
//
// or:
//
//     /storage/:id/agrostore/:storageNumber
//
// ==========================================================

async function getStorageFacility(
    id,
    roomNumber
) {

    const {

        dairy,

        farmCode

    } =

        await getDairyById(
            id
        );


    const number =
        Number(
            roomNumber
        );


    if (
        !Number.isInteger(number)
    ) {

        const error =
            new Error(
                "Storage number must be a whole number."
            );


        error.status =
            400;


        throw error;

    }


    const storage =

        await DairyStorage
            .findOne({

                farmCode,

                roomNumber:
                    number,

                status:
                    "active"

            })
            .lean();


    if (!storage) {

        const error =
            new Error(
                "Storage facility not found."
            );


        error.status =
            404;


        throw error;

    }


    return {

        dairy,

        farmCode,

        storage

    };

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getStorage,

    getAllStorage,

    getRooms,

    getAgroStores,

    getStorageFacility

};