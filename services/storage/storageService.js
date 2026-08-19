// ==========================================================
// services/storage/storageService.js
// STORAGE SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Handles storage facilities belonging to ONE parent
// Dairy Farm.
//
// ROUTES:
//
//     /storage/:id
//
// IMPORTANT ID CONTRACT:
//
//     :id = Dairy._id
//
// NEVER:
//
//     :id = Dairy.code
//     :id = DairyStorage._id
//     :id = roomNumber
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
    //
    // Your Dairy model convention:
    //
    //     negative code = Dairy Farm
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
// Numeric ascending order:
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
    //
    // IMPORTANT:
    //
    // The controller expects an object.
    //
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
// INPUT:
//
//     dairyId
//     roomNumber
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
// ENSURE STORAGE NAME IS AVAILABLE
// ==========================================================
//
// Names are unique within ONE Dairy Farm.
//
// Case insensitive:
//
//     Main Feed Store
//
// and:
//
//     main feed store
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
// GET NEXT ROOM NUMBER
// ==========================================================
//
// Rooms:
//
//     1
//     2
//     3
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
// AgroStores:
//
//     -1
//     -2
//     -3
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
// USER PROVIDES:
//
//     dairyId
//     name
//     type
//
// SERVER PROVIDES:
//
//     farmCode
//     roomNumber
//     status
//
// ==========================================================

async function createStorage(
    options = {}
) {

    // ======================================================
    // READ INPUT
    // ======================================================

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
    // RESOLVE PARENT DAIRY
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
    // NAME LENGTH
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
    // GENERATE NUMBER
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
    // Notice:
    //
    // farmCode is NEVER accepted from req.body.
    //
    // roomNumber is NEVER accepted from req.body.
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
// EXPORT
// ==========================================================

module.exports = {

    normalizeType,

    getParentDairy,

    getStorage,

    getAllStorage,

    getRooms,

    getAgroStores,

    getStorageFacility,

    createStorage

};