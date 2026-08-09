// ==========================================================
// services/addService.js
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
// ERROR
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
        value === undefined ||
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
// FILE PATH
//
// Your multer middleware stores files in:
//
// public/uploads/filename.ext
//
// Browser URL:
//
// /uploads/filename.ext
// ==========================================================

function getImagePath(
    file
) {

    if (!file) {

        return "";

    }


    if (
        file.filename
    ) {

        return `/uploads/${file.filename}`;

    }


    if (
        file.path
    ) {

        const normalized =
            String(file.path)
                .replace(/\\/g, "/");


        const marker =
            "/public/";


        const index =
            normalized.lastIndexOf(
                marker
            );


        if (
            index !== -1
        ) {

            return (
                "/" +
                normalized
                    .slice(
                        index + marker.length
                    )
            );

        }

    }


    return "";

}


// ==========================================================
// FIND DAIRY FARM
//
// Dairy Farms are identified by NEGATIVE code.
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
            "The selected Parent Dairy Farm does not exist.",
            404
        );

    }


    return farm;

}


// ==========================================================
// GET AVAILABLE DAIRY FARMS
// ==========================================================

async function getDairyFarms() {

    return Dairy
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

}


// ==========================================================
// GET ADD PAGE
// ==========================================================

async function getAddPage() {

    const structures =
        await getDairyFarms();


    return {

        structures,

        dairyBreeds:
            DAIRY_BREEDS

    };

}


// ==========================================================
// CREATE DAIRY / ASSET
// ==========================================================

async function createDairy(
    body = {},
    file = null
) {

    // ======================================================
    // NAME
    // ======================================================

    const name =
        parseText(
            body.name
        );


    if (
        !name
    ) {

        throw createError(
            "Name is required.",
            400
        );

    }


    // ======================================================
    // CODE
    //
    // EMPTY  = manual asset / structure
    // NEGATIVE = Dairy Farm
    // POSITIVE = identified dairy
    // ======================================================

    const rawCode =
        body.code;


    const hasCode =
        rawCode !== undefined &&
        rawCode !== null &&
        String(rawCode).trim() !== "";


    let code =
        null;


    if (
        hasCode
    ) {

        code =
            parseNumber(
                rawCode,
                "Dairy Code",
                {
                    allowNull: false,
                    nonNegative: false
                }
            );


        if (
            !Number.isInteger(
                code
            )
        ) {

            throw createError(
                "Dairy Code must be a whole number.",
                400
            );

        }


        if (
            code === 0
        ) {

            throw createError(
                "Dairy Code cannot be zero. Use a positive code for an animal, a negative code for a Dairy Farm, or leave it empty for a structure/manual asset.",
                400
            );

        }

    }


    const isDairyFarm =
        code !== null &&
        code < 0;


    const isIdentifiedDairy =
        code !== null &&
        code > 0;


    const isManualAsset =
        code === null;


    // ======================================================
    // TYPE
    // ======================================================

    const type =
        parseText(
            body.type
        );


    // ======================================================
    // BUILD DATA
    // ======================================================

    const dairyData = {

        name,

        code,

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

        status:
            "active",

        acquisitionDate:
            new Date()

    };


    // ======================================================
    // STATUS
    // ======================================================

    if (
        body.status !== undefined &&
        body.status !== null &&
        String(body.status).trim() !== ""
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
                "Invalid status.",
                400
            );

        }


        dairyData.status =
            status;

    }


    // ======================================================
    // PROFILE IMAGE
    // ======================================================

    const imagePath =
        getImagePath(
            file
        );


    if (
        imagePath
    ) {

        dairyData.profileImage =
            imagePath;

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


        if (
            buyingPrice !== null
        ) {

            dairyData.buyingPrice =
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
            parseNumber(
                body.currentWorth,
                "Current Worth"
            );


        if (
            currentWorth !== null
        ) {

            dairyData.currentWorth =
                currentWorth;

        }

    }


    // ======================================================
    // IDENTIFIED DAIRY ONLY
    //
    // DATE OF BIRTH
    // MASS
    // ======================================================

    if (
        isIdentifiedDairy
    ) {

        if (
            body.dateOfBirth !== undefined
        ) {

            const dateOfBirth =
                parseDate(
                    body.dateOfBirth,
                    "Date of Birth"
                );


            if (
                dateOfBirth
            ) {

                const now =
                    new Date();


                if (
                    dateOfBirth > now
                ) {

                    throw createError(
                        "Date of Birth cannot be in the future.",
                        400
                    );

                }


                dairyData.dateOfBirth =
                    dateOfBirth;

            }

        }


        if (
            body.mass !== undefined
        ) {

            const mass =
                parseNumber(
                    body.mass,
                    "Mass"
                );


            if (
                mass !== null
            ) {

                dairyData.mass =
                    mass;

            }

        }

    }


    // ======================================================
    // NON-IDENTIFIED RECORDS
    //
    // Do not accidentally store animal-specific data.
    // ======================================================

    else {

        delete dairyData.dateOfBirth;

        delete dairyData.mass;

    }


    // ======================================================
    // PARENT DAIRY FARM
    //
    // Allowed:
    //
    // 1. No code
    // 2. Positive code
    //
    // Not allowed:
    //
    // Negative code / Dairy Farm
    // ======================================================

    if (
        body.assetCode !== undefined
    ) {

        const suppliedAssetCode =
            parseText(
                body.assetCode
            );


        if (
            suppliedAssetCode
        ) {

            if (
                isDairyFarm
            ) {

                throw createError(
                    "A Dairy Farm cannot belong to another Dairy Farm.",
                    400
                );

            }


            const farm =
                await findDairyFarmByCode(
                    suppliedAssetCode
                );


            dairyData.assetCode =
                Number(
                    farm.code
                );

        }

        else {

            dairyData.assetCode =
                null;

        }

    }

    else {

        dairyData.assetCode =
            null;

    }


    // ======================================================
    // CREATE DOCUMENT
    // ======================================================

    const dairy =
        new Dairy(
            dairyData
        );


    // ======================================================
    // SAVE
    // ======================================================

    await dairy.save();


    // ======================================================
    // RELOAD
    // ======================================================

    const saved =
        await Dairy
            .findById(
                dairy._id
            )
            .lean();


    if (
        !saved
    ) {

        throw createError(
            "The Dairy / Asset was created but could not be retrieved.",
            500
        );

    }


    // ======================================================
    // RETURN
    // ======================================================

    return saved;

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getAddPage,

    createDairy,

    getDairyFarms,

    DAIRY_BREEDS

};