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

function parseNumber(
    value,
    fieldName
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return undefined;

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
// RECORD TYPE
// ==========================================================

function isDairyFarm(
    record
) {

    if (!record) {

        return false;

    }


    if (
        record.code === null ||
        record.code === undefined
    ) {

        return false;

    }


    return Number(record.code) < 0;

}


function isIdentifiedDairy(
    record
) {

    if (!record) {

        return false;

    }


    if (
        record.code === null ||
        record.code === undefined
    ) {

        return false;

    }


    return Number(record.code) > 0;

}


function isManualAsset(
    record
) {

    if (!record) {

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
        ) &&

        (
            record.assetCode === null ||
            record.assetCode === undefined
        )

    );

}


// ==========================================================
// AGE
// ==========================================================

function calculateAge(
    dateOfBirth
) {

    if (!dateOfBirth) {

        return null;

    }


    const dob =
        new Date(dateOfBirth);


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
            dob.getMonth() ||

        (
            today.getMonth() ===
                dob.getMonth() &&

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

    if (!dateOfBirth) {

        return "";

    }


    const dob =
        new Date(dateOfBirth);


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

    if (!record) {

        return record;

    }


    const object =
        typeof record.toObject === "function"

            ? record.toObject({
                virtuals: true
            })

            : {
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
        isStandaloneAsset(
            object
        );


    object.isAssignedAsset =
        object.assetCode !== null &&
        object.assetCode !== undefined;


    return object;

}


// ==========================================================
// DECORATE ARRAY
// ==========================================================

function decorateRecords(
    records
) {

    return Array.isArray(records)

        ? records.map(
            decorateRecord
        )

        : [];

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


    if (!farm) {

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


    if (!farm) {

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

    const records =
        await Dairy
            .find({})
            .sort({

                name:
                    1

            })
            .lean();


    const standaloneAssets =
        records.filter(
            isStandaloneAsset
        );


    const structures =
        records.filter(
            isDairyFarm
        );


    const totalNetWorth =
        records.reduce(
            (
                total,
                record
            ) => {

                if (
                    record.status !==
                    "active"
                ) {

                    return total;

                }


                return (
                    total +
                    (
                        Number(
                            record.currentWorth
                        ) || 0
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
                    asset.status !==
                    "active"
                ) {

                    return total;

                }


                return (
                    total +
                    (
                        Number(
                            asset.currentWorth
                        ) || 0
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

    const farm =
        await findDairyFarmById(
            id
        );


    return {

        dairy:
            decorateRecord(
                farm
            ),

        structures:
            await getDairyFarms(),

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


    const name =
        String(
            body.name ||
            body.item ||
            ""
        ).trim();


    if (!name) {

        throw createError(
            "Name is required.",
            400
        );

    }


    const buyingPrice =
        parseNumber(
            body.buyingPrice,
            "Buying Price"
        );


    const currentWorth =
        parseNumber(
            body.currentWorth,
            "Current Worth"
        );


    const valuationDate =
        parseDate(
            body.valuationDate,
            "Valuation Date"
        );


    let profileImage =
        "";


    if (
        body.profileImage
    ) {

        profileImage =
            String(
                body.profileImage
            ).trim();

    }


    if (
        file
    ) {

        profileImage =
            file.path ||
            file.location ||
            file.filename ||
            profileImage;

    }


    const assetData = {

        profileImage,

        name,

        type:
            String(
                body.type || ""
            ).trim(),

        description:
            String(
                body.description || ""
            ).trim(),

        condition:
            String(
                body.condition || ""
            ).trim(),

        location:
            String(
                body.location || ""
            ).trim(),

        code:
            null,

        assetCode:
            Number(
                farm.code
            ),

        status:
            ALLOWED_STATUSES.includes(
                body.status
            )
                ? body.status
                : "active",

        acquisitionDate:
            new Date()

    };


    if (
        buyingPrice !== undefined
    ) {

        assetData.buyingPrice =
            buyingPrice;

    }


    if (
        currentWorth !== undefined
    ) {

        assetData.currentWorth =
            currentWorth;

    }


    if (
        valuationDate !== undefined
    ) {

        assetData.valuationDate =
            valuationDate;

    }


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


    const asset =
        await Dairy
            .findById(id)
            .lean();


    if (!asset) {

        throw createError(
            "Asset not found.",
            404
        );

    }


    if (
        isDairyFarm(
            asset
        )
    ) {

        throw createError(
            "A Dairy Farm cannot be edited as an asset.",
            400
        );

    }


    const identified =
        isIdentifiedDairy(
            asset
        );


    const manual =
        isManualAsset(
            asset
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


    const decorated =
        decorateRecord(
            asset
        );


    return {

        dairy:
            decorated,

        structures:
            await getDairyFarms(),

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
// THIS IS THE IMPORTANT PART.
//
// The controller sends:
//
// profileImage
// name
// dateOfBirth
// type
// mass
// isMilking
// buyingPrice
// currentWorth
// description
// condition
// location
// assetCode
// status
// valuationDate
// acquisitionDate
//
// Only submitted fields are changed.
//
// Anything not submitted remains untouched.
// ==========================================================

async function updateAsset(
    id,
    body = {}
) {

    // ======================================================
    // ID
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
    // FIND EXISTING DOCUMENT
    // ======================================================

    const asset =
        await Dairy
            .findById(id);


    if (!asset) {

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
            asset
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
            asset
        );


    const manual =
        isManualAsset(
            asset
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
            String(
                body.profileImage
            ).trim();


        if (image) {

            asset.profileImage =
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
            String(
                body.name
            ).trim();


        if (name) {

            asset.name =
                name;

        }

    }


    // ======================================================
    // DATE OF BIRTH
    // ======================================================

    if (
        identified &&
        body.dateOfBirth !== undefined
    ) {

        asset.dateOfBirth =
            parseDate(
                body.dateOfBirth,
                "Date of Birth"
            );

    }


    // ======================================================
    // TYPE
    // ======================================================

    if (
        body.type !== undefined
    ) {

        asset.type =
            String(
                body.type
            ).trim();

    }


    // ======================================================
    // MASS
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
            mass !== undefined
        ) {

            asset.mass =
                mass;

        }

    }


    // ======================================================
    // IS MILKING
    // ======================================================

    if (
        identified &&
        body.isMilking !== undefined
    ) {

        if (
            typeof body.isMilking === "boolean"
        ) {

            asset.isMilking =
                body.isMilking;

        } else {

            asset.isMilking =
                (
                    body.isMilking === "true" ||
                    body.isMilking === "1" ||
                    body.isMilking === "on"
                );

        }

    }


    // ======================================================
    // BUYING PRICE
    // ======================================================

    if (
        body.buyingPrice !== undefined
    ) {

        const value =
            parseNumber(
                body.buyingPrice,
                "Buying Price"
            );


        if (
            value !== undefined
        ) {

            asset.buyingPrice =
                value;

        }

    }


    // ======================================================
    // CURRENT WORTH
    // ======================================================

    if (
        body.currentWorth !== undefined
    ) {

        const value =
            parseNumber(
                body.currentWorth,
                "Current Worth"
            );


        if (
            value !== undefined
        ) {

            asset.currentWorth =
                value;

        }

    }


    // ======================================================
    // DESCRIPTION
    // ======================================================

    if (
        body.description !== undefined
    ) {

        asset.description =
            String(
                body.description
            ).trim();

    }


    // ======================================================
    // CONDITION
    // ======================================================

    if (
        body.condition !== undefined
    ) {

        asset.condition =
            String(
                body.condition
            ).trim();

    }


    // ======================================================
    // LOCATION
    // ======================================================

    if (
        body.location !== undefined
    ) {

        asset.location =
            String(
                body.location
            ).trim();

    }


    // ======================================================
    // STATUS
    // ======================================================

    if (
        body.status !== undefined
    ) {

        const status =
            String(
                body.status
            ).trim();


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


        asset.status =
            status;

    }


    // ======================================================
    // VALUATION DATE
    // ======================================================

    if (
        body.valuationDate !== undefined
    ) {

        asset.valuationDate =
            parseDate(
                body.valuationDate,
                "Valuation Date"
            );

    }


    // ======================================================
    // ACQUISITION DATE
    //
    // Supported if submitted.
    // ======================================================

    if (
        body.acquisitionDate !== undefined
    ) {

        asset.acquisitionDate =
            parseDate(
                body.acquisitionDate,
                "Acquisition Date"
            );

    }


    // ======================================================
    // PARENT FARM
    // ======================================================

    if (
        body.assetCode !== undefined
    ) {

        // --------------------------------------------------
        // EMPTY = STANDALONE IDENTIFIED DAIRY
        // --------------------------------------------------

        if (
            body.assetCode === "" ||
            body.assetCode === null
        ) {

            if (
                identified
            ) {

                asset.assetCode =
                    null;

            } else {

                throw createError(
                    "A manual asset must belong to a Dairy Farm.",
                    400
                );

            }

        }

        // --------------------------------------------------
        // ASSIGN TO FARM
        // --------------------------------------------------

        else {

            const farm =
                await findDairyFarmByCode(
                    body.assetCode
                );


            asset.assetCode =
                Number(
                    farm.code
                );

        }

    }


    // ======================================================
    // SAVE
    // ======================================================

    await asset.save();


    // ======================================================
    // RELOAD
    // ======================================================

    const updated =
        await Dairy
            .findById(
                asset._id
            )
            .lean();


    if (!updated) {

        throw createError(
            "Asset could not be retrieved after update.",
            500
        );

    }


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