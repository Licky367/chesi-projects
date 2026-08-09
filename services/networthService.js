// ==========================================================
// services/networthService.js
// ==========================================================

const mongoose =
    require("mongoose");

const Dairy =
    require("../models/dairy");


// ==========================================================
// HELPERS
// ==========================================================

function isValidObjectId(id) {

    return mongoose.Types.ObjectId.isValid(id);

}


// ==========================================================
// CREATE ERROR
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
// NUMBER HELPER
// ==========================================================

function toNumber(value) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;

}


// ==========================================================
// PARSE MONEY
//
// Used when a money field is supplied.
//
// undefined / null / ""
//     means "do not change existing value"
// ==========================================================

function parseMoneyIfProvided(
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
        !Number.isFinite(number) ||
        number < 0
    ) {

        throw createError(
            `${fieldName} must be a valid non-negative number.`,
            400
        );

    }


    return number;

}


// ==========================================================
// PARSE NUMBER
//
// Used for fields such as mass.
// ==========================================================

function parseNumberIfProvided(
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
        !Number.isFinite(number) ||
        number < 0
    ) {

        throw createError(
            `${fieldName} must be a valid non-negative number.`,
            400
        );

    }


    return number;

}


// ==========================================================
// PARSE DATE
//
// undefined
//     Do not modify the existing value.
//
// null / ""
//     Explicitly clear the value.
//
// valid date
//     Store the date.
// ==========================================================

