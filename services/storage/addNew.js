// ==========================================================
// services/storage/addNew.js
// ADD ITEM DIRECTLY TO AN EXISTING STORAGE FACILITY
// ==========================================================
//
// URL:
//
//     /storage/:dairyId/contents/:storageId/add/:storageType
//
// STORAGE TYPE:
//
//     "room"
//     "agroStore"
//
// IMPORTANT:
//
//     storageType comes explicitly from the URL.
//
//     The service does NOT determine storageType by guessing
//     from another database field.
//
//     "agroStore" is case-sensitive.
//
//     Do NOT use:
//         toLowerCase()
//
// ==========================================================


const Dairy =
    require("../../models/dairy");


const storageListService =
    require("./list");


const storageContentsService =
    require("./contents");



/* ============================================================
   SERVICE ERROR
============================================================ */

function serviceError(
    message,
    statusCode = 400
) {

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
   VALIDATE STORAGE TYPE
============================================================ */

/*
Supported values are exactly:

    room
    agroStore

The value comes from the URL.

Do not convert it to lowercase.
*/

function validateStorageType(
    storageType
) {

    const type =
        clean(
            storageType
        );


    if (
        ![
            "room",
            "agroStore"
        ].includes(type)
    ) {

        throw serviceError(
            "Unsupported storage type. Expected 'room' or 'agroStore'.",
            400
        );

    }


    return type;

}



/* ============================================================
   GET DAIRY BREEDS
============================================================ */

/*
The breed list does NOT come from the Dairy document.

The Dairy schema defines the authoritative breed list:

    Dairy.getDairyBreeds()

Therefore:

    dairy.dairyBreeds
    dairy.breeds
    dairy.breed

must NOT be used.

For an animal record:

    type

contains the selected breed.

The list of available breeds comes from the model.
*/

function getBreeds() {

    return Dairy.getDairyBreeds();

}



/* ============================================================
   CALL SERVICE
============================================================ */

/*
Allows this adapter to work with the existing storage service
without assuming one exact function signature.

Only genuine argument/signature mismatches cause another
candidate signature to be attempted.

Application/database errors propagate normally.
*/

async function callService(
    fn,
    candidates
) {

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

            return await fn(
                ...args
            );

        } catch (error) {

            lastError =
                error;


            const message =
                String(
                    error?.message || ""
                );


            const signatureMismatch =
                error?.code ===
                    "ERR_INVALID_ARG_TYPE" ||

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

async function resolveParentDairy(
    dairyId
) {

    return callService(
        storageListService.getParentDairy,
        [

            [
                dairyId
            ],

            [
                {
                    dairyId
                }
            ]

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

            [
                dairyId,
                storageId
            ],

            [
                storageId,
                dairyId
            ],

            [
                {
                    dairyId,
                    storageId
                }
            ],

            [
                storageId
            ]

        ]
    );

}



/* ============================================================
   GET ADD NEW CONTEXT
============================================================ */

/*
Returns everything required by the add-new page.

The breed list comes directly from the Dairy model.

The storage type comes directly from the URL.
*/

async function getAddNewContext({
    dairyId,
    storageId,
    storageType
}) {

    /*
    ------------------------------------------------------------
    Validate identifiers
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
    Validate explicit storage type
    ------------------------------------------------------------
    */

    const validatedStorageType =
        validateStorageType(
            storageType
        );


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
    Return complete add-new context
    ------------------------------------------------------------
    */

    return {

        dairy,

        storage,

        storageType:
            validatedStorageType,

        dairyBreeds:
            getBreeds()

    };

}



/* ============================================================
   VALIDATE AND NORMALIZE
============================================================ */

function validateAndNormalize({
    body,
    storageType
}) {

    const data = {

        ...(
            body || {}
        )

    };


    /*
    ============================================================
    VALIDATE STORAGE TYPE
    ============================================================
    */

    const validatedStorageType =
        validateStorageType(
            storageType
        );


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
       BUYING PRICE
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
       CURRENT WORTH
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
       MASS
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

    if (
        validatedStorageType === "agroStore"
    ) {

        /*
        --------------------------------------------------------
        AgroStore additions are feed records.
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


        /*
        --------------------------------------------------------
        Unit
        --------------------------------------------------------
        */

        data.unit =
            clean(
                data.unit
            );


        /*
        --------------------------------------------------------
        Quantity validation
        --------------------------------------------------------
        */

        if (
            data.quantity === undefined ||
            data.quantity < 0
        ) {

            throw serviceError(
                "Please enter a valid feed quantity."
            );

        }


        /*
        --------------------------------------------------------
        Unit validation
        --------------------------------------------------------
        */

        if (
            !data.unit
        ) {

            throw serviceError(
                "Feed unit is required."
            );

        }

    }


    /* ========================================================
       NORMAL ROOM
    ======================================================== */

    if (
        validatedStorageType === "room"
    ) {

        /*
        --------------------------------------------------------
        Only animals and structures can be added to a room.
        --------------------------------------------------------
        */

        const recordType =
            clean(
                data.recordType
            );


        if (
            ![
                "animal",
                "structure"
            ].includes(
                recordType
            )
        ) {

            throw serviceError(
                "Please select what you are adding."
            );

        }


        data.recordType =
            recordType;


        /* ====================================================
           ANIMAL
        ==================================================== */

        if (
            data.recordType === "animal"
        ) {

            /*
            ----------------------------------------------------
            Gender
            ----------------------------------------------------
            */

            data.gender =
                clean(
                    data.gender
                );


            /*
            ----------------------------------------------------
            Breed
            ----------------------------------------------------
            */

            data.type =
                clean(
                    data.type
                );


            /*
            ----------------------------------------------------
            Date of Birth
            ----------------------------------------------------
            */

            data.dateOfBirth =
                clean(
                    data.dateOfBirth
                );


            /*
            ----------------------------------------------------
            Gender required
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
            Date of Birth required
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
            Breed required
            ----------------------------------------------------
            */

            if (
                !data.type
            ) {

                throw serviceError(
                    "Animal breed is required."
                );

            }


            /*
            ----------------------------------------------------
            Validate breed against model source of truth
            ----------------------------------------------------
            */

            const breeds =
                Dairy.getDairyBreeds();


            if (
                !breeds.includes(
                    data.type
                )
            ) {

                throw serviceError(
                    "Invalid animal breed."
                );

            }

        }


        /* ====================================================
           STRUCTURE
        ==================================================== */

        if (
            data.recordType === "structure"
        ) {

            data.type =
                clean(
                    data.type
                );


            if (
                !data.type
            ) {

                throw serviceError(
                    "Structure type is required."
                );

            }

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
    storageType,
    body,
    file,
    request
}) {

    /*
    ============================================================
    VALIDATE STORAGE TYPE
    ============================================================
    */

    const validatedStorageType =
        validateStorageType(
            storageType
        );


    /*
    ============================================================
    RESOLVE STORAGE CONTEXT
    ============================================================
    */

    const context =
        await getAddNewContext({

            dairyId,

            storageId,

            storageType:
                validatedStorageType

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
                validatedStorageType

        });


    /*
    ============================================================
    REMOVE DESTINATION-CONTROLLED FIELDS
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

                        storageType:
                            validatedStorageType,

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