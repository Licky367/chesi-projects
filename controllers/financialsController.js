// ==========================================================
// controllers/financialsController.js
// ==========================================================

const financialsService =
    require("../services/financialsService");


// ==========================================================
// HELPER
// ==========================================================

function getUserId(req) {

    return (

        req.user?._id ||

        req.user?.id ||

        null

    );

}


// ==========================================================
// HELPER
// NORMALIZE DATE FILTERS
//
// The summary.ejs expects:
//
// filters: {
//     startDate,
//     endDate
// }
//
// Empty values become "".
//
// The service receives the same values so that:
//
// no dates
//     -> lifetime
//
// start only
//     -> from start date onward
//
// end only
//     -> up to end date
//
// both
//     -> selected date range
//
// IMPORTANT:
// These filters are intended to affect ONLY:
//     - liabilities
//     - profit/loss
//
// Current net worth must remain current.
// ==========================================================

function getDateFilters(req) {

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
// LIABILITY ENTRY PAGE
// ==========================================================

async function getLiabilityEntryPage(
    req,
    res,
    next
) {

    try {

        const structure =
            await financialsService
                .getFinancialStructure();


        res.render(

            "financials/liability",

            {

                title:
                    "Record Liability",

                user:
                    req.user,

                farms:
                    structure.farms,

                standaloneAssets:
                    structure.standaloneAssets,

                error:
                    null,

                success:
                    req.query.success === "1"

            }

        );

    } catch (error) {

        next(error);

    }

}


// ==========================================================
// RECORD LIABILITY
// ==========================================================

async function recordLiability(
    req,
    res,
    next
) {

    try {

        const {

            dairyId,

            amount,

            description

        } = req.body;


        await financialsService.recordLiability({

            dairyId,

            amount,

            description,

            userId:
                getUserId(req)

        });


        res.redirect(
            "/financials/liability?success=1"
        );

    } catch (error) {

        try {

            const structure =
                await financialsService
                    .getFinancialStructure();


            res.status(400).render(

                "financials/liability",

                {

                    title:
                        "Record Liability",

                    user:
                        req.user,

                    farms:
                        structure.farms,

                    standaloneAssets:
                        structure.standaloneAssets,

                    error:
                        error.message,

                    success:
                        false

                }

            );

        } catch (renderError) {

            next(renderError);

        }

    }

}


// ==========================================================
// LIABILITY HISTORY PAGE
// ==========================================================

async function getLiabilityHistoryPage(
    req,
    res,
    next
) {

    try {

        const {

            startDate,

            endDate

        } = getDateFilters(req);


        const history =
            await financialsService
                .getLiabilityHistory(
                    startDate,
                    endDate
                );


        res.render(

            "financials/history",

            {

                title:
                    "Liability History",

                user:
                    req.user,

                standalone:
                    history.standalone,

                farms:
                    history.farms,

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
// FINANCIAL SUMMARY PAGE
//
// summary.ejs expects:
//
//     summary
//
// AND:
//
//     filters
//
// The date filter applies ONLY to:
//
//     1. liabilities
//     2. profit/loss
//
// Current net worth is NOT date filtered.
//
// The service is responsible for enforcing those
// financial rules.
// ==========================================================

async function getFinancialSummaryPage(
    req,
    res,
    next
) {

    try {

        // ----------------------------------------------------
        // GET FILTERS
        // ----------------------------------------------------

        const {

            startDate,

            endDate

        } = getDateFilters(req);


        // ----------------------------------------------------
        // GET FINANCIAL SUMMARY
        //
        // The service receives the selected period.
        //
        // It must return:
        //
        // summary: {
        //
        //     totals: {
        //         currentWorth,
        //         liabilities,
        //         profit
        //     },
        //
        //     farms: [
        //
        //         {
        //             farm,
        //             farmLiabilities,
        //             totalLiabilities,
        //             profit,
        //             assets
        //         }
        //
        //     ],
        //
        //     standalone: {
        //         currentWorth,
        //         liabilities,
        //         profit,
        //         assets
        //     }
        //
        // }
        //
        // IMPORTANT:
        //
        // currentWorth must remain current.
        //
        // liabilities and profit must respect
        // startDate/endDate.
        // ----------------------------------------------------

        const summary =
            await financialsService
                .getFinancialSummary(
                    startDate,
                    endDate
                );


        // ----------------------------------------------------
        // RENDER SUMMARY PAGE
        // ----------------------------------------------------

        res.render(

            "financials/summary",

            {

                title:
                    "Financial Summary",

                user:
                    req.user,

                summary,

                // ------------------------------------------------
                // IMPORTANT:
                //
                // summary.ejs reads:
                //
                // filters?.startDate
                // filters?.endDate
                //
                // Therefore filters MUST be passed separately.
                // ------------------------------------------------

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
// INDIVIDUAL DAIRY FINANCIAL DETAILS
// ==========================================================

async function getDairyFinancialPage(
    req,
    res,
    next
) {

    try {

        const {

            id

        } = req.params;


        const {

            startDate,

            endDate

        } = getDateFilters(req);


        const financial =
            await financialsService
                .getDairyFinancial(
                    id,
                    startDate,
                    endDate
                );


        const liabilities =
            await financialsService
                .getLiabilities(
                    id,
                    startDate,
                    endDate
                );


        res.render(

            "financials/dairy",

            {

                title:
                    `${financial.name} - Financials`,

                user:
                    req.user,

                dairy:
                    financial,

                liabilities,

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
// API: GET DAIRY FINANCIAL DATA
// ==========================================================

async function getDairyFinancialApi(
    req,
    res,
    next
) {

    try {

        const {

            id

        } = req.params;


        const {

            startDate,

            endDate

        } = getDateFilters(req);


        const financial =
            await financialsService
                .getDairyFinancial(
                    id,
                    startDate,
                    endDate
                );


        res.json({

            success:
                true,

            data:
                financial

        });

    } catch (error) {

        next(error);

    }

}


// ==========================================================
// API: GET FINANCIAL SUMMARY
// ==========================================================
//
// The API uses exactly the same filter contract as the
// summary page.
//
// The service receives:
//
//     startDate
//     endDate
//
// and is responsible for:
//
//     - current net worth -> always current
//     - liabilities       -> filtered
//     - profit/loss       -> filtered
//
// ==========================================================

async function getFinancialSummaryApi(
    req,
    res,
    next
) {

    try {

        const {

            startDate,

            endDate

        } = getDateFilters(req);


        const summary =
            await financialsService
                .getFinancialSummary(
                    startDate,
                    endDate
                );


        res.json({

            success:
                true,

            data:
                summary,

            filters: {

                startDate,

                endDate

            }

        });

    } catch (error) {

        next(error);

    }

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getLiabilityEntryPage,

    recordLiability,

    getLiabilityHistoryPage,

    getFinancialSummaryPage,

    getDairyFinancialPage,

    getDairyFinancialApi,

    getFinancialSummaryApi

};