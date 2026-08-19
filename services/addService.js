// ==========================================================
// services/addService.js
// ADD DAIRY / ANIMAL / STRUCTURE SERVICE
// ==========================================================

const Dairy =
    require("../models/dairy");


// ==========================================================
// CONSTANTS
// ==========================================================

const RECORD_TYPES = {

    DAIRY_FARM:
        "dairyFarm",

    ANIMAL:
        "animal",

    STRUCTURE:
        "structure"

};


// ==========================================================
// GENDER TYPES
// ==========================================================
//
// Gender is NOT stored directly in the Dairy model.
//
// It is determined from the animal code:
//
// Odd  = Male
// Even = Female
//
// The submitted gender is therefore used only when
// generating the next animal code.
// ==========================================================

const GENDER_TYPES = [

    "male",

    "female"

];


// ==========================================================
// ERROR HELPER
// ==========================================================

function createError(
    message,
    statusCode = 400
) {

    const error =
        new Error(message);

    error.statusCode =
        statusCode;

    return error;

}


// ==========================================================
// NUMBER HELPER
// ==========================================================

function toNumber(
    value,
    defaultValue = 0
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return defaultValue;

    }


    const number =
        Number(value);


    return Number.isFinite(number)

        ? number

        : defaultValue;

}


// ==========================================================
// CLEAN STRING
// ==========================================================

function cleanString(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }


    return String(value).trim();

}


// ==========================================================
// NORMALIZE STATUS
// ==========================================================

function normalizeStatus(value) {

    const status =
        cleanString(value)
        .toLowerCase();


    const allowed =
        typeof Dairy.getDairyStatuses ===
        "function"

            ? Dairy.getDairyStatuses()

            : [

                "active",

                "sold",

                "disposed",

                "inactive"

            ];


    if (
        allowed.includes(status)
    ) {

        return status;

    }


    return "active";

}


// ==========================================================
// GET MODEL BREEDS
// ==========================================================
//
// The Dairy model is the SINGLE SOURCE OF TRUTH.
//
// No breed list is duplicated in this service.
// ==========================================================

function getDairyBreeds() {

    if (
        typeof Dairy.getDairyBreeds ===
        "function"
    ) {

        return Dairy.getDairyBreeds();

    }


    if (
        Array.isArray(
            Dairy.DAIRY_BREEDS
        )
    ) {

        return [
            ...Dairy.DAIRY_BREEDS
        ];

    }


    return [];

}


// ==========================================================
// GET MODEL FARM TYPES
// ==========================================================

function getDairyFarmTypes() {

    if (
        typeof Dairy.getDairyFarmTypes ===
        "function"
    ) {

        return Dairy.getDairyFarmTypes();

    }


    if (
        Array.isArray(
            Dairy.DAIRY_FARM_TYPES
        )
    ) {

        return [
            ...Dairy.DAIRY_FARM_TYPES
        ];

    }


    return [];

}


// ==========================================================
// GET MODEL STRUCTURE TYPES
// ==========================================================

function getStructureTypes() {

    if (
        typeof Dairy.getStructureTypes ===
        "function"
    ) {

        return Dairy.getStructureTypes();

    }


    if (
        Array.isArray(
            Dairy.STRUCTURE_TYPES
        )
    ) {

        return [
            ...Dairy.STRUCTURE_TYPES
        ];

    }


    return [];

}


// ==========================================================
// GET ADD PAGE DATA
// ==========================================================

async function getAddPageData() {

    /*
     * ------------------------------------------------------
     * EXISTING DAIRY FARMS
     * ------------------------------------------------------
     */

    const dairyFarms =
        await Dairy.find({

            code: {
                $lt: 0
            }

        })
        .sort({

            code: 1

        })
        .lean();


    /*
     * ------------------------------------------------------
     * MODEL-DEFINED OPTIONS
     * ------------------------------------------------------
     */

    const dairyBreeds =
        getDairyBreeds();


    const dairyFarmTypes =
        getDairyFarmTypes();


    const structureTypes =
        getStructureTypes();


    return {

        dairyBreeds,

        dairyFarmTypes,

        structureTypes,

        dairyFarms

    };

}


