// ==========================================================
// services/networth/add.js
// ==========================================================

const mongoose =
    require("mongoose");

const Dairy =
    require("../../models/dairy");

const Update =
    require("../../models/Update");


// ==========================================================
// GET PARENT DAIRY FARM
// ==========================================================

async function getParentDairyFarm(
    id
) {

    if (
        !id ||
        !mongoose.Types.ObjectId.isValid(id)
    ) {

        return null;

    }


    const dairy =
        await Dairy.findOne({

            _id: id,

            code: {
                $lt: 0
            }

        })
        .lean();


    return dairy;

}


// ==========================================================
// CREATE ASSET
//
// Creates:
//
//     1. The Dairy asset
//     2. The corresponding Update/feed record
//
// IMPORTANT:
//
// The Update record uses:
//
//     type: "assetAdd"
//
// because update/feed.ejs and update.ejs identify
// newly-added assets using that feed type.
//
// ==========================================================

async function createAsset(
    dairyFarmId,
    assetData,
    user
) {

    // ======================================================
    // VALIDATE PARENT ID
    // ======================================================

    if (
        !dairyFarmId ||
        !mongoose.Types.ObjectId.isValid(
            dairyFarmId
        )
    ) {

        const error =
            new Error(
                "Invalid Dairy Farm ID."
            );

        error.name =
            "CastError";

        throw error;

    }


    // ======================================================
    // GET PARENT FARM
    // ======================================================

    const parentFarm =
        await Dairy.findOne({

            _id: dairyFarmId,

            code: {
                $lt: 0
            }

        });


    if (!parentFarm) {

        const error =
            new Error(
                "Dairy Farm not found."
            );

        error.name =
            "NotFoundError";

        throw error;

    }


    // ======================================================
    // NORMALIZE DATA
    // ======================================================

    const name =
        String(
            assetData.name || ""
        ).trim();


    const type =
        String(
            assetData.type || ""
        ).trim();


    const description =
        String(
            assetData.description || ""
        ).trim();


    const condition =
        String(
            assetData.condition || ""
        ).trim();


    const location =
        String(
            assetData.location || ""
        ).trim();


    const status =
        String(
            assetData.status || "active"
        ).trim();


    const buyingPrice =
        Number(
            assetData.buyingPrice
        );


    const currentWorth =
        Number(
            assetData.currentWorth
        );


    // ======================================================
    // BASIC VALIDATION
    // ======================================================

    if (!name) {

        const error =
            new Error(
                "Asset name is required."
            );

        error.name =
            "ValidationError";

        throw error;

    }


    if (!type) {

        const error =
            new Error(
                "Asset type is required."
            );

        error.name =
            "ValidationError";

        throw error;

    }


    if (
        !Number.isFinite(
            buyingPrice
        ) ||
        buyingPrice < 0
    ) {

        const error =
            new Error(
                "Buying price must be a valid number."
            );

        error.name =
            "ValidationError";

        throw error;

    }


    if (
        !Number.isFinite(
            currentWorth
        ) ||
        currentWorth < 0
    ) {

        const error =
            new Error(
                "Current worth must be a valid number."
            );

        error.name =
            "ValidationError";

        throw error;

    }


    // ======================================================
    // CREATE ASSET
    //
    // IMPORTANT:
    //
    // code is deliberately NOT assigned.
    //
    // The manual asset is associated with the parent
    // dairy through assetCode.
    // ======================================================

    const asset =
        new Dairy({

            name,

            type,

            buyingPrice,

            currentWorth,

            description,

            condition,

            location,

            status,

            assetCode:
                parentFarm.code

        });


    await asset.save();


    // ======================================================
    // CREATE FEED UPDATE
    //
    // IMPORTANT:
    //
    // This MUST be "assetAdd".
    //
    // The feed renderer uses:
    //
    //     item.type === "assetAdd"
    //
    // to render:
    //
    //     update/addAsset.ejs
    // ======================================================

    const updateData = {

        dairy:
            parentFarm._id,

        type:
            "assetAdd",

        text:
            `${name} was added as a new asset.`

    };


    // ======================================================
    // USER INFORMATION
    // ======================================================

    if (user) {

        if (user._id) {

            updateData.user =
                user._id;

        }

        updateData.userName =
            user.name ||
            user.userName ||
            "User";

    }


    // ======================================================
    // ASSET INFORMATION
    //
    // Store the relevant asset snapshot directly on the
    // Update document so the feed card can render without
    // performing another Dairy query.
    // ======================================================

    updateData.asset = {

        assetId:
            asset._id,

        name:
            asset.name,

        type:
            asset.type,

        buyingPrice:
            asset.buyingPrice,

        currentWorth:
            asset.currentWorth,

        description:
            asset.description,

        condition:
            asset.condition,

        location:
            asset.location,

        status:
            asset.status,

        assetCode:
            asset.assetCode,

        parentDairyId:
            parentFarm._id,

        parentDairyName:
            parentFarm.name || "",

        parentDairyCode:
            parentFarm.code

    };


    // ======================================================
    // SAVE UPDATE
    // ======================================================

    const update =
        await Update.create(
            updateData
        );


    // ======================================================
    // RETURN BOTH
    // ======================================================

    return {

        asset,

        update

    };

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getParentDairyFarm,

    createAsset

};