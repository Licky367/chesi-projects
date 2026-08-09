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
//     do not change
//
// ""
//     clear
//
// valid number
//     update
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
// OPTIONAL DATE
//
// undefined
//     do not change
//
// ""
//     clear
//
// valid date
//     update
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


    return String(value).trim();

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
            ? calculateAge(
                object.dateOfBirth
            )
            : null;


    object.ageText =
        identified
            ? calculateAgeText(
                object.dateOfBirth
            )
            : "";


    object.isFemale =

        identified &&

        Number(object.code) % 2 === 0;


    object.isStandaloneAsset =

        identified &&

        (
            object.assetCode === null ||

            object.assetCode === undefined
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
// GET DAIRY FARMS
// ==========================================================

async function getDairyFarms() {

    const farms =
        await Dairy
            .find({

                code: {
                    $lt: 0
                },

                assetCode:
                    null

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


    const standaloneAssets =
        allDairy.filter(
            isStandaloneAsset
        );


    const structures =
        allDairy.filter(
            isDairyFarm
        );


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


    if (
        body.profileImage !== undefined
    ) {

        assetData.profileImage =
            parseText(
                body.profileImage
            );

    }


    if (
        body.buyingPrice !== undefined
    ) {

        const value =
            parseNumber(
                body.buyingPrice,
                "Buying Price"
            );


        if (
            value !== null &&
            value !== undefined
        ) {

            assetData.buyingPrice =
                value;

        }

    }


    if (
        body.currentWorth !== undefined
    ) {

        const value =
            parseNumber(
                body.currentWorth,
                "Current Worth"
            );


        if (
            value !== null &&
            value !== undefined
        ) {

            assetData.currentWorth =
                value;

        }

    }


    if (
        body.valuationDate !== undefined
    ) {

        assetData.valuationDate =
            parseDate(
                body.valuationDate,
                "Valuation Date"
            );

    }


    void file;


    const asset =
        new Dairy(
            assetData
        );


    await asset.save();


    const saved =
        await Dairy
            .findById(
                asset._id
            )
            .lean();


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


    if (
        !isIdentifiedDairy(dairy) &&
        !isManualAsset(dairy)
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
// TRUE PARTIAL UPDATE
//
// Every editable field supplied by the browser is processed.
//
// Protected:
//
//     _id
//     code
//
// are NEVER changed.
//
// This function NEVER creates a document.
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
    // FARM PROTECTION
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


    // ======================================================
    // ITEM
    //
    // Legacy support.
    // ======================================================

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
    // Identified dairies only.
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
    // Identified dairies only.
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


        if (
            mass === null
        ) {

            dairy.mass =
                null;

        } else {

            dairy.mass =
                mass;

        }

    }


    // ======================================================
    // MILKING
    //
    // Identified dairies only.
    //
    // The controller converts the browser value into
    // true / false before it reaches this service.
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
    //
    // Supported because the controller allows it.
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
    // ASSET CODE
    //
    // This controls the parent Dairy Farm.
    //
    // Empty:
    //     identified dairy becomes standalone.
    //
    // Supplied negative farm code:
    //     asset becomes assigned to that farm.
    //
    // Manual assets:
    //     MUST have a farm.
    // ======================================================

    if (
        body.assetCode !== undefined
    ) {

        const supplied =
            body.assetCode;


        // --------------------------------------------------
        // CLEAR PARENT
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
    // PROTECTED FIELDS
    //
    // DO NOT assign:
    //
    //     dairy._id
    //     dairy.code
    //
    // They remain untouched.
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
    // RETURN ACTUAL DATABASE RECORD
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