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
// Used only when the field was actually supplied.
//
// Empty/undefined values are not forced during edits.
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
// PARSE DATE
//
// Undefined:
//     Do not change existing value.
//
// null / empty:
//     Explicitly clear value.
//
// valid date:
//     Store date.
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
// Age is NEVER stored in MongoDB.
//
// It is calculated from:
//
//     dateOfBirth
//
// every time the record is read.
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
// AGE TEXT
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


    if (years < 0) {

        return "";

    }


    return (
        `${years} years, ` +
        `${months} months, ` +
        `${days} days`
    );

}


// ==========================================================
// ADD DISPLAY DATA
//
// Adds calculated values without saving them.
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

    "Crossbreed",

    "Other"

];


// ==========================================================
// RECORD TYPE HELPERS
// ==========================================================


// ==========================================================
// DAIRY FARM / STRUCTURE
//
// code < 0
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
// IDENTIFIED DAIRY / ANIMAL
//
// code > 0
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
// code === null
// assetCode exists
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
// STANDALONE IDENTIFIED ASSET
//
// code > 0
// assetCode = null
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


    // ======================================================
    // STANDALONE IDENTIFIED ASSETS
    // ======================================================

    const standaloneAssets =
        allDairy.filter(
            function(dairy) {

                return isStandaloneAsset(
                    dairy
                );

            }
        );


    // ======================================================
    // DAIRY FARMS
    // ======================================================

    const structures =
        allDairy.filter(
            function(dairy) {

                return isDairyFarm(
                    dairy
                );

            }
        );


    // ======================================================
    // TOTAL NET WORTH
    //
    // Only active records contribute.
    // ======================================================

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


    // ======================================================
    // FARM TOTAL
    // ======================================================

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
// ==========================================================

async function addAsset(
    id,
    body = {}
) {

    // ======================================================
    // FIND PARENT FARM
    // ======================================================

    const dairy =
        await findDairyFarmById(
            id
        );


    const farmCode =
        Number(
            dairy.code
        );


    // ======================================================
    // NAME
    //
    // Required when creating a new asset.
    // ======================================================

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


    // ======================================================
    // TYPE
    //
    // Optional.
    //
    // Existing database design allows empty type.
    // ======================================================

    const type =
        body.type !== undefined
            ? String(
                body.type
            ).trim()
            : "";


    // ======================================================
    // DESCRIPTION
    // ======================================================

    const description =
        body.description !== undefined
            ? String(
                body.description
            ).trim()
            : "";


    // ======================================================
    // CONDITION
    // ======================================================

    const condition =
        body.condition !== undefined
            ? String(
                body.condition
            ).trim()
            : "";


    // ======================================================
    // LOCATION
    // ======================================================

    const location =
        body.location !== undefined
            ? String(
                body.location
            ).trim()
            : "";


    // ======================================================
    // BUYING PRICE
    // ======================================================

    const buyingPrice =
        parseMoneyIfProvided(
            body.buyingPrice,
            "Buying Price"
        );


    // ======================================================
    // CURRENT WORTH
    // ======================================================

    const currentWorth =
        parseMoneyIfProvided(
            body.currentWorth,
            "Current Worth"
        );


    // ======================================================
    // STATUS
    // ======================================================

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


    // ======================================================
    // PROFILE IMAGE
    // ======================================================

    const profileImage =
        body.profileImage !== undefined
            ? String(
                body.profileImage
            ).trim()
            : "";


    // ======================================================
    // CREATE DATA
    // ======================================================

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


    // ======================================================
    // OPTIONAL MONEY FIELDS
    // ======================================================

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


    // ======================================================
    // OPTIONAL VALUATION DATE
    // ======================================================

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


    // ======================================================
    // CREATE
    // ======================================================

    const asset =
        new Dairy(
            assetData
        );


    await asset.save();


    return decorateRecord(
        asset
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


    if (!dairy) {

        throw createError(
            "Asset not found.",
            404
        );

    }


    // ======================================================
    // DAIRY FARM IS NOT AN ASSET
    // ======================================================

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
    // FIND RECORD
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
    // CANNOT EDIT FARM AS ASSET
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
    // RECORD TYPE
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
    // Only update if supplied.
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
    // Only update if supplied.
    //
    // Empty submission means:
    //
    //     keep existing database value
    //
    // This prevents unrelated edits from failing
    // because an input was absent or blank.
    // ======================================================

    if (
        body.name !== undefined ||
        body.item !== undefined
    ) {

        const suppliedName =
            body.name !== undefined
                ? body.name
                : body.item;


        const name =
            String(
                suppliedName || ""
            ).trim();


        if (name) {

            dairy.name =
                name;

        }

    }


    // ======================================================
    // TYPE / BREED
    //
    // Only update when supplied and non-empty.
    //
    // IMPORTANT:
    //
    // We do NOT reject an existing value merely because
    // it is not currently in DAIRY_BREEDS.
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
    // Only identified dairies use DOB.
    //
    // Empty value explicitly clears DOB.
    //
    // Age will automatically become null.
    // ======================================================

    if (
        identified &&
        body.dateOfBirth !== undefined
    ) {

        const dateOfBirth =
            parseDateIfProvided(
                body.dateOfBirth,
                "Date of Birth"
            );


        dairy.dateOfBirth =
            dateOfBirth;

    }


    // ======================================================
    // BUYING PRICE
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
    // Optional update.
    //
    // Existing value is preserved if not submitted.
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
    // ASSET LOCATION
    // ======================================================


    // ======================================================
    // MANUAL ASSET
    //
    // MUST ALWAYS HAVE A FARM.
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


        /*
         * Preserve the existing parent when
         * assetCode wasn't submitted.
         */

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
    // OR
    //
    //     assigned to a Dairy Farm.
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
    // We intentionally do NOT touch:
    //
    //     dairy.code
    //
    // Therefore:
    //
    // identified dairy:
    //     code > 0
    //
    // manual asset:
    //     code = null
    //
    // farm:
    //     code < 0
    // ======================================================


    // ======================================================
    // SAVE
    // ======================================================

    await dairy.save();


    // ======================================================
    // RE-READ FROM DATABASE
    //
    // This ensures the returned record is the actual
    // persisted database state.
    // ======================================================

    const updated =
        await Dairy
            .findById(
                dairy._id
            )
            .lean();


    // ======================================================
    // RETURN DECORATED RECORD
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