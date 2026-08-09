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
 * A standalone identified Dairy asset is:
 *
 *     code > 0
 *
 * AND:
 *
 *     assetCode is null, undefined, or empty.
 *
 * Examples:
 *
 *     code = 10
 *     assetCode = null
 *     => standalone asset
 *
 *     code = 10
 *     assetCode = -5
 *     => assigned asset
 *
 *     code = -5
 *     => Dairy Farm
 *
 *     code = null
 *     => manual asset
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
   ASSET CHECK
========================================================== */

/**
 * Anything that is NOT a Dairy Farm is considered
 * an asset for Net Worth purposes.
 *
 * Included:
 *
 *     code > 0
 *     code === null
 *     code === undefined
 *
 * Excluded:
 *
 *     code < 0
 */
function isNetWorthAsset(dairy) {

    if (!dairy) {
        return false;
    }

    return !isDairyFarm(dairy);
}


/* ==========================================================
   GET NET WORTH
========================================================== */

async function getNetWorth() {

    /* ========================================================
       LOAD ALL DAIRY RECORDS
    ======================================================== */

    const dairyRecords =
        await Dairy.find({})
            .lean();


    /* ========================================================
       DAIRY FARMS
    ======================================================== */

    const structures =
        dairyRecords.filter(
            isDairyFarm
        );


    /* ========================================================
       STANDALONE IDENTIFIED ASSETS
    ======================================================== */

    const standaloneAssets =
        dairyRecords.filter(
            isStandaloneAsset
        );


    /* ========================================================
       NET WORTH ASSETS
       
       Dairy Farms are containers and are therefore excluded
       from the Net Worth calculation.
    ======================================================== */

    const assets =
        dairyRecords.filter(
            isNetWorthAsset
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
       RETURN
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

    isDairyFarm,

    isNetWorthAsset

};