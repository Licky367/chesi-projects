// ==========================================================
// services/networthService.js
// ==========================================================
//
// NET WORTH SERVICE
//
// Handles:
//
//     • Net Worth dashboard
//     • Dairy Farm structures
//     • Manual structure / facility assets
//     • Individual asset retrieval
//     • Asset updates
//
// RECORD IDENTITY:
//
//     code < 0
//         Dairy Farm
//
//     code > 0
//         Animal
//
//     code === null
//         Structure / Facility / Equipment
//
// IMPORTANT:
//
//     _id
//     code
//     assetCode
//
// are system-controlled and are NEVER changed by updateAsset().
//
// STRUCTURE INFORMATION:
//
//     about
//     mission
//     refNo
//     vision
//
// `refNo` is the canonical field name used throughout this
// service. It matches the Net Worth edit form and controller.
//
// ==========================================================


const mongoose =
    require("mongoose");

const Dairy =
    require("../models/dairy");


// ==========================================================
// CONSTANTS
// ==========================================================

const ALLOWED_STATUSES =
    Dairy.DAIRY_STATUSES || [

        "active",
        "sold",
        "disposed",
        "inactive"

    ];


const DAIRY_BREEDS =
    Dairy.DAIRY_BREEDS || [];


const DAIRY_FARM_TYPES =
    Dairy.DAIRY_FARM_TYPES || [];


const STRUCTURE_TYPES =
    Dairy.STRUCTURE_TYPES || [];


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
// RECORD TYPE HELPERS
// ==========================================================
//
// Dairy model identity:
//
//     code < 0
//         Dairy Farm
//
//     code > 0
//         Animal
//
//     code === null
//         Structure / Facility / Equipment
//

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
// IS IDENTIFIED DAIRY / ANIMAL
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
// IS STRUCTURE
// ==========================================================

function isStructure(
    record
) {

    if (
        !record
    ) {

        return false;

    }


    return (

        record.code === null ||

        record.code === undefined

    );

}


// ==========================================================
// IS ASSIGNED ASSET
// ==========================================================

function isAssignedAsset(
    record
) {

    if (
        !record
    ) {

        return false;

    }


    return (

        record.assetCode !== null &&

        record.assetCode !== undefined

    );

}


// ==========================================================
// IS STANDALONE ASSET
// ==========================================================

function isStandaloneAsset(
    record
) {

    if (
        !record
    ) {

        return false;

    }


    return (

        isStructure(record) &&

        (
            record.assetCode === null ||

            record.assetCode === undefined
        )

    );

}


// ==========================================================
// IS MANUAL ASSET
// ==========================================================

function isManualAsset(
    record
) {

    return isStructure(
        record
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


    const structure =
        isStructure(
            object
        );


    // ======================================================
    // AGE
    // ======================================================

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


    // ======================================================
    // GENDER
    // ======================================================

    object.isFemale =

        identified &&

        Number(object.code) % 2 === 0;


    object.gender =

        identified

            ?

        (
            object.isFemale
                ? "Female"
                : "Male"
        )

            :

        null;


    // ======================================================
    // RECORD FLAGS
    // ======================================================

    object.isDairyFarm =
        isDairyFarm(
            object
        );


    object.isAnimal =
        identified;


    object.isStructure =
        structure;


    object.isManualAsset =
        structure;


    object.isAssignedAsset =
        isAssignedAsset(
            object
        );


    object.isStandaloneAsset =
        isStandaloneAsset(
            object
        );


    object.hasIdentity =
        identified;


    object.isIdentifiedDairy =
        identified;


    // ======================================================
    // MILKING
    // ======================================================

    object.isMilkingText =
        object.isMilking
            ? "Yes"
            : "No";


    // ======================================================
    // ASSET VALUE
    // ======================================================

    object.assetValue =
        toNumber(
            object.currentWorth
        );


    // ======================================================
    // ACTIVE ASSET
    // ======================================================

    object.isActiveAsset =
        object.status === "active";


    // ======================================================
    // DISPLAY IMAGE
    // ======================================================

    if (
        !object.displayImage
    ) {

        if (
            object.profileImage
        ) {

            if (
                /^https?:\/\//i.test(
                    object.profileImage
                )
            ) {

                object.displayImage =
                    object.profileImage;

            }

            else if (
                object.profileImage.startsWith("/")
            ) {

                object.displayImage =
                    object.profileImage;

            }

            else {

                object.displayImage =
                    `/uploads/${object.profileImage}`;

            }

        }

        else {

            object.displayImage =
                `https://ui-avatars.com/api/?name=` +
                `${encodeURIComponent(
                    object.name || "Dairy"
                )}`;

        }

    }


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
            DAIRY_BREEDS,

        structureTypes:
            STRUCTURE_TYPES

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
            DAIRY_BREEDS,

        structureTypes:
            STRUCTURE_TYPES

    };

}


