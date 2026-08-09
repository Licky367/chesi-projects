const Dairy =
    require("../../models/dairy");


/* ==========================================================
   STANDALONE ASSET CHECK
========================================================== */

/**
 * A standalone asset is a Dairy record where:
 *
 *     code > 0
 *
 * AND:
 *
 *     assetCode is null, undefined, or empty.
 *
 * This means the Dairy record is an identified asset,
 * but it has not been assigned to another Dairy Farm.
 *
 * Examples:
 *
 *     code: 10, assetCode: null
 *         => STANDALONE
 *
 *     code: 10, assetCode: undefined
 *         => STANDALONE
 *
 *     code: 10, assetCode: ""
 *         => STANDALONE
 *
 *     code: 10, assetCode: -5
 *         => ASSIGNED
 *
 *     code: -5
 *         => DAIRY FARM / STRUCTURE
 *
 *     code: null
 *         => MANUAL ASSET
 */
function isStandaloneAsset(dairy) {

    if (!dairy) {

        return false;

    }


    /* ======================================================
       POSITIVE CODE
    ====================================================== */

    const code =
        Number(dairy.code);


    const hasPositiveCode =
        Number.isFinite(code) &&
        code > 0;


    /* ======================================================
       NO PARENT / NO ASSET CODE
    ====================================================== */

    const hasNoParent =
        dairy.assetCode === null ||
        dairy.assetCode === undefined ||
        dairy.assetCode === "";


    return (
        hasPositiveCode &&
        hasNoParent
    );

}


/* ==========================================================
   DAIRY FARM / STRUCTURE CHECK
========================================================== */

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
       DAIRY FARMS / STRUCTURES

       Definition:

           code < 0

       These records represent the Dairy Farm/container
       structures themselves.

       They are displayed under the Dairy Farms section,
       but their own currentWorth is NOT counted again
       as part of total Net Worth.
    ======================================================== */

    const structures =
        dairyRecords.filter(
            isDairyFarm
        );


    /* ========================================================
       STANDALONE IDENTIFIED ASSETS

       Definition:

           code > 0
           AND
           assetCode is null / undefined / empty

       These are identified Dairy assets that are not
       assigned to a Dairy Farm.
    ======================================================== */

    const standaloneAssets =
        dairyRecords.filter(
            isStandaloneAsset
        );


    /* ========================================================
       NET WORTH ASSETS

       Included:

           1. Identified standalone assets
              code > 0
              assetCode empty/null

           2. Identified assigned assets
              code > 0
              assetCode assigned

           3. Manual assets
              code null
              assetCode assigned or otherwise present

       Excluded:

           Dairy Farm structures
              code < 0

       Therefore, we remove only records identified as
       Dairy Farm structures.
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

                const worth =
                    Number(
                        asset.currentWorth
                    );


                /* --------------------------------------------
                   Ignore invalid currentWorth values.
                -------------------------------------------- */

                if (
                    !Number.isFinite(worth) ||
                    worth < 0
                ) {

                    return total;

                }


                return total + worth;

            },
            0
        );


    /* ========================================================
       RETURN NET WORTH DATA
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

    /*
     * Exported as well so other Net Worth services can use
     * exactly the same definition of a standalone asset.
     */
    isStandaloneAsset,

    /*
     * Exported for consistency across the Net Worth module.
     */
    isDairyFarm

};