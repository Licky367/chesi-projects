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


    const number = Number(value);


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


    const date = new Date(value);


    if (Number.isNaN(date.getTime())) {

        throw createError(
            `${fieldName} is invalid.`,
            400
        );

    }


    return date;

}


function getName(dairy) {

    return (
        dairy.name ||
        dairy.item ||
        String(dairy.code || "") ||
        "Dairy"
    );

}


/* ==========================================================
   GET NET WORTH
========================================================== */

/**
 * Main Net Worth page.
 *
 * DATA MODEL
 *
 * Dairy Farm:
 *     code < 0
 *
 * Coded asset:
 *     code > 0
 *
 * Manual asset:
 *     code === null
 *
 * Asset assignment:
 *     assetCode === negative Dairy Farm code
 *
 * A Dairy Farm's own currentWorth is NOT included in
 * totalNetWorth because the assets belonging to the farm
 * are counted separately.
 */
async function getNetWorth() {

    const [
        allDairy,
        standaloneAssets,
        structures
    ] = await Promise.all([

        Dairy
            .find({})
            .lean(),


        /*
         * Standalone assets are assets that do not belong
         * to a Dairy Farm.
         *
         * They may be:
         *
         *     code > 0
         *     code === null
         *
         * but their assetCode must be null/missing.
         */
        Dairy
            .find({
                $and: [

                    {
                        $or: [

                            {
                                code: {
                                    $gt: 0
                                }
                            },

                            {
                                code: null
                            },

                            {
                                code: {
                                    $exists: false
                                }
                            }

                        ]
                    },

                    {
                        $or: [

                            {
                                assetCode: null
                            },

                            {
                                assetCode: {
                                    $exists: false
                                }
                            }

                        ]
                    }

                ]
            })
            .sort({
                name: 1,
                item: 1
            })
            .lean(),


        /*
         * Dairy Farms are identified ONLY by negative
         * dairy.code.
         */
        Dairy
            .find({
                code: {
                    $lt: 0
                }
            })
            .sort({
                name: 1,
                item: 1
            })
            .lean()

    ]);


    /*
     * Net Worth includes:
     *
     *     - coded assets
     *     - manual assets
     *
     * Net Worth excludes:
     *
     *     - Dairy Farms themselves
     *
     * A Dairy Farm has code < 0.
     */
    const totalNetWorth =
        allDairy.reduce(
            function(total, dairy) {

                const code =
                    Number(dairy.code);


                if (
                    Number.isFinite(code) &&
                    code < 0
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

/**
 * GET /networth/structure/:id
 *
 * Loads a Dairy Farm and all assets belonging to it.
 *
 * Parent Dairy Farm:
 *
 *     dairy.code < 0
 *
 * Child asset:
 *
 *     dairy.assetCode === parent dairy.code
 *
 * IMPORTANT:
 *
 * The child asset may have:
 *
 *     code > 0
 *
 * OR
 *
 *     code === null
 *
 * Manual assets are therefore included.
 */
async function getDairyFarm(id) {

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


    if (
        dairy.code === null ||
        dairy.code === undefined ||
        Number(dairy.code) >= 0
    ) {

        throw createError(
            "The selected record is not a Dairy Farm.",
            404
        );

    }


    const farmCode =
        Number(dairy.code);


    /*
     * IMPORTANT:
     *
     * Do NOT filter by asset.code.
     *
     * Manual assets have:
     *
     *     code === null
     *
     * Their relationship to this farm is determined
     * exclusively by assetCode.
     */
    const assets =
        await Dairy
            .find({
                assetCode: farmCode
            })
            .sort({
                name: 1,
                item: 1
            })
            .lean();


    const dairyTotal =
        assets.reduce(
            function(total, asset) {

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

/**
 * GET /networth/structure/:id/add
 *
 * Loads the Add Asset form.
 *
 * The supplied id identifies the parent Dairy Farm.
 */
async function getAddAsset(id) {

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


    if (
        dairy.code === null ||
        dairy.code === undefined ||
        Number(dairy.code) >= 0
    ) {

        throw createError(
            "The selected record is not a Dairy Farm.",
            404
        );

    }


    return {

        dairy

    };

}


/* ==========================================================
   ADD ASSET
========================================================== */

/**
 * POST /networth/structure/:id/add
 *
 * Creates a manual asset belonging to the selected
 * Dairy Farm.
 *
 * REQUIRED DATA MODEL:
 *
 *     code      = null
 *     assetCode = parent dairy.code
 *
 * Example:
 *
 * Parent:
 *
 *     {
 *         code: -1001
 *     }
 *
 * New manual asset:
 *
 *     {
 *         code: null,
 *         assetCode: -1001
 *     }
 */
async function addAsset(
    id,
    body
) {

    if (!isValidObjectId(id)) {

        throw createError(
            "Invalid Dairy Farm id.",
            400
        );

    }


    /*
     * Find the actual Dairy Farm.
     *
     * There is no dairyFarm.code field.
     *
     * The parent's own dairy.code is used.
     */
    const dairy =
        await Dairy
            .findById(id);


    if (!dairy) {

        throw createError(
            "Dairy Farm not found.",
            404
        );

    }


    if (
        dairy.code === null ||
        dairy.code === undefined ||
        Number(dairy.code) >= 0
    ) {

        throw createError(
            "The selected record is not a Dairy Farm.",
            400
        );

    }


    /*
     * This is the parent farm's actual code.
     */
    const farmCode =
        Number(dairy.code);


    const item =
        String(
            body.item || ""
        ).trim();


    const type =
        String(
            body.type || ""
        ).trim();


    const description =
        String(
            body.description || ""
        ).trim();


    const condition =
        String(
            body.condition || ""
        ).trim();


    const location =
        String(
            body.location || ""
        ).trim();


    if (!item) {

        throw createError(
            "Item is required.",
            400
        );

    }


    if (!type) {

        throw createError(
            "Type is required.",
            400
        );

    }


    if (!description) {

        throw createError(
            "Description is required.",
            400
        );

    }


    if (!condition) {

        throw createError(
            "Condition is required.",
            400
        );

    }


    if (!location) {

        throw createError(
            "Location is required.",
            400
        );

    }


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


    /*
     * CREATE MANUAL ASSET
     *
     * IMPORTANT:
     *
     * code is explicitly null.
     *
     * assetCode is the negative code of the
     * parent Dairy Farm.
     *
     * We do NOT copy the parent's code into
     * the new asset's code field.
     */
    const asset =
        new Dairy({

            name: item,

            item: item,

            assetType: type,

            buyingPrice,

            currentWorth,

            assetDescription: description,

            description,

            condition,

            location,

            code: null,

            assetCode: farmCode,

            status: "active",

            acquisitionDate: new Date()

        });


    await asset.save();


    return asset;

}


/* ==========================================================
   GET ASSET
========================================================== */

/**
 * GET /networth/asset/:id
 *
 * Loads an individual asset and all available Dairy Farms.
 */
async function getAsset(id) {

    if (!isValidObjectId(id)) {

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
     * The asset page is not intended for editing
     * Dairy Farms.
     */
    if (
        dairy.code !== null &&
        dairy.code !== undefined &&
        Number(dairy.code) < 0
    ) {

        throw createError(
            "The selected record is a Dairy Farm, not an asset.",
            400
        );

    }


    /*
     * Only negative-code records are valid Dairy Farms.
     */
    const structures =
        await Dairy
            .find({
                code: {
                    $lt: 0
                }
            })
            .sort({
                name: 1,
                item: 1
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

/**
 * POST /networth/asset/:id
 *
 * Updates an existing asset.
 *
 * Both kinds of assets may be assigned to a Dairy Farm:
 *
 *     code > 0
 *     code === null
 *
 * The selected Dairy Farm is always represented by:
 *
 *     assetCode = negative dairy.code
 *
 * A Dairy Farm itself:
 *
 *     code < 0
 *
 * cannot be edited through this asset assignment route.
 */
async function updateAsset(
    id,
    body
) {

    if (!isValidObjectId(id)) {

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


    /*
     * Negative code means this is a Dairy Farm.
     *
     * A Dairy Farm cannot be treated as an asset.
     */
    if (
        dairy.code !== null &&
        dairy.code !== undefined &&
        Number(dairy.code) < 0
    ) {

        throw createError(
            "A Dairy Farm cannot be edited as an asset.",
            400
        );

    }


    const item =
        String(
            body.item || ""
        ).trim();


    if (!item) {

        throw createError(
            "Item is required.",
            400
        );

    }


    dairy.name =
        item;

    dairy.item =
        item;


    dairy.buyingPrice =
        parseMoney(
            body.buyingPrice,
            "Buying Price"
        );


    dairy.currentWorth =
        parseMoney(
            body.currentWorth,
            "Current Worth"
        );


    const description =
        String(
            body.description || ""
        ).trim();


    dairy.description =
        description;


    /*
     * Keep assetDescription synchronized when the
     * schema contains that field.
     */
    if (
        Object.prototype.hasOwnProperty.call(
            dairy,
            "assetDescription"
        )
    ) {

        dairy.assetDescription =
            description;

    }


    dairy.condition =
        String(
            body.condition || ""
        ).trim();


    dairy.location =
        String(
            body.location || ""
        ).trim();


    /* ======================================================
       STATUS
    ====================================================== */

    const allowedStatuses = [

        "active",

        "sold",

        "disposed",

        "inactive"

    ];


    const status =
        String(
            body.status || ""
        ).trim();


    if (
        !allowedStatuses.includes(status)
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
       DAIRY FARM ASSIGNMENT
    ====================================================== */

    /*
     * IMPORTANT:
     *
     * This applies to BOTH:
     *
     *     code > 0
     *
     * and:
     *
     *     code === null
     *
     * because manual assets also use assetCode.
     */
    let assetCode =
        body.assetCode;


    /*
     * Empty selection means standalone asset.
     */
    if (
        assetCode === undefined ||
        assetCode === null ||
        assetCode === ""
    ) {

        dairy.assetCode =
            null;

    } else {

        assetCode =
            Number(assetCode);


        if (
            !Number.isFinite(assetCode)
        ) {

            throw createError(
                "Invalid Dairy Farm code.",
                400
            );

        }


        /*
         * The selected code must belong to an
         * actual Dairy Farm.
         *
         * Dairy Farm identification is based ONLY
         * on negative dairy.code.
         */
        const structure =
            await Dairy
                .findOne({
                    code: assetCode
                })
                .lean();


        if (!structure) {

            throw createError(
                "Selected Dairy Farm was not found.",
                400
            );

        }


        if (
            structure.code === null ||
            structure.code === undefined ||
            Number(structure.code) >= 0
        ) {

            throw createError(
                "The selected record is not a Dairy Farm.",
                400
            );

        }


        dairy.assetCode =
            Number(structure.code);

    }


    /*
     * A manual asset remains a manual asset.
     *
     * We never assign a positive code to it here.
     *
     * Existing coded assets retain their existing code.
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