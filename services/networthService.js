const mongoose = require("mongoose");

const Dairy = require("../models/dairy");


/* ==========================================================
   HELPERS
========================================================== */

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


function parseMoney(
    value,
    fieldName
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        throw createError(
            `${fieldName} is required.`,
            400
        );

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


/* ==========================================================
   CONSTANTS
========================================================== */

const ALLOWED_STATUSES = [

    "active",

    "sold",

    "disposed",

    "inactive"

];


/* ==========================================================
   RECORD TYPE HELPERS
========================================================== */


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
 * A manual asset must have assetCode.
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
 *
 * These are the only records considered
 * standalone assets.
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


/* ==========================================================
   FIND DAIRY FARM BY ID
========================================================== */

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


/* ==========================================================
   FIND DAIRY FARM BY CODE
========================================================== */

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


/* ==========================================================
   GET NET WORTH
========================================================== */

async function getNetWorth() {

    /*
     * Read all Dairy records once.
     *
     * Classification is based entirely on:
     *
     *     code
     *     assetCode
     */

    const allDairy =
        await Dairy
            .find({})
            .sort({
                name: 1
            })
            .lean();


    /* ======================================================
       STANDALONE ASSETS
       
       Only identified dairy/animals:
       
           code > 0
           assetCode = null
    ====================================================== */

    const standaloneAssets =
        allDairy.filter(
            function(dairy) {

                return isStandaloneAsset(
                    dairy
                );

            }
        );


    /* ======================================================
       DAIRY FARMS
       
       Negative code.
    ====================================================== */

    const structures =
        allDairy.filter(
            function(dairy) {

                return isDairyFarm(
                    dairy
                );

            }
        );


    /* ======================================================
       TOTAL NET WORTH
       
       Every active Dairy record contributes its
       currentWorth.
    ====================================================== */

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


/* ==========================================================
   GET DAIRY FARM
========================================================== */

async function getDairyFarm(id) {

    const dairy =
        await findDairyFarmById(
            id
        );


    const farmCode =
        Number(dairy.code);


    /*
     * Every asset belonging to this Dairy Farm
     * has assetCode equal to the farm's code.
     *
     * This includes:
     *
     *     1. Identified dairy:
     *            code > 0
     *
     *     2. Manual Net Worth asset:
     *            code = null
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


    /* ======================================================
       FARM ASSET TOTAL
    ====================================================== */

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


/* ==========================================================
   GET ADD ASSET PAGE
========================================================== */

async function getAddAsset(id) {

    /*
     * The route identifies the Dairy Farm.
     *
     * The form does not submit:
     *
     *     code
     *     assetCode
     *
     * Those values are determined here/server-side.
     */

    const dairy =
        await findDairyFarmById(
            id
        );


    return {

        dairy

    };

}


/* ==========================================================
   ADD ASSET
========================================================== */

async function addAsset(
    id,
    body
) {

    /*
     * Find and validate the parent Dairy Farm.
     */

    const dairy =
        await findDairyFarmById(
            id
        );


    /*
     * The newly created Net Worth asset will
     * belong to this Dairy Farm.
     */

    const farmCode =
        Number(dairy.code);


    /* ======================================================
       NAME
    ====================================================== */

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


    /* ======================================================
       TYPE
    ====================================================== */

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


    /* ======================================================
       DESCRIPTION
    ====================================================== */

    const description =
        String(
            body.description ||
            ""
        ).trim();


    if (!description) {

        throw createError(
            "Description is required.",
            400
        );

    }


    /* ======================================================
       CONDITION
    ====================================================== */

    const condition =
        String(
            body.condition ||
            ""
        ).trim();


    if (!condition) {

        throw createError(
            "Condition is required.",
            400
        );

    }


    /* ======================================================
       LOCATION
    ====================================================== */

    const location =
        String(
            body.location ||
            ""
        ).trim();


    if (!location) {

        throw createError(
            "Location is required.",
            400
        );

    }


    /* ======================================================
       BUYING PRICE
    ====================================================== */

    const buyingPrice =
        parseMoney(
            body.buyingPrice,
            "Buying Price"
        );


    /* ======================================================
       CURRENT WORTH
    ====================================================== */

    const currentWorth =
        parseMoney(
            body.currentWorth,
            "Current Worth"
        );


    /* ======================================================
       STATUS
    ====================================================== */

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


    /* ======================================================
       CREATE NEW DAIRY RECORD
       
       THIS IS IMPORTANT.
       
       Every click on "Save Asset" creates a NEW
       Dairy document.
       
       It does NOT update the Dairy Farm.
       
       It does NOT create a positive code.
       
       It does NOT require dateOfBirth.
       
       It creates:
       
           code      = null
           assetCode = parent Dairy Farm code
       
       Therefore the model treats it as a manual
       Net Worth asset.
    ====================================================== */

    const asset =
        new Dairy({

            name,

            type,

            description,

            condition,

            location,

            buyingPrice,

            currentWorth,

            /*
             * No identity code.
             */

            code: null,

            /*
             * Parent Dairy Farm.
             */

            assetCode: farmCode,

            status,

            acquisitionDate:
                new Date()

        });


    /*
     * Save the NEW Dairy document.
     *
     * The model's validation will confirm:
     *
     *     code === null
     *     assetCode exists
     *
     * dateOfBirth is NOT required because
     * code is null.
     */

    await asset.save();


    return asset;

}


/* ==========================================================
   GET ASSET
========================================================== */

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


    /*
     * A Dairy Farm is not an asset.
     */

    if (
        isDairyFarm(dairy)
    ) {

        throw createError(
            "The selected record is a Dairy Farm, not an asset.",
            400
        );

    }


    /*
     * A valid asset can be:
     *
     *     identified dairy:
     *         code > 0
     *
     * OR
     *
     *     manual asset:
     *         code = null
     *         assetCode exists
     */

    const validAsset =
        isIdentifiedDairy(dairy) ||
        isManualAsset(dairy);


    if (!validAsset) {

        throw createError(
            "The selected record is not a valid asset.",
            400
        );

    }


    /*
     * Supply Dairy Farms for any asset-edit
     * interface that needs parent selection.
     */

    const structures =
        await Dairy
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


    return {

        dairy,

        structures

    };

}


/* ==========================================================
   UPDATE ASSET
========================================================== */

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


    /* ======================================================
       CANNOT EDIT DAIRY FARM AS AN ASSET
    ====================================================== */

    if (
        isDairyFarm(dairy)
    ) {

        throw createError(
            "A Dairy Farm cannot be edited as an asset.",
            400
        );

    }


    /* ======================================================
       IDENTIFY CURRENT ASSET TYPE
    ====================================================== */

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


    /* ======================================================
       NAME
    ====================================================== */

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


    dairy.name =
        name;


    /* ======================================================
       TYPE
    ====================================================== */

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


    dairy.type =
        type;


    /* ======================================================
       BUYING PRICE
    ====================================================== */

    dairy.buyingPrice =
        parseMoney(
            body.buyingPrice,
            "Buying Price"
        );


    /* ======================================================
       CURRENT WORTH
    ====================================================== */

    dairy.currentWorth =
        parseMoney(
            body.currentWorth,
            "Current Worth"
        );


    /* ======================================================
       DESCRIPTION
    ====================================================== */

    dairy.description =
        String(
            body.description ||
            ""
        ).trim();


    /* ======================================================
       CONDITION
    ====================================================== */

    dairy.condition =
        String(
            body.condition ||
            ""
        ).trim();


    /* ======================================================
       LOCATION
    ====================================================== */

    dairy.location =
        String(
            body.location ||
            ""
        ).trim();


    /* ======================================================
       STATUS
    ====================================================== */

    const status =
        String(
            body.status ||
            ""
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


    /* ======================================================
       VALUATION DATE
    ====================================================== */

    dairy.valuationDate =
        parseDate(
            body.valuationDate,
            "Valuation Date"
        );


    /* ======================================================
       PARENT ASSIGNMENT
    ====================================================== */

    /*
     * ------------------------------------------------------
     * MANUAL ASSET
     * ------------------------------------------------------
     *
     * code === null
     *
     * Manual assets MUST always have a parent.
     */

    if (manual) {

        const requestedAssetCode =
            body.assetCode;


        if (
            requestedAssetCode === undefined ||
            requestedAssetCode === null ||
            requestedAssetCode === ""
        ) {

            throw createError(
                "A manual asset must belong to a Dairy Farm.",
                400
            );

        }


        const farm =
            await findDairyFarmByCode(
                requestedAssetCode
            );


        dairy.assetCode =
            Number(
                farm.code
            );

    }


    /*
     * ------------------------------------------------------
     * IDENTIFIED DAIRY
     * ------------------------------------------------------
     *
     * code > 0
     *
     * It may:
     *
     *     remain standalone
     *
     * OR
     *
     *     belong to a Dairy Farm.
     */

    if (identified) {

        const requestedAssetCode =
            body.assetCode;


        if (
            requestedAssetCode === undefined ||
            requestedAssetCode === null ||
            requestedAssetCode === ""
        ) {

            dairy.assetCode =
                null;

        } else {

            const farm =
                await findDairyFarmByCode(
                    requestedAssetCode
                );


            dairy.assetCode =
                Number(
                    farm.code
                );

        }

    }


    /*
     * Save the updated Dairy record.
     *
     * For identified dairy (code > 0),
     * the model will require dateOfBirth.
     *
     * For manual asset (code === null),
     * dateOfBirth is not required.
     */

    await dairy.save();


    return dairy;

}


/* ==========================================================
   EXPORTS
========================================================== */

module.exports = {

    getNetWorth,

    getDairyFarm,

    getAddAsset,

    addAsset,

    getAsset,

    updateAsset

};