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


function getName(dairy) {

    return (
        dairy.name ||
        dairy.item ||
        dairy.code ||
        "Dairy"
    );

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


/* ==========================================================
   GET NET WORTH
========================================================== */

/**
 * Main Net Worth page.
 *
 * Returns:
 *
 *     totalNetWorth
 *     standaloneAssets
 *     structures
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

        Dairy
            .find({
                code: {
                    $gt: 0
                },
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
            })
            .sort({
                name: 1,
                item: 1
            })
            .lean(),

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
     * Dairy Farms themselves are structures.
     *
     * Their currentWorth must therefore NOT be added to
     * Net Worth. Otherwise the farm and the assets inside
     * the farm would be counted twice.
     *
     * Assets include:
     *
     *     code > 0
     *
     * and Dairy records whose code is null/undefined.
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
 * Loads one Dairy Farm.
 *
 * Farm:
 *
 *     code < 0
 *
 * Assets assigned to it:
 *
 *     assetCode === farm.code
 *
 * for positive-code assets.
 *
 * NOTE:
 * A record with code === null and no farm-reference field
 * cannot be uniquely associated with a particular farm.
 * The Add Asset EJS explicitly says that such a record must
 * not receive assetCode. Therefore this service does not
 * incorrectly assign every null-code record to every farm.
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
     * Existing positive-code assets assigned through
     * assetCode.
     */
    const assets =
        await Dairy
            .find({
                code: {
                    $gt: 0
                },
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
 * Loads the Add Asset page.
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
 * Creates a new asset directly from a Dairy Farm.
 *
 * According to networth-add.ejs:
 *
 *     code      = null
 *     assetCode = null / undefined
 *
 * The new record therefore remains an ordinary unclassified
 * Dairy record rather than becoming a Dairy Farm.
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
     * IMPORTANT:
     *
     * Do not copy the farm's negative code.
     *
     * Do not set assetCode.
     *
     * This follows the exact rules documented in
     * networth-add.ejs.
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
 * Loads an individual asset.
 *
 * Also supplies the available Dairy Farms for the
 * assetCode selector.
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
 * Updates an existing asset.
 *
 * Positive-code assets may have assetCode changed.
 *
 * Dairy Farms cannot be assigned to another farm.
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
     * A negative code identifies a Dairy Farm.
     *
     * The asset editor must not turn a Dairy Farm into an
     * assigned asset.
     */
    if (
        dairy.code !== null &&
        dairy.code !== undefined &&
        Number(dairy.code) < 0
    ) {

        throw createError(
            "A Dairy Farm cannot be assigned as an asset.",
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


    dairy.name = item;

    dairy.item = item;


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


    /*
     * Keep both service field names compatible with the
     * EJS comments/model naming supplied by the user.
     */
    const description =
        String(
            body.description || ""
        ).trim();


    dairy.description =
        description;


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
       ASSET FARM ASSIGNMENT
    ====================================================== */

    /*
     * ONLY positive-code assets may receive assetCode.
     */
    if (
        dairy.code !== null &&
        dairy.code !== undefined &&
        Number(dairy.code) > 0
    ) {

        let assetCode =
            body.assetCode;


        if (
            assetCode === undefined ||
            assetCode === null ||
            assetCode === ""
        ) {

            dairy.assetCode = null;

        } else {

            assetCode =
                Number(assetCode);


            if (!Number.isFinite(assetCode)) {

                throw createError(
                    "Invalid Dairy Farm code.",
                    400
                );

            }


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
                Number(structure.code) >= 0
            ) {

                throw createError(
                    "The selected record is not a Dairy Farm.",
                    400
                );

            }


            dairy.assetCode =
                assetCode;

        }

    }


    /*
     * A null-code direct asset must not receive assetCode
     * from this editor.
     *
     * This follows the rule in networth-add.ejs.
     */
    else {

        dairy.assetCode = null;

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