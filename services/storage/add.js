// ==========================================================
// services/storage/add.js
// STORAGE ADD / CREATE SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Creates a Room or AgroStore belonging to ONE Dairy Farm.
//
// STORAGE TYPES:
//
//     room
//         roomNumber: 1, 2, 3, ...
//
//     agroStore
//         roomNumber: -1, -2, -3, ...
//
// OWNERSHIP:
//
//     assetCode = farmCode
//
// Therefore:
//
//     Dairy Farm -1
//         Room 1
//             assetCode: -1
//
//         AgroStore -1
//             assetCode: -1
//
// The browser provides ONLY:
//
//     dairyId
//     name
//     type
//
// The server determines:
//
//     farmCode
//     assetCode
//     roomNumber
//     status
//
// ==========================================================


const DairyStorage =
    require("../../models/dairyStorage");


const {
    getParentDairy
} =
    require("./list");


// ==========================================================
// CONSTANTS
// ==========================================================

const STORAGE_TYPES = [

    "room",

    "agroStore"

];


// ==========================================================
// ESCAPE REGEXP
// ==========================================================
//
// Safely escapes a name before using it inside a regular
// expression.
//
// ==========================================================

function escapeRegExp(value) {

    return String(value)
        .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

}


// ==========================================================
// NORMALIZE STORAGE NAME
// ==========================================================

function normalizeName(name) {

    return String(name || "")
        .trim()
        .replace(/\s+/g, " ");

}


// ==========================================================
// VALIDATE FARM CODE
// ==========================================================
//
// A valid Dairy Farm code must be:
//
//     integer
//     negative
//
// ==========================================================

function validateFarmCode(farmCode) {

    const code =
        Number(farmCode);


    if (
        !Number.isInteger(code) ||
        code >= 0
    ) {

        const error =
            new Error(
                "Invalid Dairy Farm code."
            );

        error.status = 400;

        throw error;

    }


    return code;

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
// Normal Rooms:
//
//     1
//     2
//     3
//     ...
//
// The number is generated from active rooms belonging to
// this farm.
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
//     ...
//
// The number is generated independently for each farm.
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
// SERVER GENERATES:
//
//     farmCode
//     assetCode
//     roomNumber
//     status
//
// IMPORTANT:
//
//     assetCode === farmCode
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
        normalizeName(
            options.name
        );


    const type =
        String(
            options.type || ""
        ).trim();


    // ======================================================
    // VALIDATE DAIRY ID
    // ======================================================

    if (
        !dairyId
    ) {

        const error =
            new Error(
                "Dairy Farm ID is required."
            );

        error.status =
            400;

        throw error;

    }


    // ======================================================
    // RESOLVE PARENT DAIRY
    // ======================================================
    //
    // getParentDairy() is responsible for resolving the
    // actual Dairy Farm from dairyId.
    //
    // farmCode comes from the database.
    //
    // It is NEVER trusted from the browser.
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
    // VALIDATE FARM CODE
    // ======================================================

    const validFarmCode =
        validateFarmCode(
            farmCode
        );


    // ======================================================
    // ASSET CODE
    // ======================================================
    //
    // A storage facility belongs to its parent Dairy Farm.
    //
    // Therefore:
    //
    //     assetCode = farmCode
    //
    // Example:
    //
    //     farmCode = -7
    //
    //     assetCode = -7
    //
    // ======================================================

    const assetCode =
        validFarmCode;


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
        !STORAGE_TYPES.includes(
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
        validFarmCode,
        name
    );


    // ======================================================
    // GENERATE ROOM / AGROSTORE NUMBER
    // ======================================================

    let roomNumber;


    if (
        type === "room"
    ) {

        roomNumber =
            await getNextRoomNumber(
                validFarmCode
            );

    } else {

        roomNumber =
            await getNextAgroStoreNumber(
                validFarmCode
            );

    }


    // ======================================================
    // SAFETY CHECK
    // ======================================================
    //
    // The generated number must match the storage type.
    //
    // ======================================================

    if (
        type === "room" &&
        (
            !Number.isInteger(roomNumber) ||
            roomNumber <= 0
        )
    ) {

        const error =
            new Error(
                "Failed to generate a valid room number."
            );

        error.status =
            500;

        throw error;

    }


    if (
        type === "agroStore" &&
        (
            !Number.isInteger(roomNumber) ||
            roomNumber >= 0
        )
    ) {

        const error =
            new Error(
                "Failed to generate a valid AgroStore number."
            );

        error.status =
            500;

        throw error;

    }


    // ======================================================
    // CREATE STORAGE DOCUMENT
    // ======================================================
    //
    // IMPORTANT:
    //
    // farmCode and assetCode are generated by the server.
    //
    // Neither value comes from req.body.
    //
    // ======================================================

    const storage =
        await DairyStorage.create({

            // ----------------------------------------------
            // Parent Dairy Farm
            // ----------------------------------------------

            farmCode:
                validFarmCode,


            // ----------------------------------------------
            // Parent Farm Ownership
            // ----------------------------------------------
            //
            // This is the important relationship:
            //
            //     assetCode === farmCode
            //
            // ----------------------------------------------

            assetCode:
                assetCode,


            // ----------------------------------------------
            // Storage name
            // ----------------------------------------------

            name:
                name,


            // ----------------------------------------------
            // Storage type
            // ----------------------------------------------

            type:
                type,


            // ----------------------------------------------
            // Generated allocation number
            // ----------------------------------------------

            roomNumber:
                roomNumber,


            // ----------------------------------------------
            // New storage is active
            // ----------------------------------------------

            status:
                "active"

        });


    // ======================================================
    // RETURN
    // ======================================================

    return {

        dairy,

        farmCode:
            validFarmCode,

        assetCode,

        roomNumber,

        type,

        storage

    };

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    createStorage

};