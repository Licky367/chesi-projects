// ==========================================================
// services/storage/addNew.js
// ADD A NEW ITEM DIRECTLY TO AN EXISTING STORAGE FACILITY
// ==========================================================
//
// URL:
//
//     /storage/:dairyId/contents/:storageId/add/:storageType
//
// SUPPORTED STORAGE TYPES:
//
//     "room"
//     "agroStore"
//
// IMPORTANT:
//
//     These are the ONLY supported storage types.
//
//     "agroStore" is case-sensitive.
//
//     Do NOT use:
//
//         toLowerCase()
//
//     Do NOT introduce:
//
//         agrostore
//         warehouse
//         store
//         barn
//         feedStore
//         etc.
//
// ==========================================================


const mongoose =
    require("mongoose");


const Dairy =
    require("../../models/dairy");



/* ============================================================
   STORAGE TYPE CONSTANTS
============================================================ */

const STORAGE_TYPES = {

    ROOM:
        "room",

    AGRO_STORE:
        "agroStore"

};



/* ============================================================
   RECORD TYPE CONSTANTS
============================================================ */

const ANIMAL_RECORD_TYPE =
    "animal";


const STRUCTURE_RECORD_TYPE =
    "structure";



/* ============================================================
   FEED TYPE
============================================================ */

const FEED_TYPE =
    "feeds";



/* ============================================================
   STORAGE STATUS
============================================================ */

const ACTIVE_STATUS =
    "active";



/* ============================================================
   ANIMAL GENDER
============================================================ */

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
        new Error(
            message
        );


    error.statusCode =
        statusCode;


    error.status =
        statusCode;


    return error;

}



/* ============================================================
   CLEAN VALUE
============================================================ */

function clean(
    value
) {

    return typeof value === "string"
        ? value.trim()
        : value;

}



/* ============================================================
   VALID OBJECT ID
============================================================ */

function isValidObjectId(
    value
) {

    return mongoose.Types.ObjectId.isValid(
        value
    );

}



/* ============================================================
   NUMBER OR UNDEFINED
============================================================ */

