// ==========================================================
// services/networth/updateAsset.js
// ==========================================================

const mongoose =
    require("mongoose");

const Dairy =
    require("../../models/dairy");


// ==========================================================
// CONSTANTS
// ==========================================================

const ALLOWED_STATUSES = [

    "active",

    "sold",

    "disposed",

    "inactive"

];


// ==========================================================
// DAIRY BREEDS
// ==========================================================

const DAIRY_BREEDS = [

    "Friesian",

    "Ayrshire",

    "Guernsey",

    "Jersey",

    "Brown Swiss",

    "Sahiwal",

    "Boran",

    "Ankole",

    "Fleckvieh",

    "Simmental",

    "Holstein",

    "Crossbreed",

    "Other"

];


// ==========================================================
// ERROR HELPER
// ==========================================================

function createError(
    message,
    statusCode = 500
) {

    const error =
        new Error(message);

    error.statusCode =
        statusCode;

    return error;

}


// ==========================================================
// OBJECT ID
// ==========================================================

function isValidObjectId(
    id
) {

    return mongoose.Types.ObjectId.isValid(
        id
    );

}


// ==========================================================
// NUMBER
// ==========================================================

function parseNumber(
    value,
    fieldName,
    options = {}
) {

    const {

        allowNull = true,

        nonNegative = true

    } = options;


    if (
        value === undefined
    ) {

        return undefined;

    }


    if (
        value === null ||
        value === ""
    ) {

        return allowNull
            ? null
            : undefined;

    }


    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        throw createError(
            `${fieldName} must be a valid number.`,
            400
        );

    }


    if (
        nonNegative &&
        number < 0
    ) {

        throw createError(
            `${fieldName} must be a non-negative number.`,
            400
        );

    }


    return number;

}


// ==========================================================
// DATE
// ==========================================================

function parseDate(
    value,
    fieldName
) {

    if (
        value === undefined
    ) {

        return undefined;

    }


    if (
        value === null ||
        value === ""
    ) {

        return null;

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        throw createError(
            `${fieldName} is invalid.`,
            400
        );

    }


    return date;

}


// ==========================================================
// BOOLEAN
// ==========================================================

function parseBoolean(
    value
) {

    if (
        typeof value === "boolean"
    ) {

        return value;

    }


    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return false;

    }


    const normalized =
        String(value)
            .trim()
            .toLowerCase();


    return (

        normalized === "true" ||

        normalized === "1" ||

        normalized === "yes" ||

        normalized === "on"

    );

}


// ==========================================================
// TEXT
// ==========================================================

function parseText(
    value
) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }


    return String(
        value
    ).trim();

}


// ==========================================================
// RECORD TYPE
// ==========================================================

function isDairyFarm(
    record
) {

    if (
        !record
    ) {

        return false;

    }


    if (
        record.code === null ||
        record.code === undefined
    ) {

        return false;

    }


    return Number(
        record.code
    ) < 0;

}


// ==========================================================
// IDENTIFIED DAIRY
// ==========================================================

function isIdentifiedDairy(
    record
) {

    if (
        !record
    ) {

        return false;

    }


    if (
        record.code === null ||
        record.code === undefined
    ) {

        return false;

    }


    return Number(
        record.code
    ) > 0;

}


// ==========================================================
// MANUAL ASSET
// ==========================================================

function isManualAsset(
    record
) {

    if (
        !record
    ) {

        return false;

    }


    const noCode =

        record.code === null ||

        record.code === undefined;


    const hasParent =

        record.assetCode !== null &&

        record.assetCode !== undefined;


    return (

        noCode &&

        hasParent

    );

}


// ==========================================================
// STANDALONE IDENTIFIED ASSET
// ==========================================================

function isStandaloneAsset(
    record
) {

    return (

        isIdentifiedDairy(
            record
        )

        &&

        (
            record.assetCode === null ||

            record.assetCode === undefined

        )

    );

}


// ==========================================================
// CALCULATE AGE
// ==========================================================

