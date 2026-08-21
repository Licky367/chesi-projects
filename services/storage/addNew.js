// ==========================================================
// services/storage/addNew.js
// ADD A NEW ITEM DIRECTLY TO AN EXISTING STORAGE FACILITY
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



/* ============================================================
   CONSTANTS
============================================================ */

const ROOM_TYPE =
    "room";


const AGROSTORE_TYPE =
    "agroStore";


const STRUCTURE_RECORD_TYPE =
    "structure";


const FEED_TYPE =
    "feeds";


const ACTIVE_STATUS =
    "active";


const ANIMAL_RECORD_TYPE =
    "animal";


const STRUCTURE_ITEM_TYPE =
    "structure";


const FEMALE =
    "female";


const MALE =
    "male";



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

    error.status =
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
            ROOM_TYPE,
            AGROSTORE_TYPE
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
The breed list comes directly from the Dairy model.

Do NOT use:

    dairy.dairyBreeds
    dairy.breeds
    dairy.breed

The authoritative source is:

    Dairy.getDairyBreeds()
*/

function getBreeds() {

    return Dairy.getDairyBreeds();

}



/* ============================================================
   CALL SERVICE
============================================================ */

/*
Allows this adapter to work with the existing storage list
service without assuming one exact function signature.

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
   GET STORAGE ROOM NUMBER
============================================================ */

/*
The storage's roomNumber is authoritative.

Every item created directly inside storage receives:

    dwellNumber = storage.roomNumber

This is also how existing contents are located.
*/

function getStorageRoomNumber(
    storage
) {

    if (
        !storage
    ) {

        return null;

    }


    if (
        storage.roomNumber ===
            null ||

        storage.roomNumber ===
            undefined
    ) {

        return null;

    }


    const roomNumber =
        String(
            storage.roomNumber
        ).trim();


    return roomNumber !== ""
        ? roomNumber
        : null;

}



/* ============================================================
   CHECK STORAGE TYPE
============================================================ */

function getStorageType(
    storage
) {

    return typeof storage?.type === "string"
        ? storage.type.trim()
        : "";

}



/* ============================================================
   CHECK ACTIVE STORAGE
============================================================ */

