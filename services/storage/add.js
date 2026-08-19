// ==========================================================
// services/storage/add.js
// ADD STORAGE SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Creates storage belonging to ONE parent Dairy Farm.
//
// ROUTES:
//
//     GET  /storage/:id/add
//     POST /storage/:id/add
//
// IMPORTANT:
//
//     :id = Dairy._id
//
// RELATION:
//
//     Dairy._id
//          ↓
//     Dairy.code
//          ↓
//     DairyStorage.farmCode
//
// USER PROVIDES:
//
//     name
//     type
//
// SERVER DETERMINES:
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
//
// dairyId MUST be:
//
//     Dairy._id
//
// It must NOT be:
//
//     Dairy.code
//
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
// INPUT:
//
//     dairyId = Dairy._id
//
// RETURNS:
//
//     dairy
//     farmCode
//
// The farmCode is obtained internally from:
//
//     dairy.code
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
    // FIND DAIRY BY _ID
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
    // RESOLVE FARM CODE
    // ======================================================
    //
    // IMPORTANT:
    //
    // This is NOT the route ID.
    //
    // It is only the value used by DairyStorage.
    //
    // ======================================================

    const farmCode =
        Number(
            dairy.code
        );


    // ======================================================
    // VERIFY FARM CODE
    // ======================================================

    if (
        !Number.isInteger(
            farmCode
        ) ||
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


    // ======================================================
    // RETURN
    // ======================================================

    return {

        dairy,

        farmCode

    };
}


// ==========================================================
// GET NEXT ROOM NUMBER
// ==========================================================
//
// ROOM NUMBERS ARE POSITIVE:
//
//     1
//     2
//     3
//     4
//
// The next number is determined from the highest existing
// active room.
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


    // ======================================================
    // EXTRACT VALID ROOM NUMBERS
    // ======================================================

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
// AGROSTORE NUMBERS ARE NEGATIVE:
//
//     -1
//     -2
//     -3
//     -4
//
// Because the numbers become more negative, we find the
// smallest existing number and subtract one.
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


    // ======================================================
    // EXTRACT VALID AGROSTORE NUMBERS
    // ======================================================

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
// Storage names must be unique within the same Dairy Farm.
//
// Comparison is case-insensitive.
//
// Therefore:
//
//     Main Store
//
// and:
//
//     main store
//
// cannot both exist as active storage facilities on the
// same farm.
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


    // ======================================================
    // DUPLICATE NAME
    // ======================================================

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
// GET ADD PAGE DATA
// ==========================================================
//
// Used by:
//
//     GET /storage/:id/add
//
// IMPORTANT:
//
//     dairyId = Dairy._id
//
// This function exists specifically so the controller can
// load the parent Dairy before rendering the form.
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
//
// INPUT:
//
//     {
//         dairyId,
//         name,
//         type
//     }
//
// dairyId:
//
//     Dairy._id
//
// name:
//
//     User supplied.
//
// type:
//
//     "room"
//     "agroStore"
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
    // GET INPUT
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
    // GET PARENT DAIRY
    // ======================================================
    //
    // This resolves:
    //
    //     Dairy._id
    //          ↓
    //     dairy.code
    //
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
    // CHECK NAME DUPLICATE
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
    // CREATE STORAGE DOCUMENT
    // ======================================================
//
// IMPORTANT:
//
// farmCode comes from:
//
//     dairy.code
//
// roomNumber is generated by the server.
//
// Neither is taken from req.body.
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
    // RETURN CREATED STORAGE
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