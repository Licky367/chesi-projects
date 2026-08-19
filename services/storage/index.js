// ==========================================================
// services/storage/index.js
// STORAGE SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Handles storage belonging to ONE specific Dairy Farm.
//
// Route:
//
//     /storage/:id
//
// IMPORTANT ID CONTRACT
// ----------------------------------------------------------
//
//     :id = Dairy._id
//
// NOT:
//
//     :id = farmCode
//
// NOT:
//
//     :id = DairyStorage._id
//
// The relationship is:
//
//     /storage/:id
//            |
//            | id = Dairy._id
//            ↓
//        Dairy document
//            |
//            | dairy.code
//            ↓
//     DairyStorage.farmCode
//
// Example:
//
//     Dairy:
//
//         _id  = 68abc123...
//         code = -1
//
//     DairyStorage:
//
//         farmCode = -1
//
// Therefore:
//
//     /storage/68abc123...
//
// loads storage where:
//
//     DairyStorage.farmCode === -1
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
//
// This ID MUST be a MongoDB Dairy._id.
//
// ==========================================================

function isValidDairyId(
    id
) {

    return mongoose.Types.ObjectId.isValid(
        id
    );

}


// ==========================================================
// GET PARENT DAIRY FARM
// ==========================================================
//
// Receives:
//
//     Dairy._id
//
// Returns:
//
//     {
//         dairy,
//         farmCode
//     }
//
// Where:
//
//     dairy   = parent Dairy Farm document
//     farmCode = dairy.code
//
// ==========================================================

async function getDairyById(
    dairyId
) {

    // ======================================================
    // REQUIRE ID
    // ======================================================

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


    // ======================================================
    // VALIDATE OBJECT ID
    // ======================================================

    if (
        !isValidDairyId(
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


    // ======================================================
    // FIND DAIRY USING _id
    // ======================================================
    //
    // IMPORTANT:
    //
    // This is where the URL ID is resolved.
    //
    //     /storage/:id
    //
    //     :id
    //       ↓
    //     Dairy._id
    //
    // ======================================================

    const dairy =

        await Dairy
            .findById(
                dairyId
            )
            .lean();


    // ======================================================
    // DAIRY NOT FOUND
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
    // VERIFY PARENT IS A DAIRY FARM
    // ======================================================
    //
    // According to models/dairy.js:
    //
    //     code < 0
    //         = Dairy Farm
    //
    //     code > 0
    //         = Animal
    //
    //     code === null
    //         = Structure / Asset
    //
    // Storage belongs to a Dairy Farm.
    //
    // ======================================================

    if (
        dairy.code === null ||
        dairy.code === undefined
    ) {

        const error =
            new Error(
                "The supplied Dairy does not have a farm code."
            );


        error.status =
            422;


        throw error;

    }


    // ======================================================
    // CONVERT FARM CODE TO NUMBER
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
                "The supplied Dairy is not a valid parent Dairy Farm."
            );


        error.status =
            422;


        throw error;

    }


    // ======================================================
    // RETURN PARENT FARM + CODE
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
// Storage belongs to ONE parent farm.
//
// Sorting is by roomNumber.
//
// Normal rooms:
//
//     0
//     1
//     2
//     3
//
// AgroStores:
//
//     -1
//     -2
//     -3
//
// Numeric sorting gives:
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

                Number(
                    a.roomNumber
                ) -

                Number(
                    b.roomNumber
                )

            );

        }

    );

}


// ==========================================================
// GET STORAGE FOR ONE DAIRY FARM
// ==========================================================
//
// Receives:
//
//     {
//         dairyId,
//         type
//     }
//
// Where:
//
//     dairyId = Dairy._id
//
// The service resolves:
//
//     Dairy._id
//          ↓
//     Dairy.code
//          ↓
//     DairyStorage.farmCode
//
// Returns ONLY storage belonging to that farm.
//
// ==========================================================

async function getStorage(
    options = {}
) {

    // ======================================================
    // READ DAIRY ID
    // ======================================================

    const dairyId =
        String(
            options.dairyId ||
            options.id ||
            ""
        )
        .trim();


    // ======================================================
    // RESOLVE PARENT FARM
    // ======================================================

    const {

        dairy,

        farmCode

    } =

        await getDairyById(
            dairyId
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
    // THIS IS THE CRITICAL QUERY.
    //
    // Storage is identified by:
    //
    //     farmCode = dairy.code
    //
    // Therefore storage from another farm can NEVER
    // appear here.
    //
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
    // RETURN STORAGE ARRAY
    // ======================================================
    //
    // The controller expects:
    //
    //     const storage =
    //         await storageService.getStorage(...);
    //
    // Therefore this function returns the array itself.
    //
    // ======================================================

    return storage;

}


// ==========================================================
// GET ALL STORAGE FOR DAIRY FARM
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
// GET ROOMS FOR DAIRY FARM
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
// GET AGROSTORES FOR DAIRY FARM
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
// Receives:
//
//     dairyId
//     roomNumber
//
// Where:
//
//     dairyId = parent Dairy Farm._id
//
// Then:
//
//     Dairy._id
//          ↓
//     Dairy.code
//          ↓
//     DairyStorage.farmCode
//
// ==========================================================

async function getStorageFacility(
    dairyId,
    roomNumber
) {

    // ======================================================
    // RESOLVE PARENT FARM
    // ======================================================

    const {

        dairy,

        farmCode

    } =

        await getDairyById(
            dairyId
        );


    // ======================================================
    // NORMALIZE STORAGE NUMBER
    // ======================================================

    const number =
        Number(
            roomNumber
        );


    // ======================================================
    // VALIDATE STORAGE NUMBER
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
    //
    // BOTH IDENTIFIERS ARE REQUIRED:
    //
    //     farmCode
    //
    // and
    //
    //     roomNumber
    //
    // This guarantees that the facility belongs to the
    // requested parent Dairy Farm.
    //
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
    // STORAGE NOT FOUND
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

    getStorage,

    getAllStorage,

    getRooms,

    getAgroStores,

    getStorageFacility

};