function parseDateIfProvided(
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
// CALCULATE AGE
//
// Age is display-only.
// It is NEVER stored in MongoDB.
// ==========================================================

function calculateAge(
    dateOfBirth
) {

    if (!dateOfBirth) {

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


    let age =
        today.getFullYear() -
        dob.getFullYear();


    const birthdayNotReached =
        today.getMonth() < dob.getMonth() ||
        (
            today.getMonth() === dob.getMonth() &&
            today.getDate() < dob.getDate()
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
//
// Example:
//
//     7 years, 4 months, 12 days
// ==========================================================

function calculateAgeText(
    dateOfBirth
) {

    if (!dateOfBirth) {

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
// RECORD TYPE HELPERS
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


    return (
        Number(record.code) < 0
    );

}


// ==========================================================
// IDENTIFIED DAIRY
//
// Positive numeric code.
// ==========================================================

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


    return (
        Number(record.code) > 0
    );

}


// ==========================================================
// MANUAL ASSET
//
// Manual assets:
//
//     code      = null
//     assetCode = Dairy Farm code
// ==========================================================

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


// ==========================================================
// STANDALONE IDENTIFIED DAIRY
//
// Positive code.
// No parent Dairy Farm.
// ==========================================================

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
// DECORATE ONE RECORD
//
// Adds display-only properties.
//
//     age
//     ageText
//     isFemale
//     isStandaloneAsset
//     isAssignedAsset
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


    return object;

}


// ==========================================================
// DECORATE ARRAY
// ==========================================================

function decorateRecords(
    records
) {

    return (
        Array.isArray(records)
            ? records.map(
                decorateRecord
            )
            : []
    );

}


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
// FIND DAIRY FARM BY ID
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


    const dairy =
        await Dairy
            .findById(id)
            .lean();


    if (!dairy) {

        throw createError(
            "Dairy Farm not found.",
            404
        );

    }


    if (
        !isDairyFarm(
            dairy
        )
    ) {

        throw createError(
            "The selected record is not a Dairy Farm.",
            404
        );

    }


    return dairy;

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


    if (!farm) {

        throw createError(
            "Selected Dairy Farm was not found.",
            404
        );

    }


    return farm;

}


// ==========================================================
// GET ALL DAIRY FARMS
// ==========================================================

async function getDairyFarms() {

    const structures =
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
        structures
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
    // STANDALONE IDENTIFIED DAIRY
    // ------------------------------------------------------

    const standaloneAssets =
        allDairy.filter(
            function(dairy) {

                return isStandaloneAsset(
                    dairy
                );

            }
        );


    // ------------------------------------------------------
    // DAIRY FARMS
    // ------------------------------------------------------

    const structures =
        allDairy.filter(
            function(dairy) {

                return isDairyFarm(
                    dairy
                );

            }
        );


    // ------------------------------------------------------
    // TOTAL NET WORTH
    //
    // Includes all active records:
    //
    //     Dairy Farms
    //     Identified dairies
    //     Manual assets
    //
    // Excludes inactive/sold/disposed records.
    // ------------------------------------------------------

    const totalNetWorth =
        allDairy.reduce(
            function(
                total,
                dairy
            ) {

                if (
                    dairy.status !== "active"
                ) {

                    return total;

                }


                return (
                    total +
                    toNumber(
                        dairy.currentWorth
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

    const dairy =
        await findDairyFarmById(
            id
        );


    const farmCode =
        Number(
            dairy.code
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
    // TOTAL VALUE OF ASSETS BELONGING TO FARM
    //
    // Only active assets count.
    // ------------------------------------------------------

    const dairyTotal =
        assets.reduce(
            function(
                total,
                asset
            ) {

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
                dairy
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
// GET ADD ASSET PAGE
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
//
// CREATION WORKFLOW ONLY.
//
// This function intentionally performs creation
// validation.
//
// It is NOT used by updateAsset().
// ==========================================================

async function addAsset(
    id,
    body = {},
    file = null
) {

    const dairy =
        await findDairyFarmById(
            id
        );


    const farmCode =
        Number(
            dairy.code
        );


    // ------------------------------------------------------
    // NAME
    // ------------------------------------------------------

    const suppliedName =
        body.name !== undefined
            ? body.name
            : body.item;


    const name =
        String(
            suppliedName || ""
        ).trim();


    if (!name) {

        throw createError(
            "Name is required when creating an asset.",
            400
        );

    }


    // ------------------------------------------------------
    // TEXT FIELDS
    // ------------------------------------------------------

    const type =
        body.type !== undefined
            ? String(
                body.type
            ).trim()
            : "";


    const description =
        body.description !== undefined
            ? String(
                body.description
            ).trim()
            : "";


    const condition =
        body.condition !== undefined
            ? String(
                body.condition
            ).trim()
            : "";


    const location =
        body.location !== undefined
            ? String(
                body.location
            ).trim()
            : "";


    // ------------------------------------------------------
    // MONEY
    // ------------------------------------------------------

    const buyingPrice =
        parseMoneyIfProvided(
            body.buyingPrice,
            "Buying Price"
        );


    const currentWorth =
        parseMoneyIfProvided(
            body.currentWorth,
            "Current Worth"
        );


    // ------------------------------------------------------
    // STATUS
    // ------------------------------------------------------

    let status =
        body.status !== undefined
            ? String(
                body.status
            ).trim()
            : "active";


    if (!status) {

        status =
            "active";

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


    // ------------------------------------------------------
    // PROFILE IMAGE
    // ------------------------------------------------------

    let profileImage = "";


    if (
        body.profileImage !== undefined &&
        body.profileImage !== null
    ) {

        profileImage =
            String(
                body.profileImage
            ).trim();

    }


    // ------------------------------------------------------
    // NOTE ABOUT FILE
    // ------------------------------------------------------
    //
    // The controller passes req.file as the third argument.
    //
    // This service does not attempt to upload the raw file.
    //
    // The upload middleware/storage layer should convert it
    // into a usable path or URL and place that path/URL into
    // body.profileImage before creation.
    //
    // Keeping this argument here preserves compatibility with
    // the controller without incorrectly saving a multer file
    // object into MongoDB.
    // ------------------------------------------------------

    void file;


    // ------------------------------------------------------
    // CREATE DATA
    // ------------------------------------------------------

    const assetData = {

        profileImage,

        name,

        type,

        description,

        condition,

        location,

        code:
            null,

        assetCode:
            farmCode,

        status,

        acquisitionDate:
            new Date()

    };


    // ------------------------------------------------------
    // BUYING PRICE
    // ------------------------------------------------------

    if (
        buyingPrice !== undefined
    ) {

        assetData.buyingPrice =
            buyingPrice;

    }


    // ------------------------------------------------------
    // CURRENT WORTH
    // ------------------------------------------------------

    if (
        currentWorth !== undefined
    ) {

        assetData.currentWorth =
            currentWorth;

    }


    // ------------------------------------------------------
    // VALUATION DATE
    // ------------------------------------------------------

    const valuationDate =
        parseDateIfProvided(
            body.valuationDate,
            "Valuation Date"
        );


    if (
        valuationDate !== undefined
    ) {

        assetData.valuationDate =
            valuationDate;

    }


    // ------------------------------------------------------
    // CREATE
    // ------------------------------------------------------

    const asset =
        new Dairy(
            assetData
        );


    await asset.save();


    // ------------------------------------------------------
    // RETURN PERSISTED RECORD
    // ------------------------------------------------------

    const savedAsset =
        await Dairy
            .findById(
                asset._id
            )
            .lean();


    return decorateRecord(
        savedAsset
    );

}


// ==========================================================
// GET ASSET
//
// EDIT PAGE ONLY.
//
// No creation validation.
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


    if (!dairy) {

        throw createError(
            "Asset not found.",
            404
        );

    }


    // ------------------------------------------------------
    // A FARM IS NOT AN ASSET
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
    // VALID ASSET TYPES
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // FARM LIST
    // ------------------------------------------------------

    const structures =
        await getDairyFarms();


    // ------------------------------------------------------
    // DECORATED RECORD
    // ------------------------------------------------------

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
// PATCH-STYLE EDITING.
//
// Only fields actually supplied are considered.
//
// IMPORTANT:
//
// This function NEVER performs creation validation.
//
// Therefore:
//
//     missing name
//     missing DOB
//     missing currentWorth
//
// are all allowed.
//
// Protected fields:
//
//     _id
//     code
//
// are never modified.
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
            .findById(id);


    if (!dairy) {

        throw createError(
            "Asset not found.",
            404
        );

    }


    // ======================================================
    // FARM CANNOT BE EDITED AS AN ASSET
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
    // DETERMINE TYPE
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
    //
    // Only replace when a non-empty image path/URL
    // is supplied.
    // ======================================================

    if (
        body.profileImage !== undefined &&
        body.profileImage !== null
    ) {

        const profileImage =
            String(
                body.profileImage
            ).trim();


        if (profileImage) {

            dairy.profileImage =
                profileImage;

        }

    }


    // ======================================================
    // NAME
    //
    // Empty value:
    //     preserve existing value.
    // ======================================================

    if (
        body.name !== undefined
    ) {

        const name =
            String(
                body.name
            ).trim();


        if (name) {

            dairy.name =
                name;

        }

    }


    // ======================================================
    // ITEM
    //
    // Backwards compatibility.
    //
    // Only use it when name itself was not supplied.
    // ======================================================

    if (
        body.name === undefined &&
        body.item !== undefined
    ) {

        const item =
            String(
                body.item
            ).trim();


        if (item) {

            dairy.name =
                item;

        }

    }


    // ======================================================
    // TYPE / BREED
    //
    // Empty value preserves existing value.
    // ======================================================

    if (
        body.type !== undefined
    ) {

        const type =
            String(
                body.type
            ).trim();


        if (type) {

            dairy.type =
                type;

        }

    }


    // ======================================================
    // DATE OF BIRTH
    //
    // IDENTIFIED DAIRIES ONLY.
    //
    // undefined:
    //     preserve
    //
    // "":
    //     clear
    //
    // valid date:
    //     update
    // ======================================================

    if (
        identified &&
        body.dateOfBirth !== undefined
    ) {

        dairy.dateOfBirth =
            parseDateIfProvided(
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
            parseNumberIfProvided(
                body.mass,
                "Mass"
            );


        if (
            mass !== undefined
        ) {

            dairy.mass =
                mass;

        }

    }


    // ======================================================
    // MILKING
    //
    // IDENTIFIED DAIRIES ONLY.
    //
    // The controller has already converted the submitted
    // value to Boolean:
    //
    //     true
    //     false
    //
    // Therefore both values are meaningful.
    //
    // IMPORTANT:
    //
    // We only update this field when the controller actually
    // sends it.
    //
    // If it is omitted:
    //
    //     existing value remains unchanged.
    // ======================================================

    if (
        identified &&
        body.isMilking !== undefined
    ) {

        if (
            typeof body.isMilking === "boolean"
        ) {

            dairy.isMilking =
                body.isMilking;

        } else {

            dairy.isMilking =
                (
                    body.isMilking === true ||
                    body.isMilking === "true" ||
                    body.isMilking === "1" ||
                    body.isMilking === "on"
                );

        }

    }


    // ======================================================
    // BUYING PRICE
    //
    // Empty value:
    //     preserve existing value.
    // ======================================================

    if (
        body.buyingPrice !== undefined
    ) {

        const buyingPrice =
            parseMoneyIfProvided(
                body.buyingPrice,
                "Buying Price"
            );


        if (
            buyingPrice !== undefined
        ) {

            dairy.buyingPrice =
                buyingPrice;

        }

    }


    // ======================================================
    // CURRENT WORTH
    //
    // Empty value:
    //     preserve existing value.
    // ======================================================

    if (
        body.currentWorth !== undefined
    ) {

        const currentWorth =
            parseMoneyIfProvided(
                body.currentWorth,
                "Current Worth"
            );


        if (
            currentWorth !== undefined
        ) {

            dairy.currentWorth =
                currentWorth;

        }

    }


    // ======================================================
    // DESCRIPTION
    //
    // Empty value is allowed.
    // ======================================================

    if (
        body.description !== undefined
    ) {

        dairy.description =
            String(
                body.description
            ).trim();

    }


    // ======================================================
    // CONDITION
    //
    // Empty value is allowed.
    // ======================================================

    if (
        body.condition !== undefined
    ) {

        dairy.condition =
            String(
                body.condition
            ).trim();

    }


    // ======================================================
    // LOCATION
    //
    // Empty value is allowed.
    // ======================================================

    if (
        body.location !== undefined
    ) {

        dairy.location =
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


        if (status) {

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

    }


    // ======================================================
    // VALUATION DATE
    //
    // Empty:
    //     explicitly clear.
    // ======================================================

    if (
        body.valuationDate !== undefined
    ) {

        dairy.valuationDate =
            parseDateIfProvided(
                body.valuationDate,
                "Valuation Date"
            );

    }


    // ======================================================
    // ACQUISITION DATE
    //
    // Normally read-only in the UI.
    //
    // The controller currently allows it through for
    // compatibility, so the service handles it.
    // ======================================================

    if (
        body.acquisitionDate !== undefined
    ) {

        dairy.acquisitionDate =
            parseDateIfProvided(
                body.acquisitionDate,
                "Acquisition Date"
            );

    }


    // ======================================================
    // ASSET CODE / PARENT FARM
    // ======================================================


    // ======================================================
    // MANUAL ASSET
    //
    // Manual assets MUST always belong to a Dairy Farm.
    // ======================================================

    if (
        manual
    ) {

        if (
            body.assetCode !== undefined
        ) {

            if (
                body.assetCode === null ||
                body.assetCode === ""
            ) {

                throw createError(
                    "A manual asset must belong to a Dairy Farm.",
                    400
                );

            }


            const farm =
                await findDairyFarmByCode(
                    body.assetCode
                );


            dairy.assetCode =
                Number(
                    farm.code
                );

        }


        if (
            dairy.assetCode === null ||
            dairy.assetCode === undefined
        ) {

            throw createError(
                "A manual asset must belong to a Dairy Farm.",
                400
            );

        }

    }


    // ======================================================
    // IDENTIFIED DAIRY
    //
    // Can be:
    //
    //     standalone
    //
    // or:
    //
    //     assigned to a Dairy Farm
    //
    // Empty assetCode:
    //
    //     standalone
    //
    // Supplied farm code:
    //
    //     assigned
    // ======================================================

    if (
        identified &&
        body.assetCode !== undefined
    ) {

        if (
            body.assetCode === null ||
            body.assetCode === ""
        ) {

            dairy.assetCode =
                null;

        } else {

            const farm =
                await findDairyFarmByCode(
                    body.assetCode
                );


            dairy.assetCode =
                Number(
                    farm.code
                );

        }

    }


    // ======================================================
    // PROTECTED IDENTITY
    //
    // NEVER MODIFY:
    //
    //     dairy._id
    //     dairy.code
    //
    // They are intentionally never assigned above.
    // ======================================================


    // ======================================================
    // SAVE
    // ======================================================

    await dairy.save();


    // ======================================================
    // RE-READ FROM DATABASE
    //
    // Ensures the returned object represents the actual
    // persisted MongoDB document.
    // ======================================================

    const updated =
        await Dairy
            .findById(
                dairy._id
            )
            .lean();


    if (!updated) {

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