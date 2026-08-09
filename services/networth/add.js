const mongoose =
    require("mongoose");

const Dairy =
    require("../../models/dairy");


/* ==========================================================
   GET PARENT DAIRY FARM
========================================================== */

async function getParentDairyFarm(id) {

    if (
        !id ||
        !mongoose.Types.ObjectId.isValid(id)
    ) {

        return null;

    }


    /*
     * A Dairy Farm is identified by a negative
     * Dairy code.
     *
     * We also verify the record exists.
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


/* ==========================================================
   CREATE ASSET
========================================================== */

async function createAsset(
    dairyFarmId,
    assetData
) {

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


    /*
     * Verify that the parent is actually
     * a Dairy Farm.
     */

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


    /*
     * Normalize numeric values.
     */

    const buyingPrice =
        Number(
            assetData.buyingPrice
        );


    const currentWorth =
        Number(
            assetData.currentWorth
        );


    /*
     * Build the new asset.
     *
     * IMPORTANT:
     *
     * code is intentionally NOT supplied.
     *
     * This makes the record a manual asset rather
     * than an identified Dairy animal.
     *
     * The parent relationship is represented by
     * assetCode = parentFarm.code.
     */

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

            /*
             * Parent Dairy Farm.
             *
             * This is the important relationship.
             */

            assetCode:
                parentFarm.code

        });


    await asset.save();


    return asset;

}


module.exports = {

    getParentDairyFarm,

    createAsset

};