function calculateAge(
    dateOfBirth
) {

    if (
        !dateOfBirth
    ) {

        return null;

    }


    const dob =
        new Date(
            dateOfBirth
        );


    if (
        Number.isNaN(
            dob.getTime()
        )
    ) {

        return null;

    }


    const today =
        new Date();


    if (
        dob > today
    ) {

        return null;

    }


    let age =

        today.getFullYear() -

        dob.getFullYear();


    const birthdayNotReached =

        today.getMonth() <
            dob.getMonth()

        ||

        (

            today.getMonth() ===
                dob.getMonth()

            &&

            today.getDate() <
                dob.getDate()

        );


    if (
        birthdayNotReached
    ) {

        age--;

    }


    return age >= 0
        ? age
        : null;

}


// ==========================================================
// CALCULATE AGE TEXT
// ==========================================================

function calculateAgeText(
    dateOfBirth
) {

    if (
        !dateOfBirth
    ) {

        return "";

    }


    const dob =
        new Date(
            dateOfBirth
        );


    if (
        Number.isNaN(
            dob.getTime()
        )
    ) {

        return "";

    }


    const today =
        new Date();


    if (
        dob > today
    ) {

        return "";

    }


    let years =

        today.getFullYear() -

        dob.getFullYear();


    let months =

        today.getMonth() -

        dob.getMonth();


    let days =

        today.getDate() -

        dob.getDate();


    if (
        days < 0
    ) {

        months--;


        const previousMonth =
            new Date(

                today.getFullYear(),

                today.getMonth(),

                0

            );


        days +=
            previousMonth.getDate();

    }


    if (
        months < 0
    ) {

        years--;

        months += 12;

    }


    if (
        years < 0
    ) {

        return "";

    }


    return (

        `${years} years, ` +

        `${months} months, ` +

        `${days} days`

    );

}


// ==========================================================
// DECORATE RECORD
// ==========================================================

function decorateRecord(
    record
) {

    if (
        !record
    ) {

        return record;

    }


    const object =

        typeof record.toObject === "function"

            ?

        record.toObject({
            virtuals: true
        })

            :

        {
            ...record
        };


    const identified =
        isIdentifiedDairy(
            object
        );


    // ------------------------------------------------------
    // AGE
    // ------------------------------------------------------

    object.age =

        identified

            ?

        calculateAge(
            object.dateOfBirth
        )

            :

        null;


    object.ageText =

        identified

            ?

        calculateAgeText(
            object.dateOfBirth
        )

            :

        "";


    // ------------------------------------------------------
    // FEMALE
    //
    // Even code = female
    // Odd code = male
    // ------------------------------------------------------

    object.isFemale =

        identified &&

        Number(
            object.code
        ) % 2 === 0;


    // ------------------------------------------------------
    // ASSET FLAGS
    // ------------------------------------------------------

    object.isStandaloneAsset =

        isStandaloneAsset(
            object
        );


    object.isAssignedAsset =

        object.assetCode !== null &&

        object.assetCode !== undefined;


    object.isManualAsset =

        isManualAsset(
            object
        );


    object.isDairyFarm =

        isDairyFarm(
            object
        );


    // ------------------------------------------------------
    // DISPLAY IMAGE
    // ------------------------------------------------------

    object.displayImage =

        object.displayImage ||

        object.profileImage ||

        "";


    return object;

}


// ==========================================================
// FIND DAIRY FARM BY CODE
// ==========================================================

async function findDairyFarmByCode(
    code
) {

    const numericCode =
        Number(code);


    if (
        !Number.isFinite(
            numericCode
        ) ||

        numericCode >= 0
    ) {

        throw createError(
            "Invalid Dairy Farm code.",
            400
        );

    }


    const farm =
        await Dairy
            .findOne({

                code:
                    numericCode,

                assetCode:
                    null

            })
            .lean();


    if (
        !farm
    ) {

        throw createError(
            "Selected Dairy Farm was not found.",
            404
        );

    }


    return farm;

}


// ==========================================================
// UPDATE ASSET
// ==========================================================

