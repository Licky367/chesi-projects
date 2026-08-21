// ==========================================================
// services/storage/addNew.js
// ADD ITEM DIRECTLY TO AN EXISTING STORAGE FACILITY
// ==========================================================
//
// This service is intentionally an adapter around the existing
// storage service. Existing storage/list and storage/contents
// logic remains authoritative for resolving the parent Dairy,
// storage facility and actual storage allocation.
//
// STORAGE TYPES:
//     "room"
//     "agroStore"
//
// IMPORTANT:
//     "agroStore" is the exact database value.
//     Do NOT change it to "agrostore".
//     Do NOT use toLowerCase().
//
// ==========================================================


const storageListService = require("./list");
const storageContentsService = require("./contents");


/* ============================================================
   SERVICE ERROR
============================================================ */

function serviceError(message, statusCode = 400) {

    const error =
        new Error(message);

    error.statusCode =
        statusCode;

    return error;
}


/* ============================================================
   CLEAN VALUE
============================================================ */

function clean(value) {

    return typeof value === "string"
        ? value.trim()
        : value;

}


/* ============================================================
   NUMBER OR UNDEFINED
============================================================ */

function numberOrUndefined(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return undefined;

    }


    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        throw serviceError(
            "Numeric fields must contain valid numbers."
        );

    }


    return number;

}


/* ============================================================
   STORAGE TYPE
============================================================ */

/*
IMPORTANT:

The database uses the exact storage types:

    "room"
    "agroStore"

We intentionally do NOT call toLowerCase().

This preserves the database value exactly.
*/

function getStorageType(storage) {

    return clean(
        storage?.type
    );

}


/* ============================================================
   GET DAIRY BREEDS
============================================================ */

function getBreeds(dairy) {

    if (
        Array.isArray(dairy?.dairyBreeds)
    ) {

        return dairy.dairyBreeds;

    }


    if (
        Array.isArray(dairy?.breeds)
    ) {

        return dairy.breeds;

    }


    if (
        Array.isArray(dairy?.breed)
    ) {

        return dairy.breed;

    }


    return [];

}


/* ============================================================
   CALL SERVICE
============================================================ */

/*
Allows this adapter to work with the existing storage service
without assuming one exact function signature.

Only genuine argument/signature mismatches cause the next
candidate signature to be attempted.

Application/database errors are allowed to propagate.
*/

async function callService(fn, candidates) {

    if (
        typeof fn !== "function"
    ) {

        throw serviceError(
            "The required storage service operation is not available.",
            500
        );

    }


    let lastError;


    for (
        const args of candidates
    ) {

        try {

            return await fn(...args);

        } catch (error) {

            lastError =
                error;


            /*
            ----------------------------------------------------
            Only fall through for argument/signature mismatches.
            ----------------------------------------------------
            */

            const message =
                String(
                    error?.message || ""
                );


            const signatureMismatch =
                error?.code === "ERR_INVALID_ARG_TYPE" ||
                message.includes(
                    "Cannot read properties of undefined"
                ) ||
                message.includes(
                    "is not a function"
                );


            if (
                !signatureMismatch
            ) {

                throw error;

            }

        }

    }


    throw (
        lastError ||
        serviceError(
            "Storage service invocation failed.",
            500
        )
    );

}


/* ============================================================
   RESOLVE PARENT DAIRY
============================================================ */

async function resolveParentDairy(dairyId) {

    return callService(
        storageListService.getParentDairy,
        [
            [dairyId],
            [{ dairyId }]
        ]
    );

}


/* ============================================================
   RESOLVE STORAGE
============================================================ */

async function resolveStorage(
    dairyId,
    storageId
) {

    const fn =
        storageListService.getStorageFacility ||
        storageListService.getStorage;


    return callService(
        fn,
        [
            [dairyId, storageId],
            [storageId, dairyId],
            [{ dairyId, storageId }],
            [storageId]
        ]
    );

}


/* ============================================================
   GET ADD NEW CONTEXT
============================================================ */

