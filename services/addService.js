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
// FARM TYPES
// ==========================================================

const FARM_TYPES = [

    "ranch",

    "zeroGrazing",

    "semiZeroGrazing",

    "pastureBased",

    "mixedFarming",

    "cooperative",

    "other"

];


// ==========================================================
// STRUCTURE TYPES
// ==========================================================

const STRUCTURE_TYPES = [

    "machine",

    "equipment",

    "tool",

    "building",

    "cowshed",

    "milkingParlour",

    "feedStore",

    "hayShed",

    "waterSystem",

    "fencing",

    "vehicle",

    "generator",

    "solarSystem",

    "other"

];


// ==========================================================
// GENDER TYPES
// ==========================================================

const GENDER_TYPES = [

    "male",

    "female"

];


// ==========================================================
// DEFAULT BREEDS
// ==========================================================

const DAIRY_BREEDS = [

    "Friesian",

    "Ayrshire",

    "Guernsey",

    "Jersey",

    "Brown Swiss",

    "Sahiwal",

    "Boran",

    "Crossbreed",

    "Other"

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


    const allowed = [

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
// GET ADD PAGE DATA
// ==========================================================

async function getAddPageData() {

    /*
     * Retrieve existing Dairy Farm records.
     *
     * Negative codes identify Dairy Farms.
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


    return {

        dairyBreeds:
            DAIRY_BREEDS,

        dairyFarms

    };

}


// ==========================================================
// FIND NEXT NEGATIVE DAIRY FARM CODE
// ==========================================================
//
// Dairy Farms use negative codes:
//
// -1
// -2
// -3
// -4
//
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
            Number(lastFarm.code)
        )
    ) {

        return -1;

    }


    return (
        Number(lastFarm.code) - 1
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
// The backend generates the code.
// The browser never supplies it.
//
// ==========================================================

async function getNextPositiveCode(
    gender
) {

    const normalizedGender =
        cleanString(
            gender
        ).toLowerCase();


    /*
     * Male = odd
     * Female = even
     */

    const isFemale =
        normalizedGender ===
        "female";


    const parity =
        isFemale
            ? 0
            : 1;


    /*
     * Find the highest existing positive code
     * belonging to the selected gender/parity.
     *
     * MongoDB $expr is used so parity is checked
     * directly against the code.
     */

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


    /*
     * If there are no existing animals of this
     * gender, start at:
     *
     * male   -> 1
     * female -> 2
     */

    if (
        !lastAnimal ||
        !Number.isFinite(
            Number(lastAnimal.code)
        )
    ) {

        return isFemale
            ? 2
            : 1;

    }


    /*
     * Move to the next number with the same parity.
     */

    return (
        Number(lastAnimal.code) + 2
    );

}


// ==========================================================
// VERIFY DAIRY FARM
// ==========================================================
//
// assetCode must be the NEGATIVE CODE of an existing
// Dairy Farm.
//
// ==========================================================

async function verifyDairyFarm(
    assetCode
) {

    const farmCode =
        Number(assetCode);


    if (
        !Number.isFinite(farmCode) ||
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


    /*
     * Extra protection:
     * the selected record must actually have
     * a negative Dairy Farm code.
     */

    if (
        Number(farm.code) >= 0
    ) {

        throw createError(
            "The selected record is not a Dairy Farm."
        );

    }


    return farm;

}


// ==========================================================
// VALIDATE DATE
// ==========================================================

function validateDate(
    value
) {

    const date =
        new Date(value);


    if (
        !value ||
        Number.isNaN(
            date.getTime()
        )
    ) {

        throw createError(
            "A valid Date of Birth is required."
        );

    }


    return date;

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


    const recordType =
        cleanString(
            body.recordType
        );


    const name =
        cleanString(
            body.name
        );


    /*
     * ======================================================
     * BASIC VALIDATION
     * ======================================================
     */

    if (!recordType) {

        throw createError(
            "Please select what you are adding."
        );

    }


    if (
        !Object.values(
            RECORD_TYPES
        ).includes(recordType)
    ) {

        throw createError(
            "Invalid record type."
        );

    }


    if (!name) {

        throw createError(
            "Name is required."
        );

    }


    /*
     * ======================================================
     * COMMON DATA
     * ======================================================
     */

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


    /*
     * ======================================================
     * PROFILE IMAGE
     * ======================================================
     */

    let profileImage;


    if (file) {

        profileImage =
            file.path ||
            file.location ||
            file.filename ||
            undefined;

    }


    /*
     * ======================================================
     * BASE RECORD
     * ======================================================
     */

    const recordData = {

        name,

        buyingPrice,

        currentWorth,

        description,

        condition,

        location,

        status

    };


    /*
     * Only add profileImage when supplied.
     */

    if (profileImage) {

        recordData.profileImage =
            profileImage;

    }


    /*
     * ======================================================
     * DAIRY FARM
     * ======================================================
     *
     * Negative code.
     *
     * Example:
     *
     * -1
     * -2
     * -3
     *
     * ======================================================
     */

    if (
        recordType ===
        RECORD_TYPES.DAIRY_FARM
    ) {

        const farmType =
            cleanString(
                body.farmType
            );


        if (!farmType) {

            throw createError(
                "Dairy Farm Type is required."
            );

        }


        if (
            !FARM_TYPES.includes(
                farmType
            )
        ) {

            throw createError(
                "Invalid Dairy Farm Type."
            );

        }


        const code =
            await getNextNegativeCode();


        recordData.code =
            code;


        recordData.type =
            farmType;


        /*
         * A Dairy Farm cannot belong to
         * another Dairy Farm.
         */

        recordData.assetCode =
            null;


        /*
         * Explicitly prevent animal-only data.
         */

        recordData.dateOfBirth =
            undefined;

        recordData.mass =
            undefined;

        recordData.gender =
            undefined;


        const created =
            await Dairy.create(
                recordData
            );


        return {

            record:
                created,

            code,

            recordType

        };

    }


    /*
     * ======================================================
     * ANIMAL
     * ======================================================
     *
     * Positive code.
     *
     * Gender controls parity:
     *
     * MALE:
     * 1, 3, 5, 7...
     *
     * FEMALE:
     * 2, 4, 6, 8...
     *
     * ======================================================
     */

    if (
        recordType ===
        RECORD_TYPES.ANIMAL
    ) {

        /*
         * --------------------------------------------------
         * PARENT DAIRY FARM
         * --------------------------------------------------
         */

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


        /*
         * --------------------------------------------------
         * GENDER
         * --------------------------------------------------
         */

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


        /*
         * --------------------------------------------------
         * DATE OF BIRTH
         * --------------------------------------------------
         */

        const dateOfBirth =
            validateDate(
                body.dateOfBirth
            );


        /*
         * --------------------------------------------------
         * BREED
         * --------------------------------------------------
         */

        const breed =
            cleanString(
                body.type
            );


        if (!breed) {

            throw createError(
                "Animal breed is required."
            );

        }


        /*
         * --------------------------------------------------
         * MASS
         * --------------------------------------------------
         */

        let animalMass;


        if (
            body.mass !== undefined &&
            body.mass !== ""
        ) {

            animalMass =
                Number(body.mass);


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


        /*
         * --------------------------------------------------
         * GENERATE CODE
         * --------------------------------------------------
         *
         * Gender determines whether the code is
         * even or odd.
         *
         * Male:
         *   1, 3, 5, 7...
         *
         * Female:
         *   2, 4, 6, 8...
         *
         */

        const code =
            await getNextPositiveCode(
                gender
            );


        recordData.code =
            code;


        /*
         * --------------------------------------------------
         * PARENT FARM
         * --------------------------------------------------
         */

        recordData.assetCode =
            Number(assetCode);


        /*
         * --------------------------------------------------
         * ANIMAL DATA
         * --------------------------------------------------
         */

        recordData.dateOfBirth =
            dateOfBirth;


        recordData.type =
            breed;


        recordData.gender =
            gender;


        if (
            animalMass !== undefined
        ) {

            recordData.mass =
                animalMass;

        }


        /*
         * --------------------------------------------------
         * CREATE ANIMAL
         * --------------------------------------------------
         */

        const created =
            await Dairy.create(
                recordData
            );


        return {

            record:
                created,

            code,

            assetCode:
                Number(assetCode),

            gender,

            recordType

        };

    }


    /*
     * ======================================================
     * STRUCTURE / FACILITY
     * ======================================================
     *
     * No dairy code.
     *
     * Parent Dairy Farm is optional.
     * ======================================================
     */

    if (
        recordType ===
        RECORD_TYPES.STRUCTURE
    ) {

        /*
         * --------------------------------------------------
         * STRUCTURE TYPE
         * --------------------------------------------------
         */

        const structureType =
            cleanString(
                body.type
            );


        if (!structureType) {

            throw createError(
                "Structure / Facility Type is required."
            );

        }


        if (
            !STRUCTURE_TYPES.includes(
                structureType
            )
        ) {

            throw createError(
                "Invalid Structure / Facility Type."
            );

        }


        /*
         * --------------------------------------------------
         * OPTIONAL PARENT FARM
         * --------------------------------------------------
         */

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


        /*
         * Structures receive no Dairy code.
         */

        recordData.code =
            null;


        recordData.type =
            structureType;


        /*
         * Structures do not receive animal-only data.
         */

        recordData.dateOfBirth =
            undefined;

        recordData.mass =
            undefined;

        recordData.gender =
            undefined;


        /*
         * --------------------------------------------------
         * CREATE STRUCTURE
         * --------------------------------------------------
         */

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


    /*
     * ======================================================
     * FALLBACK
     * ======================================================
     */

    throw createError(
        "Unable to determine record type.",
        500
    );

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getAddPageData,

    createRecord

};