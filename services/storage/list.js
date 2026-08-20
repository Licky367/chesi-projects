// ==========================================================
// services/storage/list.js
// STORAGE LIST SERVICE
// ==========================================================
//
// HANDLES:
//
//     normalizeType()
//     validateDairyId()
//     getParentDairy()
//     sortStorage()
//     getStorage()
//     getAllStorage()
//     getRooms()
//     getAgroStores()
//     getStorageFacility()
//
// IMPORTANT ID CONTRACT:
//
//     dairyId = Dairy._id
//
// RELATION:
//
//     Dairy._id
//          ↓
//     Dairy.code
//          ↓
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
// Invalid values become:
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
//
// The route ID must always be:
//
//     Dairy._id
//
// ==========================================================

function validateDairyId(
    dairyId
) {

    if (
        !dairyId
    ) {

        const error =
            new Error(
                "Dairy ID is required."
            );

        error.status =
            400;

        throw error;
    }


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
// INPUT:
//
//     Dairy._id
//
// RETURNS:
//
//     {
//         dairy,
//         farmCode
//     }
//
// ==========================================================

async function getParentDairy(
    dairyId
) {

    // ======================================================
    // VALIDATE ID
    // ======================================================

    validateDairyId(
        dairyId
    );


    // ======================================================
    // FIND DAIRY
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

    if (
        !dairy
    ) {

        const error =
            new Error(
                "Dairy farm not found."
            );

        error.status =
            404;

        throw error;
    }


    // ======================================================
    // DAIRY MUST HAVE CODE
    // ======================================================

    if (
        dairy.code === null ||
        dairy.code === undefined
    ) {

        const error =
            new Error(
                "The selected Dairy does not have a farm code."
            );

        error.status =
            422;

        throw error;
    }


    // ======================================================
    // CONVERT CODE TO NUMBER
    // ======================================================

    const farmCode =
        Number(
            dairy.code
        );


    // ======================================================
    // FARM CODE MUST BE NEGATIVE INTEGER
    // ======================================================

    if (
        !Number.isInteger(
            farmCode
        ) ||
        farmCode >= 0
    ) {

        const error =
            new Error(
                "The selected Dairy is not a valid parent Dairy Farm."
            );

        error.status =
            422;

        throw error;
    }


    // ======================================================
    // RETURN
    // ======================================================

    return {

        dairy,

        farmCode

    };
}


// ==========================================================
// SORT STORAGE
// ==========================================================
//
// AgroStores:
//
//     -1
//     -2
//     -3
//
// Rooms:
//
//      1
//      2
//      3
//
// Numeric ascending:
//
//     -3
//     -2
//     -1
//      1
//      2
//      3
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
// GET STORAGE
// ==========================================================

async function getStorage(
    options = {}
) {

    // ======================================================
    // GET DAIRY ID
    // ======================================================

    const dairyId =
        String(
            options.dairyId ||
            options.id ||
            ""
        )
        .trim();


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
    // NORMALIZE FILTER
    // ======================================================

    const type =
        normalizeType(
            options.type
        );


    // ======================================================
    // BASE QUERY
    // ======================================================

    const query = {

        farmCode,

        status:
            "active"

    };


    // ======================================================
    // ROOM FILTER
    // ======================================================

    if (
        type === "room"
    ) {

        query.type =
            "room";
    }


    // ======================================================
    // AGROSTORE FILTER
    // ======================================================

    if (
        type === "agroStore"
    ) {

        query.type =
            "agroStore";
    }


    // ======================================================
    // FETCH
    // ======================================================

    const storage =
        await DairyStorage
            .find(
                query
            )
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

        type,

        storage

    };
}


// ==========================================================
// GET ALL STORAGE
// ==========================================================

async function getAllStorage(
    dairyId
) {

    return getStorage({

        dairyId,

        type:
            "all"

    });
}


// ==========================================================
// GET ROOMS
// ==========================================================

async function getRooms(
    dairyId
) {

    return getStorage({

        dairyId,

        type:
            "room"

    });
}


// ==========================================================
// GET AGROSTORES
// ==========================================================

async function getAgroStores(
    dairyId
) {

    return getStorage({

        dairyId,

        type:
            "agroStore"

    });
}


// ==========================================================
// GET ONE STORAGE FACILITY
// ==========================================================
//
// Both:
//
//     dairyId
//     roomNumber
//
// are required.
//
// ==========================================================

async function getStorageFacility(
    dairyId,
    roomNumber
) {

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
    // CONVERT NUMBER
    // ======================================================

    const number =
        Number(
            roomNumber
        );


    // ======================================================
    // VALIDATE
    // ======================================================

    if (
        !Number.isInteger(
            number
        )
    ) {

        const error =
            new Error(
                "Storage number must be a whole number."
            );

        error.status =
            400;

        throw error;
    }


    // ======================================================
    // FIND STORAGE
    // ======================================================

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


    // ======================================================
    // NOT FOUND
    // ======================================================

    if (
        !storage
    ) {

        const error =
            new Error(
                "Storage facility not found."
            );

        error.status =
            404;

        throw error;
    }


    // ======================================================
    // RETURN
    // ======================================================

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

    normalizeType,

    validateDairyId,

    getParentDairy,

    sortStorage,

    getStorage,

    getAllStorage,

    getRooms,

    getAgroStores,

    getStorageFacility

};