async function updateAsset(
    id,
    body = {},
    file = null
) {

    // ======================================================
    // VALIDATE ID
    // ======================================================

    if (
        !isValidObjectId(id)
    ) {

        throw createError(
            "Invalid asset id.",
            400
        );

    }


    // ======================================================
    // FIND EXISTING RECORD
    // ======================================================

    const dairy =
        await Dairy.findById(
            id
        );


    if (
        !dairy
    ) {

        throw createError(
            "Asset not found.",
            404
        );

    }


    // ======================================================
    // NEVER EDIT A DAIRY FARM HERE
    // ======================================================

    if (
        isDairyFarm(
            dairy
        )
    ) {

        throw createError(
            "A Dairy Farm cannot be edited as an asset.",
            400
        );

    }


    // ======================================================
    // DETERMINE RECORD TYPE
    // ======================================================

    const identified =
        isIdentifiedDairy(
            dairy
        );


    const manual =
        isManualAsset(
            dairy
        );


    if (
        !identified &&
        !manual
    ) {

        throw createError(
            "The selected record is not a valid asset.",
            400
        );

    }


    // ======================================================
    // PROFILE IMAGE
    // ======================================================

    /*
     * A newly uploaded image always takes priority.
     */

    if (
        file &&
        file.filename
    ) {

        dairy.profileImage =
            `/uploads/${file.filename}`;

    }


    /*
     * Also support a controller that already
     * provides a profileImage path.
     */

    else if (
        body.profileImage !== undefined
    ) {

        const image =
            parseText(
                body.profileImage
            );


        if (
            image
        ) {

            dairy.profileImage =
                image;

        }

    }


    // ======================================================
    // NAME
    // ======================================================

    if (
        body.name !== undefined
    ) {

        const name =
            parseText(
                body.name
            );


        if (
            !name
        ) {

            throw createError(
                "Name cannot be empty.",
                400
            );

        }


        dairy.name =
            name;

    }


    // ======================================================
    // LEGACY ITEM FIELD
    // ======================================================

    else if (
        body.item !== undefined
    ) {

        const item =
            parseText(
                body.item
            );


        if (
            !item
        ) {

            throw createError(
                "Name cannot be empty.",
                400
            );

        }


        dairy.name =
            item;

    }


    // ======================================================
    // TYPE / BREED
    //
    // Identified dairy:
    //     Breed
    //
    // Manual asset:
    //     Asset Type
    //
    // Both use database field:
    //     type
    // ======================================================

    if (
        body.type !== undefined
    ) {

        const type =
            parseText(
                body.type
            );


        /*
         * An identified animal may have an empty breed.
         * Manual assets may also have an empty type.
         *
         * Therefore we do not force a value here unless
         * your schema itself requires it.
         */

        dairy.type =
            type;

    }


    // ======================================================
    // DATE OF BIRTH
    //
    // Only identified dairy records.
    // ======================================================

    if (
        identified &&
        body.dateOfBirth !== undefined
    ) {

        dairy.dateOfBirth =

            parseDate(
                body.dateOfBirth,
                "Date of Birth"
            );

    }


    // ======================================================
    // MASS
    //
    // Only identified dairy records.
    // ======================================================

    if (
        identified &&
        body.mass !== undefined
    ) {

        dairy.mass =

            parseNumber(
                body.mass,
                "Mass"
            );

    }


    // ======================================================
    // MILKING
    //
    // Only identified female dairy records.
    // ======================================================

    if (
        identified
    ) {

        const female =

            Number(
                dairy.code
            ) % 2 === 0;


        if (
            female
        ) {

            /*
             * HTML checkboxes are special:
             *
             * Checked:
             *     req.body.isMilking === "true"
             *
             * Unchecked:
             *     req.body.isMilking === undefined
             *
             * Since this page is specifically an edit form,
             * absence of the checkbox means FALSE.
             */

            if (
                body.isMilking !== undefined
            ) {

                dairy.isMilking =
                    parseBoolean(
                        body.isMilking
                    );

            }

            else {

                dairy.isMilking =
                    false;

            }

        }

    }


    // ======================================================
    // BUYING PRICE
    // ======================================================

    if (
        body.buyingPrice !== undefined
    ) {

        dairy.buyingPrice =

            parseNumber(
                body.buyingPrice,
                "Buying Price"
            );

    }


    // ======================================================
    // CURRENT WORTH
    // ======================================================

    if (
        body.currentWorth !== undefined
    ) {

        dairy.currentWorth =

            parseNumber(
                body.currentWorth,
                "Current Worth"
            );

    }


    // ======================================================
    // DESCRIPTION
    // ======================================================

    if (
        body.description !== undefined
    ) {

        dairy.description =

            parseText(
                body.description
            );

    }


    // ======================================================
    // CONDITION
    // ======================================================

    if (
        body.condition !== undefined
    ) {

        dairy.condition =

            parseText(
                body.condition
            );

    }


    // ======================================================
    // LOCATION
    // ======================================================

    if (
        body.location !== undefined
    ) {

        dairy.location =

            parseText(
                body.location
            );

    }


    // ======================================================
    // PARENT DAIRY FARM
    // ======================================================

    if (
        body.assetCode !== undefined
    ) {

        const supplied =
            body.assetCode;


        // --------------------------------------------------
        // REMOVE PARENT
        // --------------------------------------------------

        if (
            supplied === null ||
            supplied === ""
        ) {

            /*
             * Manual assets are never allowed to become
             * parentless.
             */

            if (
                manual
            ) {

                throw createError(
                    "A manual asset must belong to a Dairy Farm.",
                    400
                );

            }


            dairy.assetCode =
                null;

        }


        // --------------------------------------------------
        // ASSIGN PARENT
        // --------------------------------------------------

        else {

            const farm =
                await findDairyFarmByCode(
                    supplied
                );


            dairy.assetCode =
                Number(
                    farm.code
                );

        }

    }


    // ======================================================
    // MANUAL ASSET PARENT SAFETY
    // ======================================================

    if (
        manual &&
        (
            dairy.assetCode === null ||
            dairy.assetCode === undefined ||
            dairy.assetCode === ""
        )
    ) {

        throw createError(
            "A manual asset must belong to a Dairy Farm.",
            400
        );

    }


    // ======================================================
    // STATUS
    // ======================================================

    if (
        body.status !== undefined
    ) {

        const status =
            parseText(
                body.status
            );


        if (
            !status
        ) {

            throw createError(
                "Asset status cannot be empty.",
                400
            );

        }


        if (
            !ALLOWED_STATUSES.includes(
                status
            )
        ) {

            throw createError(
                "Invalid asset status.",
                400
            );

        }


        dairy.status =
            status;

    }


    // ======================================================
    // VALUATION DATE
    // ======================================================

    if (
        body.valuationDate !== undefined
    ) {

        dairy.valuationDate =

            parseDate(
                body.valuationDate,
                "Valuation Date"
            );

    }


    // ======================================================
    // PROTECTED FIELDS
    //
    // We intentionally DO NOT assign:
    //
    //     dairy._id
    //     dairy.code
    //     dairy.acquisitionDate
    //
    // The EJS does not submit those fields for editing.
    // ======================================================


    // ======================================================
    // SAVE
    // ======================================================

    await dairy.save();


    // ======================================================
    // RELOAD ACTUAL DATABASE RECORD
    // ======================================================

    const updated =
        await Dairy
            .findById(
                dairy._id
            )
            .lean();


    if (
        !updated
    ) {

        throw createError(
            "Asset could not be retrieved after update.",
            500
        );

    }


    // ======================================================
    // RETURN DECORATED DATABASE RECORD
    // ======================================================

    return decorateRecord(
        updated
    );

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    updateAsset,

    isDairyFarm,

    isIdentifiedDairy,

    isManualAsset,

    isStandaloneAsset,

    calculateAge,

    calculateAgeText,

    DAIRY_BREEDS

};