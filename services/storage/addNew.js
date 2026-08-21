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
//     DO NOT use:
//
//         toLowerCase()
//
//     DO NOT introduce:
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

const STORAGE_TYPES = Object.freeze({

    ROOM:
        "room",

    AGRO_STORE:
        "agroStore"

});



/* ============================================================
   RECORD TYPE CONSTANTS
============================================================ */

const RECORD_TYPES = Object.freeze({

    ANIMAL:
        "animal",

    STRUCTURE:
        "structure"

});



/* ============================================================
   FEED TYPE
============================================================ */

const FEED_TYPE =
    "feeds";



/* ============================================================
   ACTIVE STATUS
============================================================ */

const ACTIVE_STATUS =
    "active";



/* ============================================================
   ANIMAL GENDER
============================================================ */

const GENDERS = Object.freeze({

    FEMALE:
        "female",

    MALE:
        "male"

});



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
   CLEAN STRING VALUE
============================================================ */

function clean(
    value
) {

    if (
        typeof value !== "string"
    ) {

        return value;

    }


    return value.trim();

}



/* ============================================================
   VALID OBJECT ID
============================================================ */

function isValidObjectId(
    value
) {

    if (
        value === undefined ||
        value === null
    ) {

        return false;

    }


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

    /*
    ------------------------------------------------------------
    Empty values are allowed for optional numeric fields.
    ------------------------------------------------------------
    */

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

Do NOT lowercase it.
*/

function validateStorageType(
    storageType
) {

    const type =
        clean(
            storageType
        );


    if (
        type !==
            STORAGE_TYPES.ROOM &&

        type !==
            STORAGE_TYPES.AGRO_STORE
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
The Dairy model is the authoritative source for animal breeds.
*/

function getBreeds() {

    const breeds =
        Dairy.getDairyBreeds();


    if (
        !Array.isArray(
            breeds
        )
    ) {

        throw serviceError(
            "Dairy breed configuration is unavailable.",
            500
        );

    }


    return breeds;

}



/* ============================================================
   RESOLVE PARENT DAIRY FARM
============================================================ */

async function resolveParentDairy(
    dairyId
) {

    /* ---------------------------------------------------------
       Validate ID
    --------------------------------------------------------- */

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


    /* ---------------------------------------------------------
       Find Dairy record
    --------------------------------------------------------- */

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


    /* ---------------------------------------------------------
       Parent must be a Dairy Farm
       Dairy Farm codes are negative.
    --------------------------------------------------------- */

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

    1. Exist.
    2. Be a structure.
    3. Belong to the selected Dairy Farm.
    4. Have type "room" or "agroStore".
    5. Be active.
    6. Have a valid roomNumber.
*/

async function resolveStorage(
    dairy,
    storageId
) {

    /* ---------------------------------------------------------
       Validate storage ID
    --------------------------------------------------------- */

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


    /* ---------------------------------------------------------
       Parent farm code
       Used to verify ownership.
    --------------------------------------------------------- */

    const farmCode =
        Number(
            dairy.code
        );


    /* ---------------------------------------------------------
       Find storage
    --------------------------------------------------------- */

    const storage =
        await Dairy.findOne({

            _id:
                storageId,

            recordType:
                RECORD_TYPES.STRUCTURE,

            assetCode:
                farmCode,

            type: {

                $in: [

                    STORAGE_TYPES.ROOM,

                    STORAGE_TYPES.AGRO_STORE

                ]

            }

        })
        .lean();


    if (
        !storage
    ) {

        throw serviceError(
            "Storage facility not found for this Dairy Farm.",
            404
        );

    }


    /* ---------------------------------------------------------
       Verify storage type
    --------------------------------------------------------- */

    if (
        storage.type !==
            STORAGE_TYPES.ROOM &&

        storage.type !==
            STORAGE_TYPES.AGRO_STORE
    ) {

        throw serviceError(
            "The selected storage facility has an unsupported storage type.",
            400
        );

    }


    /* ---------------------------------------------------------
       Storage must be active
    --------------------------------------------------------- */

    if (
        storage.status !==
            ACTIVE_STATUS
    ) {

        throw serviceError(
            "Items cannot be added to an inactive storage facility.",
            400
        );

    }


    /* ---------------------------------------------------------
       Room number is mandatory
    --------------------------------------------------------- */

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

The browser does NOT provide this value.

Every newly created item receives:

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
        !roomNumber
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
    Gender values are normalized independently.

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
        normalized !==
            GENDERS.FEMALE &&

        normalized !==
            GENDERS.MALE
    ) {

        throw serviceError(
            "Animal gender must be either female or male."
        );

    }


    return normalized;

}



/* ============================================================
   VALIDATE ANIMAL BREED
============================================================ */

function validateAnimalBreed(
    value
) {

    const breed =
        clean(
            value
        );


    if (
        !breed
    ) {

        throw serviceError(
            "Animal breed is required."
        );

    }


    const breeds =
        getBreeds();


    if (
        !breeds.includes(
            breed
        )
    ) {

        throw serviceError(
            "Invalid animal breed."
        );

    }


    return breed;

}



/* ============================================================
   VALIDATE DATE OF BIRTH
============================================================ */

function validateDateOfBirth(
    value
) {

    const date =
        clean(
            value
        );


    if (
        !date
    ) {

        throw serviceError(
            "Animal Date of Birth is required."
        );

    }


    const parsed =
        new Date(
            date
        );


    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {

        throw serviceError(
            "Animal Date of Birth must be a valid date."
        );

    }


    return date;

}



/* ============================================================
   GENERATE NEXT ANIMAL CODE
============================================================ */

/*
============================================================
ANIMAL CODE RULES
============================================================

Female:

    positive EVEN numbers

        2
        4
        6
        8
        10
        ...

Male:

    positive ODD numbers

        1
        3
        5
        7
        9
        ...

The browser DOES NOT provide the code.

The service generates it.
*/

async function generateAnimalCode(
    gender
) {

    /* ---------------------------------------------------------
       Validate gender
    --------------------------------------------------------- */

    if (
        gender !==
            GENDERS.FEMALE &&

        gender !==
            GENDERS.MALE
    ) {

        throw serviceError(
            "Cannot generate an animal code without a valid gender."
        );

    }


    /* ---------------------------------------------------------
       Determine parity
    --------------------------------------------------------- */

    const parity =
        gender ===
            GENDERS.FEMALE

            ? 0

            : 1;


    /* ---------------------------------------------------------
       Find highest existing animal code of this gender/parity
    --------------------------------------------------------- */

    const latest =
        await Dairy.findOne({

            recordType:
                RECORD_TYPES.ANIMAL,

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


    /* ---------------------------------------------------------
       Determine starting code
    --------------------------------------------------------- */

    let code;


    if (
        latest
    ) {

        code =
            Number(
                latest.code
            ) + 2;

    } else {

        code =
            gender ===
                GENDERS.FEMALE

                ? 2

                : 1;

    }


    /* ---------------------------------------------------------
       Safety validation
    --------------------------------------------------------- */

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


    /* ---------------------------------------------------------
       Additional uniqueness protection
    --------------------------------------------------------- */

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
   NORMALIZE PROFILE IMAGE
============================================================ */

/*
The controller may pass the uploaded Multer file object.

The service should store the value expected by the Dairy model.

This function intentionally does not invent a storage path.

If the uploaded file has:

    path

that path is used.

If it has:

    filename

that filename is used.

If it has:

    url

that URL is used.

Otherwise the original file object is retained so that the
controller/application can provide its own supported value.
*/

function normalizeProfileImage(
    file
) {

    if (
        !file
    ) {

        return undefined;

    }


    if (
        typeof file === "string"
    ) {

        return file;

    }


    if (
        file.path
    ) {

        return file.path;

    }


    if (
        file.filename
    ) {

        return file.filename;

    }


    if (
        file.url
    ) {

        return file.url;

    }


    return file;

}



/* ============================================================
   VALIDATE AND NORMALIZE FORM DATA
============================================================ */

/*
This function validates the actual POST body.

It does NOT trust destination information from the browser.

For animals:

    code is never accepted from req.body.

For storage:

    assetCode and dwellNumber are never accepted from req.body.
*/

function validateAndNormalize({
    body,
    storageType
}) {

    const data = {

        ...(
            body || {}
        )

    };


    /* ---------------------------------------------------------
       Validate storage type
    --------------------------------------------------------- */

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
        data.buyingPrice !==
            undefined &&

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
        data.currentWorth !==
            undefined &&

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
        data.mass !==
            undefined &&

        data.mass < 0
    ) {

        throw serviceError(
            "Mass cannot be negative."
        );

    }



    /* ========================================================
       DESCRIPTION
    ======================================================== */

    data.description =
        clean(
            data.description
        );



    /* ========================================================
       CONDITION
    ======================================================== */

    data.condition =
        clean(
            data.condition
        );



    /* ========================================================
       LOCATION
    ======================================================== */

    data.location =
        clean(
            data.location
        );



    /* ========================================================
       STATUS
    ======================================================== */

    data.status =
        clean(
            data.status
        );


    if (
        !data.status
    ) {

        data.status =
            ACTIVE_STATUS;

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
        The storage itself is:

            agroStore

        The item being added is:

            feeds
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
            data.quantity ===
                undefined ||

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
        The EJS may send:

            recordType=structure

        as a UI/helper value.

        It must NOT determine the actual feed item type.

        The service controls this.
        --------------------------------------------------------
        */

        delete data.recordType;

    }



    /* ========================================================
       NORMAL STORAGE ROOM
    ======================================================== */

    if (
        validatedStorageType ===
            STORAGE_TYPES.ROOM
    ) {

        const recordType =
            clean(
                data.recordType
            );


        if (
            recordType !==
                RECORD_TYPES.ANIMAL &&

            recordType !==
                RECORD_TYPES.STRUCTURE
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
                RECORD_TYPES.ANIMAL
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
            NEVER ACCEPT CODE FROM CLIENT
            ----------------------------------------------------
            */

            delete data.code;


            /*
            ----------------------------------------------------
            Breed
            ----------------------------------------------------
            */

            data.type =
                validateAnimalBreed(
                    data.type
                );


            /*
            ----------------------------------------------------
            Date of Birth
            ----------------------------------------------------
            */

            data.dateOfBirth =
                validateDateOfBirth(
                    data.dateOfBirth
                );

        }



        /* ====================================================
           STRUCTURE
        ==================================================== */

        if (
            recordType ===
                RECORD_TYPES.STRUCTURE
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
            The structure type must be one of the structure
            types defined by the Dairy model.

            This uses the model's authoritative list when
            available.
            ----------------------------------------------------
            */

            if (
                typeof Dairy.getStructureTypes ===
                    "function"
            ) {

                const structureTypes =
                    Dairy.getStructureTypes();


                if (
                    Array.isArray(
                        structureTypes
                    ) &&
                    !structureTypes.includes(
                        data.type
                    )
                ) {

                    throw serviceError(
                        "Invalid structure type."
                    );

                }

            }


            /*
            ----------------------------------------------------
            Structures do not receive animal properties.
            ----------------------------------------------------
            */

            delete data.code;

            delete data.gender;

            delete data.dateOfBirth;

        }

    }



    /* ========================================================
       NEVER TRUST DESTINATION FIELDS
    ======================================================== */

    delete data.dairyId;

    delete data.storageId;

    delete data.assetCode;

    delete data.dwellNumber;

    delete data.roomNumber;

    delete data.storage;



    return data;

}



/* ============================================================
   BUILD NEW DAIRY DATA
============================================================ */

/*
Trusted relationships:

    assetCode
        =
    parent dairy.code


    dwellNumber
        =
    storage.roomNumber


The browser cannot override either.
*/

function buildNewDairyData({
    data,
    dairy,
    roomNumber,
    animalCode
}) {

    const newData = {

        ...data

    };


    /* ---------------------------------------------------------
       Remove client-controlled relationship values
    --------------------------------------------------------- */

    delete newData.dairyId;

    delete newData.storageId;

    delete newData.roomNumber;

    delete newData.storage;

    delete newData.assetCode;

    delete newData.dwellNumber;



    /* ---------------------------------------------------------
       Apply trusted parent farm relationship
    --------------------------------------------------------- */

    newData.assetCode =
        dairy.code;



    /* ---------------------------------------------------------
       Apply trusted storage relationship
    --------------------------------------------------------- */

    newData.dwellNumber =
        roomNumber;



    /* ---------------------------------------------------------
       Animal code
    --------------------------------------------------------- */

    if (
        data.recordType ===
            RECORD_TYPES.ANIMAL
    ) {

        if (
            !Number.isSafeInteger(
                animalCode
            ) ||
            animalCode <= 0
        ) {

            throw serviceError(
                "A valid generated animal code is required.",
                500
            );

        }


        newData.code =
            animalCode;

    } else {

        /*
        --------------------------------------------------------
        Non-animal records do not receive animal codes.
        --------------------------------------------------------
        */

        delete newData.code;

    }


    return newData;

}



/* ============================================================
   CREATE NEW DAIRY RECORD
============================================================ */

/*
Creates a completely NEW Dairy document.

It does NOT:

    - move an existing Dairy document
    - update an existing Dairy document
    - attach an existing item
*/

async function createNewDairyRecord({
    data,
    dairy,
    roomNumber,
    animalCode
}) {

    /* ---------------------------------------------------------
       Build trusted document
    --------------------------------------------------------- */

    const newData =
        buildNewDairyData({

            data,

            dairy,

            roomNumber,

            animalCode

        });


    /* ---------------------------------------------------------
       Create document
    --------------------------------------------------------- */

    const item =
        new Dairy(
            newData
        );


    /* ---------------------------------------------------------
       Mongoose validation/hooks execute here
    --------------------------------------------------------- */

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
    request is accepted so the service interface can be used
    by controllers that pass req.

    It is intentionally NOT trusted for relationship values.
    */

    void request;


    /* ========================================================
       1. VALIDATE URL STORAGE TYPE
    ======================================================== */

    const validatedStorageType =
        validateStorageType(
            storageType
        );



    /* ========================================================
       2. RESOLVE PARENT DAIRY FARM
    ======================================================== */

    const dairy =
        await resolveParentDairy(
            dairyId
        );



    /* ========================================================
       3. RESOLVE TARGET STORAGE
    ======================================================== */

    const storage =
        await resolveStorage(
            dairy,

            storageId
        );



    /* ========================================================
       4. VERIFY URL TYPE AGAINST ACTUAL STORAGE
    ======================================================== */

    if (
        storage.type !==
            validatedStorageType
    ) {

        throw serviceError(
            "The selected storage facility does not match the requested storage type.",
            400
        );

    }



    /* ========================================================
       5. GET AUTHORITATIVE ROOM NUMBER
    ======================================================== */

    const roomNumber =
        getStorageRoomNumber(
            storage
        );



    /* ========================================================
       6. VALIDATE AND NORMALIZE FORM
    ======================================================== */

    const data =
        validateAndNormalize({

            body,

            storageType:
                validatedStorageType

        });



    /* ========================================================
       7. PROFILE IMAGE
    ======================================================== */

    const profileImage =
        normalizeProfileImage(
            file
        );


    if (
        profileImage !==
            undefined
    ) {

        data.profileImage =
            profileImage;

    }



    /* ========================================================
       8. GENERATE ANIMAL CODE
    ======================================================== */

    let animalCode =
        undefined;


    if (
        data.recordType ===
            RECORD_TYPES.ANIMAL
    ) {

        animalCode =
            await generateAnimalCode(
                data.gender
            );

    }



    /* ========================================================
       9. CREATE NEW DAIRY RECORD
    ======================================================== */

    const item =
        await createNewDairyRecord({

            data,

            dairy,

            roomNumber,

            animalCode

        });



    /* ========================================================
       10. RETURN RESULT
    ======================================================== */

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
Used by the controller when rendering addNew.ejs.

Returns:

    dairy
    storage
    roomNumber
    storageType
    dairyBreeds
*/

async function getAddNewContext({
    dairyId,
    storageId,
    storageType
}) {

    /* ========================================================
       1. VALIDATE URL STORAGE TYPE
    ======================================================== */

    const validatedStorageType =
        validateStorageType(
            storageType
        );



    /* ========================================================
       2. RESOLVE PARENT FARM
    ======================================================== */

    const dairy =
        await resolveParentDairy(
            dairyId
        );



    /* ========================================================
       3. RESOLVE STORAGE
    ======================================================== */

    const storage =
        await resolveStorage(
            dairy,

            storageId
        );



    /* ========================================================
       4. URL TYPE MUST MATCH STORAGE TYPE
    ======================================================== */

    if (
        storage.type !==
            validatedStorageType
    ) {

        throw serviceError(
            "The selected storage facility does not match the requested storage type.",
            400
        );

    }



    /* ========================================================
       5. GET AUTHORITATIVE ROOM NUMBER
    ======================================================== */

    const roomNumber =
        getStorageRoomNumber(
            storage
        );



    /* ========================================================
       6. GET BREEDS
    ======================================================== */

    const dairyBreeds =
        getBreeds();



    /* ========================================================
       7. RETURN VIEW CONTEXT
    ======================================================== */

    return {

        dairy,

        storage,

        roomNumber,

        storageType:
            validatedStorageType,

        dairyBreeds

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