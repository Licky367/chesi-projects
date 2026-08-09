// ==========================================================
// services/networthService.js
// ==========================================================

const mongoose =
    require("mongoose");

const Dairy =
    require("../models/dairy");


// ==========================================================
// CONSTANTS
// ==========================================================

const ALLOWED_STATUSES = [

    "active",

    "sold",

    "disposed",

    "inactive"

];


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

function toNumber(
    value
) {

    const number =
        Number(value);


    return Number.isFinite(number)
        ? number
        : 0;

}


// ==========================================================
// OPTIONAL NUMBER
//
// undefined
//     field was not supplied
//
// null / ""
//     explicitly clear the field
//
// valid number
//     update field
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


    // ------------------------------------------------------
    // NOT SUPPLIED
    // ------------------------------------------------------

    if (
        value === undefined
    ) {

        return undefined;

    }


    // ------------------------------------------------------
    // CLEAR FIELD
    // ------------------------------------------------------

    if (
        value === null ||
        value === ""
    ) {

        if (
            allowNull
        ) {

            return null;

        }


        return undefined;

    }


    // ------------------------------------------------------
    // CONVERT
    // ------------------------------------------------------

    const number =
        Number(value);


    // ------------------------------------------------------
    // VALIDATE
    // ------------------------------------------------------

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
// OPTIONAL DATE
//
// undefined
//     do not modify
//
// null / ""
//     clear
//
// valid date
//     update
// ==========================================================

function parseDate(
    value,
    fieldName
) {

    // ------------------------------------------------------
    // NOT SUPPLIED
    // ------------------------------------------------------

    if (
        value === undefined
    ) {

        return undefined;

    }


    // ------------------------------------------------------
    // CLEAR
    // ------------------------------------------------------

    if (
        value === null ||
        value === ""
    ) {

        return null;

    }


    // ------------------------------------------------------
    // CONVERT
    // ------------------------------------------------------

    const date =
        new Date(value);


    // ------------------------------------------------------
    // VALIDATE
    // ------------------------------------------------------

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
// RECORD TYPES
// ==========================================================

// ----------------------------------------------------------
// DAIRY FARM
//
// code < 0
// ----------------------------------------------------------

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


    return (
        Number(record.code) < 0
    );

}


// ----------------------------------------------------------
// IDENTIFIED DAIRY
//
// code > 0
// ----------------------------------------------------------

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


    return (
        Number(record.code) > 0
    );

}


// ----------------------------------------------------------
// MANUAL ASSET
//
// code      = null / undefined
// assetCode = supplied
// ----------------------------------------------------------

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


// ----------------------------------------------------------
// STANDALONE IDENTIFIED ASSET
//
// code > 0
// no parent farm
// ----------------------------------------------------------

