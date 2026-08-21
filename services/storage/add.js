// ==========================================================
// services/storage/add.js
// STORAGE ADD / CREATE SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Creates a storage facility using:
//
//     models/dairy.js
//
// STORAGE RECORD:
//
//     recordType === "structure"
//
// STORAGE TYPES:
//
//     type === "room"
//         -> positive roomNumber
//         -> 1, 2, 3, 4, ...
//
//     type === "agroStore"
//         -> negative roomNumber
//         -> -1, -2, -3, -4, ...
//
// PARENT:
//
//     /storage/:id/add
//
//     :id = parent Dairy Farm MongoDB _id
//
// OWNERSHIP:
//
//     storage.assetCode = parent Dairy.code
//
// IMPORTANT:
//
//     The client DOES NOT determine:
//
//         recordType
//         assetCode
//         roomNumber
//
//     The server determines all three.
//
// ==========================================================


const mongoose = require("mongoose");

const Dairy = require("../../models/dairy");


// ==========================================================
// CONSTANTS
// ==========================================================

const STORAGE_RECORD_TYPE = "structure";

const ROOM_TYPE = "room";

const AGROSTORE_TYPE = "agroStore";

const STORAGE_TYPES = [
    ROOM_TYPE,
    AGROSTORE_TYPE
];


// ==========================================================
// ERROR HELPER
// ==========================================================

function createError(
    message,
    statusCode = 400
) {

    const error = new Error(message);

    error.status = statusCode;

    return error;

}


// ==========================================================
// NORMALIZE NAME
// ==========================================================

function normalizeName(name) {

    return String(name || "")
        .trim()
        .replace(/\s+/g, " ");

}


// ==========================================================
// VALIDATE DAIRY ID
// ==========================================================

function validateDairyId(dairyId) {

    const id = String(
        dairyId || ""
    ).trim();


    if (!id) {

        throw createError(
            "Dairy Farm ID is required.",
            400
        );

    }


    if (
        !mongoose.Types.ObjectId.isValid(id)
    ) {

        throw createError(
            "Invalid Dairy Farm ID.",
            400
        );

    }


    return id;

}


// ==========================================================
// GET PARENT DAIRY FARM
// ==========================================================
//
// The parent is identified by MongoDB _id.
//
// A valid Dairy Farm must have:
//
//     code < 0
//
// ==========================================================

async function getParentDairy(
    dairyId
) {

    const dairy = await Dairy
        .findById(dairyId)
        .lean();


    if (!dairy) {

        throw createError(
            "Parent Dairy Farm was not found.",
            404
        );

    }


    const farmCode = Number(
        dairy.code
    );


    if (
        !Number.isInteger(farmCode) ||
        farmCode >= 0
    ) {

        throw createError(
            "The selected Dairy is not a valid Dairy Farm.",
            400
        );

    }


    return {
        dairy,
        farmCode
    };

}


// ==========================================================
// ESCAPE REGULAR EXPRESSION
// ==========================================================

function escapeRegExp(value) {

    return String(value)
        .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

}


// ==========================================================
// CHECK STORAGE NAME
// ==========================================================
//
// Storage names must be unique within the parent farm.
//
// Ownership:
//
//     assetCode === parent Dairy.code
//
// ==========================================================

async function ensureNameAvailable(
    assetCode,
    name
) {

    const existing = await Dairy
        .findOne({

            recordType:
                STORAGE_RECORD_TYPE,

            assetCode:
                assetCode,

            name: {

                $regex:
                    `^${escapeRegExp(name)}$`,

                $options:
                    "i"

            }

        })
        .select("_id")
        .lean();


    if (existing) {

        throw createError(
            "A storage facility with this name already exists on this Dairy Farm.",
            409
        );

    }

}


// ==========================================================
// GET USED ROOM NUMBERS
// ==========================================================
//
// We inspect ALL storage structures belonging to this farm,
// rather than only the requested type.
//
// This prevents a positive/negative room number collision
// if the database contains inconsistent legacy records.
//
// ==========================================================

async function getUsedRoomNumbers(
    assetCode
) {

    const storages = await Dairy
        .find({

            recordType:
                STORAGE_RECORD_TYPE,

            assetCode:
                assetCode,

            type: {
                $in: STORAGE_TYPES
            }

        })
        .select("roomNumber")
        .lean();


    return storages

        .map(
            storage =>
                Number(
                    storage.roomNumber
                )
        )

        .filter(
            number =>
                Number.isInteger(number)
        );

}


// ==========================================================
// GENERATE NEXT POSITIVE ROOM NUMBER
// ==========================================================
//
// Generates:
//
//     1
//     2
//     3
//     ...
//
// Only positive numbers are considered.
//
// ==========================================================

async function getNextRoomNumber(
    assetCode
) {

    const usedNumbers =
        await getUsedRoomNumbers(
            assetCode
        );


    const positiveNumbers =
        usedNumbers.filter(
            number =>
                number > 0
        );


    if (
        positiveNumbers.length === 0
    ) {

        return 1;

    }


    return (
        Math.max(
            ...positiveNumbers
        ) + 1
    );

}


// ==========================================================
// GENERATE NEXT NEGATIVE AGROSTORE NUMBER
// ==========================================================
//
// Generates:
//
//     -1
//     -2
//     -3
//     ...
//
// Only negative numbers are considered.
//
// ==========================================================

