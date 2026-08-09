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
// DEFAULT BREEDS
// ==========================================================
//
// The EJS receives dairyBreeds from here.
//
// If your application already stores breeds somewhere else,
// replace this list with that source.
//
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
     * We need the existing Dairy records in order to
     * populate the Dairy Farm selector.
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
// Example:
//
// existing:
// -1
// -2
// -5
//
// next:
// -6
//
// This function does NOT trust the browser to supply a code.
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
// Example:
//
// existing:
// 1
// 2
// 7
//
// next:
// 8
//
// Again, the browser does not supply this.
//
// ==========================================================

async function getNextPositiveCode() {

    const lastAnimal =
        await Dairy.findOne({

            code: {
                $gt: 0
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
            Number(lastAnimal.code)
        )
    ) {

        return 1;

    }


    return (
        Number(lastAnimal.code) + 1
    );

}


// ==========================================================
// VERIFY DAIRY FARM
// ==========================================================
//
// assetCode must be the NEGATIVE CODE of an existing
// Dairy Farm.
//
// We intentionally do not accept a positive code here.
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
     * a parent must actually be a Dairy Farm.
     *
     * The negative code convention is the primary
     * identifier used by the current system.
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
     *
     * This preserves compatibility with an existing upload
     * middleware.
     *
     * Adjust the saved field below only if your Dairy model
     * uses a different image field.
     */

    let profileImage;


    if (file) {

        /*
         * If the upload middleware has already produced
         * a filename/path, use that.
         */

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
     * Only add profileImage when an image was actually
     * supplied.
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
     * Negative code generated by backend.
     *
     * No assetCode.
     *
     * No dateOfBirth.
     *
     * No animal mass.
     *
     * Farm type becomes `type`.
     *
     * No parent Dairy Farm.
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
         * A Dairy Farm cannot belong to another
         * Dairy Farm.
         */

        recordData.assetCode =
            null;


        /*
         * Explicitly prevent animal-only fields.
         */

        recordData.dateOfBirth =
            undefined;

        recordData.mass =
            undefined;


        /*
         * Create the record.
         */

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
     * Positive code generated by backend.
     *
     * assetCode = negative parent Dairy Farm code.
     * ======================================================
     */

    if (
        recordType ===
        RECORD_TYPES.ANIMAL
    ) {

        const assetCode =
            cleanString(
                body.assetCode
            );


        /*
         * Animal MUST belong to a Dairy Farm.
         */

        if (!assetCode) {

            throw createError(
                "Animal must belong to a Dairy Farm. Please select a Dairy Farm."
            );

        }


        await verifyDairyFarm(
            assetCode
        );


        /*
         * Date of birth is required for animals.
         */

        const dateOfBirth =
            validateDate(
                body.dateOfBirth
            );


        /*
         * Breed is required.
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
         * Mass is optional.
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
         * Generate the positive code here.
         */

        const code =
            await getNextPositiveCode();


        recordData.code =
            code;


        /*
         * IMPORTANT:
         *
         * assetCode is NOT generated as a new code.
         *
         * It is the negative code of the selected
         * parent Dairy Farm.
         */

        recordData.assetCode =
            Number(assetCode);


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

            recordType

        };

    }


    /*
     * ======================================================
     * STRUCTURE / FACILITY
     * ======================================================
     *
     * No code.
     *
     * Parent Dairy Farm is optional.
     *
     * If a parent is selected:
     *
     * assetCode = negative code of parent farm.
     * ======================================================
     */

    if (
        recordType ===
        RECORD_TYPES.STRUCTURE
    ) {

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
         * The EJS sends the optional parent farm as:
         *
         * structureFarmCode
         *
         * We convert that into the actual model field:
         *
         * assetCode
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

            /*
             * No parent farm.
             */

            recordData.assetCode =
                null;

        }


        /*
         * Structures/facilities receive NO dairy code.
         */

        recordData.code =
            null;


        recordData.type =
            structureType;


        /*
         * Structures do not receive animal-only fields.
         */

        recordData.dateOfBirth =
            undefined;

        recordData.mass =
            undefined;


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
     * This should never be reached because recordType
     * was validated above.
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