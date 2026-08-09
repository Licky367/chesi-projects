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


    /*
     * Get the allowed statuses from the model.
     *
     * This prevents the service from maintaining a
     * second independent status list.
     */

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


    /*
     * This fallback should normally never be required
     * because the current Dairy model exposes the static.
     */

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


    /*
     * Female = even
     * Male   = odd
     */

    const isFemale =
        normalizedGender ===
        "female";


    const parity =
        isFemale

            ? 0

            : 1;


    /*
     * Find the highest existing positive animal
     * code having the required parity.
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
     * No existing animal of this gender.
     */

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


    /*
     * Keep the same parity.
     */

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


    /*
     * Negative code confirms that this is a
     * Dairy Farm under the current model convention.
     */

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


    /*
     * Do not allow a future date of birth.
     */

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
//
// IMPORTANT:
//
// Breed comes directly from the Dairy model.
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


    /*
     * ======================================================
     * RECORD TYPE
     * ======================================================
     */

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


    /*
     * ======================================================
     * NAME
     * ======================================================
     */

    const name =
        cleanString(
            body.name
        );


    if (!name) {

        throw createError(
            "Name is required."
        );

    }


    /*
     * ======================================================
     * COMMON FINANCIAL DATA
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


    /*
     * ======================================================
     * COMMON TEXT DATA
     * ======================================================
     */

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
     * Only save profileImage when supplied.
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
     * Negative automatically generated code.
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
            validateFarmType(
                body.farmType
            );


        const code =
            await getNextNegativeCode();


        recordData.code =
            code;


        recordData.type =
            farmType;


        /*
         * Dairy Farms cannot belong to another
         * Dairy Farm.
         */

        recordData.assetCode =
            null;


        /*
         * Animal-only fields are cleared by the
         * model as well, but explicitly setting them
         * here keeps the service intent clear.
         */

        recordData.dateOfBirth =
            null;


        recordData.mass =
            0;


        recordData.isMilking =
            false;


        /*
         * Do not save gender.
         *
         * Gender is derived from positive animal codes
         * by the model's virtual.
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
     * Positive automatically generated code.
     *
     * Male:
     *   1, 3, 5, 7...
     *
     * Female:
     *   2, 4, 6, 8...
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
         *
         * IMPORTANT:
         *
         * This is validated against the breed list
         * defined in models/dairy.js.
         * --------------------------------------------------
         */

        const breed =
            validateBreed(
                body.type
            );


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


        /*
         * --------------------------------------------------
         * GENERATE ANIMAL CODE
         * --------------------------------------------------
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
            Number(
                assetCode
            );


        /*
         * --------------------------------------------------
         * ANIMAL DATA
         * --------------------------------------------------
         */

        recordData.dateOfBirth =
            dateOfBirth;


        recordData.type =
            breed;


        /*
         * Gender is intentionally NOT stored as
         * recordData.gender because the current model
         * derives gender from the animal code.
         *
         * Even code = Female
         * Odd code  = Male
         */


        if (
            animalMass !== undefined
        ) {

            recordData.mass =
                animalMass;

        }


        /*
         * --------------------------------------------------
         * MILKING
         * --------------------------------------------------
         *
         * Only females can be milking.
         *
         * The model also enforces this using the
         * generated code.
         */

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
                Number(
                    assetCode
                ),

            gender,

            breed,

            recordType

        };

    }


    /*
     * ======================================================
     * STRUCTURE / FACILITY
     * ======================================================
     *
     * code = null
     *
     * Parent Dairy Farm is optional.
     *
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
            validateStructureType(
                body.type
            );


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
         * --------------------------------------------------
         * STRUCTURE CODE
         * --------------------------------------------------
         *
         * Structures do not receive a Dairy code.
         */

        recordData.code =
            null;


        recordData.type =
            structureType;


        /*
         * --------------------------------------------------
         * REMOVE ANIMAL-ONLY DATA
         * --------------------------------------------------
         */

        recordData.dateOfBirth =
            null;


        recordData.mass =
            0;


        recordData.isMilking =
            false;


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