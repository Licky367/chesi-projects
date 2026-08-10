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
// ==========================================================
//
// DATE FILTERING APPLIES TO:
//
//     - liabilities
//     - revenue
//     - profit/loss
//
// CURRENT VALUES ARE NOT DATE FILTERED:
//
//     - currentWorth
//     - sellingPrice
//     - buyingPrice
//
// Profit/loss is calculated by the service using:
//
//     SOLD:
//
//         sellingPrice
//         - buyingPrice
//         - filtered liabilities
//         + filtered revenue
//
//     UNSOLD:
//
//         - filtered liabilities
//         + filtered revenue
//
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
//
// Liability history is filtered by:
//
//     startDate
//     endDate
//
// Farm-owned liabilities remain visible in history,
// regardless of whether they are included in summary totals.
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
// ==========================================================
//
// SUMMARY STRUCTURE:
//
//     summary:
//
//         totals:
//
//             currentWorth
//             sellingPrice
//             buyingPrice
//             revenue
//             liabilities
//             profit
//
//         farms:
//
//             [
//                 {
//                     farm,
//                     currentWorth,
//                     sellingPrice,
//                     buyingPrice,
//                     revenue,
//                     farmLiabilities,
//                     totalLiabilities,
//                     profit,
//                     assets
//                 }
//             ]
//
//         standalone:
//
//             {
//                 currentWorth,
//                 sellingPrice,
//                 buyingPrice,
//                 revenue,
//                 liabilities,
//                 profit,
//                 assets
//             }
//
// ==========================================================
//
// DATE FILTER RULES:
//
// CURRENT:
//
//     currentWorth
//     sellingPrice
//     buyingPrice
//
// FILTERED:
//
//     liabilities
//     revenue
//
// CALCULATED:
//
//     profit/loss
//
// ==========================================================

async function getFinancialSummaryPage(
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


        res.render(

            "financials/summary",

            {

                title:
                    "Financial Summary",

                user:
                    req.user,

                summary,

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
// INDIVIDUAL DAIRY / ASSET FINANCIAL DETAILS
// ==========================================================
//
// The service returns:
//
//     dairy:
//
//         currentWorth
//             -> CURRENT
//
//         sellingPrice
//             -> CURRENT
//
//         buyingPrice
//             -> CURRENT
//
//         revenue
//             -> FILTERED
//
//         totalLiabilities
//             -> FILTERED
//
//         profit
//             -> FILTERED/CALCULATED
//
// ==========================================================
//
// PROFIT:
//
// SOLD:
//
//     sellingPrice
//     - buyingPrice
//     - filteredLiabilities
//     + filteredRevenue
//
// UNSOLD:
//
//     - filteredLiabilities
//     + filteredRevenue
//
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
// INDIVIDUAL FARM FINANCIAL DETAILS
// ==========================================================
//
// Opened when a farm name is selected.
//
// The service MUST include:
//
//     FARM ITSELF
//
//         currentWorth
//         sellingPrice
//         buyingPrice
//         revenue
//         liabilities
//         profit
//
//     +
//     ALL ASSETS BELONGING TO THE FARM
//
//         currentWorth
//         sellingPrice
//         buyingPrice
//         revenue
//         liabilities
//         profit
//
// ==========================================================
//
// FARM TOTALS:
//
//     farm itself
//     +
//     all farm assets
//
// CURRENT:
//
//     currentWorth
//     sellingPrice
//     buyingPrice
//
// FILTERED:
//
//     liabilities
//     revenue
//
// CALCULATED:
//
//     profit
//
// ==========================================================

async function getFarmFinancialPage(
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
                .getFarmFinancialPage(
                    id,
                    startDate,
                    endDate
                );


        res.render(

            "financials/dairy",

            {

                title:
                    `${financial.farm?.name || "Farm"} - Financials`,

                user:
                    req.user,

                dairy:
                    financial,

                liabilities:
                    financial.liabilities || [],

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
// INDIVIDUAL STANDALONE ASSET FINANCIAL DETAILS
// ==========================================================
//
// CURRENT:
//
//     currentWorth
//     sellingPrice
//     buyingPrice
//
// FILTERED:
//
//     revenue
//     liabilities
//
// CALCULATED:
//
//     profit
//
// ==========================================================

async function getStandaloneFinancialPage(
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
                .getStandaloneFinancial(
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

            "financials/standalone",

            {

                title:
                    `${financial.name || "Standalone Asset"} - Financials`,

                user:
                    req.user,

                standalone:
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
//
// CURRENT:
//
//     currentWorth
//     sellingPrice
//     buyingPrice
//
// FILTERED:
//
//     revenue
//     liabilities
//
// CALCULATED:
//
//     profit
//
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
                financial,

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
// API: GET FARM FINANCIAL DATA
// ==========================================================
//
// CURRENT:
//
//     currentWorth
//     sellingPrice
//     buyingPrice
//
// FILTERED:
//
//     revenue
//     liabilities
//
// CALCULATED:
//
//     profit
//
// FARM TOTALS INCLUDE:
//
//     farm itself
//     +
//     all farm assets
//
// ==========================================================

async function getFarmFinancialApi(
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
                .getFarmFinancialPage(
                    id,
                    startDate,
                    endDate
                );


        res.json({

            success:
                true,

            data:
                financial,

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
// API: GET STANDALONE FINANCIAL DATA
// ==========================================================
//
// CURRENT:
//
//     currentWorth
//     sellingPrice
//     buyingPrice
//
// FILTERED:
//
//     revenue
//     liabilities
//
// CALCULATED:
//
//     profit
//
// ==========================================================

async function getStandaloneFinancialApi(
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
                .getStandaloneFinancial(
                    id,
                    startDate,
                    endDate
                );


        res.json({

            success:
                true,

            data:
                financial,

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
// API: GET FINANCIAL SUMMARY
// ==========================================================
//
// SAME RULES AS SUMMARY PAGE.
//
// CURRENT:
//
//     currentWorth
//     sellingPrice
//     buyingPrice
//
// FILTERED:
//
//     liabilities
//     revenue
//
// PROFIT:
//
//     SOLD:
//
//         sellingPrice
//         - buyingPrice
//         - filteredLiabilities
//         + filteredRevenue
//
//     UNSOLD:
//
//         - filteredLiabilities
//         + filteredRevenue
//
// FARM TOTALS:
//
//     farm itself
//     +
//     all farm assets
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

    getFarmFinancialPage,

    getStandaloneFinancialPage,

    getDairyFinancialApi,

    getFarmFinancialApi,

    getStandaloneFinancialApi,

    getFinancialSummaryApi

};