function numberOrUndefined(
    value
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return undefined;

    }


    const number =
        Number(
            value
        );


    if (
        !Number.isFinite(
            number
        )
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
Supported values are EXACTLY:

    room
    agroStore

The value comes from the URL.

Do NOT convert the value to lowercase.
*/

function validateStorageType(
    storageType
) {

    const type =
        clean(
            storageType
        );


    if (
        type !== STORAGE_TYPES.ROOM &&
        type !== STORAGE_TYPES.AGRO_STORE
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
The Dairy model is the authoritative source for breeds.
*/

function getBreeds() {

    return Dairy.getDairyBreeds();

}



/* ============================================================
   RESOLVE PARENT DAIRY FARM
============================================================ */

async function resolveParentDairy(
    dairyId
) {

    /*
    ------------------------------------------------------------
    Validate ID
    ------------------------------------------------------------
    */

    if (
        !isValidObjectId(
            dairyId
        )
    ) {

        throw serviceError(
            "Invalid Dairy Farm ID.",
            400
        );

    }


    /*
    ------------------------------------------------------------
    Find parent Dairy record
    ------------------------------------------------------------
    */

    const dairy =
        await Dairy.findById(
            dairyId
        )
        .lean();


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
    Parent farm MUST have a negative code
    ------------------------------------------------------------
    */

    const farmCode =
        Number(
            dairy.code
        );


    if (
        !Number.isInteger(
            farmCode
        ) ||
        farmCode >= 0
    ) {

        throw serviceError(
            "The selected Dairy record is not a Dairy Farm.",
            400
        );

    }


    return dairy;

}



/* ============================================================
   RESOLVE STORAGE FACILITY
============================================================ */

/*
The storage facility MUST:

    1. Exist
    2. Be a structure
    3. Belong to the selected Dairy Farm
    4. Have type:
           room
       OR
           agroStore
    5. Be active
    6. Have a roomNumber
*/

async function resolveStorage(
    dairy,
    storageId
) {

    /*
    ------------------------------------------------------------
    Validate storage ID
    ------------------------------------------------------------
    */

    if (
        !isValidObjectId(
            storageId
        )
    ) {

        throw serviceError(
            "Invalid storage facility ID.",
            400
        );

    }


    /*
    ------------------------------------------------------------
    Find storage belonging to parent farm
    ------------------------------------------------------------
    */

    const storage =
        await Dairy.findOne({

            _id:
                storageId,

            recordType:
                STRUCTURE_RECORD_TYPE,

            assetCode:
                dairy.code,

            type: {

                $in: [

                    STORAGE_TYPES.ROOM,

                    STORAGE_TYPES.AGRO_STORE

                ]

            }

        })
        .lean();


    /*
    ------------------------------------------------------------
    Storage not found
    ------------------------------------------------------------
    */

    if (
        !storage
    ) {

        throw serviceError(
            "Storage facility not found for this Dairy Farm.",
            404
        );

    }


    /*
    ------------------------------------------------------------
    Verify storage type is one of the two supported types
    ------------------------------------------------------------
    */

    if (
        storage.type !== STORAGE_TYPES.ROOM &&
        storage.type !== STORAGE_TYPES.AGRO_STORE
    ) {

        throw serviceError(
            "The selected storage facility has an unsupported storage type.",
            400
        );

    }


    /*
    ------------------------------------------------------------
    Active storage required
    ------------------------------------------------------------
    */

    if (
        storage.status !==
            ACTIVE_STATUS
    ) {

        throw serviceError(
            "Items cannot be added to an inactive storage facility.",
            400
        );

    }


    /*
    ------------------------------------------------------------
    Room number required
    ------------------------------------------------------------
    */

    if (
        storage.roomNumber ===
            null ||

        storage.roomNumber ===
            undefined ||

        String(
            storage.roomNumber
        ).trim() === ""
    ) {

        throw serviceError(
            "The selected storage facility does not have a valid Room Number.",
            400
        );

    }


    return storage;

}



/* ============================================================
   GET STORAGE ROOM NUMBER
============================================================ */

/*
The storage's roomNumber is authoritative.

Every new item created through this service receives:

    dwellNumber = storage.roomNumber
*/

function getStorageRoomNumber(
    storage
) {

    if (
        !storage
    ) {

        throw serviceError(
            "Storage facility is required.",
            400
        );

    }


    const roomNumber =
        String(
            storage.roomNumber
        ).trim();


    if (
        roomNumber === ""
    ) {

        throw serviceError(
            "The selected storage facility does not have a valid Room Number.",
            400
        );

    }


    return roomNumber;

}



/* ============================================================
   VALIDATE ANIMAL GENDER
============================================================ */

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
    Gender is normalized independently of storage type.

    Accepted:

        female
        male

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
   GENERATE NEXT ANIMAL CODE
============================================================ */

/*
IMPORTANT
------------------------------------------------------------

The browser DOES NOT provide an animal code.

The service generates it automatically.

CODE RULES
------------------------------------------------------------

Female:

    positive EVEN numbers

        2
        4
        6
        8
        10
        12
        ...

Male:

    positive ODD numbers

        1
        3
        5
        7
        9
        11
        ...

The generated code is unique among animal records.

There is NO code field required in addNew.ejs.
*/

async function generateAnimalCode(
    gender
) {

    /*
    ------------------------------------------------------------
    Validate gender
    ------------------------------------------------------------
    */

    if (
        gender !== FEMALE &&
        gender !== MALE
    ) {

        throw serviceError(
            "Cannot generate an animal code without a valid gender."
        );

    }


    /*
    ------------------------------------------------------------
    Determine required parity
    ------------------------------------------------------------

    Female = even
    Male   = odd
    ------------------------------------------------------------
    */

    const parity =
        gender === FEMALE
            ? 0
            : 1;


    /*
    ------------------------------------------------------------
    Find the highest existing animal code for this gender
    ------------------------------------------------------------
    */

    const latest =
        await Dairy.findOne({

            recordType:
                ANIMAL_RECORD_TYPE,

            gender,

            code: {

                $type:
                    "number",

                $gt:
                    0,

                $mod: [
                    2,
                    parity
                ]

            }

        })
        .sort({
            code:
                -1
        })
        .select(
            "code"
        )
        .lean();


    /*
    ------------------------------------------------------------
    Starting code
    ------------------------------------------------------------

    Female:

        2

    Male:

        1
    ------------------------------------------------------------
    */

    let code =
        latest
            ? Number(
                latest.code
            ) + 2
            : (
                gender === FEMALE
                    ? 2
                    : 1
            );


    /*
    ------------------------------------------------------------
    Safety check
    ------------------------------------------------------------
    */

    if (
        !Number.isSafeInteger(
            code
        ) ||
        code <= 0
    ) {

        throw serviceError(
            "Unable to generate a valid animal code.",
            500
        );

    }


    /*
    ------------------------------------------------------------
    Ensure uniqueness
    ------------------------------------------------------------

    Normally the query above is sufficient.

    This additional check protects against old records or
    records whose gender/code relationship was not consistent.
    ------------------------------------------------------------
    */

    while (
        await Dairy.exists({
            code
        })
    ) {

        code += 2;


        if (
            !Number.isSafeInteger(
                code
            )
        ) {

            throw serviceError(
                "Unable to generate a unique animal code.",
                500
            );

        }

    }


    return code;

}



/* ============================================================
   VALIDATE AND NORMALIZE
============================================================ */

/*
This function validates the submitted form data.

IMPORTANT:

For animals, CODE IS NOT READ FROM THE REQUEST.

The animal code is generated later by:

    generateAnimalCode()

*/

function validateAndNormalize({
    body,
    storageType
}) {

    /*
    ------------------------------------------------------------
    Copy request body
    ------------------------------------------------------------
    */

    const data = {

        ...(
            body || {}
        )

    };


    /*
    ------------------------------------------------------------
    Validate storage type
    ------------------------------------------------------------
    */

    const validatedStorageType =
        validateStorageType(
            storageType
        );


    /* ========================================================
       NAME
    ======================================================== */

    data.name =
        clean(
            data.name
        );


    if (
        !data.name
    ) {

        throw serviceError(
            "Name is required."
        );

    }



    /* ========================================================
       GENERAL NUMERIC FIELDS
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
            STORAGE_TYPES.AGRO_STORE
    ) {

        /*
        --------------------------------------------------------
        agroStore is the STORAGE TYPE.

        feeds is the ITEM TYPE.
        --------------------------------------------------------
        */

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
        Unit
        --------------------------------------------------------
        */

        data.unit =
            clean(
                data.unit
            );


        if (
            !data.unit
        ) {

            throw serviceError(
                "Feed unit is required."
            );

        }


        /*
        --------------------------------------------------------
        A feed is NOT automatically marked as a structure.
        --------------------------------------------------------
        */

        delete data.recordType;

    }



    /* ========================================================
       NORMAL ROOM
    ======================================================== */

    if (
        validatedStorageType ===
            STORAGE_TYPES.ROOM
    ) {

        /*
        --------------------------------------------------------
        A normal room accepts:

            animal
            structure
        --------------------------------------------------------
        */

        const recordType =
            clean(
                data.recordType
            );


        if (
            recordType !==
                ANIMAL_RECORD_TYPE &&

            recordType !==
                STRUCTURE_RECORD_TYPE
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
            recordType ===
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
            IMPORTANT:

            Do NOT read:

                data.code

            The code is automatically generated later.
            ----------------------------------------------------
            */

            delete data.code;


            /*
            ----------------------------------------------------
            Breed
            ----------------------------------------------------
            */

            data.type =
                clean(
                    data.type
                );


            if (
                !data.type
            ) {

                throw serviceError(
                    "Animal breed is required."
                );

            }


            /*
            ----------------------------------------------------
            Validate breed against Dairy model
            ----------------------------------------------------
            */

            const breeds =
                getBreeds();


            if (
                !breeds.includes(
                    data.type
                )
            ) {

                throw serviceError(
                    "Invalid animal breed."
                );

            }


            /*
            ----------------------------------------------------
            Date of Birth
            ----------------------------------------------------
            */

            data.dateOfBirth =
                clean(
                    data.dateOfBirth
                );


            if (
                !data.dateOfBirth
            ) {

                throw serviceError(
                    "Animal Date of Birth is required."
                );

            }

        }



        /* ====================================================
           STRUCTURE
        ==================================================== */

        if (
            recordType ===
                STRUCTURE_RECORD_TYPE
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


            /*
            ----------------------------------------------------
            Structures do not receive animal codes.
            ----------------------------------------------------
            */

            delete data.code;

            delete data.gender;

            delete data.dateOfBirth;

        }

    }


    return data;

}



/* ============================================================
   BUILD NEW DAIRY DATA
============================================================ */

/*
The browser NEVER controls:

    assetCode
    dwellNumber

The service supplies both values from trusted server-side
records.

    assetCode  = parent farm code
    dwellNumber = storage roomNumber
*/

function buildNewDairyData({
    data,
    dairy,
    roomNumber,
    animalCode
}) {

    const newData = {

        ...data,


        /*
        --------------------------------------------------------
        PARENT FARM
        --------------------------------------------------------

        This is the farm's numeric code.

        Example:

            parent farm code = -101

        Then:

            new item.assetCode = -101
        --------------------------------------------------------
        */

        assetCode:
            dairy.code,


        /*
        --------------------------------------------------------
        STORAGE LOCATION
        --------------------------------------------------------

        Example:

            storage.roomNumber = "12"

        Then:

            new item.dwellNumber = "12"
        --------------------------------------------------------
        */

        dwellNumber:
            roomNumber

    };


    /*
    ------------------------------------------------------------
    ANIMAL CODE
    ------------------------------------------------------------

    Only an animal receives a generated code.
    ------------------------------------------------------------
    */

    if (
        data.recordType ===
            ANIMAL_RECORD_TYPE
    ) {

        newData.code =
            animalCode;

    }


    /*
    ------------------------------------------------------------
    NEVER TRUST DESTINATION FIELDS FROM REQUEST
    ------------------------------------------------------------
    */

    delete newData.dairyId;

    delete newData.storageId;

    delete newData.roomNumber;

    delete newData.storage;


    /*
    ------------------------------------------------------------
    The browser cannot override these either.
    ------------------------------------------------------------
    */

    delete newData.assetCode;

    delete newData.dwellNumber;


    /*
    ------------------------------------------------------------
    Re-apply trusted server-side relationship values.
    ------------------------------------------------------------
    */

    newData.assetCode =
        dairy.code;


    newData.dwellNumber =
        roomNumber;


    return newData;

}



/* ============================================================
   CREATE NEW DAIRY RECORD
============================================================ */

/*
This function creates a completely NEW Dairy document.

It does NOT add an existing item to storage.
*/

async function createNewDairyRecord({
    data,
    dairy,
    roomNumber,
    animalCode
}) {

    /*
    ------------------------------------------------------------
    Build trusted document
    ------------------------------------------------------------
    */

    const newData =
        buildNewDairyData({

            data,

            dairy,

            roomNumber,

            animalCode

        });


    /*
    ------------------------------------------------------------
    Create new Mongoose document
    ------------------------------------------------------------
    */

    const item =
        new Dairy(
            newData
        );


    /*
    ------------------------------------------------------------
    SAVE

    Mongoose validation/hooks execute here.
    ------------------------------------------------------------
    */

    await item.save();


    /*
    ------------------------------------------------------------
    Return actual created document
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
    1. VALIDATE URL STORAGE TYPE
    ============================================================
    */

    const validatedStorageType =
        validateStorageType(
            storageType
        );


    /*
    ============================================================
    2. RESOLVE PARENT FARM
    ============================================================
    */

    const dairy =
        await resolveParentDairy(
            dairyId
        );


    /*
    ============================================================
    3. RESOLVE TARGET STORAGE
    ============================================================
    */

    const storage =
        await resolveStorage(
            dairy,

            storageId

        );


    /*
    ============================================================
    4. VERIFY URL STORAGE TYPE
    ============================================================
    */

    if (
        storage.type !==
            validatedStorageType
    ) {

        throw serviceError(
            "The selected storage facility does not match the requested storage type.",
            400
        );

    }


    /*
    ============================================================
    5. GET AUTHORITATIVE ROOM NUMBER
    ============================================================
    */

    const roomNumber =
        getStorageRoomNumber(
            storage
        );


    /*
    ============================================================
    6. VALIDATE FORM DATA
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
    7. REMOVE CLIENT-CONTROLLED DESTINATION FIELDS
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
    8. PROFILE IMAGE
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
    9. GENERATE ANIMAL CODE
    ============================================================

    IMPORTANT:

    There is NO code supplied by the form.

    The service generates it automatically.

    Female:

        2, 4, 6, 8, ...

    Male:

        1, 3, 5, 7, ...
    ============================================================
    */

    let animalCode;


    if (
        data.recordType ===
            ANIMAL_RECORD_TYPE
    ) {

        animalCode =
            await generateAnimalCode(
                data.gender
            );

    }


    /*
    ============================================================
    10. CREATE COMPLETELY NEW DAIRY RECORD
    ============================================================
    */

    const item =
        await createNewDairyRecord({

            data,

            dairy,

            roomNumber,

            animalCode

        });


    /*
    ============================================================
    11. RETURN RESULT
    ============================================================
    */

    return {

        success:
            true,

        created:
            true,

        item,

        dairy,

        storage,

        storageType:
            validatedStorageType,

        roomNumber,

        animalCode:
            animalCode || null

    };

}



/* ============================================================
   GET ADD-NEW CONTEXT
============================================================ */

/*
Used when rendering addNew.ejs.

It validates:

    parent farm
    storage
    storage type
    room number

It also provides:

    dairyBreeds
*/

async function getAddNewContext({
    dairyId,
    storageId,
    storageType
}) {

    /*
    ------------------------------------------------------------
    Validate URL storage type
    ------------------------------------------------------------
    */

    const validatedStorageType =
        validateStorageType(
            storageType
        );


    /*
    ------------------------------------------------------------
    Resolve parent farm
    ------------------------------------------------------------
    */

    const dairy =
        await resolveParentDairy(
            dairyId
        );


    /*
    ------------------------------------------------------------
    Resolve storage
    ------------------------------------------------------------
    */

    const storage =
        await resolveStorage(
            dairy,

            storageId

        );


    /*
    ------------------------------------------------------------
    URL type MUST match actual storage type
    ------------------------------------------------------------
    */

    if (
        storage.type !==
            validatedStorageType
    ) {

        throw serviceError(
            "The selected storage facility does not match the requested storage type.",
            400
        );

    }


    /*
    ------------------------------------------------------------
    Get authoritative room number
    ------------------------------------------------------------
    */

    const roomNumber =
        getStorageRoomNumber(
            storage
        );


    /*
    ------------------------------------------------------------
    Return context for addNew.ejs
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
   EXPORTS
============================================================ */

module.exports = {

    getAddNewContext,

    addNewItem,

    validateAndNormalize,

    generateAnimalCode

};