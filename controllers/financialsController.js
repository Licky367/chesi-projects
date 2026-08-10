// ==========================================================
// controllers/financialsController.js
// ==========================================================

const financialsService =
    require("../services/financialsService");


// ==========================================================
// HELPER
// GET USER ID
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
// Date filters affect:
//
//     liabilities
//     revenue
//     profit
//
// Current asset values remain:
//
//     currentWorth
//     buyingPrice
//     sellingPrice
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
// INDIVIDUAL DAIRY / ASSET FINANCIAL PAGE
// ==========================================================
//
// Used for an individual Dairy record.
//
// This can represent:
//
//     Animal
//     Farm asset
//
// The service calculates:
//
//     currentWorth
//     salesAmount
//     revenue
//     totalLiabilities
//     profit
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
// INDIVIDUAL FARM FINANCIAL PAGE
// ==========================================================
//
// IMPORTANT:
//
// A Dairy Farm is simply:
//
//     Dairy.code < 0
//
// Farm totals include:
//
//     FARM ITSELF
//
//     +
//     
//     ALL DAIRY ASSETS WHOSE assetCode
//     MATCHES THE FARM code
//
// The generated service exposes:
//
//     getFarmFinancialTotals()
//
// NOT:
//
//     getFarmFinancialPage()
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


        // ==================================================
        // GET ALL DAIRY RECORDS
        // ==================================================

        const dairies =

            await financialsService
                .getAllDairies();


        // ==================================================
        // FIND REQUESTED FARM
        //
        // A farm MUST have code < 0.
        // ==================================================

        const farm =

            dairies.find(

                dairy =>

                    String(
                        dairy._id
                    ) ===
                    String(id)

            );


        if (!farm) {

            throw new Error(
                "Dairy Farm not found."
            );

        }


        if (

            farm.code === null ||

            farm.code === undefined ||

            Number(
                farm.code
            ) >= 0

        ) {

            throw new Error(
                "Requested Dairy record is not a Dairy Farm."
            );

        }


        // ==================================================
        // BUILD FARM FINANCIAL TOTALS
        // ==================================================
        //
        // The service handles:
        //
        //     farm
        //     +
        //     farm assets
        //
        // and calculates:
        //
        //     currentWorth
        //     liabilities
        //     sales
        //     revenue
        //     profit
        //
        // ==================================================

        const financial =

            await financialsService
                .getFarmFinancialTotals(

                    farm,

                    dairies,

                    startDate,

                    endDate

                );


        // ==================================================
        // GET FARM'S OWN LIABILITY RECORDS
        // ==================================================
        //
        // The totals above already include liabilities
        // belonging to the farm AND its assets.
        //
        // This query is for the detailed liability records
        // belonging directly to the farm.
        //
        // ==================================================

        const liabilities =

            await financialsService
                .getLiabilities(

                    farm._id,

                    startDate,

                    endDate

                );


        // ==================================================
        // RENDER
        // ==================================================

        res.render(

            "financials/dairy",

            {

                title:
                    `${farm.name} - Financials`,

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
// INDIVIDUAL STANDALONE ASSET FINANCIAL PAGE
// ==========================================================
//
// A standalone asset:
//
//     code      -> null
//     assetCode -> null
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
// API
// GET INDIVIDUAL DAIRY FINANCIAL DATA
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
// API
// GET FARM FINANCIAL DATA
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


        // ==================================================
        // GET ALL DAIRIES
        // ==================================================

        const dairies =

            await financialsService
                .getAllDairies();


        // ==================================================
        // FIND FARM
        // ==================================================

        const farm =

            dairies.find(

                dairy =>

                    String(
                        dairy._id
                    ) ===
                    String(id)

            );


        if (!farm) {

            throw new Error(
                "Dairy Farm not found."
            );

        }


        // ==================================================
        // VERIFY FARM
        // ==================================================

        if (

            farm.code === null ||

            farm.code === undefined ||

            Number(
                farm.code
            ) >= 0

        ) {

            throw new Error(
                "Requested Dairy record is not a Dairy Farm."
            );

        }


        // ==================================================
        // GET FINANCIAL TOTALS
        // ==================================================

        const financial =

            await financialsService
                .getFarmFinancialTotals(

                    farm,

                    dairies,

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
// API
// GET STANDALONE FINANCIAL DATA
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
// API
// GET FINANCIAL SUMMARY
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