async function getAddNewContext({
    dairyId,
    storageId
}) {

    /*
    ------------------------------------------------------------
    Required identifiers
    ------------------------------------------------------------
    */

    if (
        !dairyId ||
        !storageId
    ) {

        throw serviceError(
            "Dairy and storage identifiers are required.",
            400
        );

    }


    /*
    ------------------------------------------------------------
    Resolve parent Dairy
    ------------------------------------------------------------
    */

    const dairy =
        await resolveParentDairy(
            dairyId
        );


    /*
    ------------------------------------------------------------
    Resolve storage facility
    ------------------------------------------------------------
    */

    const storage =
        await resolveStorage(
            dairyId,
            storageId
        );


    /*
    ------------------------------------------------------------
    Validate Dairy
    ------------------------------------------------------------
    */

    if (
        !dairy
    ) {

        throw serviceError(
            "Dairy Farm not found.",
            404
        );

    }


    /*
    ------------------------------------------------------------
    Validate storage
    ------------------------------------------------------------
    */

    if (
        !storage
    ) {

        throw serviceError(
            "Storage facility not found.",
            404
        );

    }


    /*
    ------------------------------------------------------------
    Resolve exact storage type
    ------------------------------------------------------------
    */

    const storageType =
        getStorageType(
            storage
        );


    /*
    ------------------------------------------------------------
    SUPPORTED STORAGE TYPES
    ------------------------------------------------------------

    Exact database values:

        room
        agroStore

    DO NOT change agroStore to agrostore.
    ------------------------------------------------------------
    */

    if (
        ![
            "room",
            "agroStore"
        ].includes(storageType)
    ) {

        throw serviceError(
            "This storage facility has an unsupported storage type.",
            400
        );

    }


    /*
    ------------------------------------------------------------
    Return complete context
    ------------------------------------------------------------
    */

    return {

        dairy,

        storage,

        storageType,

        dairyBreeds:
            getBreeds(dairy)

    };

}


/* ============================================================
   VALIDATE AND NORMALIZE
============================================================ */

function validateAndNormalize({
    body,
    storageType
}) {

    const data =
        {
            ...body
        };


    /* ========================================================
       NAME
    ======================================================== */

    const name =
        clean(
            data.name
        );


    if (
        !name
    ) {

        throw serviceError(
            "Name is required."
        );

    }


    data.name =
        name;


    /* ========================================================
       NUMERIC FIELDS
    ======================================================== */

    data.buyingPrice =
        numberOrUndefined(
            data.buyingPrice
        );


    data.currentWorth =
        numberOrUndefined(
            data.currentWorth
        );


    data.mass =
        numberOrUndefined(
            data.mass
        );


    /* ========================================================
       BUYING PRICE VALIDATION
    ======================================================== */

    if (
        data.buyingPrice !== undefined &&
        data.buyingPrice < 0
    ) {

        throw serviceError(
            "Buying Price cannot be negative."
        );

    }


    /* ========================================================
       CURRENT WORTH VALIDATION
    ======================================================== */

    if (
        data.currentWorth !== undefined &&
        data.currentWorth < 0
    ) {

        throw serviceError(
            "Current Worth cannot be negative."
        );

    }


    /* ========================================================
       MASS VALIDATION
    ======================================================== */

    if (
        data.mass !== undefined &&
        data.mass < 0
    ) {

        throw serviceError(
            "Mass cannot be negative."
        );

    }


    /* ========================================================
       AGROSTORE
    ======================================================== */

    /*
    IMPORTANT:

    Exact storage type:

        "agroStore"

    NOT:

        "agrostore"
    */

    if (
        storageType === "agroStore"
    ) {

        /*
        --------------------------------------------------------
        AgroStore records are feeds.
        --------------------------------------------------------
        */

        data.recordType =
            "structure";


        data.type =
            "feeds";


        /*
        --------------------------------------------------------
        Quantity
        --------------------------------------------------------
        */

        data.quantity =
            numberOrUndefined(
                data.quantity
            );


        data.unit =
            clean(
                data.unit
            );


        if (
            data.quantity === undefined ||
            data.quantity < 0
        ) {

            throw serviceError(
                "Please enter a valid feed quantity."
            );

        }


        if (
            !data.unit
        ) {

            throw serviceError(
                "Feed unit is required."
            );

        }

    }


    /* ========================================================
       NORMAL STORAGE ROOM
    ======================================================== */

    else {

        /*
        --------------------------------------------------------
        Record type
        --------------------------------------------------------
        */

        if (
            ![
                "animal",
                "structure"
            ].includes(
                clean(
                    data.recordType
                )
            )
        ) {

            throw serviceError(
                "Please select what you are adding."
            );

        }


        data.recordType =
            clean(
                data.recordType
            );


        /* ====================================================
           ANIMAL
        ==================================================== */

        if (
            data.recordType === "animal"
        ) {

            data.gender =
                clean(
                    data.gender
                );


            data.type =
                clean(
                    data.type
                );


            data.dateOfBirth =
                clean(
                    data.dateOfBirth
                );


            /*
            ----------------------------------------------------
            Gender
            ----------------------------------------------------
            */

            if (
                !data.gender
            ) {

                throw serviceError(
                    "Animal gender is required."
                );

            }


            /*
            ----------------------------------------------------
            Date of Birth
            ----------------------------------------------------
            */

            if (
                !data.dateOfBirth
            ) {

                throw serviceError(
                    "Animal Date of Birth is required."
                );

            }


            /*
            ----------------------------------------------------
            Breed
            ----------------------------------------------------
            */

            if (
                !data.type
            ) {

                throw serviceError(
                    "Animal breed is required."
                );

            }

        }


        /* ====================================================
           STRUCTURE
        ==================================================== */

        if (
            data.recordType === "structure" &&
            !clean(data.type)
        ) {

            throw serviceError(
                "Structure type is required."
            );

        }

    }


    return data;

}