// ==========================================================
// FIND NEXT NEGATIVE DAIRY FARM CODE
// ==========================================================
//
// Dairy Farms:
//
// -1
// -2
// -3
// -4
//
// The browser never supplies this code.
// ==========================================================

async function getNextNegativeCode() {

    const lastFarm =
        await Dairy.findOne({

            code: {
                $lt: 0
            }

        })
        .sort({

            code: 1

        })
        .select("code")
        .lean();


    if (
        !lastFarm ||
        !Number.isFinite(
            Number(
                lastFarm.code
            )
        )
    ) {

        return -1;

    }


    return (

        Number(
            lastFarm.code
        ) - 1

    );

}


// ==========================================================
// FIND NEXT POSITIVE ANIMAL CODE
// ==========================================================
//
// Gender determines parity:
//
// MALE
// 1, 3, 5, 7, 9...
//
// FEMALE
// 2, 4, 6, 8, 10...
//
// The browser never supplies the code.
// ==========================================================

async function getNextPositiveCode(
    gender
) {

    const normalizedGender =
        cleanString(
            gender
        ).toLowerCase();


    const isFemale =
        normalizedGender ===
        "female";


    const parity =
        isFemale
            ? 0
            : 1;


    const lastAnimal =
        await Dairy.findOne({

            code: {
                $gt: 0
            },

            $expr: {

                $eq: [

                    {
                        $mod: [

                            "$code",

                            2

                        ]

                    },

                    parity

                ]

            }

        })
        .sort({

            code: -1

        })
        .select("code")
        .lean();


    if (
        !lastAnimal ||
        !Number.isFinite(
            Number(
                lastAnimal.code
            )
        )
    ) {

        return isFemale
            ? 2
            : 1;

    }


    return (

        Number(
            lastAnimal.code
        ) + 2

    );

}


// ==========================================================
// VERIFY DAIRY FARM
// ==========================================================
//
// assetCode must be the NEGATIVE CODE of an existing
// Dairy Farm.
// ==========================================================

async function verifyDairyFarm(
    assetCode
) {

    const farmCode =
        Number(
            assetCode
        );


    if (
        !Number.isFinite(
            farmCode
        ) ||
        farmCode >= 0
    ) {

        throw createError(
            "Invalid Dairy Farm selected."
        );

    }


    const farm =
        await Dairy.findOne({

            code:
                farmCode

        });


    if (!farm) {

        throw createError(
            "The selected Dairy Farm does not exist."
        );

    }


    if (
        Number(
            farm.code
        ) >= 0
    ) {

        throw createError(
            "The selected record is not a Dairy Farm."
        );

    }


    return farm;

}


// ==========================================================
// CREATE STORAGE FOR DAIRY FARM
// ==========================================================
//
// Every Dairy Farm MUST have exactly one Storage Facility.
//
// Farm:
//
//     code = -1
//
// Storage:
//
//     code          = null
//     assetCode     = null
//     storageNumber = -1
//
// The storage facility is deliberately NOT created as a
// normal structure.
//
// It is the special storage entity defined by models/dairy.js.
//
// ==========================================================

