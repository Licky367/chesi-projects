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


    /*
     * A Dairy Farm is identified by
     * a negative Dairy code.
     */

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
// 1. The actual Dairy asset
// 2. The corresponding Update feed record
//
// The feed record belongs to the PARENT DAIRY FARM.
//
// ==========================================================

async function createAsset(
    dairyFarmId,
    assetData,
    user
) {

    // ======================================================
    // VALIDATE DAIRY FARM ID
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
    // VERIFY PARENT DAIRY FARM
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
    // NORMALIZE NUMERIC VALUES
    // ======================================================

    const buyingPrice =
        Number(
            assetData.buyingPrice
        );


    const currentWorth =
        Number(
            assetData.currentWorth
        );


    // ======================================================
    // BUILD ASSET
    // ======================================================
    //
    // IMPORTANT:
    //
    // No "code" is supplied.
    //
    // Therefore this remains a manual asset.
    //
    // The relationship to the parent Dairy Farm is:
    //
    //     assetCode = parentFarm.code
    //
    // ======================================================

    const asset =
        new Dairy({

            name:
                String(
                    assetData.name || ""
                ).trim(),

            type:
                String(
                    assetData.type || ""
                ).trim(),

            buyingPrice,

            currentWorth,

            description:
                String(
                    assetData.description || ""
                ).trim(),

            condition:
                String(
                    assetData.condition || ""
                ).trim(),

            location:
                String(
                    assetData.location || ""
                ).trim(),

            status:
                assetData.status || "active",

            assetCode:
                parentFarm.code

        });


    // ======================================================
    // SAVE ACTUAL ASSET FIRST
    // ======================================================

    await asset.save();


    // ======================================================
    // PREPARE USER INFORMATION
    // ======================================================

    let userId = null;

    let userName = "User";


    if (user) {

        /*
         * Support either:
         *
         * req.session.user._id
         *
         * or
         *
         * req.session.user.id
         */

        userId =
            user._id ||
            user.id ||
            null;


        userName =
            user.name ||
            user.userName ||
            user.username ||
            "User";

    }


    // ======================================================
    // CREATE ASSET FEED UPDATE
    // ======================================================
    //
    // IMPORTANT:
    //
    // "dairy" points to the PARENT FARM.
    //
    // This means the event appears immediately when
    // viewing the Dairy Farm feed.
    //
    // ======================================================

    try {

        await Update.create({

            dairy:
                parentFarm._id,

            user:
                userId,

            userName:
                userName,

            type:
                "asset",

            asset: {

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

                assetId:
                    asset._id,

                parentFarmCode:
                    parentFarm.code

            }

        });

    } catch (updateError) {

        /*
         * The actual asset has already been saved.
         *
         * We do NOT delete the asset here automatically.
         *
         * The feed record failing should not cause the
         * newly-created financial asset to disappear.
         */

        console.error(
            "Asset Feed Update Creation Error:",
            updateError
        );

    }


    // ======================================================
    // RETURN ASSET
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