// ==========================================================
// services/storage/add.js
// STORAGE CREATION SERVICE
// ==========================================================
//
// HANDLES:
//
//     createStorage()
//
// SUPPORT FUNCTIONS:
//
//     escapeRegExp()
//     ensureNameAvailable()
//     getNextRoomNumber()
//     getNextAgroStoreNumber()
//
// IMPORTANT:
//
//     farmCode is NEVER accepted from req.body.
//
//     roomNumber is NEVER accepted from req.body.
//
//     Both are generated server-side.
//
// ==========================================================


const DairyStorage =
    require("../../models/dairyStorage");

const {
    getParentDairy
} =
    require("./list");


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
// SERVER:
//
//     resolves farmCode
//     generates roomNumber
//     sets active status
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

    createStorage

};