async function createStorageForFarm(
    farm
) {

    if (!farm) {

        throw createError(
            "Cannot create storage without a Dairy Farm.",
            500
        );

    }


    const farmCode =
        Number(
            farm.code
        );


    if (
        !Number.isInteger(
            farmCode
        ) ||
        farmCode >= 0
    ) {

        throw createError(
            "Invalid Dairy Farm code for storage creation.",
            500
        );

    }


    /*
     * ------------------------------------------------------
     * PROTECT AGAINST DUPLICATE STORAGE
     * ------------------------------------------------------
     *
     * The Dairy model also enforces this through the
     * unique storageNumber index.
     *
     * Checking here gives us a clearer application-level
     * error before MongoDB has to reject the document.
     */

    const existingStorage =
        await Dairy.findOne({

            storageNumber:
                farmCode

        });


    if (
        existingStorage
    ) {

        throw createError(
            "This Dairy Farm already has a Storage Facility.",
            409
        );

    }


    /*
     * ------------------------------------------------------
     * STORAGE DATA
     * ------------------------------------------------------
     *
     * Storage is a special facility.
     *
     * According to the Dairy model:
     *
     *     code          = null
     *     assetCode     = null
     *     storageNumber = negative farm code
     *
     * No structure type is required.
     */

    const storageData = {

        name:
            `${farm.name} Storage`,

        code:
            null,

        assetCode:
            null,

        storageNumber:
            farmCode,

        type:
            "",

        buyingPrice:
            0,

        currentWorth:
            0,

        revenue:
            0,

        sellingPrice:
            0,

        mass:
            0,

        isMilking:
            false,

        dateOfBirth:
            null,

        description:
            `Storage Facility for ${farm.name}.`,

        condition:
            "Good",

        location:
            cleanString(
                farm.location
            ),

        status:
            "active"

    };


    /*
     * ------------------------------------------------------
     * CREATE STORAGE
     * ------------------------------------------------------
     */

    const storage =
        await Dairy.create(
            storageData
        );


    return storage;

}


// ==========================================================
// VALIDATE DATE
// ==========================================================

function validateDate(
    value
) {

    if (!value) {

        throw createError(
            "A valid Date of Birth is required."
        );

    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        throw createError(
            "A valid Date of Birth is required."
        );

    }


    if (
        date > new Date()
    ) {

        throw createError(
            "Date of Birth cannot be in the future."
        );

    }


    return date;

}


// ==========================================================
// VALIDATE BREED
// ==========================================================

function validateBreed(
    breed
) {

    const normalizedBreed =
        cleanString(
            breed
        );


    if (!normalizedBreed) {

        throw createError(
            "Animal breed is required."
        );

    }


    const dairyBreeds =
        getDairyBreeds();


    if (
        !dairyBreeds.includes(
            normalizedBreed
        )
    ) {

        throw createError(
            "Invalid animal breed."
        );

    }


    return normalizedBreed;

}


// ==========================================================
// VALIDATE FARM TYPE
// ==========================================================

function validateFarmType(
    farmType
) {

    const normalizedType =
        cleanString(
            farmType
        );


    if (!normalizedType) {

        throw createError(
            "Dairy Farm Type is required."
        );

    }


    const farmTypes =
        getDairyFarmTypes();


    if (
        !farmTypes.includes(
            normalizedType
        )
    ) {

        throw createError(
            "Invalid Dairy Farm Type."
        );

    }


    return normalizedType;

}


// ==========================================================
// VALIDATE STRUCTURE TYPE
// ==========================================================

function validateStructureType(
    structureType
) {

    const normalizedType =
        cleanString(
            structureType
        );


    if (!normalizedType) {

        throw createError(
            "Structure / Facility Type is required."
        );

    }


    const structureTypes =
        getStructureTypes();


    if (
        !structureTypes.includes(
            normalizedType
        )
    ) {

        throw createError(
            "Invalid Structure / Facility Type."
        );

    }


    return normalizedType;

}


// ==========================================================
// CREATE RECORD
// ==========================================================