function isStandaloneAsset(
    record
) {

    if (
        !isIdentifiedDairy(
            record
        )
    ) {

        return false;

    }


    return (

        record.assetCode === null ||

        record.assetCode === undefined

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
            ? calculateAge(
                object.dateOfBirth
            )
            : null;


    // ------------------------------------------------------
    // AGE TEXT
    // ------------------------------------------------------

    object.ageText =
        identified
            ? calculateAgeText(
                object.dateOfBirth
            )
            : "";


    // ------------------------------------------------------
    // FEMALE
    //
    // Existing project convention:
    //
    // even code = female
    // odd code  = male
    // ------------------------------------------------------

    object.isFemale =

        identified &&

        Number(object.code) % 2 === 0;


    // ------------------------------------------------------
    // STANDALONE
    // ------------------------------------------------------

    object.isStandaloneAsset =

        identified &&

        (
            object.assetCode === null ||

            object.assetCode === undefined
        );


    // ------------------------------------------------------
    // ASSIGNED
    // ------------------------------------------------------

    object.isAssignedAsset =

        object.assetCode !== null &&

        object.assetCode !== undefined;


    // ------------------------------------------------------
    // MANUAL
    // ------------------------------------------------------

    object.isManualAsset =
        isManualAsset(
            object
        );


    // ------------------------------------------------------
    // FARM
    // ------------------------------------------------------

    object.isDairyFarm =
        isDairyFarm(
            object
        );


    return object;

}


// ==========================================================
// DECORATE ARRAY
// ==========================================================

function decorateRecords(
    records
) {

    if (
        !Array.isArray(records)
    ) {

        return [];

    }


    return records.map(
        decorateRecord
    );

}


// ==========================================================
// FIND FARM BY ID
// ==========================================================

async function findDairyFarmById(
    id
) {

    if (
        !isValidObjectId(id)
    ) {

        throw createError(
            "Invalid Dairy Farm id.",
            400
        );

    }


    const farm =
        await Dairy
            .findById(id)
            .lean();


    if (
        !farm
    ) {

        throw createError(
            "Dairy Farm not found.",
            404
        );

    }


    if (
        !isDairyFarm(
            farm
        )
    ) {

        throw createError(
            "The selected record is not a Dairy Farm.",
            400
        );

    }


    return farm;

}


// ==========================================================
// FIND FARM BY CODE
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


    // ------------------------------------------------------
    // A farm has:
    //
    // code < 0
    // and no parent assetCode
    //
    // We accept both null and missing assetCode.
    // ------------------------------------------------------

    const farm =
        await Dairy
            .findOne({

                code:
                    numericCode,

                $or: [

                    {
                        assetCode:
                            null
                    },

                    {
                        assetCode: {
                            $exists: false
                        }
                    }

                ]

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
// GET DAIRY FARMS
// ==========================================================

async function getDairyFarms() {

    const farms =
        await Dairy
            .find({

                code: {
                    $lt: 0
                },

                $or: [

                    {
                        assetCode:
                            null
                    },

                    {
                        assetCode: {
                            $exists: false
                        }
                    }

                ]

            })
            .sort({

                name:
                    1

            })
            .lean();


    return decorateRecords(
        farms
    );

}


// ==========================================================
// GET NET WORTH
// ==========================================================

async function getNetWorth() {

    const allDairy =
        await Dairy
            .find({})
            .sort({

                name:
                    1

            })
            .lean();


    // ------------------------------------------------------
    // STANDALONE IDENTIFIED ASSETS
    // ------------------------------------------------------

    const standaloneAssets =
        allDairy.filter(
            isStandaloneAsset
        );


    // ------------------------------------------------------
    // DAIRY FARMS
    // ------------------------------------------------------

    const structures =
        allDairy.filter(
            isDairyFarm
        );


    // ------------------------------------------------------
    // TOTAL NET WORTH
    //
    // Only ACTIVE records count.
    // ------------------------------------------------------

    const totalNetWorth =
        allDairy.reduce(

            (
                total,
                record
            ) => {

                if (
                    record.status !== "active"
                ) {

                    return total;

                }


                return (

                    total +

                    toNumber(
                        record.currentWorth
                    )

                );

            },

            0

        );


    return {

        totalNetWorth,

        standaloneAssets:
            decorateRecords(
                standaloneAssets
            ),

        structures:
            decorateRecords(
                structures
            )

    };

}


// ==========================================================
// GET DAIRY FARM
// ==========================================================

async function getDairyFarm(
    id
) {

    const farm =
        await findDairyFarmById(
            id
        );


    const farmCode =
        Number(
            farm.code
        );


    const assets =
        await Dairy
            .find({

                assetCode:
                    farmCode

            })
            .sort({

                name:
                    1

            })
            .lean();


    // ------------------------------------------------------
    // FARM TOTAL
    //
    // Only active assets count.
    // ------------------------------------------------------

    const dairyTotal =
        assets.reduce(

            (
                total,
                asset
            ) => {

                if (
                    asset.status !== "active"
                ) {

                    return total;

                }


                return (

                    total +

                    toNumber(
                        asset.currentWorth
                    )

                );

            },

            0

        );


    return {

        dairy:
            decorateRecord(
                farm
            ),

        assets:
            decorateRecords(
                assets
            ),

        dairyTotal,

        dairyBreeds:
            DAIRY_BREEDS

    };

}


// ==========================================================
// GET ADD ASSET
// ==========================================================

async function getAddAsset(
    id
) {

    const dairy =
        await findDairyFarmById(
            id
        );


    const structures =
        await getDairyFarms();


    return {

        dairy:
            decorateRecord(
                dairy
            ),

        structures,

        dairyBreeds:
            DAIRY_BREEDS

    };

}


// ==========================================================
// ADD ASSET
// ==========================================================

async function addAsset(
    id,
    body = {},
    file = null
) {

    const farm =
        await findDairyFarmById(
            id
        );


    const farmCode =
        Number(
            farm.code
        );


    // ------------------------------------------------------
    // NAME
    // ------------------------------------------------------

    const suppliedName =

        body.name !== undefined

            ?

        body.name

            :

        body.item;


    const name =
        parseText(
            suppliedName
        );


    if (
        !name
    ) {

        throw createError(
            "Name is required when creating an asset.",
            400
        );

    }


    // ------------------------------------------------------
    // CREATE DATA
    // ------------------------------------------------------

    const assetData = {

        name,

        type:
            parseText(
                body.type
            ),

        description:
            parseText(
                body.description
            ),

        condition:
            parseText(
                body.condition
            ),

        location:
            parseText(
                body.location
            ),

        code:
            null,

        assetCode:
            farmCode,

        status:
            "active",

        acquisitionDate:
            new Date()

    };


    // ------------------------------------------------------
    // STATUS
    // ------------------------------------------------------

    if (
        body.status !== undefined
    ) {

        const status =
            parseText(
                body.status
            );


        if (
            status &&
            !ALLOWED_STATUSES.includes(
                status
            )
        ) {

            throw createError(
                "Invalid asset status.",
                400
            );

        }


        if (
            status
        ) {

            assetData.status =
                status;

        }

    }


    // ------------------------------------------------------
    // PROFILE IMAGE
    // ------------------------------------------------------

    if (
        body.profileImage !== undefined
    ) {

        assetData.profileImage =
            parseText(
                body.profileImage
            );

    }


    // ------------------------------------------------------
    // BUYING PRICE
    // ------------------------------------------------------

    if (
        body.buyingPrice !== undefined
    ) {

        const buyingPrice =
            parseNumber(
                body.buyingPrice,
                "Buying Price"
            );


        if (
            buyingPrice !== null &&
            buyingPrice !== undefined
        ) {

            assetData.buyingPrice =
                buyingPrice;

        }

    }


    // ------------------------------------------------------
    // CURRENT WORTH
    // ------------------------------------------------------

    if (
        body.currentWorth !== undefined
    ) {

        const currentWorth =
            parseNumber(
                body.currentWorth,
                "Current Worth"
            );


        if (
            currentWorth !== null &&
            currentWorth !== undefined
        ) {

            assetData.currentWorth =
                currentWorth;

        }

    }


    // ------------------------------------------------------
    // VALUATION DATE
    // ------------------------------------------------------

    if (
        body.valuationDate !== undefined
    ) {

        assetData.valuationDate =
            parseDate(
                body.valuationDate,
                "Valuation Date"
            );

    }


    // ------------------------------------------------------
    // UPLOAD FILE
    //
    // The controller is responsible for converting req.file
    // into body.profileImage.
    //
    // The service deliberately does not save the Multer
    // object itself.
    // ------------------------------------------------------

    void file;


    // ------------------------------------------------------
    // CREATE
    // ------------------------------------------------------

    const asset =
        new Dairy(
            assetData
        );


    await asset.save();


    // ------------------------------------------------------
    // RELOAD
    // ------------------------------------------------------

    const saved =
        await Dairy
            .findById(
                asset._id
            )
            .lean();


    if (
        !saved
    ) {

        throw createError(
            "Asset could not be retrieved after creation.",
            500
        );

    }


    return decorateRecord(
        saved
    );

}


// ==========================================================
// GET ASSET
// ==========================================================

async function getAsset(
    id
) {

    if (
        !isValidObjectId(id)
    ) {

        throw createError(
            "Invalid asset id.",
            400
        );

    }


    const dairy =
        await Dairy
            .findById(id)
            .lean();


    if (
        !dairy
    ) {

        throw createError(
            "Asset not found.",
            404
        );

    }


    // ------------------------------------------------------
    // FARM IS NOT AN ASSET
    // ------------------------------------------------------

    if (
        isDairyFarm(
            dairy
        )
    ) {

        throw createError(
            "The selected record is a Dairy Farm, not an asset.",
            400
        );

    }


    // ------------------------------------------------------
    // VALID ASSET
    // ------------------------------------------------------

    if (

        !isIdentifiedDairy(
            dairy
        )

        &&

        !isManualAsset(
            dairy
        )

    ) {

        throw createError(
            "The selected record is not a valid asset.",
            400
        );

    }


    const structures =
        await getDairyFarms();


    const decorated =
        decorateRecord(
            dairy
        );


    return {

        dairy:
            decorated,

        structures,

        age:
            decorated.age,

        ageText:
            decorated.ageText,

        dairyBreeds:
            DAIRY_BREEDS

    };

}


// ==========================================================
// UPDATE ASSET
//
// TRUE PARTIAL UPDATE.
//
// Every field supplied by the controller is processed.
//
// Editable fields:
//
//     profileImage
//     name
//     item
//     type
//     dateOfBirth
//     mass
//     isMilking
//     buyingPrice
//     currentWorth
//     description
//     condition
//     location
//     assetCode
//     status
//     valuationDate
//     acquisitionDate
//
// Protected:
//
//     _id
//     code
//
// are NEVER modified.
// ==========================================================

async function updateAsset(
    id,
    body = {}
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
        await Dairy
            .findById(
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
    // NEVER EDIT A FARM THROUGH THIS METHOD
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
    // DETERMINE ASSET TYPE
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

    if (
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
            name
        ) {

            dairy.name =
                name;

        }

    }

    // ------------------------------------------------------
    // LEGACY ITEM FIELD
    // ------------------------------------------------------

    else if (
        body.item !== undefined
    ) {

        const item =
            parseText(
                body.item
            );


        if (
            item
        ) {

            dairy.name =
                item;

        }

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
    //
    // IDENTIFIED DAIRIES ONLY.
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
    // IDENTIFIED DAIRIES ONLY.
    // ======================================================

    if (
        identified &&
        body.mass !== undefined
    ) {

        const mass =
            parseNumber(
                body.mass,
                "Mass"
            );


        dairy.mass =
            mass;

    }


    // ======================================================
    // MILKING
    //
    // IDENTIFIED DAIRIES ONLY.
    //
    // Both true and false are legitimate values.
    // ======================================================

    if (
        identified &&
        body.isMilking !== undefined
    ) {

        dairy.isMilking =
            parseBoolean(
                body.isMilking
            );

    }


    // ======================================================
    // BUYING PRICE
    // ======================================================

    if (
        body.buyingPrice !== undefined
    ) {

        const buyingPrice =
            parseNumber(
                body.buyingPrice,
                "Buying Price"
            );


        dairy.buyingPrice =
            buyingPrice;

    }


    // ======================================================
    // CURRENT WORTH
    // ======================================================

    if (
        body.currentWorth !== undefined
    ) {

        const currentWorth =
            parseNumber(
                body.currentWorth,
                "Current Worth"
            );


        dairy.currentWorth =
            currentWorth;

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
    // ACQUISITION DATE
    // ======================================================

    if (
        body.acquisitionDate !== undefined
    ) {

        dairy.acquisitionDate =
            parseDate(
                body.acquisitionDate,
                "Acquisition Date"
            );

    }


    // ======================================================
    // PARENT DAIRY FARM
    //
    // assetCode controls assignment.
    //
    // "" / null:
    //
    //     identified dairy becomes standalone.
    //
    // negative farm code:
    //
    //     asset becomes assigned to that farm.
    //
    // manual asset:
    //
    //     cannot exist without a parent farm.
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
        // ASSIGN TO FARM
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
    //
    // A manual asset can NEVER be detached from a farm.
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
    // PROTECTED FIELDS
    //
    // We intentionally NEVER assign:
    //
    //     dairy._id
    //     dairy.code
    //
    // Therefore their existing values remain untouched.
    // ======================================================


    // ======================================================
    // SAVE
    // ======================================================

    await dairy.save();


    // ======================================================
    // RELOAD FROM DATABASE
    //
    // This is important.
    //
    // The controller receives the actual persisted document,
    // not merely the in-memory Mongoose object.
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
    // DECORATE
    // ======================================================

    return decorateRecord(
        updated
    );

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getNetWorth,

    getDairyFarm,

    getAddAsset,

    addAsset,

    getAsset,

    updateAsset,

    getDairyFarms,

    DAIRY_BREEDS,

    calculateAge,

    calculateAgeText

};