/* ============================================================
   ADD NEW ITEM
============================================================ */

async function addNewItem({
    dairyId,
    storageId,
    body,
    file,
    request
}) {

    /*
    ============================================================
    RESOLVE STORAGE CONTEXT
    ============================================================
    */

    const context =
        await getAddNewContext({
            dairyId,
            storageId
        });


    /*
    ============================================================
    VALIDATE AND NORMALIZE SUBMITTED DATA
    ============================================================
    */

    const data =
        validateAndNormalize({
            body,
            storageType:
                context.storageType
        });


    /*
    ============================================================
    REMOVE DESTINATION-CONTROLLED FIELDS
    ============================================================

    The browser must never control these fields.

    The existing storage contents service is responsible for
    determining the final storage allocation.
    ============================================================
    */

    delete data.dairyId;

    delete data.storageId;

    delete data.assetCode;

    delete data.dwellNumber;

    delete data.roomNumber;

    delete data.storage;


    /* ========================================================
       PROFILE IMAGE
    ======================================================== */

    if (
        file
    ) {

        data.profileImage =
            file;

    }


    /*
    ============================================================
    EXISTING STORAGE ADD OPERATION
    ============================================================
    */

    const addItems =
        storageContentsService.addItemsToStorage;


    if (
        typeof addItems !== "function"
    ) {

        throw serviceError(
            "The existing storage contents add operation is unavailable.",
            500
        );

    }


    /*
    ============================================================
    CALL EXISTING CONTENTS SERVICE
    ============================================================
    */

    const result =
        await callService(
            addItems,
            [

                [
                    dairyId,
                    storageId,
                    data,
                    request
                ],

                [
                    dairyId,
                    storageId,
                    data
                ],

                [
                    context.dairy,
                    context.storage,
                    data,
                    request
                ],

                [
                    context.dairy,
                    context.storage,
                    data
                ],

                [
                    {
                        dairyId,
                        storageId,
                        data,
                        dairy:
                            context.dairy,
                        storage:
                            context.storage,
                        request
                    }
                ]

            ]
        );


    /*
    ============================================================
    RETURN RESULT
    ============================================================
    */

    return (
        result ||
        {
            success: true
        }
    );

}


/* ============================================================
   EXPORTS
============================================================ */

module.exports = {

    getAddNewContext,

    addNewItem,

    validateAndNormalize

};