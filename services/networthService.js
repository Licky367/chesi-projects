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


function toNumber(value) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;

}


/*
 * Parse a money field only when the field
 * was actually supplied.
 *
 * This is important for UPDATE operations.
 *
 * An edit request must not suddenly make an
 * existing record invalid just because another
 * field was not submitted.
 */
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


/*
 * Parse a date only when the field is supplied.
 */
function parseDateIfProvided(
    value,
    fieldName
) {

    if (
        value === undefined
    ) {

        return undefined;

    }


    /*
     * An empty date means explicitly clear
     * the date.
     */
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


/*
 * Calculate age from Date of Birth.
 *
 * This is for display only.
 *
 * Age is NOT stored in MongoDB.
 */
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


    let age =
        today.getFullYear() -
        dob.getFullYear();


    const monthDifference =
        today.getMonth() -
        dob.getMonth();


    if (
        monthDifference < 0 ||
        (
            monthDifference === 0 &&
            today.getDate() < dob.getDate()
        )
    ) {

        age--;

    }


    return age >= 0
        ? age
        : null;

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


/*
 * ==========================================================
 * DAIRY BREEDS
 *
 * Used when:
 *
 *     code > 0
 *
 * The frontend can use this list to create the
 * breed dropdown.
 *
 * "Other" is included so the system does not force
 * an animal into an unsuitable breed.
 * ==========================================================
 */

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


/*
 * ==========================================================
 * DAIRY FARM / STRUCTURE
 *
 * code < 0
 * ==========================================================
 */

function isDairyFarm(record) {

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


/*
 * ==========================================================
 * IDENTIFIED DAIRY / ANIMAL
 *
 * code > 0
 * ==========================================================
 */

function isIdentifiedDairy(record) {

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


/*
 * ==========================================================
 * MANUAL NET WORTH ASSET
 *
 * code === null
 *
 * Manual assets belong to a Dairy Farm.
 *
 * Their assetCode is the negative code of
 * the parent Dairy Farm.
 * ==========================================================
 */

function isManualAsset(record) {

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


/*
 * ==========================================================
 * STANDALONE IDENTIFIED DAIRY
 *
 * code > 0
 * assetCode = null
 * ==========================================================
 */

function isStandaloneAsset(record) {

    if (
        !isIdentifiedDairy(record)
    ) {

        return false;

    }


    return (
        record.assetCode === null ||
        record.assetCode === undefined
    );

}


// ==========================================================
// FIND DAIRY FARM BY ID
// ==========================================================

async function findDairyFarmById(id) {

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
        !isDairyFarm(dairy)
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

async function findDairyFarmByCode(code) {

    const numericCode =
        Number(code);


    if (
        !Number.isFinite(numericCode) ||
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

                code: numericCode,

                assetCode: null

            })
            .lean();


    if (!farm) {

        throw createError(
            "Selected Dairy Farm was not found.",
            404
        );

    }


    if (
        !isDairyFarm(farm)
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

    return Dairy
        .find({

            code: {
                $lt: 0
            },

            assetCode: null

        })
        .sort({

            name: 1

        })
        .lean();

}


// ==========================================================
// GET NET WORTH
// ==========================================================

async function getNetWorth() {

    const allDairy =
        await Dairy
            .find({})
            .sort({

                name: 1

            })
            .lean();


    // ======================================================
    // STANDALONE ASSETS
    //
    // Identified dairies only:
    //
    //     code > 0
    //     assetCode = null
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
    //
    // code < 0
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
    // All active records contribute their
    // currentWorth.
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

        standaloneAssets,

        structures

    };

}


// ==========================================================
// GET DAIRY FARM
// ==========================================================

async function getDairyFarm(id) {

    const dairy =
        await findDairyFarmById(
            id
        );


    const farmCode =
        Number(dairy.code);


    /*
     * Every asset belonging to this Dairy Farm
     * has assetCode equal to the farm code.
     */

    const assets =
        await Dairy
            .find({

                assetCode: farmCode

            })
            .sort({

                name: 1

            })
            .lean();


    // ======================================================
    // FARM ASSET TOTAL
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

        dairy,

        assets,

        dairyTotal

    };

}


// ==========================================================
// GET ADD ASSET PAGE
// ==========================================================

async function getAddAsset(id) {

    const dairy =
        await findDairyFarmById(
            id
        );


    const structures =
        await getDairyFarms();


    return {

        dairy,

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
    body
) {

    /*
     * Find the parent Dairy Farm.
     */

    const dairy =
        await findDairyFarmById(
            id
        );


    const farmCode =
        Number(dairy.code);


    // ======================================================
    // NAME
    // ======================================================

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


    // ======================================================
    // TYPE
    // ======================================================

    const type =
        String(
            body.type ||
            ""
        ).trim();


    if (!type) {

        throw createError(
            "Type is required.",
            400
        );

    }


    // ======================================================
    // DESCRIPTION
    // ======================================================

    const description =
        String(
            body.description ||
            ""
        ).trim();


    // ======================================================
    // CONDITION
    // ======================================================

    const condition =
        String(
            body.condition ||
            ""
        ).trim();


    // ======================================================
    // LOCATION
    // ======================================================

    const location =
        String(
            body.location ||
            ""
        ).trim();


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

    const status =
        String(
            body.status ||
            "active"
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


    // ======================================================
    // PROFILE IMAGE
    // ======================================================

    const profileImage =
        String(
            body.profileImage ||
            ""
        ).trim();


    // ======================================================
    // CREATE MANUAL ASSET
    //
    // code:
    //     null
    //
    // assetCode:
    //     parent Dairy Farm code
    //
    // IMPORTANT:
    //
    // assetCode remains the parent's code.
    // ======================================================

    const assetData = {

        profileImage,

        name,

        type,

        description,

        condition,

        location,

        code: null,

        assetCode: farmCode,

        status,

        acquisitionDate:
            new Date()

    };


    /*
     * Only add monetary fields when supplied.
     *
     * This prevents accidental undefined values.
     */

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


    const asset =
        new Dairy(
            assetData
        );


    await asset.save();


    return asset;

}


// ==========================================================
// GET ASSET
// ==========================================================

async function getAsset(id) {

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
    // DAIRY FARM IS NOT EDITABLE THROUGH ASSET PAGE
    // ======================================================

    if (
        isDairyFarm(dairy)
    ) {

        throw createError(
            "The selected record is a Dairy Farm, not an asset.",
            400
        );

    }


    // ======================================================
    // VALID ASSET
    // ======================================================

    const identified =
        isIdentifiedDairy(dairy);


    const manual =
        isManualAsset(dairy);


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
    // AGE
    //
    // Calculated from dateOfBirth.
    //
    // Not stored in DB.
    // ======================================================

    const age =
        identified
            ? calculateAge(
                dairy.dateOfBirth
            )
            : null;


    // ======================================================
    // DAIRY FARM OPTIONS
    // ======================================================

    const structures =
        await getDairyFarms();


    return {

        dairy,

        structures,

        age,

        dairyBreeds:
            DAIRY_BREEDS

    };

}


// ==========================================================
// UPDATE ASSET
// ==========================================================

async function updateAsset(
    id,
    body
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
            .findById(id);


    if (!dairy) {

        throw createError(
            "Asset not found.",
            404
        );

    }


    // ======================================================
    // CANNOT EDIT DAIRY FARM
    // ======================================================

    if (
        isDairyFarm(dairy)
    ) {

        throw createError(
            "A Dairy Farm cannot be edited as an asset.",
            400
        );

    }


    // ======================================================
    // DETERMINE CURRENT RECORD TYPE
    // ======================================================

    const identified =
        isIdentifiedDairy(dairy);


    const manual =
        isManualAsset(dairy);


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
    // Only replace the image when a new image was
    // actually supplied.
    //
    // Existing image is preserved otherwise.
    // ======================================================

    if (
        body.profileImage !== undefined &&
        body.profileImage !== null &&
        String(body.profileImage).trim() !== ""
    ) {

        dairy.profileImage =
            String(
                body.profileImage
            ).trim();

    }


    // ======================================================
    // NAME
    //
    // UPDATE ONLY IF SUBMITTED.
    //
    // This is the major difference between EDIT
    // and CREATE.
    // ======================================================

    if (
        body.name !== undefined
    ) {

        const name =
            String(
                body.name
            ).trim();


        /*
         * Empty submitted name means the user
         * deliberately cleared it.
         *
         * Do not silently replace it with the
         * old value.
         *
         * However, if the DB currently has a name,
         * an empty edit should not be allowed.
         */

        if (!name) {

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

        const type =
            String(
                body.type
            ).trim();


        if (!type) {

            throw createError(
                identified
                    ? "Breed cannot be empty."
                    : "Type cannot be empty.",
                400
            );

        }


        /*
         * Identified dairies use type as BREED.
         *
         * We validate against the available breed
         * list, except "Other" and existing custom
         * values can be handled through the list.
         */

        if (
            identified &&
            !DAIRY_BREEDS.includes(type)
        ) {

            throw createError(
                "Invalid dairy breed.",
                400
            );

        }


        dairy.type =
            type;

    }


    // ======================================================
    // DATE OF BIRTH
    //
    // Identified dairies only.
    //
    // Manual assets do not need an animal DOB.
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
            parseDateIfProvided(
                body.valuationDate,
                "Valuation Date"
            );

    }


    // ======================================================
    // ASSET LOCATION
    //
    // IMPORTANT:
    //
    // Manual assets:
    //
    //     code === null
    //
    // MUST ALWAYS HAVE:
    //
    //     assetCode = negative Dairy Farm code
    //
    // Identified dairies:
    //
    //     may have assetCode = null
    //
    //     OR
    //
    //     assetCode = negative Dairy Farm code
    // ======================================================

    if (
        manual
    ) {

        /*
         * If assetCode was not submitted, preserve
         * the existing parent.
         *
         * This prevents an ordinary edit from
         * accidentally detaching the manual asset.
         */

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
         * Safety check:
         *
         * A manual asset must never leave the
         * database without a parent Dairy Farm.
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
    // IDENTIFIED DAIRY LOCATION
    //
    // Only change assetCode when the edit form
    // actually sends it.
    // ======================================================

    if (
        identified &&
        body.assetCode !== undefined
    ) {

        /*
         * Empty value means:
         *
         *     Standalone
         */

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
    // IMPORTANT:
    //
    // NEVER allow the asset edit form to modify:
    //
    //     code
    //
    // The code is part of the record's identity.
    //
    // Manual asset:
    //
    //     code remains null
    //
    // Identified dairy:
    //
    //     code remains positive
    //
    // Dairy Farm:
    //
    //     code remains negative
    // ======================================================


    // ======================================================
    // SAVE
    // ======================================================

    await dairy.save();


    // ======================================================
    // RETURN UPDATED DOCUMENT
    // ======================================================

    return dairy;

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

    DAIRY_BREEDS

};