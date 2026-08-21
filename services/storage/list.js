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
//     Parent Dairy Farm
//         |
//         |-- Dairy._id
//         |
//         |-- Dairy.code
//                 |
//                 v
//          child structure.assetCode
//
// RECORD IDENTITY:
//
//     recordType === "structure"
//         = structure/storage record
//
// STORAGE TYPE:
//
//     type === "room"
//         = normal storage room
//
//     type === "agroStore"
//         = AgroStore
//
// STORAGE IDENTITY:
//
//     item._id
//         = unique identity of the storage facility
//
// IMPORTANT:
//
//     roomNumber and dwellNumber are DIFFERENT fields.
//
//     roomNumber
//         = storage/room number
//
//     dwellNumber
//         = separate structural/dwelling value
//
//     NEVER use dwellNumber as the storage ID.
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

const ALL_STORAGE_TYPE =
    "all";


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
// IMPORTANT:
//
// This function normalizes the storage FILTER.
//
// It does not change:
//
//     recordType
//     item.type
//
// ==========================================================

function normalizeType(
    type
) {

    const value =
        String(
            type || ALL_STORAGE_TYPE
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


    return ALL_STORAGE_TYPE;

}


// ==========================================================
// VALIDATE DAIRY ID
// ==========================================================
//
// The parent dairy is identified by:
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
// VALIDATE STORAGE ID
// ==========================================================
//
// A storage facility is identified by:
//
//     Dairy._id
//
// NOT:
//
//     roomNumber
//     dwellNumber
//     assetCode
//
// ==========================================================

function validateStorageId(
    storageId
) {

    if (
        !storageId
    ) {

        const error =
            new Error(
                "Storage ID is required."
            );

        error.status =
            400;

        throw error;

    }


    if (
        !mongoose.Types.ObjectId.isValid(
            storageId
        )
    ) {

        const error =
            new Error(
                "Invalid storage ID."
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
//     dairyId
//
// RETURNS:
//
//     {
//         dairy,
//         farmCode
//     }
//
// The parent farm's:
//
//     dairy.code
//
// is used to locate its child structure records through:
//
//     assetCode
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
    // GET FARM CODE
    // ======================================================

    const farmCode =
        Number(
            dairy.code
        );


    // ======================================================
    // VALIDATE PARENT FARM
    // ======================================================
    //
    // Parent Dairy Farm:
    //
    //     code < 0
    //
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
// STORAGE RECORD FILTER
// ==========================================================
//
// Every storage facility must be:
//
//     recordType === "structure"
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
// IMPORTANT:
//
// Storage identity is NOT determined by this sort.
//
// Every storage facility is identified by:
//
//     item._id
//
// The sort is only for presentation.
//
// Prefer roomNumber when available.
//
// Fall back to dwellNumber only for legacy records that
// do not contain roomNumber.
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

            const aRoomNumber =
                Number(
                    a.roomNumber
                );

            const bRoomNumber =
                Number(
                    b.roomNumber
                );


            const aHasRoomNumber =
                Number.isFinite(
                    aRoomNumber
                );

            const bHasRoomNumber =
                Number.isFinite(
                    bRoomNumber
                );


            // ==================================================
            // BOTH HAVE ROOM NUMBERS
            // ==================================================

            if (
                aHasRoomNumber &&
                bHasRoomNumber
            ) {

                return (
                    aRoomNumber -
                    bRoomNumber
                );

            }


            // ==================================================
            // ONLY A HAS ROOM NUMBER
            // ==================================================

            if (
                aHasRoomNumber
            ) {

                return -1;

            }


            // ==================================================
            // ONLY B HAS ROOM NUMBER
            // ==================================================

            if (
                bHasRoomNumber
            ) {

                return 1;

            }


            // ==================================================
            // LEGACY FALLBACK
            // ==================================================

            const aDwellNumber =
                Number(
                    a.dwellNumber
                );

            const bDwellNumber =
                Number(
                    b.dwellNumber
                );


            if (
                Number.isFinite(
                    aDwellNumber
                ) &&
                Number.isFinite(
                    bDwellNumber
                )
            ) {

                return (
                    aDwellNumber -
                    bDwellNumber
                );

            }


            return 0;

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
    // GET PARENT DAIRY
    // ======================================================

    const {

        dairy,

        farmCode

    } =
        await getParentDairy(
            dairyId
        );


    // ======================================================
    // NORMALIZE FILTER TYPE
    // ======================================================

    const type =
        normalizeType(
            options.type
        );


    // ======================================================
    // BASE STORAGE QUERY
    // ======================================================
    //
    // Parent relationship:
    //
    //     child.assetCode === parent.code
    //
    // Storage identity:
    //
    //     recordType === "structure"
    //
    // Only active storage is listed.
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
    // FILTER BY ROOM
    // ======================================================

    if (
        type === ROOM_TYPE
    ) {

        query.type =
            ROOM_TYPE;

    }


    // ======================================================
    // FILTER BY AGROSTORE
    // ======================================================

    if (
        type === AGROSTORE_TYPE
    ) {

        query.type =
            AGROSTORE_TYPE;

    }


    // ======================================================
    // FETCH STORAGE
    // ======================================================

    const storage =
        await Dairy
            .find(
                query
            )
            .lean();


    // ======================================================
    // SORT FOR DISPLAY
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
            ALL_STORAGE_TYPE

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
//     assetCode === parent farm code
//     status === "active"
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
//     assetCode === parent farm code
//     status === "active"
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
//     storageId
//
// IMPORTANT:
//
// `dairyId` identifies the PARENT Dairy Farm.
//
// `storageId` identifies the SPECIFIC STORAGE FACILITY:
//
//     item._id
//
// DO NOT use:
//
//     roomNumber
//     dwellNumber
//     assetCode
//
// to identify the storage.
//
//
//
// SECURITY / OWNERSHIP:
//
// The storage must satisfy ALL of:
//
//     _id === storageId
//
//     recordType === "structure"
//
//     assetCode === parent dairy.code
//
//     status === "active"
//
// This prevents a storage belonging to another dairy farm
// from being accessed simply by knowing its MongoDB ID.
//
// ==========================================================

async function getStorageFacility(
    dairyId,
    storageId
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
    // VALIDATE STORAGE ID
    // ======================================================

    validateStorageId(
        storageId
    );


    // ======================================================
    // FIND STORAGE BY ITS MONGODB _id
    // ======================================================
    //
    // THIS IS THE IMPORTANT CORRECTION.
    //
    // The storage facility is identified by:
    //
    //     _id
    //
    // roomNumber and dwellNumber are NOT identifiers.
    //
    // ======================================================

    const storage =
        await Dairy
            .findOne({

                _id:
                    storageId,

                recordType:
                    STRUCTURE_RECORD_TYPE,

                assetCode:
                    farmCode,

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
    // VALIDATE STORAGE TYPE
    // ======================================================
    //
    // The facility may be either:
    //
    //     room
    //
    // or:
    //
    //     agroStore
    //
    // Do not infer the type from roomNumber or dwellNumber.
    //
    // ======================================================

    if (
        storage.type !== ROOM_TYPE &&
        storage.type !== AGROSTORE_TYPE
    ) {

        const error =
            new Error(
                "Invalid storage type."
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