// ==========================================================
// ADD ASSET
// ==========================================================
//
// Creates a manually-created Structure / Facility.
//
// Identity:
//
//     code = null
//
// Parent:
//
//     assetCode = negative Dairy Farm code
//
// Structure information:
//
//     about
//     mission
//     refNo
//     vision
//
// IMPORTANT:
//
//     `refNo` is the canonical reference-number field.
//
// ==========================================================

async function addAsset(
    id,
    body = {},
    file = null
) {

    // ======================================================
    // FIND PARENT FARM
    // ======================================================

    const farm =
        await findDairyFarmById(
            id
        );


    const farmCode =
        Number(
            farm.code
        );


    // ======================================================
    // NAME
    // ======================================================

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


    // ======================================================
    // TYPE
    // ======================================================

    const type =
        parseText(
            body.type
        );


    if (
        !type
    ) {

        throw createError(
            "Asset type is required.",
            400
        );

    }


    if (
        STRUCTURE_TYPES.length > 0 &&

        !STRUCTURE_TYPES.includes(
            type
        )
    ) {

        throw createError(
            "Invalid asset type.",
            400
        );

    }


    // ======================================================
    // STATUS
    // ======================================================

    const submittedStatus =
        body.status !== undefined

            ?

        parseText(
            body.status
        )

            :

        "active";


    if (
        !submittedStatus
    ) {

        throw createError(
            "Asset status cannot be empty.",
            400
        );

    }


    if (
        !ALLOWED_STATUSES.includes(
            submittedStatus
        )
    ) {

        throw createError(
            "Invalid asset status.",
            400
        );

    }


    // ======================================================
    // BASE ASSET
    // ======================================================

    const assetData = {

        // --------------------------------------------------
        // BASIC DATA
        // --------------------------------------------------

        name,

        type,

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


        // --------------------------------------------------
        // STRUCTURE / DAIRY INFORMATION
        // --------------------------------------------------

        about:
            parseText(
                body.about
            ),

        mission:
            parseText(
                body.mission
            ),

        refNo:
            parseText(
                body.refNo
            ),

        vision:
            parseText(
                body.vision
            ),


        // --------------------------------------------------
        // STATUS
        // --------------------------------------------------

        status:
            submittedStatus,


        // --------------------------------------------------
        // SYSTEM IDENTITY
        // --------------------------------------------------

        code:
            null,

        assetCode:
            farmCode,


        // --------------------------------------------------
        // ACQUISITION
        // --------------------------------------------------

        acquisitionDate:
            new Date()

    };


    // ======================================================
    // BUYING PRICE
    // ======================================================

    if (
        body.buyingPrice !== undefined
    ) {

        assetData.buyingPrice =
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

        assetData.currentWorth =
            parseNumber(
                body.currentWorth,
                "Current Worth"
            );

    }


    // ======================================================
    // VALUATION DATE
    // ======================================================

    if (
        body.valuationDate !== undefined
    ) {

        assetData.valuationDate =
            parseDate(
                body.valuationDate,
                "Valuation Date"
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

            assetData.profileImage =
                image;

        }

    }


    // ======================================================
    // MULTER FILE
    // ======================================================

    if (
        file &&
        file.filename
    ) {

        assetData.profileImage =
            `/uploads/${file.filename}`;

    }


    // ======================================================
    // SAVE
    // ======================================================

    const asset =
        new Dairy(
            assetData
        );


    await asset.save();


    // ======================================================
    // RELOAD
    // ======================================================

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
        !isStructure(dairy)
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
            DAIRY_BREEDS,

        structureTypes:
            STRUCTURE_TYPES

    };

}