async function getNextAgroStoreNumber(
    assetCode
) {

    const usedNumbers =
        await getUsedRoomNumbers(
            assetCode
        );


    const negativeNumbers =
        usedNumbers.filter(
            number =>
                number < 0
        );


    if (
        negativeNumbers.length === 0
    ) {

        return -1;

    }


    return (
        Math.min(
            ...negativeNumbers
        ) - 1
    );

}


// ==========================================================
// GENERATE STORAGE ROOM NUMBER
// ==========================================================
//
// type === "room":
//
//     positive number
//
// type === "agroStore":
//
//     negative number
//
// The client cannot supply this value.
//
// ==========================================================

async function generateRoomNumber(
    assetCode,
    type
) {

    if (
        type === ROOM_TYPE
    ) {

        const roomNumber =
            await getNextRoomNumber(
                assetCode
            );


        if (
            !Number.isInteger(roomNumber) ||
            roomNumber <= 0
        ) {

            throw createError(
                "Failed to generate a valid positive room number.",
                500
            );

        }


        return roomNumber;

    }


    if (
        type === AGROSTORE_TYPE
    ) {

        const roomNumber =
            await getNextAgroStoreNumber(
                assetCode
            );


        if (
            !Number.isInteger(roomNumber) ||
            roomNumber >= 0
        ) {

            throw createError(
                "Failed to generate a valid negative AgroStore room number.",
                500
            );

        }


        return roomNumber;

    }


    throw createError(
        "Invalid storage type.",
        400
    );

}


// ==========================================================
// VERIFY GENERATED NUMBER DOES NOT EXIST
// ==========================================================
//
// This is an additional safety check before creation.
//
// ==========================================================

async function ensureRoomNumberAvailable(
    assetCode,
    roomNumber
) {

    const existing =
        await Dairy
            .findOne({

                recordType:
                    STORAGE_RECORD_TYPE,

                assetCode:
                    assetCode,

                roomNumber:
                    roomNumber

            })
            .select("_id")
            .lean();


    if (existing) {

        throw createError(
            "The generated storage room number already exists. Please try again.",
            409
        );

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
//     recordType
//     assetCode
//     roomNumber
//
// ==========================================================

async function createStorage(
    options = {}
) {

    // ======================================================
    // PARENT ID
    // ======================================================

    const dairyId =
        validateDairyId(
            options.dairyId
        );


    // ======================================================
    // NAME
    // ======================================================

    const name =
        normalizeName(
            options.name
        );


    if (!name) {

        throw createError(
            "Storage name is required.",
            400
        );

    }


    if (
        name.length > 200
    ) {

        throw createError(
            "Storage name cannot exceed 200 characters.",
            400
        );

    }


    // ======================================================
    // STORAGE TYPE
    // ======================================================
    //
    // The user may select only:
    //
    //     room
    //     agroStore
    //
    // roomNumber is NOT accepted from options.
    //
    // ======================================================

    const type =
        String(
            options.type || ""
        ).trim();


    if (
        !STORAGE_TYPES.includes(type)
    ) {

        throw createError(
            "Storage type must be either room or agroStore.",
            400
        );

    }


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
    // ASSET CODE
    // ======================================================
    //
    // ALWAYS derived from the parent Dairy.
    //
    // Never use options.assetCode.
    //
    // ======================================================

    const assetCode =
        farmCode;


    // ======================================================
    // CHECK DUPLICATE NAME
    // ======================================================

    await ensureNameAvailable(
        assetCode,
        name
    );


    // ======================================================
    // GENERATE ROOM NUMBER
    // ======================================================
    //
    // NEVER read:
    //
    //     options.roomNumber
    //
    // The service always generates it.
    //
    // ======================================================

    const roomNumber =
        await generateRoomNumber(
            assetCode,
            type
        );


    // ======================================================
    // FINAL COLLISION CHECK
    // ======================================================

    await ensureRoomNumberAvailable(
        assetCode,
        roomNumber
    );


    // ======================================================
    // CREATE STORAGE
    // ======================================================
    //
    // Everything below is server-controlled except name
    // and type.
    //
    // ======================================================

    const storage =
        await Dairy.create({

            // ------------------------------------------------
            // ALWAYS A STRUCTURE
            // ------------------------------------------------

            recordType:
                STORAGE_RECORD_TYPE,


            // ------------------------------------------------
            // PARENT FARM CODE
            // ------------------------------------------------
            //
            // Example:
            //
            // parent.code = -10
            //
            // storage.assetCode = -10
            //
            // ------------------------------------------------

            assetCode:
                assetCode,


            // ------------------------------------------------
            // STORAGE NAME
            // ------------------------------------------------

            name:
                name,


            // ------------------------------------------------
            // STORAGE TYPE
            // ------------------------------------------------

            type:
                type,


            // ------------------------------------------------
            // SERVER-GENERATED ROOM NUMBER
            // ------------------------------------------------
            //
            // room:
            //     1, 2, 3...
            //
            // agroStore:
            //     -1, -2, -3...
            //
            // ------------------------------------------------

            roomNumber:
                roomNumber

        });


    // ======================================================
    // RETURN
    // ======================================================

    return {

        dairy,

        farmCode,

        assetCode,

        recordType:
            STORAGE_RECORD_TYPE,

        type,

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