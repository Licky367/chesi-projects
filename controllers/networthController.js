const mongoose = require("mongoose");

const Dairy = require("../models/Dairy");


/* ==========================================================
   HELPERS
========================================================== */

function createError(message, statusCode = 500) {

    const error = new Error(message);

    error.statusCode = statusCode;

    return error;

}


function isValidObjectId(id) {

    return mongoose.Types.ObjectId.isValid(id);

}


function toNumber(value, fallback = 0) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;

}


function cleanNullableString(value) {

    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {

        return null;

    }

    return String(value).trim();

}


/* ==========================================================
   GET NET WORTH
========================================================== */

/**
 * Returns the data required by:
 *
 *     views/networth.ejs
 *
 * Provides:
 *
 *     totalNetWorth
 *     standaloneAssets
 *     structures
 *
 * Rules:
 *
 *     Standalone asset:
 *
 *         code > 0
 *         assetCode is null / undefined
 *
 *
 *     Dairy Farm:
 *
 *         code < 0
 */
async function getNetWorth() {

    const records = await Dairy.find({})
        .sort({ name: 1, item: 1 })
        .lean();


    const standaloneAssets = records.filter(function(dairy) {

        return (
            dairy &&
            Number.isInteger(Number(dairy.code)) &&
            Number(dairy.code) > 0 &&
            (
                dairy.assetCode === null ||
                dairy.assetCode === undefined
            )
        );

    });


    const structures = records.filter(function(dairy) {

        return (
            dairy &&
            dairy.code !== null &&
            dairy.code !== undefined &&
            Number(dairy.code) < 0
        );

    });


    /*
     * Net worth is based on currentWorth.
     *
     * Every record with a currentWorth contributes
     * to the total.
     *
     * The service does not double-count farm values
     * merely because a farm contains assigned assets.
     *
     * A Dairy Farm record itself is included only if
     * its own currentWorth is actually present.
     */

    const totalNetWorth = records.reduce(
        function(total, dairy) {

            return total + toNumber(
                dairy.currentWorth,
                0
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
 * Returns data required by:
 *
 *     views/networth-structures.ejs
 *
 * The farm is identified by its MongoDB _id.
 *
 * Farm rule:
 *
 *     code < 0
 *
 *
 * Asset membership:
 *
 *     asset.assetCode === farm.code
 *
 * OR
 *
 *     asset.code is null/undefined
 *
 *     when that record has been directly added to
 *     this farm.
 *
 * The service determines membership.
 *
 * The EJS page does not.
 */
async function getDairyFarm(id) {

    if (!isValidObjectId(id)) {

        throw createError(
            "Invalid Dairy Farm identifier.",
            400
        );

    }


    const dairy = await Dairy.findById(id)
        .lean();


    if (!dairy) {

        throw createError(
            "Dairy Farm not found.",
            404
        );

    }


    if (Number(dairy.code) >= 0) {

        throw createError(
            "The selected Dairy record is not a Dairy Farm.",
            400
        );

    }


    const allAssets = await Dairy.find({})
        .sort({ name: 1, item: 1 })
        .lean();


    /*
     * The current farm is identified by its negative code.
     */

    const farmCode = Number(dairy.code);


    const assets = allAssets.filter(function(asset) {

        if (!asset) {

            return false;

        }


        /*
         * Never include the Dairy Farm itself.
         */

        if (
            String(asset._id) === String(dairy._id)
        ) {

            return false;

        }


        /*
         * Existing asset assigned through assetCode.
         *
         * Example:
         *
         * asset.assetCode = -100
         * farm.code       = -100
         */

        if (
            asset.assetCode !== null &&
            asset.assetCode !== undefined &&
            Number(asset.assetCode) === farmCode
        ) {

            return true;

        }


        /*
         * Directly-created farm asset.
         *
         * These assets have no positive/negative Dairy code.
         *
         * They are ordinary Dairy records with:
         *
         *     code = null
         *
         * and are considered direct farm assets.
         *
         * IMPORTANT:
         *
         * This condition alone cannot distinguish between
         * two different farms if multiple farms contain
         * code-null records.
         *
         * Therefore, if your database has a dedicated
         * farm reference field, that field should be used
         * here instead.
         */

        if (
            (
                asset.code === null ||
                asset.code === undefined
            ) &&
            (
                asset.assetCode === null ||
                asset.assetCode === undefined
            )
        ) {

            return true;

        }


        return false;

    });


    const dairyTotal = assets.reduce(
        function(total, asset) {

            return total + toNumber(
                asset.currentWorth,
                0
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

/**
 * Returns data required by:
 *
 *     views/networth-add.ejs
 *
 * The route identifies the Dairy Farm by _id.
 */
async function getAddAsset(id) {

    if (!isValidObjectId(id)) {

        throw createError(
            "Invalid Dairy Farm identifier.",
            400
        );

    }


    const dairy = await Dairy.findById(id)
        .lean();


    if (!dairy) {

        throw createError(
            "Dairy Farm not found.",
            404
        );

    }


    if (Number(dairy.code) >= 0) {

        throw createError(
            "The selected Dairy record is not a Dairy Farm.",
            400
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
 * Creates a new ordinary Dairy asset directly for a
 * Dairy Farm.
 *
 * The new record must:
 *
 *     code      = null
 *     assetCode = null
 *
 * The current farm is identified by _id.
 */
async function addAsset(
    structureId,
    data
) {

    if (!isValidObjectId(structureId)) {

        throw createError(
            "Invalid Dairy Farm identifier.",
            400
        );

    }


    const dairyFarm = await Dairy.findById(
        structureId
    );


    if (!dairyFarm) {

        throw createError(
            "Dairy Farm not found.",
            404
        );

    }


    if (Number(dairyFarm.code) >= 0) {

        throw createError(
            "The selected Dairy record is not a Dairy Farm.",
            400
        );

    }


    if (!data) {

        throw createError(
            "No asset data was supplied.",
            400
        );

    }


    const item =
        data.item !== undefined
            ? String(data.item).trim()
            : "";


    const type =
        data.type !== undefined
            ? String(data.type).trim()
            : "";


    const description =
        data.description !== undefined
            ? String(data.description).trim()
            : "";


    const condition =
        data.condition !== undefined
            ? String(data.condition).trim()
            : "";


    const location =
        data.location !== undefined
            ? String(data.location).trim()
            : "";


    if (!item) {

        throw createError(
            "Asset name is required.",
            400
        );

    }


    if (!type) {

        throw createError(
            "Asset type is required.",
            400
        );

    }


    if (!description) {

        throw createError(
            "Asset description is required.",
            400
        );

    }


    if (!condition) {

        throw createError(
            "Asset condition is required.",
            400
        );

    }


    if (!location) {

        throw createError(
            "Asset location is required.",
            400
        );

    }


    const buyingPrice =
        toNumber(data.buyingPrice, NaN);


    const currentWorth =
        toNumber(data.currentWorth, NaN);


    if (!Number.isFinite(buyingPrice) || buyingPrice < 0) {

        throw createError(
            "Buying Price must be a valid non-negative number.",
            400
        );

    }


    if (!Number.isFinite(currentWorth) || currentWorth < 0) {

        throw createError(
            "Current Worth must be a valid non-negative number.",
            400
        );

    }


    /*
     * IMPORTANT:
     *
     * This asset is created as an ordinary Dairy record.
     *
     * It does NOT receive the farm's negative code.
     *
     * It does NOT receive assetCode.
     *
     * The database schema must therefore allow code to be null.
     */

    const assetData = {

        name: item,

        item,

        assetType: type,

        buyingPrice,

        currentWorth,

        assetDescription: description,

        description,

        condition,

        location,

        code: null,

        assetCode: null

    };


    const asset = await Dairy.create(
        assetData
    );


    return asset;

}


/* ==========================================================
   GET ASSET
========================================================== */

/**
 * Returns data required by:
 *
 *     views/networth-asset.ejs
 *
 * Also supplies:
 *
 *     structures
 *
 * so the asset can be assigned to a Dairy Farm.
 */
async function getAsset(id) {

    if (!isValidObjectId(id)) {

        throw createError(
            "Invalid asset identifier.",
            400
        );

    }


    const dairy = await Dairy.findById(id)
        .lean();


    if (!dairy) {

        throw createError(
            "Asset not found.",
            404
        );

    }


    const structures = await Dairy.find({
        code: {
            $lt: 0
        }
    })
        .sort({ name: 1, item: 1 })
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
 * Updates an existing Dairy record.
 *
 * The EJS form sends:
 *
 *     item
 *     buyingPrice
 *     currentWorth
 *     description
 *     condition
 *     location
 *     assetCode
 *     status
 *     valuationDate
 *
 * The asset's code is never changed here.
 *
 * If the asset has:
 *
 *     code > 0
 *
 * assetCode may be changed to a negative Dairy Farm code
 * or cleared for standalone status.
 *
 * A Dairy Farm:
 *
 *     code < 0
 *
 * cannot receive assetCode.
 */
async function updateAsset(
    id,
    data
) {

    if (!isValidObjectId(id)) {

        throw createError(
            "Invalid asset identifier.",
            400
        );

    }


    const dairy = await Dairy.findById(id);


    if (!dairy) {

        throw createError(
            "Asset not found.",
            404
        );

    }


    if (!data) {

        throw createError(
            "No update data was supplied.",
            400
        );

    }


    const item =
        data.item !== undefined
            ? String(data.item).trim()
            : "";


    if (!item) {

        throw createError(
            "Asset name is required.",
            400
        );

    }


    const buyingPrice =
        toNumber(data.buyingPrice, NaN);


    const currentWorth =
        toNumber(data.currentWorth, NaN);


    if (!Number.isFinite(buyingPrice) || buyingPrice < 0) {

        throw createError(
            "Buying Price must be a valid non-negative number.",
            400
        );

    }


    if (!Number.isFinite(currentWorth) || currentWorth < 0) {

        throw createError(
            "Current Worth must be a valid non-negative number.",
            400
        );

    }


    /*
     * NAME
     */

    dairy.name = item;

    dairy.item = item;


    /*
     * MONEY
     */

    dairy.buyingPrice = buyingPrice;

    dairy.currentWorth = currentWorth;


    /*
     * DESCRIPTION
     *
     * Your EJS reads dairy.description,
     * while the add form maps description to
     * assetDescription.
     *
     * Keep both synchronized.
     */

    if (data.description !== undefined) {

        const description =
            String(data.description).trim();

        dairy.description = description;

        dairy.assetDescription = description;

    }


    /*
     * CONDITION
     */

    if (data.condition !== undefined) {

        dairy.condition =
            String(data.condition).trim();

    }


    /*
     * LOCATION
     */

    if (data.location !== undefined) {

        dairy.location =
            String(data.location).trim();

    }


    /*
     * STATUS
     */

    if (data.status !== undefined) {

        const allowedStatuses = [
            "active",
            "sold",
            "disposed",
            "inactive"
        ];


        if (
            !allowedStatuses.includes(
                data.status
            )
        ) {

            throw createError(
                "Invalid asset status.",
                400
            );

        }


        dairy.status = data.status;

    }


    /*
     * VALUATION DATE
     */

    if (
        data.valuationDate !== undefined &&
        String(data.valuationDate).trim() !== ""
    ) {

        const valuationDate =
            new Date(data.valuationDate);


        if (
            Number.isNaN(
                valuationDate.getTime()
            )
        ) {

            throw createError(
                "Invalid valuation date.",
                400
            );

        }


        dairy.valuationDate =
            valuationDate;

    } else if (
        data.valuationDate !== undefined
    ) {

        dairy.valuationDate = null;

    }


    /*
     * DAIRY FARM ASSIGNMENT
     *
     * Only positive-code assets can have assetCode.
     *
     * Negative-code Dairy Farms cannot be assigned.
     */

    if (Number(dairy.code) > 0) {

        const submittedAssetCode =
            cleanNullableString(
                data.assetCode
            );


        if (submittedAssetCode === null) {

            dairy.assetCode = null;

        } else {

            const farmCode =
                Number(submittedAssetCode);


            if (
                !Number.isInteger(farmCode) ||
                farmCode >= 0
            ) {

                throw createError(
                    "A valid negative Dairy Farm code is required.",
                    400
                );

            }


            const farm =
                await Dairy.findOne({
                    code: farmCode
                });


            if (!farm) {

                throw createError(
                    "The selected Dairy Farm does not exist.",
                    404
                );

            }


            if (Number(farm.code) >= 0) {

                throw createError(
                    "The selected record is not a Dairy Farm.",
                    400
                );

            }


            dairy.assetCode = farmCode;

        }

    } else if (Number(dairy.code) < 0) {

        /*
         * Dairy Farms cannot receive assetCode.
         */

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