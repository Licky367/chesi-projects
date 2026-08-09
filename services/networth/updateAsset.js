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

function isValidObjectId(id) {

    return mongoose.Types.ObjectId.isValid(
        id
    );

}


// ==========================================================
// TEXT
// ==========================================================

function parseText(value) {

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
// NUMBER
// ==========================================================

function parseNumber(
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
        number < 0
    ) {

        throw createError(
            `${fieldName} cannot be negative.`,
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

function parseBoolean(value) {

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
// DAIRY FARM
// ==========================================================

function isDairyFarm(record) {

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

function isIdentifiedDairy(record) {

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

function isManualAsset(record) {

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
// FIND PARENT DAIRY FARM
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
        await Dairy.findOne({

            code:
                numericCode,

            assetCode:
                null

        }).lean();


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
// AGE
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
// AGE TEXT
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


    object.isFemale =

        identified &&

        Number(
            object.code
        ) % 2 === 0;


    object.isManualAsset =
        isManualAsset(
            object
        );


    object.isDairyFarm =
        isDairyFarm(
            object
        );


    object.isStandaloneAsset =

        identified &&

        (
            object.assetCode === null ||

            object.assetCode === undefined
        );


    object.isAssignedAsset =

        object.assetCode !== null &&

        object.assetCode !== undefined;


    object.displayImage =

        object.displayImage ||

        object.profileImage ||

        "";


    return object;

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
    // FIND RECORD
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
    // DETERMINE RECORD TYPE
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

    if (
        file &&
        file.filename
    ) {

        dairy.profileImage =
            `/uploads/${file.filename}`;

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
    // TYPE / BREED
    // ======================================================

    if (
        body.type !== undefined
    ) {

        dairy.type =
            parseText(
                body.type
            );

    }


    // ======================================================
    // DATE OF BIRTH
    // ======================================================

    if (
        identified &&
        body.dateOfBirth !== undefined
    ) {

        const dateOfBirth =
            parseDate(
                body.dateOfBirth,
                "Date of Birth"
            );


        if (
            dateOfBirth &&
            dateOfBirth > new Date()
        ) {

            throw createError(
                "Date of Birth cannot be in the future.",
                400
            );

        }


        dairy.dateOfBirth =
            dateOfBirth;

    }


    // ======================================================
    // MASS
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
    // ======================================================

    if (
        identified
    ) {

        const isFemale =

            Number(
                dairy.code
            ) % 2 === 0;


        if (
            isFemale
        ) {

            /*
             * Checked checkbox:
             *     "true"
             *
             * Unchecked checkbox:
             *     field absent
             *
             * For this edit form, absence means false.
             */

            dairy.isMilking =

                parseBoolean(
                    body.isMilking
                );

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
            parseText(
                body.assetCode
            );


        // --------------------------------------------------
        // REMOVE PARENT
        // --------------------------------------------------

        if (
            !supplied
        ) {

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
    // MANUAL ASSET SAFETY
    // ======================================================

    if (
        manual &&
        (
            dairy.assetCode === null ||
            dairy.assetCode === undefined
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
    // We intentionally never modify:
    //
    //     _id
    //     code
    //     acquisitionDate
    //
    // These remain unchanged in MongoDB.
    // ======================================================


    // ======================================================
    // SAVE
    // ======================================================

    await dairy.save();


    // ======================================================
    // RELOAD
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
    // RETURN
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

    calculateAgeText

};