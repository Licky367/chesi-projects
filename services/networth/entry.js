const Dairy =
    require("../../models/dairy");


/* ==========================================================
   DAIRY FARM CHECK
========================================================== */

/**
 * A Dairy Farm / structure is a Dairy record whose
 * code is negative.
 *
 *     code < 0
 */
function isDairyFarm(dairy) {

    if (!dairy) {

        return false;

    }


    const code =
        Number(dairy.code);


    return (
        Number.isFinite(code) &&
        code < 0
    );

}


/* ==========================================================
   STANDALONE ASSET CHECK
========================================================== */

/**
 * A standalone asset is a Dairy record that:
 *
 *     code > 0
 *
 * AND:
 *
 *     assetCode is null, undefined, or empty.
 *
 * Therefore:
 *
 *     code > 0 + no assetCode
 *         = standalone asset
 *
 *     code > 0 + assetCode
 *         = assigned asset
 *
 *     code < 0
 *         = Dairy Farm
 *
 *     code === null
 *         = manual asset
 */
function isStandaloneAsset(dairy) {

    if (!dairy) {

        return false;

    }


    const code =
        Number(dairy.code);


    const hasPositiveCode =
        Number.isFinite(code) &&
        code > 0;


    const hasNoAssetCode =
        dairy.assetCode === null ||
        dairy.assetCode === undefined ||
        dairy.assetCode === "";


    return (
        hasPositiveCode &&
        hasNoAssetCode
    );

}


/* ==========================================================
   GET NET WORTH
========================================================== */

async function getNetWorth() {

    /* ========================================================
       LOAD DAIRY RECORDS
    ======================================================== */

    const dairyRecords =
        await Dairy.find({})
            .lean();


    /* ========================================================
       DAIRY FARMS

       Every Dairy record with:

           code < 0

       is a Dairy Farm / structure.
    ======================================================== */

    const structures =
        dairyRecords.filter(
            isDairyFarm
        );


    /* ========================================================
       STANDALONE ASSETS

       Every Dairy record with:

           code > 0
           AND
           assetCode null/missing/empty
    ======================================================== */

    const standaloneAssets =
        dairyRecords.filter(
            isStandaloneAsset
        );


    /* ========================================================
       ACTUAL NET WORTH ASSETS

       Dairy Farm structures are containers and therefore
       are NOT counted directly.

       Everything else is an asset:

           code > 0
           OR
           code === null
           OR
           other non-farm records
    ======================================================== */

    const assets =
        dairyRecords.filter(
            function (dairy) {

                if (!dairy) {

                    return false;

                }


                return !isDairyFarm(dairy);

            }
        );


    /* ========================================================
       CALCULATE TOTAL NET WORTH
    ======================================================== */

    const totalNetWorth =
        assets.reduce(
            function (total, asset) {

                const currentWorth =
                    Number(
                        asset.currentWorth
                    );


                /*
                 * Ignore missing, invalid, or negative values.
                 */

                if (
                    !Number.isFinite(
                        currentWorth
                    ) ||
                    currentWorth < 0
                ) {

                    return total;

                }


                return (
                    total +
                    currentWorth
                );

            },
            0
        );


    /* ========================================================
       RETURN DATA TO CONTROLLER
    ======================================================== */

    return {

        totalNetWorth,

        standaloneAssets,

        structures

    };

}


/* ==========================================================
   EXPORTS
========================================================== */

module.exports = {

    getNetWorth,

    isStandaloneAsset,

    isDairyFarm

};