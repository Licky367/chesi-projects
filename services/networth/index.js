const Dairy =
    require("../../models/Dairy");


/* ==========================================================
   GET NET WORTH
========================================================== */

async function getNetWorth() {


    /* ========================================================
       LOAD ALL RELEVANT DAIRY RECORDS
    ======================================================== */

    const dairyRecords =
        await Dairy.find({})
            .lean();


    /* ========================================================
       DAIRY FARMS
       
       Definition:
       
           code < 0
    ======================================================== */

    const structures =
        dairyRecords.filter(
            function (dairy) {

                return (
                    dairy &&
                    dairy.code !== null &&
                    dairy.code !== undefined &&
                    Number(dairy.code) < 0
                );

            }
        );


    /* ========================================================
       STANDALONE IDENTIFIED ASSETS
       
       Definition:
       
           code > 0
           assetCode === null
       
       NOT:
       
           code < 0
           code === null
           assetCode !== null
    ======================================================== */

    const standaloneAssets =
        dairyRecords.filter(
            function (dairy) {

                if (!dairy) {

                    return false;

                }


                const hasPositiveCode =
                    dairy.code !== null &&
                    dairy.code !== undefined &&
                    Number(dairy.code) > 0;


                const hasNoParent =
                    dairy.assetCode === null ||
                    dairy.assetCode === undefined ||
                    dairy.assetCode === "";


                return (
                    hasPositiveCode &&
                    hasNoParent
                );

            }
        );


    /* ========================================================
       TOTAL NET WORTH
       
       Net Worth consists of the currentWorth of assets.
       
       We do NOT simply sum every Dairy record because
       Dairy Farm structure records themselves are containers
       and should not be counted again as assets.
       
       Included:
       
           1. Identified standalone assets
              code > 0
              assetCode empty/null
       
           2. Identified assigned assets
              code > 0
              assetCode assigned
       
           3. Manual assets
              code null
              assetCode assigned
       
       Excluded:
       
           Dairy Farms
              code < 0
    ======================================================== */

    const assets =
        dairyRecords.filter(
            function (dairy) {

                if (!dairy) {

                    return false;

                }


                /*
                 * Dairy Farm / structure.
                 */

                if (
                    dairy.code !== null &&
                    dairy.code !== undefined &&
                    Number(dairy.code) < 0
                ) {

                    return false;

                }


                /*
                 * Anything else is an asset:
                 *
                 * code > 0
                 * OR
                 * code === null
                 */

                return true;

            }
        );


    /* ========================================================
       CALCULATE TOTAL
    ======================================================== */

    const totalNetWorth =
        assets.reduce(
            function (total, asset) {

                const worth =
                    Number(
                        asset.currentWorth
                    );


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
       RETURN DATA
    ======================================================== */

    return {

        totalNetWorth,

        standaloneAssets,

        structures

    };

}


module.exports = {

    getNetWorth

};