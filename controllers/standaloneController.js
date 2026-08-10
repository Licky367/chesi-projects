// ==========================================================
// controllers/standaloneController.js
// ==========================================================
//
// PURPOSE:
//
// Handles:
//
//     GET /financials/standalone
//
// The standalone.ejs page displays ALL standalone Dairy
// records in a financial table.
//
// A standalone asset is a Dairy record with:
//
//     code      -> empty
//     assetCode -> empty
//
// This controller does NOT handle an individual asset.
//
// ==========================================================


const standaloneService =
    require("../services/standaloneService");


// ==========================================================
// DATE FILTER HELPER
// ==========================================================
//
// Supported:
//
//     /financials/standalone
//
//     /financials/standalone?startDate=YYYY-MM-DD
//
//     /financials/standalone?endDate=YYYY-MM-DD
//
//     /financials/standalone?startDate=YYYY-MM-DD
//                              &endDate=YYYY-MM-DD
// ==========================================================

function getDateFilters(
    req
) {

    const startDate =

        typeof req.query?.startDate === "string"

            ? req.query.startDate.trim()

            : "";


    const endDate =

        typeof req.query?.endDate === "string"

            ? req.query.endDate.trim()

            : "";


    return {

        startDate,

        endDate

    };

}


// ==========================================================
// STANDALONE PAGE
// ==========================================================
//
// GET /financials/standalone
//
// Renders:
//
//     views/financials/standalone.ejs
//
// The service supplies:
//
//     assets
//     totals
// ==========================================================

async function getStandalonePage(
    req,
    res,
    next
) {

    try {

        // ==================================================
        // GET DATE FILTERS
        // ==================================================

        const {

            startDate,

            endDate

        } =
            getDateFilters(
                req
            );


        // ==================================================
        // GET STANDALONE FINANCIAL DATA
        // ==================================================

        const result =
            await standaloneService
                .getStandaloneFinancials(

                    startDate,

                    endDate

                );


        // ==================================================
        // RENDER PAGE
        // ==================================================

        return res.render(

            "financials/standalone",

            {

                title:
                    "Standalone Assets",

                user:
                    req.user,

                // --------------------------------------------------
                // ALL STANDALONE RECORDS
                // --------------------------------------------------

                assets:
                    result.assets,

                // --------------------------------------------------
                // ALIAS
                //
                // Kept available in case standalone.ejs uses
                // "standalone" as its collection variable.
                // --------------------------------------------------

                standalone:
                    result.assets,

                // --------------------------------------------------
                // TABLE TOTALS
                // --------------------------------------------------

                totals:
                    result.totals,

                // --------------------------------------------------
                // DATE FILTERS
                // --------------------------------------------------

                filters: {

                    startDate,

                    endDate

                }

            }

        );

    } catch (error) {

        next(error);

    }

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getStandalonePage

};