// ==========================================================
// services/storage/add.js
// STORAGE ADD / CREATE SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Creates a storage record in the SINGLE Dairy model.
//
// A storage record is:
//
//     recordType = "structure"
//
// The user chooses the storage:
//
//     type = "room"
//     OR
//     type = "agroStore"
//
// PARENT:
//
//     /storage/:id/add
//
//     :id = parent Dairy Farm MongoDB _id
//
// OWNERSHIP:
//
//     assetCode = parent Dairy.code
//
// ROOM NUMBERS:
//
//     room
//         1, 2, 3, ...
//
//     agroStore
//         -1, -2, -3, ...
//
// USER PROVIDES:
//
//     dairyId
//     name
//     type
//
// SERVER DETERMINES:
//
//     recordType
//     assetCode
//     roomNumber
//
// IMPORTANT:
//
//     recordType !== type
//
//     recordType:
//         "structure"
//
//     type:
//         "room"
//         "agroStore"
//
// ==========================================================


const mongoose =
    require("mongoose");


const Dairy =
    require("../../models/dairy");


// ==========================================================
// CONSTANTS
// ==========================================================

const STORAGE_RECORD_TYPE =
    "structure";


const STORAGE_TYPES = [

    "room",

    "agroStore"

];


// ==========================================================
// NORMALIZE NAME
// ==========================================================

function normalizeName(name) {

    return String(name || "")
        .trim()
        .replace(/\s+/g, " ");

}


// ==========================================================
// VALIDATE PARENT DAIRY ID
// ==========================================================
//
// The ID comes from:
//
//     /storage/:id/add
//
// It must identify the parent Dairy Farm.
//
// ==========================================================

function validateDairyId(dairyId) {

    const id =
        String(
            dairyId || ""
        ).trim();


    if (!id) {

        const error =
            new Error(
                "Dairy Farm ID is required."
            );

        error.status =
            400;

        throw error;

    }


    if (
        !mongoose.Types.ObjectId.isValid(
            id
        )
    ) {

        const error =
            new Error(
                "Invalid Dairy Farm ID."
            );

        error.status =
            400;

        throw error;

    }


    return id;

}


// ==========================================================
// VALIDATE PARENT DAIRY FARM
// ==========================================================
//
// The parent is identified by MongoDB _id.
//
// The parent's code must be negative because a Dairy Farm
// is represented as a structure/facility record with a
// negative Dairy code.
//
// ==========================================================

async function getParentDairy(
    dairyId
) {

    const parent =
        await Dairy
            .findById(
                dairyId
            )
            .lean();


    if (!parent) {

        const error =
            new Error(
                "Parent Dairy Farm was not found."
            );

        error.status =
            404;

        throw error;

    }


    const farmCode =
        Number(
            parent.code
        );


    if (
        !Number.isInteger(
            farmCode
        ) ||
        farmCode >= 0
    ) {

        const error =
            new Error(
                "The selected Dairy is not a valid Dairy Farm."
            );

        error.status =
            400;

        throw error;

    }


    return {

        dairy:
            parent,

        farmCode

    };

}


// ==========================================================
// ESCAPE REGEXP
// ==========================================================

function escapeRegExp(value) {

    return String(value)
        .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

}


// ==========================================================
// ENSURE STORAGE NAME IS AVAILABLE
// ==========================================================
//
// Storage names are unique within the parent Dairy Farm.
//
// The relationship is determined through:
//
//     assetCode = parent Dairy.code
//
// ==========================================================

async function ensureNameAvailable(
    assetCode,
    name
) {

    const existing =
        await Dairy
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
// Room numbers are:
//
//     1
//     2
//     3
//     ...
//
// Only records belonging to this parent Dairy Farm and
// having:
//
//     recordType = "structure"
//     type = "room"
//
// are considered.
//
// ==========================================================

async function getNextRoomNumber(
    assetCode
) {

    const rooms =
        await Dairy
            .find({

                recordType:
                    STORAGE_RECORD_TYPE,

                assetCode:
                    assetCode,

                type:
                    "room"

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
// AgroStore numbers are:
//
//     -1
//     -2
//     -3
//     ...
//
// They are generated independently for each parent Dairy
// Farm.
//
// ==========================================================

async function getNextAgroStoreNumber(
    assetCode
) {

    const stores =
        await Dairy
            .find({

                recordType:
                    STORAGE_RECORD_TYPE,

                assetCode:
                    assetCode,

                type:
                    "agroStore"

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
// dairyId:
//
//     Parent Dairy Farm MongoDB _id.
//
// name:
//
//     User-provided storage name.
//
// type:
//
//     User-selected storage type.
//
//         room
//         agroStore
//
// ==========================================================

async function createStorage(
    options = {}
) {

    // ======================================================
    // READ INPUT
    // ======================================================

    const dairyId =
        validateDairyId(
            options.dairyId
        );


    const name =
        normalizeName(
            options.name
        );


    const type =
        String(
            options.type || ""
        ).trim();


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
    // VALIDATE STORAGE TYPE
    // ======================================================
    //
    // This is the USER'S storage type.
    //
    // It is NOT recordType.
    //
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
    // RESOLVE PARENT DAIRY FARM
    // ======================================================
    //
    // dairyId is the MongoDB _id from:
    //
    //     /storage/:id/add
    //
    // The service resolves that ID to the actual parent
    // Dairy Farm.
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
    // ASSET CODE
    // ======================================================
    //
    // The new storage record belongs to the parent Dairy
    // Farm through the parent's Dairy code.
    //
    // Example:
    //
    //     parent._id = 66...
    //     parent.code = -7
    //
    //     storage.assetCode = -7
    //
    // The MongoDB _id is NOT stored in assetCode.
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

    let roomNumber;


    if (
        type === "room"
    ) {

        roomNumber =
            await getNextRoomNumber(
                assetCode
            );

    } else {

        roomNumber =
            await getNextAgroStoreNumber(
                assetCode
            );

    }


    // ======================================================
    // SAFETY CHECK
    // ======================================================

    if (
        type === "room" &&
        (
            !Number.isInteger(
                roomNumber
            ) ||
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
            !Number.isInteger(
                roomNumber
            ) ||
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
    // CREATE STORAGE RECORD
    // ======================================================
    //
    // SINGLE SOURCE OF TRUTH:
    //
    //     models/dairy.js
    //
    // ======================================================

    const storage =
        await Dairy.create({

            // ------------------------------------------------
            // Backend-controlled record classification
            // ------------------------------------------------

            recordType:
                STORAGE_RECORD_TYPE,


            // ------------------------------------------------
            // Parent relationship
            // ------------------------------------------------
            //
            // assetCode = parent Dairy.code
            //
            // NOT parent Dairy._id.
            // ------------------------------------------------

            assetCode:
                assetCode,


            // ------------------------------------------------
            // User-provided storage name
            // ------------------------------------------------

            name:
                name,


            // ------------------------------------------------
            // User-selected storage type
            //
            // This is independent from recordType.
            // ------------------------------------------------

            type:
                type,


            // ------------------------------------------------
            // Backend-generated storage number
            // ------------------------------------------------

            roomNumber:
                roomNumber

        });


    // ======================================================
    // RETURN
    // ======================================================

    return {

        dairy,

        farmCode:
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