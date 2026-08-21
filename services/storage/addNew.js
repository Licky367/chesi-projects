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
    Find Dairy
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
    4. Be either:
           room
           agroStore
    5. Be active
    6. Have a roomNumber

The URL storageType is validated separately.

The database storage type is NOT guessed or converted.

There are only two possible storage types.
*/

async function resolveStorage(
    dairy,
    storageId
) {

    /*
    ------------------------------------------------------------
    Validate ID
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
    Find storage belonging to this farm
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
    Not found
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
    Validate roomNumber
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
roomNumber is authoritative.

The newly created item's:

    dwellNumber

MUST equal:

    storage.roomNumber
*/

function getStorageRoomNumber(
    storage
) {

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
    Canonical gender values
    ------------------------------------------------------------

    The form uses:

        female
        male

    We accept case variations from the request but store the
    canonical lowercase values.
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
   VALIDATE ANIMAL CODE
============================================================ */

/*
ANIMAL CODE RULES
------------------------------------------------------------

Female:

    positive EVEN integer

    2
    4
    6
    8
    10
    ...

Male:

    positive ODD integer

    1
    3
    5
    7
    9
    ...

INVALID:

    0
    negative values
    decimals
    strings that are not numbers
    Infinity
    NaN

The code is REQUIRED.

The service does NOT automatically generate an animal code.
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
        Number(
            value
        );


    /*
    ------------------------------------------------------------
    Positive integer
    ------------------------------------------------------------
    */

    if (
        !Number.isInteger(
            code
        ) ||
        code <= 0
    ) {

        throw serviceError(
            "Animal code must be a positive whole number."
        );

    }


    /*
    ------------------------------------------------------------
    FEMALE = EVEN
    ------------------------------------------------------------
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
    MALE = ODD
    ------------------------------------------------------------
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
   VALIDATE UNIQUE ANIMAL CODE
============================================================ */

/*
Animal codes identify animals.

The code must not already belong to another Dairy record.
*/

async function validateUniqueAnimalCode(
    code
) {

    const existing =
        await Dairy.findOne({

            code

        })
        .select(
            "_id"
        )
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
        AgroStore stores feeds.
        --------------------------------------------------------

        IMPORTANT:

        "agroStore" is the STORAGE type.

        "feeds" is the ITEM type.

        They are NOT the same thing.
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
        Feed is NOT a storage structure.
        --------------------------------------------------------

        This distinction matters because the contents service
        explicitly excludes:

            recordType === "structure"

        from ordinary storage items.

        Therefore we do NOT force:

            recordType = "structure"

        onto a feed.
        */

        data.recordType =
            undefined;

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
            CODE
            ----------------------------------------------------

            Mandatory.

            Female = positive even.

            Male = positive odd.
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

        }

    }


    return data;

}



/* ============================================================
   BUILD NEW DAIRY DATA
============================================================ */

/*
The browser does NOT control:

    assetCode
    dwellNumber

The service supplies them from trusted server-side data.

FARM:

    assetCode = parent farm code

STORAGE:

    dwellNumber = storage.roomNumber
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
    NEVER TRUST DESTINATION FIELDS FROM REQUEST
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
    roomNumber
}) {

    /*
    ------------------------------------------------------------
    Build trusted data
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
    Create Mongoose document
    ------------------------------------------------------------
    */

    const item =
        new Dairy(
            newData
        );


    /*
    ------------------------------------------------------------
    Save
    ------------------------------------------------------------
    */

    await item.save();


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
    VALIDATE URL STORAGE TYPE
    ============================================================
    */

    const validatedStorageType =
        validateStorageType(
            storageType
        );


    /*
    ============================================================
    RESOLVE PARENT DAIRY
    ============================================================
    */

    const dairy =
        await resolveParentDairy(
            dairyId
        );


    /*
    ============================================================
    RESOLVE TARGET STORAGE
    ============================================================

    IMPORTANT:

    The storage is resolved directly from the database using:

        dairyId
        storageId

    We do NOT use a loose getStorage/getStorageFacility
    signature adapter.

    This prevents the wrong record from being returned.
    ============================================================
    */

    const storage =
        await resolveStorage(
            dairy,

            storageId

        );


    /*
    ============================================================
    VERIFY URL TYPE AGAINST THE ACTUAL TARGET
    ============================================================

    Both values must be one of:

        room
        agroStore

    We compare the explicit URL type with the actual storage
    record ONLY after the storage has been resolved directly
    and unambiguously.

    No conversion is performed.
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
    STORAGE ROOM NUMBER
    ============================================================
    */

    const roomNumber =
        getStorageRoomNumber(
            storage
        );


    /*
    ============================================================
    VALIDATE FORM DATA
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
    REMOVE CLIENT-CONTROLLED DESTINATION FIELDS
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

        addItemsToStorage()

    That operation is for EXISTING Dairy records selected
    using itemIds from contents.ejs.

    This operation creates a completely NEW Dairy record.
    ============================================================
    */

    const item =
        await createNewDairyRecord({

            data,

            dairy,

            roomNumber

        });


    /*
    ============================================================
    RETURN
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

        roomNumber

    };

}



/* ============================================================
   EXPORTS
============================================================ */

module.exports = {

    getAddNewContext: async function({
        dairyId,
        storageId,
        storageType
    }) {

        /*
        --------------------------------------------------------
        Validate URL storage type.
        --------------------------------------------------------
        */

        const validatedStorageType =
            validateStorageType(
                storageType
            );


        /*
        --------------------------------------------------------
        Resolve parent farm.
        --------------------------------------------------------
        */

        const dairy =
            await resolveParentDairy(
                dairyId
            );


        /*
        --------------------------------------------------------
        Resolve target storage.
        --------------------------------------------------------
        */

        const storage =
            await resolveStorage(
                dairy,

                storageId

            );


        /*
        --------------------------------------------------------
        The URL type and actual storage type must agree.
        --------------------------------------------------------
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
        --------------------------------------------------------
        Room number.
        --------------------------------------------------------
        */

        const roomNumber =
            getStorageRoomNumber(
                storage
            );


        /*
        --------------------------------------------------------
        Return form context.
        --------------------------------------------------------
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

    },


    addNewItem,

    validateAndNormalize

};