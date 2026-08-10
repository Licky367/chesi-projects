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
// Current values remain current:
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
// HELPER
// VALIDATE FARM
// ==========================================================
//
// A Dairy Farm is identified by:
//
//     code < 0
//
// ==========================================================

function isFarm(dairy) {

    if (!dairy) {

        return false;

    }


    if (

        dairy.code === null ||

        dairy.code === undefined ||

        dairy.code === ""

    ) {

        return false;

    }


    return (

        Number(
            dairy.code
        ) < 0

    );

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
// Supports:
//
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
//
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
// Service:
//
//     getFinancialSummary()
//
// Returns:
//
//     totals
//     farms
//     standalone
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
// INDIVIDUAL DAIRY / ASSET FINANCIAL PAGE
// ==========================================================
//
// URL:
//
//     /financials/dairy/:id
//
// Service:
//
//     getDairyFinancial()
//
// Includes:
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
                    `${financial.name || "Dairy"} - Financials`,

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
// URL:
//
//     /financials/farm/:id
//
// IMPORTANT:
//
// The service does NOT expose:
//
//     getFarmFinancialPage()
//
// Therefore this controller:
//
//     1. Gets all dairies
//     2. Finds the requested farm
//     3. Verifies code < 0
//     4. Passes the farm and all dairies to
//        getFarmFinancialTotals()
//
// Farm totals include:
//
//     farm itself
//     +
//     all farm assets
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
            !isFarm(farm)
        ) {

            throw new Error(
                "Requested Dairy record is not a Dairy Farm."
            );

        }


        // ==================================================
        // GET FARM FINANCIAL TOTALS
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
        // The totals returned above include:
        //
        //     farm liabilities
        //     +
        //     asset liabilities
        //
        // This separate query supplies the liability
        // records belonging directly to the farm for the
        // detailed history section.
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
                    `${farm.name || "Farm"} - Financials`,

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
// URL:
//
//     /financials/standalone?id=<DAIRY_ID>
//
// IMPORTANT:
//
// The standalone route has NO :id parameter.
//
// Therefore:
//
//     req.query.id
//
// is used instead of:
//
//     req.params.id
//
// The service itself verifies that the requested record
// is actually a standalone asset.
//
// ==========================================================

async function getStandaloneFinancialPage(
    req,
    res,
    next
) {

    try {

        const id =

            typeof req.query?.id === "string"

                ? req.query.id.trim()

                : "";


        if (!id) {

            throw new Error(
                "Standalone asset ID is required."
            );

        }


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
//
// URL:
//
//     /financials/api/dairy/:id
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
// API
// GET FARM FINANCIAL DATA
// ==========================================================
//
// URL:
//
//     /financials/api/farm/:id
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
            !isFarm(farm)
        ) {

            throw new Error(
                "Requested Dairy record is not a Dairy Farm."
            );

        }


        // ==================================================
        // GET FARM FINANCIAL TOTALS
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
//
// URL:
//
//     /financials/api/standalone?id=<DAIRY_ID>
//
// ==========================================================

async function getStandaloneFinancialApi(
    req,
    res,
    next
) {

    try {

        const id =

            typeof req.query?.id === "string"

                ? req.query.id.trim()

                : "";


        if (!id) {

            throw new Error(
                "Standalone asset ID is required."
            );

        }


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
//
// URL:
//
//     /financials/api/summary
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
// EXPORTS
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