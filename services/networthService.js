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

    const error = new Error(message);

    error.statusCode = statusCode;

    return error;

}


function toNumber(value) {

    const number = Number(value);

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
 * Dairy Farm
 *
 * Negative code.
 */

function isDairyFarm(record) {

    return (
        record &&
        record.code !== null &&
        record.code !== undefined &&
        Number(record.code) < 0
    );

}


/*
 * Coded asset
 *
 * Positive code.
 */

function isCodedAsset(record) {

    return (
        record &&
        record.code !== null &&
        record.code !== undefined &&
        Number(record.code) > 0
    );

}


/*
 * Manual asset
 *
 * No own code, but assigned to a parent.
 */

function isManualAsset(record) {

    return (
        record &&
        (
            record.code === null ||
            record.code === undefined
        ) &&
        record.assetCode !== null &&
        record.assetCode !== undefined
    );

}


/*
 * Standalone coded asset
 *
 * Positive code + no parent.
 */

function isStandaloneAsset(record) {

    return (
        isCodedAsset(record) &&
        (
            record.assetCode === null ||
            record.assetCode === undefined
        )
    );

}


/* ==========================================================
   VALIDATE DAIRY FARM
========================================================== */

async function findDairyFarmById(id) {

    if (!isValidObjectId(id)) {

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


    if (!isDairyFarm(dairy)) {

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
            400
        );

    }


    if (!isDairyFarm(farm)) {

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
     * Fetch all records once.
     *
     * Classification is then performed from
     * the actual record structure.
     *
     * This prevents the standalone list and
     * structure list from drifting apart.
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
     * Includes:
     *
     * 1. Positive-code assets assigned to
     *    this farm.
     *
     * 2. Manual assets with code:null
     *    assigned to this farm.
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
   GET ADD ASSET
========================================================== */

async function getAddAsset(id) {

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

    const dairy =
        await findDairyFarmById(
            id
        );


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
       MONEY
    ====================================================== */

    const buyingPrice =
        parseMoney(
            body.buyingPrice,
            "Buying Price"
        );


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
       CREATE MANUAL ASSET
       
       code:
           null
       
       assetCode:
           negative Dairy Farm code
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

            code: null,

            assetCode: farmCode,

            status,

            acquisitionDate:
                new Date()

        });


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
     * A Dairy Farm cannot be opened
     * through the asset editor.
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
     * Every valid asset must either:
     *
     * 1. Have a positive code, OR
     * 2. Be a manual asset with assetCode.
     */

    const validAsset =
        isCodedAsset(dairy) ||
        isManualAsset(dairy);


    if (!validAsset) {

        throw createError(
            "The selected record is not a valid asset.",
            400
        );

    }


    /*
     * All available Dairy Farms are supplied
     * to the edit form.
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
       IDENTIFY RECORD TYPE
    ====================================================== */

    const originalIsFarm =
        isDairyFarm(dairy);


    if (originalIsFarm) {

        throw createError(
            "A Dairy Farm cannot be edited as an asset.",
            400
        );

    }


    const originalIsCodedAsset =
        isCodedAsset(dairy);


    const originalIsManualAsset =
        isManualAsset(dairy);


    if (
        !originalIsCodedAsset &&
        !originalIsManualAsset
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

    const requestedAssetCode =
        body.assetCode;


    /*
     * ------------------------------------------------------
     * MANUAL ASSET
     * ------------------------------------------------------
     *
     * Manual assets have no own code.
     *
     * They MUST always belong to a Dairy Farm.
     */

    if (
        originalIsManualAsset
    ) {

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
     * POSITIVE-CODE ASSET
     * ------------------------------------------------------
     *
     * A coded asset may either:
     *
     * 1. Remain standalone:
     *       assetCode = null
     *
     * 2. Be assigned to a Dairy Farm:
     *       assetCode = negative farm code
     */

    if (
        originalIsCodedAsset
    ) {

        if (
            requestedAssetCode === undefined ||
            requestedAssetCode === null ||
            requestedAssetCode === ""
        ) {

            /*
             * Standalone asset.
             */

            dairy.assetCode =
                null;

        } else {

            /*
             * Assigned to Dairy Farm.
             */

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