// ==========================================================
// services/storage/storageService.js
// STORAGE SERVICE
// ==========================================================
//
// HANDLES:
//
//     Storage listing
//     Storage creation
//     Parent Dairy resolution
//     Storage numbering
//     Storage filtering
//     Storage facility lookup
//
// IMPORTANT ID CONTRACT
// ----------------------------------------------------------
//
//     dairyId = Dairy._id
//
// NEVER:
//
//     dairyId = Dairy.code
//     dairyId = DairyStorage._id
//     dairyId = roomNumber
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
// dairyId MUST be:
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
//     dairyId = Dairy._id
//
// RETURNS:
//
//     {
//         dairy,
//         farmCode
//     }
//
// RESOLUTION:
//
//     Dairy._id
//          ↓
//     Dairy.code
//          ↓
//     farmCode
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
    // VERIFY PARENT FARM
    // ======================================================
    //
    // Dairy Farm codes are negative.
    //
    //     code < 0 = Dairy Farm
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
// ALIAS
// ==========================================================
//
// The controller can use getDairyById() if needed.
//
// Both names resolve to the SAME function.
//
// ==========================================================

const getDairyById =
    getParentDairy;


// ==========================================================
// SORT STORAGE
// ==========================================================
//
// Numeric sorting:
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
// dairyId:
//
//     Dairy._id
//
// type:
//
//     all
//     room
//     agroStore
//
// RETURNS:
//
//     storage array
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
    // RESOLVE PARENT FARM
    // ======================================================

    const {

        farmCode

    } =
        await getParentDairy(
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
    // RETURN ARRAY
    // ======================================================

    return storage;
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
// GET NEXT ROOM NUMBER
// ==========================================================
//
// ROOM:
//
//     1
//     2
//     3
//     ...
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
                room =>
                    Number(
                        room.roomNumber
                    )
            )
            .filter(
                number =>
                    Number.isInteger(
                        number
                    ) &&
                    number > 0
            );


    // ======================================================
    // FIRST ROOM
    // ======================================================

    if (
        numbers.length === 0
    ) {

        return 1;
    }


    // ======================================================
    // NEXT ROOM
    // ======================================================

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
// AGROSTORE:
//
//     -1
//     -2
//     -3
//     ...
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
                store =>
                    Number(
                        store.roomNumber
                    )
            )
            .filter(
                number =>
                    Number.isInteger(
                        number
                    ) &&
                    number < 0
            );


    // ======================================================
    // FIRST AGROSTORE
    // ======================================================

    if (
        numbers.length === 0
    ) {

        return -1;
    }


    // ======================================================
    // NEXT AGROSTORE
    // ======================================================

    return (
        Math.min(
            ...numbers
        ) - 1
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
// CHECK STORAGE NAME
// ==========================================================
//
// Names are unique per farm.
//
// Case insensitive:
//
//     Main Store
//
// and:
//
//     main store
//
// are considered the same.
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


    if (
        existing
    ) {

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
//
// INPUT:
//
//     {
//         dairyId,
//         name,
//         type
//     }
//
// SERVER GENERATES:
//
//     farmCode
//     roomNumber
//
// ==========================================================

async function createStorage(
    options = {}
) {

    // ======================================================
    // INPUT
    // ======================================================

    const dairyId =
        String(
            options.dairyId || ""
        )
        .trim();


    const name =
        String(
            options.name || ""
        )
        .trim();


    const type =
        String(
            options.type || ""
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
    // VALIDATE NAME
    // ======================================================

    if (
        !name
    ) {

        const error =
            new Error(
                "Storage name is required."
            );

        error.status =
            400;

        throw error;
    }


    // ======================================================
    // VALIDATE NAME LENGTH
    // ======================================================

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
        ].includes(
            type
        )
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
    // CHECK DUPLICATE NAME
    // ======================================================

    await ensureNameAvailable(
        farmCode,
        name
    );


    // ======================================================
    // GENERATE STORAGE NUMBER
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
    // CREATE DOCUMENT
    // ======================================================
    //
    // IMPORTANT:
    //
    // farmCode is NEVER accepted from req.body.
    //
    // It comes from:
    //
    //     Dairy.code
    //
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
// GET ADD PAGE DATA
// ==========================================================
//
// Used by the add form.
//
// ==========================================================

async function getAddPageData(
    dairyId
) {

    return getParentDairy(
        dairyId
    );
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
// Both are required to identify the facility.
//
// ==========================================================

async function getStorageFacility(
    dairyId,
    roomNumber
) {

    // ======================================================
    // RESOLVE FARM
    // ======================================================

    const {

        dairy,

        farmCode

    } =
        await getParentDairy(
            dairyId
        );


    // ======================================================
    // NORMALIZE NUMBER
    // ======================================================

    const number =
        Number(
            roomNumber
        );


    // ======================================================
    // VALIDATE NUMBER
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
    // FIND FACILITY
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
// EXPORTS
// ==========================================================
//
// IMPORTANT:
//
// The merged controller expects:
//
//     getStorage()
//     getParentDairy()
//     createStorage()
//
// The additional exports are retained for future storage
// routes so the service remains modular.
//
// ==========================================================

module.exports = {

    // ------------------------------------------------------
    // Parent Dairy
    // ------------------------------------------------------

    getParentDairy,

    getDairyById,


    // ------------------------------------------------------
    // Storage listing
    // ------------------------------------------------------

    getStorage,

    getAllStorage,

    getRooms,

    getAgroStores,


    // ------------------------------------------------------
    // Storage creation
    // ------------------------------------------------------

    getAddPageData,

    createStorage,


    // ------------------------------------------------------
    // Individual facility
    // ------------------------------------------------------

    getStorageFacility,


    // ------------------------------------------------------
    // Utilities
    // ------------------------------------------------------

    normalizeType,

    validateDairyId,

    getNextRoomNumber,

    getNextAgroStoreNumber

};