function isActiveStorage(
    storage
) {

    return (
        storage &&
        storage.status ===
            ACTIVE_STATUS
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
    Validate parent Dairy
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
    Validate actual storage type
    ------------------------------------------------------------
    */

    const actualStorageType =
        getStorageType(
            storage
        );


    if (
        actualStorageType !==
            validatedStorageType
    ) {

        throw serviceError(
            "The selected storage facility does not match the requested storage type.",
            400
        );

    }


    /*
    ------------------------------------------------------------
    Validate storage type
    ------------------------------------------------------------
    */

    if (
        ![
            ROOM_TYPE,
            AGROSTORE_TYPE
        ].includes(
            actualStorageType
        )
    ) {

        throw serviceError(
            "The selected storage facility has an unsupported storage type.",
            400
        );

    }


    /*
    ------------------------------------------------------------
    Validate storage status
    ------------------------------------------------------------
    */

    if (
        !isActiveStorage(
            storage
        )
    ) {

        throw serviceError(
            "Items cannot be added to an inactive storage facility.",
            400
        );

    }


    /*
    ------------------------------------------------------------
    Validate room number
    ------------------------------------------------------------
    */

    const roomNumber =
        getStorageRoomNumber(
            storage
        );


    if (
        roomNumber === null
    ) {

        throw serviceError(
            "The selected storage facility does not have a valid Room Number.",
            400
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

        roomNumber,

        storageType:
            validatedStorageType,

        dairyBreeds:
            getBreeds()

    };

}



/* ============================================================
   VALIDATE ANIMAL CODE
============================================================ */

/*
Animal codes are mandatory.

RULES:

    Female:
        positive EVEN integer

        2
        4
        6
        8
        ...

    Male:
        positive ODD integer

        1
        3
        5
        7
        ...

INVALID:

    0
    negative numbers
    decimals
    NaN
    Infinity
    missing values

The code is also checked for uniqueness.
*/

function validateAnimalCode({
    value,
    gender
}) {

    /*
    ------------------------------------------------------------
    Required
    ------------------------------------------------------------
    */

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        throw serviceError(
            "Animal code is required."
        );

    }


    /*
    ------------------------------------------------------------
    Convert
    ------------------------------------------------------------
    */

    const code =
        Number(value);


    /*
    ------------------------------------------------------------
    Positive integer
    ------------------------------------------------------------
    */

    if (
        !Number.isInteger(code) ||
        code <= 0
    ) {

        throw serviceError(
            "Animal code must be a positive whole number."
        );

    }


    /*
    ------------------------------------------------------------
    Female
    ------------------------------------------------------------

    Female animal codes MUST be even.
    */

    if (
        gender === FEMALE &&
        code % 2 !== 0
    ) {

        throw serviceError(
            "Female animal codes must be positive even numbers."
        );

    }


    /*
    ------------------------------------------------------------
    Male
    ------------------------------------------------------------

    Male animal codes MUST be odd.
    */

    if (
        gender === MALE &&
        code % 2 !== 1
    ) {

        throw serviceError(
            "Male animal codes must be positive odd numbers."
        );

    }


    return code;

}



/* ============================================================
   VALIDATE ANIMAL GENDER
============================================================ */

/*
The accepted values are:

    female
    male

The comparison is deliberately normalized only for gender.

This does NOT alter storageType handling.
*/

function validateAnimalGender(
    value
) {

    const gender =
        clean(
            value
        );


    if (
        !gender
    ) {

        throw serviceError(
            "Animal gender is required."
        );

    }


    /*
    ------------------------------------------------------------
    Accept the normal form values while preserving the
    application's canonical values.
    ------------------------------------------------------------
    */

    const normalized =
        String(
            gender
        ).toLowerCase();


    if (
        normalized !== FEMALE &&
        normalized !== MALE
    ) {

        throw serviceError(
            "Animal gender must be either female or male."
        );

    }


    return normalized;

}



/* ============================================================
   VALIDATE UNIQUE ANIMAL CODE
============================================================ */

/*
Code is the identity of an animal.

Before saving a new animal, make sure another Dairy record
does not already use that code.
*/

async function validateUniqueAnimalCode(
    code
) {

    const existing =
        await Dairy.findOne({
            code
        })
        .select("_id")
        .lean();


    if (
        existing
    ) {

        throw serviceError(
            `Animal code ${code} is already in use. Please choose another code.`,
            409
        );

    }

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
        validatedStorageType ===
            AGROSTORE_TYPE
    ) {

        /*
        --------------------------------------------------------
        AgroStore additions are feed records.
        --------------------------------------------------------
        */

        data.recordType =
            STRUCTURE_RECORD_TYPE;


        data.type =
            FEED_TYPE;


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
        validatedStorageType ===
            ROOM_TYPE
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
                ANIMAL_RECORD_TYPE,
                STRUCTURE_ITEM_TYPE
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
            data.recordType ===
                ANIMAL_RECORD_TYPE
        ) {

            /*
            ----------------------------------------------------
            Gender
            ----------------------------------------------------
            */

            data.gender =
                validateAnimalGender(
                    data.gender
                );


            /*
            ----------------------------------------------------
            ANIMAL CODE
            ----------------------------------------------------

            Code is mandatory and its parity determines the
            animal's sex.
            */

            data.code =
                validateAnimalCode({

                    value:
                        data.code,

                    gender:
                        data.gender

                });


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
            data.recordType ===
                STRUCTURE_ITEM_TYPE
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
   BUILD NEW DAIRY DATA
============================================================ */

/*
A new item is NOT an existing item selected from contents.ejs.

Therefore:

    itemIds
    addItemsToStorage()

are NOT involved.

Instead, a completely new Dairy record is created.

FARM RELATIONSHIP:

    assetCode = parent Dairy Farm code

STORAGE LOCATION:

    dwellNumber = storage.roomNumber

ANIMAL:

    code = supplied positive animal identity code

The browser is never trusted for assetCode or dwellNumber.
*/

function buildNewDairyData({
    data,
    dairy,
    roomNumber
}) {

    const newData = {

        ...data,


        /*
        --------------------------------------------------------
        FARM RELATIONSHIP
        --------------------------------------------------------
        */

        assetCode:
            dairy.code,


        /*
        --------------------------------------------------------
        STORAGE LOCATION
        --------------------------------------------------------
        */

        dwellNumber:
            roomNumber

    };


    /*
    ------------------------------------------------------------
    DESTINATION-CONTROLLED FIELDS

    Never trust these from the browser.
    ------------------------------------------------------------
    */

    delete newData.dairyId;

    delete newData.storageId;

    delete newData.roomNumber;

    delete newData.storage;


    return newData;

}



/* ============================================================
   CREATE NEW DAIRY RECORD
============================================================ */

async function createNewDairyRecord({
    data,
    dairy,
    storage,
    roomNumber
}) {

    /*
    ------------------------------------------------------------
    Build server-controlled data
    ------------------------------------------------------------
    */

    const newData =
        buildNewDairyData({

            data,

            dairy,

            roomNumber

        });


    /*
    ------------------------------------------------------------
    CREATE DOCUMENT
    ------------------------------------------------------------
    */

    const item =
        new Dairy(
            newData
        );


    /*
    ------------------------------------------------------------
    SAVE
    ------------------------------------------------------------
    */

    await item.save();


    /*
    ------------------------------------------------------------
    RETURN
    ------------------------------------------------------------
    */

    return item;

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


    /*
    ============================================================
    PROFILE IMAGE
    ============================================================
    */

    if (
        file
    ) {

        data.profileImage =
            file;

    }


    /*
    ============================================================
    ANIMAL CODE UNIQUENESS
    ============================================================
    */

    if (
        data.recordType ===
            ANIMAL_RECORD_TYPE
    ) {

        await validateUniqueAnimalCode(
            data.code
        );

    }


    /*
    ============================================================
    CREATE NEW DAIRY RECORD
    ============================================================

    IMPORTANT:

    DO NOT call:

        storageContentsService.addItemsToStorage()

    That service is for EXISTING records selected by itemIds.

    This operation creates a completely NEW Dairy document.
    */

    const item =
        await createNewDairyRecord({

            data,

            dairy:
                context.dairy,

            storage:
                context.storage,

            roomNumber:
                context.roomNumber

        });


    /*
    ============================================================
    RETURN RESULT
    ============================================================
    */

    return {

        success:
            true,

        created:
            true,

        item,

        dairy:
            context.dairy,

        storage:
            context.storage,

        storageType:
            validatedStorageType,

        roomNumber:
            context.roomNumber

    };

}



/* ============================================================
   EXPORTS
============================================================ */

module.exports = {

    getAddNewContext,

    addNewItem,

    validateAndNormalize

};