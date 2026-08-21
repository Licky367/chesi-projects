// ==========================================================
// services/storage/list.js
// STORAGE LIST / READ SERVICE
// ==========================================================
//
// SINGLE SOURCE OF TRUTH:
//
//     models/dairy.js
//
// STORAGE ARCHITECTURE:
//
//     Dairy._id
//         ↓
//     parent Dairy Farm
//         ↓
//     Dairy.code
//         ↓
//     child structure.assetCode
//
// RECORD IDENTITY:
//
//     recordType === "structure"
//         = structure record
//
// STORAGE TYPE:
//
//     type === "room"
//         = normal storage room
//
//     type === "agroStore"
//         = AgroStore
//
// DWELLING:
//
//     dwellNumber >= 0
//         = normal room number
//
//     dwellNumber < 0
//         = AgroStore number
//
// IMPORTANT:
//
//     recordType and type are DIFFERENT fields.
//
//     recordType = "structure"
//         identifies the record category.
//
//     type = "room" / "agroStore"
//         identifies the structure/storage type.
//
// ==========================================================


const mongoose =
    require("mongoose");


const Dairy =
    require("../../models/dairy");


// ==========================================================
// CONSTANTS
// ==========================================================

const STRUCTURE_RECORD_TYPE =
    "structure";

const ROOM_TYPE =
    "room";

const AGROSTORE_TYPE =
    "agroStore";


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
// IMPORTANT:
//
// This normalizes the STORAGE `type`.
//
// It does NOT normalize `recordType`.
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
        value === ROOM_TYPE
    ) {

        return ROOM_TYPE;

    }


    if (
        value === AGROSTORE_TYPE
    ) {

        return AGROSTORE_TYPE;

    }


    return "all";

}


// ==========================================================
// VALIDATE DAIRY ID
// ==========================================================
//
// The route ID is always:
//
//     Dairy._id
//
// Example:
//
//     /storage/64f.../add
//
// The ID is NOT:
//
//     Dairy.code
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
// GET PARENT DAIRY FARM
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
// The returned `farmCode` is the parent's:
//
//     dairy.code
//
// It is then used to locate child structures through:
//
//     assetCode: farmCode
//
// ==========================================================

async function getParentDairy(
    dairyId
) {

    // ======================================================
    // VALIDATE MONGODB ID
    // ======================================================

    validateDairyId(
        dairyId
    );


    // ======================================================
    // FIND PARENT DAIRY
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
    // PARENT MUST BE A DAIRY FARM
    // ======================================================
    //
    // Dairy Farm identity:
    //
    //     code < 0
    //
    // ======================================================

    const farmCode =
        Number(
            dairy.code
        );


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
// STORAGE RECORD FILTER
// ==========================================================
//
// Every storage facility must:
//
//     recordType === "structure"
//
// The storage `type` is handled separately.
//
// ==========================================================

function getStructureFilter() {

    return {

        recordType:
            STRUCTURE_RECORD_TYPE

    };

}


// ==========================================================
// SORT STORAGE
// ==========================================================
//
// Storage is represented by:
//
//     dwellNumber
//
// Example:
//
//     AgroStores:
//         -3
//         -2
//         -1
//
//     Rooms:
//          0
//          1
//          2
//          3
//
// Numeric ascending order:
//
//     -3
//     -2
//     -1
//      0
//      1
//      2
//      3
//
// ==========================================================

function sortStorage(
    storage
) {

    return storage.sort(
        (
            a,
            b
        ) => {

            const aNumber =
                Number(
                    a.dwellNumber
                );

            const bNumber =
                Number(
                    b.dwellNumber
                );


            return (
                aNumber -
                bNumber
            );

        }
    );

}


// ==========================================================
// GET STORAGE
// ==========================================================
//
// INPUT:
//
//     {
//         dairyId,
//         type
//     }
//
// RETURNS:
//
//     {
//         dairy,
//         farmCode,
//         type,
//         storage
//     }
//
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
    // NORMALIZE STORAGE TYPE
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
    // recordType identifies this as a structure.
    //
    // type identifies which kind of storage.
    //
    // assetCode identifies the parent farm.
    //
    // ======================================================

    const query = {

        ...getStructureFilter(),

        assetCode:
            farmCode,

        status:
            "active"

    };


    // ======================================================
    // ROOM FILTER
    // ======================================================

    if (
        type === ROOM_TYPE
    ) {

        query.type =
            ROOM_TYPE;

    }


    // ======================================================
    // AGROSTORE FILTER
    // ======================================================

    if (
        type === AGROSTORE_TYPE
    ) {

        query.type =
            AGROSTORE_TYPE;

    }


    // ======================================================
    // FETCH FROM DAIRY MODEL
    // ======================================================

    const storage =
        await Dairy
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
//
// A room is:
//
//     recordType === "structure"
//     type === "room"
//     assetCode === farm.code
//     dwellNumber >= 0
//
// ==========================================================

async function getRooms(
    dairyId
) {

    return getStorage({

        dairyId,

        type:
            ROOM_TYPE

    });

}


// ==========================================================
// GET AGROSTORES
// ==========================================================
//
// An AgroStore is:
//
//     recordType === "structure"
//     type === "agroStore"
//     assetCode === farm.code
//     dwellNumber < 0
//
// ==========================================================

async function getAgroStores(
    dairyId
) {

    return getStorage({

        dairyId,

        type:
            AGROSTORE_TYPE

    });

}


// ==========================================================
// GET ONE STORAGE FACILITY
// ==========================================================
//
// INPUT:
//
//     dairyId
//     roomNumber
//
// IMPORTANT:
//
// `dairyId` identifies the parent Dairy Farm through
// MongoDB _id.
//
// `roomNumber` is actually the storage's `dwellNumber`.
//
// BOTH are required.
//
// This prevents a storage facility belonging to another
// Dairy Farm from being returned.
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
    // CONVERT STORAGE NUMBER
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
    // FIND STORAGE FACILITY
    // ======================================================
    //
    // IMPORTANT:
    //
    // recordType === "structure"
    //
    // type is NOT used here because this function is capable
    // of returning either:
    //
    //     room
    //
    // or:
    //
    //     agroStore
    //
    // The dwellNumber determines the actual storage number.
    //
    // ======================================================

    const storage =
        await Dairy
            .findOne({

                recordType:
                    STRUCTURE_RECORD_TYPE,

                assetCode:
                    farmCode,

                dwellNumber:
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

    getParentDairy,

    getStorage,

    getAllStorage,

    getRooms,

    getAgroStores,

    getStorageFacility

};