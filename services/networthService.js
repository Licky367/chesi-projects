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
// Used only when the field is actually supplied.
//
// Empty values are ignored during editing.
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
//     Do not change existing value.
//
// null / ""
//     Explicitly clear value.
//
// valid value
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
// code = null
// AND belongs to a Dairy Farm.
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
// Adds display-only information.
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


    const standaloneAssets =
        allDairy.filter(
            function(dairy) {

                return isStandaloneAsset(
                    dairy
                );

            }
        );


    const structures =
        allDairy.filter(
            function(dairy) {

                return isDairyFarm(
                    dairy
                );

            }
        );


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
// CREATION RULES ONLY.
// ==========================================================

async function addAsset(
    id,
    body = {}
) {

    const dairy =
        await findDairyFarmById(
            id
        );


    const farmCode =
        Number(
            dairy.code
        );


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


    const assetData = {

        profileImage:
            body.profileImage
                ? String(
                    body.profileImage
                ).trim()
                : "",

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
//
// THIS IS AN EDIT PAGE.
//
// NO CREATION VALIDATION.
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
//
// EDITING RULE:
//
// Only fields actually submitted are changed.
//
// No creation validation.
// No required DOB.
// No required name.
// No required currentWorth.
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
    // FIND EXISTING DATABASE RECORD
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
    // DAIRY FARM CANNOT BE EDITED HERE
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
    //
    // Only replace when a new value is supplied.
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
    // IMPORTANT:
    //
    // Empty name does NOT cause an error.
    //
    // Existing value remains untouched.
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
    // TYPE / BREED
    //
    // Empty type is allowed.
    //
    // Existing value can therefore remain unchanged
    // when no meaningful value is supplied.
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
    // CRITICAL:
    //
    // NEVER REQUIRED.
    //
    // undefined:
    //     preserve existing value.
    //
    // "":
    //     clear existing DOB.
    //
    // valid date:
    //     update DOB.
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
    // Only relevant to identified animals.
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
    // Only relevant to identified animals.
    //
    // Checkbox handling:
    //
    // checked:
    //     body.isMilking = "true"
    //
    // unchecked:
    //     field is absent.
    // ======================================================

    if (
        identified &&
        (
            body.isMilking !== undefined ||
            body.isMilking === undefined
        )
    ) {

        /*
         * We only update this field when the request
         * actually represents the identified-animal
         * milking control.
         *
         * If the field is present:
         *     true/1/on/checked => true
         *
         * If absent:
         *     false
         *
         * This works correctly with a normal checkbox.
         */

        if (
            body.isMilking !== undefined
        ) {

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
    //     leave existing value untouched.
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
    //     leave existing value untouched.
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
    // Empty string is allowed.
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
    // Empty string is allowed.
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
    // Empty string is allowed.
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
    // Normally not submitted by the EJS because it is
    // read-only.
    //
    // If another trusted caller submits it, it can still
    // be handled here.
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

    // ------------------------------------------------------
    // MANUAL ASSET
    //
    // Must remain attached to a Dairy Farm.
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // IDENTIFIED ANIMAL
    //
    // Can be standalone or assigned.
    // ------------------------------------------------------

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
    //     _id
    //     code
    // ======================================================


    // ======================================================
    // SAVE
    // ======================================================

    await dairy.save();


    // ======================================================
    // RE-READ DATABASE
    //
    // This is important.
    //
    // The response is now the actual persisted record,
    // not merely the in-memory object.
    // ======================================================

    const updated =
        await Dairy
            .findById(
                dairy._id
            )
            .lean();


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