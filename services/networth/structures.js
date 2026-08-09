const mongoose = require("mongoose");

const Dairy =
    require("../../models/dairy");


/* ==========================================================
   VALIDATE OBJECT ID
========================================================== */

function isValidObjectId(id) {

    return mongoose.Types.ObjectId.isValid(id);

}


/* ==========================================================
   GET DAIRY FARM
========================================================== */

async function getDairyFarm(id) {

    if (!isValidObjectId(id)) {

        return null;

    }


    /*
     * The Dairy Farm itself is identified by its _id.
     *
     * The EJS expects:
     *
     *     dairy._id
     *     dairy.code
     *     dairy.name
     *     dairy.item
     */

    const dairy =
        await Dairy.findById(id).lean();


    if (!dairy) {

        return null;

    }


    /*
     * A Dairy Farm is a Dairy record whose code is negative.
     */

    if (
        dairy.code === null ||
        dairy.code === undefined ||
        Number(dairy.code) >= 0
    ) {

        return null;

    }


    const farmCode =
        Number(dairy.code);


    /*
     * Assets belonging to this Dairy Farm can be:
     *
     * 1. An identified Dairy whose assetCode points
     *    to this farm's code.
     *
     * 2. A manually-created asset whose code is null
     *    and assetCode points to this farm's code.
     *
     * We deliberately do NOT use asset.code as the
     * membership test.
     */

    const assets =
        await Dairy.find({

            assetCode: farmCode,

            _id: {
                $ne: dairy._id
            }

        })
        .sort({
            createdAt: -1
        })
        .lean();


    /*
     * Calculate the total current worth displayed
     * by networth-structures.ejs.
     */

    const dairyTotal =
        assets.reduce(
            (total, asset) => {

                const worth =
                    Number(
                        asset.currentWorth
                    );


                if (
                    !Number.isFinite(worth)
                ) {

                    return total;

                }


                return total + worth;

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
   GET ADD ASSET DATA
========================================================== */

async function getAddAssetData(id) {

    if (!isValidObjectId(id)) {

        return null;

    }


    const dairy =
        await Dairy.findById(id).lean();


    if (!dairy) {

        return null;

    }


    /*
     * Only negative-code Dairy records are valid
     * Dairy Farms.
     */

    if (
        dairy.code === null ||
        dairy.code === undefined ||
        Number(dairy.code) >= 0
    ) {

        return null;

    }


    /*
     * Fetch all Dairy Farm structures so the add-asset
     * page can provide a parent-farm selector if needed.
     */

    const structures =
        await Dairy.find({

            code: {
                $lt: 0
            }

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
   ADD ASSET
========================================================== */

async function addAsset(
    structureId,
    data = {},
    file = null
) {

    if (!isValidObjectId(structureId)) {

        return null;

    }


    /*
     * Find the parent Dairy Farm.
     */

    const parentFarm =
        await Dairy.findById(
            structureId
        );


    if (!parentFarm) {

        return null;

    }


    if (
        parentFarm.code === null ||
        parentFarm.code === undefined ||
        Number(parentFarm.code) >= 0
    ) {

        throw new Error(
            "The selected record is not a Dairy Farm."
        );

    }


    const farmCode =
        Number(parentFarm.code);


    /*
     * Build the new asset.
     *
     * assetCode is the field that establishes the
     * relationship between the asset and the Dairy Farm.
     *
     * The asset itself does not need a Dairy code.
     */

    const assetData = {

        name:
            typeof data.name === "string"
                ? data.name.trim()
                : "",

        type:
            typeof data.type === "string"
                ? data.type.trim()
                : "",

        buyingPrice:
            data.buyingPrice !== undefined &&
            data.buyingPrice !== ""
                ? Number(data.buyingPrice)
                : 0,

        currentWorth:
            data.currentWorth !== undefined &&
            data.currentWorth !== ""
                ? Number(data.currentWorth)
                : 0,

        description:
            typeof data.description === "string"
                ? data.description.trim()
                : "",

        condition:
            typeof data.condition === "string"
                ? data.condition.trim()
                : "",

        location:
            typeof data.location === "string"
                ? data.location.trim()
                : "",

        assetCode:
            farmCode,

        status:
            data.status ||
            "active",

        valuationDate:
            data.valuationDate ||
            new Date(),

        acquisitionDate:
            data.acquisitionDate ||
            new Date()

    };


    /*
     * Prevent NaN from entering MongoDB.
     */

    if (
        !Number.isFinite(
            assetData.buyingPrice
        )
    ) {

        assetData.buyingPrice = 0;

    }


    if (
        !Number.isFinite(
            assetData.currentWorth
        )
    ) {

        assetData.currentWorth = 0;

    }


    /*
     * Image handling.
     *
     * This is intentionally defensive because the exact
     * upload middleware/storage configuration may determine
     * whether req.file.path, req.file.location or
     * req.file.filename is available.
     */

    if (file) {

        if (file.path) {

            assetData.profileImage =
                file.path;

        } else if (file.location) {

            assetData.profileImage =
                file.location;

        } else if (file.filename) {

            assetData.profileImage =
                file.filename;

        }

    }


    /*
     * Create the asset.
     */

    const asset =
        await Dairy.create(
            assetData
        );


    return asset;

}


/* ==========================================================
   EXPORTS
========================================================== */

module.exports = {

    getDairyFarm,

    getAddAssetData,

    addAsset

};