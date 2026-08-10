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
// NORMALIZE DATE FILTERS
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
// IMPORTANT:
//
// financialsService exposes:
//
//     getFarmFinancialTotals()
//
// It does NOT expose:
//
//     getFarmFinancialPage()
//
// Therefore the controller prepares the farm object and
// passes it to getFarmFinancialTotals().
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
        // FIND SELECTED FARM
        // ==================================================

        const farm =
            dairies.find(

                dairy =>

                    String(
                        dairy._id
                    ) ===
                    String(
                        id
                    )

            );


        if (!farm) {

            throw new Error(
                "Dairy farm not found."
            );

        }


        // ==================================================
        // VERIFY FARM
        //
        // A farm has a negative code.
        // ==================================================

        if (

            farm.code === null ||

            farm.code === undefined ||

            Number(
                farm.code
            ) >= 0

        ) {

            throw new Error(
                "The selected record is not a dairy farm."
            );

        }


        // ==================================================
        // GET FARM FINANCIALS
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
        // GET FARM LIABILITY HISTORY
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
// API: INDIVIDUAL DAIRY / ASSET
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
// API: INDIVIDUAL FARM
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


        const dairies =
            await financialsService
                .getAllDairies();


        const farm =
            dairies.find(

                dairy =>

                    String(
                        dairy._id
                    ) ===
                    String(
                        id
                    )

            );


        if (!farm) {

            throw new Error(
                "Dairy farm not found."
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
                "The selected record is not a dairy farm."
            );

        }


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
// API: FINANCIAL SUMMARY
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

    getDairyFinancialApi,

    getFarmFinancialApi,

    getFinancialSummaryApi

};