async function createRecord({
    body,
    file,
    user
}) {

    body =
        body || {};


    // ======================================================
    // RECORD TYPE
    // ======================================================

    const recordType =
        cleanString(
            body.recordType
        );


    if (!recordType) {

        throw createError(
            "Please select what you are adding."
        );

    }


    if (
        !Object.values(
            RECORD_TYPES
        ).includes(
            recordType
        )
    ) {

        throw createError(
            "Invalid record type."
        );

    }


    // ======================================================
    // NAME
    // ======================================================

    const name =
        cleanString(
            body.name
        );


    if (!name) {

        throw createError(
            "Name is required."
        );

    }


    // ======================================================
    // COMMON FINANCIAL DATA
    // ======================================================

    const buyingPrice =
        toNumber(
            body.buyingPrice,
            0
        );


    const currentWorth =
        toNumber(
            body.currentWorth,
            0
        );


    if (
        buyingPrice < 0
    ) {

        throw createError(
            "Buying Price cannot be negative."
        );

    }


    if (
        currentWorth < 0
    ) {

        throw createError(
            "Current Worth cannot be negative."
        );

    }


    // ======================================================
    // COMMON TEXT DATA
    // ======================================================

    const description =
        cleanString(
            body.description
        );


    const condition =
        cleanString(
            body.condition
        );


    const location =
        cleanString(
            body.location
        );


    const status =
        normalizeStatus(
            body.status
        );


    // ======================================================
    // PROFILE IMAGE
    // ======================================================

    let profileImage;


    if (file) {

        profileImage =

            file.path ||

            file.location ||

            file.filename ||

            undefined;

    }


    // ======================================================
    // BASE RECORD
    // ======================================================

    const recordData = {

        name,

        buyingPrice,

        currentWorth,

        description,

        condition,

        location,

        status

    };


    if (profileImage) {

        recordData.profileImage =
            profileImage;

    }


    // ======================================================
    // DAIRY FARM
    // ======================================================
    //
    // Creating a Dairy Farm automatically creates its
    // corresponding Storage Facility.
    //
    // ======================================================

    if (
        recordType ===
        RECORD_TYPES.DAIRY_FARM
    ) {

        const farmType =
            validateFarmType(
                body.farmType
            );


        const code =
            await getNextNegativeCode();


        recordData.code =
            code;


        recordData.type =
            farmType;


        recordData.assetCode =
            null;


        recordData.storageNumber =
            null;


        recordData.dateOfBirth =
            null;


        recordData.mass =
            0;


        recordData.isMilking =
            false;


        /*
         * --------------------------------------------------
         * CREATE FARM
         * --------------------------------------------------
         */

        let createdFarm;


        try {

            createdFarm =
                await Dairy.create(
                    recordData
                );

        } catch (error) {

            throw error;

        }


        /*
         * --------------------------------------------------
         * CREATE REQUIRED STORAGE
         * --------------------------------------------------
         *
         * The storage facility uses the newly created farm's
         * negative code as storageNumber.
         */

        let storage;


        try {

            storage =
                await createStorageForFarm(
                    createdFarm
                );

        } catch (error) {

            /*
             * ------------------------------------------------
             * ROLLBACK
             * ------------------------------------------------
             *
             * If storage creation fails, do not leave a farm
             * in the database without its required storage.
             */

            try {

                await Dairy.deleteOne({

                    _id:
                        createdFarm._id

                });

            } catch (rollbackError) {

                console.error(
                    "Dairy Farm rollback failed:",
                    rollbackError
                );

            }


            throw error;

        }


        /*
         * --------------------------------------------------
         * SUCCESS
         * --------------------------------------------------
         */

        return {

            record:
                createdFarm,

            storage,

            code,

            storageNumber:
                code,

            recordType

        };

    }


    // ======================================================
    // ANIMAL
    // ======================================================

    if (
        recordType ===
        RECORD_TYPES.ANIMAL
    ) {

        // --------------------------------------------------
        // PARENT DAIRY FARM
        // --------------------------------------------------

        const assetCode =
            cleanString(
                body.assetCode
            );


        if (!assetCode) {

            throw createError(
                "Animal must belong to a Dairy Farm. Please select a Dairy Farm."
            );

        }


        await verifyDairyFarm(
            assetCode
        );


        // --------------------------------------------------
        // GENDER
        // --------------------------------------------------

        const gender =
            cleanString(
                body.gender
            ).toLowerCase();


        if (!gender) {

            throw createError(
                "Animal gender is required."
            );

        }


        if (
            !GENDER_TYPES.includes(
                gender
            )
        ) {

            throw createError(
                "Invalid animal gender."
            );

        }


        // --------------------------------------------------
        // DATE OF BIRTH
        // --------------------------------------------------

        const dateOfBirth =
            validateDate(
                body.dateOfBirth
            );


        // --------------------------------------------------
        // BREED
        // --------------------------------------------------

        const breed =
            validateBreed(
                body.type
            );


        // --------------------------------------------------
        // MASS
        // --------------------------------------------------

        let animalMass;


        if (
            body.mass !== undefined &&
            body.mass !== ""
        ) {

            animalMass =
                Number(
                    body.mass
                );


            if (
                !Number.isFinite(
                    animalMass
                ) ||
                animalMass < 0
            ) {

                throw createError(
                    "Animal mass must be a valid positive number."
                );

            }

        }


        // --------------------------------------------------
        // GENERATE ANIMAL CODE
        // --------------------------------------------------

        const code =
            await getNextPositiveCode(
                gender
            );


        recordData.code =
            code;


        recordData.assetCode =
            Number(
                assetCode
            );


        recordData.storageNumber =
            null;


        recordData.dateOfBirth =
            dateOfBirth;


        recordData.type =
            breed;


        if (
            animalMass !== undefined
        ) {

            recordData.mass =
                animalMass;

        }


        // --------------------------------------------------
        // MILKING
        // --------------------------------------------------

        const isFemale =
            gender === "female";


        if (
            isFemale &&
            body.isMilking !== undefined
        ) {

            recordData.isMilking =
                body.isMilking === true ||
                body.isMilking === "true" ||
                body.isMilking === "1" ||
                body.isMilking === "on";

        } else {

            recordData.isMilking =
                false;

        }


        // --------------------------------------------------
        // CREATE ANIMAL
        // --------------------------------------------------

        const created =
            await Dairy.create(
                recordData
            );


        return {

            record:
                created,

            code,

            assetCode:
                Number(
                    assetCode
                ),

            gender,

            breed,

            recordType

        };

    }


    // ======================================================
    // STRUCTURE / FACILITY
    // ======================================================

    if (
        recordType ===
        RECORD_TYPES.STRUCTURE
    ) {

        // --------------------------------------------------
        // STRUCTURE TYPE
        // --------------------------------------------------

        const structureType =
            validateStructureType(
                body.type
            );


        // --------------------------------------------------
        // OPTIONAL PARENT FARM
        // --------------------------------------------------

        const structureFarmCode =
            cleanString(
                body.structureFarmCode
            );


        if (
            structureFarmCode
        ) {

            await verifyDairyFarm(
                structureFarmCode
            );


            recordData.assetCode =
                Number(
                    structureFarmCode
                );

        } else {

            recordData.assetCode =
                null;

        }


        // --------------------------------------------------
        // STRUCTURE CODE
        // --------------------------------------------------

        recordData.code =
            null;


        recordData.storageNumber =
            null;


        recordData.type =
            structureType;


        // --------------------------------------------------
        // REMOVE ANIMAL-ONLY DATA
        // --------------------------------------------------

        recordData.dateOfBirth =
            null;


        recordData.mass =
            0;


        recordData.isMilking =
            false;


        // --------------------------------------------------
        // CREATE STRUCTURE
        // --------------------------------------------------

        const created =
            await Dairy.create(
                recordData
            );


        return {

            record:
                created,

            code:
                null,

            assetCode:
                recordData.assetCode,

            recordType

        };

    }


    // ======================================================
    // FALLBACK
    // ======================================================

    throw createError(
        "Unable to determine record type.",
        500
    );

}


// ==========================================================
// EXPORTS
// ==========================================================
//
// createStorageForFarm is intentionally NOT exported.
//
// Storage creation is an internal responsibility of
// Dairy Farm creation.
// ==========================================================

module.exports = {

    getAddPageData,

    createRecord

};