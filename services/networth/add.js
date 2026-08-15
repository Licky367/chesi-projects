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

async function getParentDairyFarm(id) {

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
// ==========================================================
//
// Creates:
//
// 1. The actual Dairy asset.
// 2. The Update feed record.
//
// ==========================================================

async function createAsset(
    dairyFarmId,
    assetData,
    user
) {

    // ======================================================
    // VALIDATE FARM ID
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
    // FIND PARENT FARM
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
    // NORMALIZE VALUES
    // ======================================================

    const name =
        String(
            assetData.name || ""
        ).trim();


    const type =
        String(
            assetData.type || ""
        ).trim();


    const buyingPrice =
        Number(
            assetData.buyingPrice
        );


    const currentWorth =
        Number(
            assetData.currentWorth
        );


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
        assetData.status ||
        "active";


    // ======================================================
    // CREATE ACTUAL ASSET
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

            // ----------------------------------------------
            // Parent Dairy Farm
            // ----------------------------------------------

            assetCode:
                parentFarm.code

        });


    await asset.save();


    // ======================================================
    // CREATE FEED UPDATE
    // ======================================================
    //
    // IMPORTANT:
    //
    // The update belongs to the PARENT FARM.
    //
    // This guarantees that pageService.js will find it
    // whenever somebody opens the farm feed.
    //
    // ======================================================

    let userId =
        null;

    let userName =
        "User";

    let userImage =
        "";


    if (user) {

        userId =
            user._id || null;

        userName =
            user.name ||
            user.userName ||
            user.username ||
            "User";

        userImage =
            user.profileImage ||
            user.image ||
            user.avatar ||
            "";

    }


    await Update.create({

        // ----------------------------------------------
        // IMPORTANT: PARENT FARM
        // ----------------------------------------------

        dairy:
            parentFarm._id,

        // ----------------------------------------------
        // USER
        // ----------------------------------------------

        user:
            userId,

        userName,

        userImage,

        // ----------------------------------------------
        // FEED TYPE
        // ----------------------------------------------

        type:
            "assetAdd",

        // ----------------------------------------------
        // ASSET INFORMATION
        // ----------------------------------------------

        asset: {

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
                asset.status

        }

    });


    // ======================================================
    // RETURN CREATED ASSET
    // ======================================================

    return asset;

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getParentDairyFarm,

    createAsset

};