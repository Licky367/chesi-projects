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


/* ==========================================================
   CONSTANTS
========================================================== */

const ASSET_STATUSES = [

    "active",

    "sold",

    "disposed",

    "inactive"

];


/* ==========================================================
   GET NET WORTH
========================================================== */

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


                if (
                    dairy.assetStatus !== "active"
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

                if (
                    asset.assetStatus !== "active"
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


    const farmCode =
        Number(dairy.code);


    const name =
        String(
            body.name ||
            body.item ||
            ""
        ).trim();


    const type =
        String(
            body.type ||
            ""
        ).trim();


    const description =
        String(
            body.description ||
            ""
        ).trim();


    const status =
        String(
            body.status ||
            "active"
        ).trim();


    const condition =
        String(
            body.condition ||
            ""
        ).trim();


    const location =
        String(
            body.location ||
            ""
        ).trim();


    if (!name) {

        throw createError(
            "Name is required.",
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


    if (!ASSET_STATUSES.includes(status)) {

        throw createError(
            "Invalid asset status.",
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


    const asset =
        new Dairy({

            name,

            item: name,

            assetType: type,

            buyingPrice,

            currentWorth,

            assetDescription: description,

            description,

            condition,

            location,

            code: null,

            assetCode: farmCode,

            assetStatus: status,

            assetSource: "asset",

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

    dairy.item =
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


    dairy.assetType =
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

    const description =
        String(
            body.description ||
            ""
        ).trim();


    dairy.assetDescription =
        description;


    /*
     * Keep the legacy/general description field
     * synchronized if it exists in the document.
     */
    if (
        Object.prototype.hasOwnProperty.call(
            dairy,
            "description"
        )
    ) {

        dairy.description =
            description;

    }


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


    if (!ASSET_STATUSES.includes(status)) {

        throw createError(
            "Invalid asset status.",
            400
        );

    }


    dairy.assetStatus =
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

    let assetCode =
        body.assetCode;


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


        if (!Number.isFinite(assetCode)) {

            throw createError(
                "Invalid Dairy Farm code.",
                400
            );

        }


        if (assetCode >= 0) {

            throw createError(
                "Selected Dairy Farm code must be negative.",
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
            Number(
                structure.code
            );

    }


    /*
     * Preserve the source classification for
     * positive-code and manual assets.
     *
     * A positive code is a dairy/animal.
     * A null code is a manual asset.
     */
    if (
        dairy.code !== null &&
        dairy.code !== undefined &&
        Number(dairy.code) > 0
    ) {

        dairy.assetSource =
            "dairy";

    } else {

        dairy.assetSource =
            "asset";

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