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

        } = req.query;


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

                    startDate:
                        startDate || "",

                    endDate:
                        endDate || ""

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

        } = req.query;


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

                summary

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

        } = req.query;


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

                    startDate:
                        startDate || "",

                    endDate:
                        endDate || ""

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

        } = req.query;


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

async function getFinancialSummaryApi(
    req,
    res,
    next
) {

    try {

        const {

            startDate,

            endDate

        } = req.query;


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
                summary

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