// ==========================================================
// UPDATE ASSET
// ==========================================================
//
// Updates an existing animal or structure.
//
// NEVER changes:
//
//     _id
//     code
//     assetCode
//
// Editable fields:
//
//     name
//     type
//     about
//     mission
//     refNo
//     vision
//     description
//     condition
//     location
//     status
//     buyingPrice
//     currentWorth
//     valuationDate
//     acquisitionDate
//     profileImage
//     dateOfBirth
//     mass
//     isMilking
//
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
    // FIND ASSET
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
    // NEVER EDIT DAIRY FARM HERE
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


    const structure =
        isStructure(
            dairy
        );


    if (
        !identified &&
        !structure
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
    // TYPE
    // ======================================================

    if (
        body.type !== undefined
    ) {

        const type =
            parseText(
                body.type
            );


        if (
            !type
        ) {

            throw createError(
                "Asset type cannot be empty.",
                400
            );

        }


        if (
            structure &&

            STRUCTURE_TYPES.length > 0 &&

            !STRUCTURE_TYPES.includes(
                type
            )
        ) {

            throw createError(
                "Invalid structure type.",
                400
            );

        }


        dairy.type =
            type;

    }


    // ======================================================
    // ABOUT
    // ======================================================

    if (
        body.about !== undefined
    ) {

        dairy.about =
            parseText(
                body.about
            );

    }


    // ======================================================
    // MISSION
    // ======================================================

    if (
        body.mission !== undefined
    ) {

        dairy.mission =
            parseText(
                body.mission
            );

    }


    // ======================================================
    // REFERENCE NUMBER
    // ======================================================
    //
    // IMPORTANT:
    //
    // The application now uses:
    //
    //     refNo
    //
    // consistently.
    //
    // Do NOT use regNo here.
    //
    // ======================================================

    if (
        body.refNo !== undefined
    ) {

        dairy.refNo =
            parseText(
                body.refNo
            );

    }


    // ======================================================
    // VISION
    // ======================================================

    if (
        body.vision !== undefined
    ) {

        dairy.vision =
            parseText(
                body.vision
            );

    }


    // ======================================================
    // DATE OF BIRTH
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
    // FINAL IDENTITY SAFETY
    // ======================================================

    if (
        identified
    ) {

        if (
            dairy.assetCode === null ||
            dairy.assetCode === undefined
        ) {

            throw createError(
                "An animal must belong to a Dairy Farm.",
                400
            );

        }


        if (
            Number(
                dairy.assetCode
            ) >= 0
        ) {

            throw createError(
                "Animal assetCode must be the negative code of its parent Dairy Farm.",
                400
            );

        }

    }


    // ======================================================
    // STRUCTURE SAFETY
    // ======================================================

    if (
        structure
    ) {

        if (
            dairy.assetCode !== null &&

            dairy.assetCode !== undefined &&

            Number(
                dairy.assetCode
            ) >= 0
        ) {

            throw createError(
                "Structure assetCode must be the negative code of its parent Dairy Farm or null.",
                400
            );

        }

    }


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


    return decorateRecord(
        updated
    );

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    // ------------------------------------------------------
    // MAIN OPERATIONS
    // ------------------------------------------------------

    getNetWorth,

    getDairyFarm,

    getAddAsset,

    addAsset,

    getAsset,

    updateAsset,

    getDairyFarms,


    // ------------------------------------------------------
    // CONSTANTS
    // ------------------------------------------------------

    ALLOWED_STATUSES,

    DAIRY_BREEDS,

    DAIRY_FARM_TYPES,

    STRUCTURE_TYPES,


    // ------------------------------------------------------
    // HELPERS
    // ------------------------------------------------------

    calculateAge,

    calculateAgeText,

    isDairyFarm,

    isIdentifiedDairy,

    isStructure,

    isManualAsset,

    isAssignedAsset,

    isStandaloneAsset,

    decorateRecord,

    decorateRecords

};