// ==========================================================
// controllers/financialsController.js
// ==========================================================
//
// FINANCIALS CONTROLLER
//
// FINANCIAL DEFINITIONS
// ----------------------------------------------------------
//
// monetaryAssets
//
//     = revenue
//     + salesAmount
//
// propertyAssets
//
//     = currentWorth of unsold assets
//
// netWorth
//
//     = monetaryAssets
//     + propertyAssets
//
// The financialsService is responsible for calculating these
// values. This controller only prepares the data for the
// views and APIs.
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
// IDENTIFY FARM
// ==========================================================
//
// Dairy Farm:
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
// HELPER
// IDENTIFY STANDALONE ASSET
// ==========================================================
//
// Standalone:
//
//     code      = null
//     assetCode = null
//
// ==========================================================

function isStandaloneAsset(dairy) {

    if (!dairy) {

        return false;

    }


    const noCode = (

        dairy.code === null ||

        dairy.code === undefined ||

        dairy.code === ""

    );


    const noAssetCode = (

        dairy.assetCode === null ||

        dairy.assetCode === undefined ||

        dairy.assetCode === ""

    );


    return (

        noCode &&

        noAssetCode

    );

}


// ==========================================================
// HELPER
// NORMALIZE NUMBER
// ==========================================================

function number(value) {

    const result =
        Number(value);


    return Number.isFinite(result)

        ? result

        : 0;

}


// ==========================================================
// HELPER
// NORMALIZE STANDALONE FINANCIAL RECORD
// ==========================================================
//
// The service is now the source of truth for:
//
//     salesAmount
//     revenue
//     monetaryAssets
//     propertyAssets
//     netWorth
//     profit
//
// This helper only guarantees that the values expected by
// standalone.ejs exist and are numeric.
// ==========================================================

function normalizeStandaloneFinancial(
    dairy,
    financial
) {

    const source =
        financial || {};


    const currentWorth =
        number(

            source.currentWorth !== undefined

                ? source.currentWorth

                : dairy?.currentWorth

        );


    const buyingPrice =
        number(

            source.buyingPrice !== undefined

                ? source.buyingPrice

                : dairy?.buyingPrice

        );


    const sellingPrice =
        number(

            source.sellingPrice !== undefined

                ? source.sellingPrice

                : dairy?.sellingPrice

        );


    const salesAmount =
        number(
            source.salesAmount
        );


    const revenue =
        number(
            source.revenue
        );


    const liabilities =
        number(

            source.totalLiabilities !== undefined

                ? source.totalLiabilities

                : source.liabilities

        );


    const monetaryAssets =
        number(

            source.monetaryAssets !== undefined

                ? source.monetaryAssets

                : (

                    revenue +
                    salesAmount

                )

        );


    const propertyAssets =
        number(

            source.propertyAssets !== undefined

                ? source.propertyAssets

                : (

                    source.status?.toLowerCase?.() === "sold"

                        ? 0

                        : currentWorth

                )

        );


    const netWorth =
        number(

            source.netWorth !== undefined

                ? source.netWorth

                : (

                    monetaryAssets +
                    propertyAssets

                )

        );


    const profit =
        number(
            source.profit
        );


    return {

        ...dairy,

        currentWorth,

        buyingPrice,

        sellingPrice,

        salesAmount,

        revenue,

        liabilities,

        totalLiabilities:
            liabilities,

        profit,

        monetaryAssets,

        propertyAssets,

        netWorth

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


        // --------------------------------------------------
        // GET ALL DAIRIES
        // --------------------------------------------------

        const dairies =
            await financialsService
                .getAllDairies();


        // --------------------------------------------------
        // FIND FARM
        // --------------------------------------------------

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


        // --------------------------------------------------
        // VERIFY FARM
        // --------------------------------------------------

        if (!isFarm(farm)) {

            throw new Error(
                "Requested Dairy record is not a Dairy Farm."
            );

        }


        // --------------------------------------------------
        // GET FARM FINANCIALS
        // --------------------------------------------------

        const financial =
            await financialsService
                .getFarmFinancialTotals(

                    farm,

                    dairies,

                    startDate,

                    endDate

                );


        // --------------------------------------------------
        // GET FARM LIABILITIES
        // --------------------------------------------------

        const liabilities =
            await financialsService
                .getLiabilities(

                    farm._id,

                    startDate,

                    endDate

                );


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
// STANDALONE ASSETS FINANCIAL PAGE
// ==========================================================
//
// URL:
//
//     GET /financials/standalone
//
// This is a collection page.
//
// There is NO:
//
//     /financials/standalone/:id
//
// ==========================================================

async function getStandaloneFinancialPage(
    req,
    res,
    next
) {

    try {

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
        // FIND STANDALONE ASSETS
        // ==================================================

        const standaloneDairies =
            dairies.filter(

                dairy =>
                    isStandaloneAsset(dairy)

            );


        // ==================================================
        // BUILD INDIVIDUAL FINANCIAL RECORDS
        // ==================================================

        const assets =
            await Promise.all(

                standaloneDairies.map(

                    async function(dairy) {

                        const financial =
                            await financialsService
                                .getStandaloneFinancial(

                                    dairy._id,

                                    startDate,

                                    endDate

                                );


                        return normalizeStandaloneFinancial(

                            dairy,

                            financial

                        );

                    }

                )

            );


        // ==================================================
        // COLLECTION TOTALS
        // ==================================================

        let currentWorth = 0;

        let buyingPrice = 0;

        let sellingPrice = 0;

        let salesAmount = 0;

        let revenue = 0;

        let liabilities = 0;

        let profit = 0;

        let monetaryAssets = 0;

        let propertyAssets = 0;

        let netWorth = 0;


        assets.forEach(

            function(asset) {

                currentWorth +=
                    number(
                        asset.currentWorth
                    );


                buyingPrice +=
                    number(
                        asset.buyingPrice
                    );


                sellingPrice +=
                    number(
                        asset.sellingPrice
                    );


                salesAmount +=
                    number(
                        asset.salesAmount
                    );


                revenue +=
                    number(
                        asset.revenue
                    );


                liabilities +=
                    number(
                        asset.liabilities
                    );


                profit +=
                    number(
                        asset.profit
                    );


                monetaryAssets +=
                    number(
                        asset.monetaryAssets
                    );


                propertyAssets +=
                    number(
                        asset.propertyAssets
                    );

            }

        );


        // --------------------------------------------------
        // IMPORTANT
        //
        // monetaryAssets =
        //     revenue + salesAmount
        //
        // netWorth =
        //     monetaryAssets + propertyAssets
        // --------------------------------------------------

        monetaryAssets =
            revenue +
            salesAmount;


        netWorth =
            monetaryAssets +
            propertyAssets;


        // ==================================================
        // STANDALONE COLLECTION
        // ==================================================

        const standalone = {

            assets,

            currentWorth,

            buyingPrice,

            sellingPrice,

            salesAmount,

            revenue,

            liabilities,

            profit,

            monetaryAssets,

            propertyAssets,

            netWorth

        };


        // ==================================================
        // RENDER
        // ==================================================

        res.render(

            "financials/standalone",

            {

                title:
                    "Standalone Assets - Financials",

                user:
                    req.user,

                standalone,

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


        // --------------------------------------------------
        // GET ALL DAIRIES
        // --------------------------------------------------

        const dairies =
            await financialsService
                .getAllDairies();


        // --------------------------------------------------
        // FIND FARM
        // --------------------------------------------------

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


        // --------------------------------------------------
        // VERIFY FARM
        // --------------------------------------------------

        if (!isFarm(farm)) {

            throw new Error(
                "Requested Dairy record is not a Dairy Farm."
            );

        }


        // --------------------------------------------------
        // GET FARM FINANCIALS
        // --------------------------------------------------

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
// GET ALL STANDALONE ASSET FINANCIAL DATA
// ==========================================================
//
// URL:
//
//     GET /financials/api/standalone
//
// ==========================================================

async function getStandaloneFinancialApi(
    req,
    res,
    next
) {

    try {

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
        // FIND STANDALONE ASSETS
        // ==================================================

        const standaloneDairies =
            dairies.filter(

                dairy =>
                    isStandaloneAsset(dairy)

            );


        // ==================================================
        // GET FINANCIAL DATA
        // ==================================================

        const assets =
            await Promise.all(

                standaloneDairies.map(

                    async function(dairy) {

                        const financial =
                            await financialsService
                                .getStandaloneFinancial(

                                    dairy._id,

                                    startDate,

                                    endDate

                                );


                        return normalizeStandaloneFinancial(

                            dairy,

                            financial

                        );

                    }

                )

            );


        // ==================================================
        // CALCULATE TOTALS
        // ==================================================

        let currentWorth = 0;

        let buyingPrice = 0;

        let sellingPrice = 0;

        let salesAmount = 0;

        let revenue = 0;

        let liabilities = 0;

        let profit = 0;

        let propertyAssets = 0;


        assets.forEach(

            function(asset) {

                currentWorth +=
                    number(
                        asset.currentWorth
                    );


                buyingPrice +=
                    number(
                        asset.buyingPrice
                    );


                sellingPrice +=
                    number(
                        asset.sellingPrice
                    );


                salesAmount +=
                    number(
                        asset.salesAmount
                    );


                revenue +=
                    number(
                        asset.revenue
                    );


                liabilities +=
                    number(
                        asset.liabilities
                    );


                profit +=
                    number(
                        asset.profit
                    );


                propertyAssets +=
                    number(
                        asset.propertyAssets
                    );

            }

        );


        // ==================================================
        // NEW MONETARY ASSET DEFINITION
        // ==================================================
        //
        // monetaryAssets =
        //
        //     revenue
        //     +
        //     salesAmount
        //
        // ==================================================

        const monetaryAssets =
            revenue +
            salesAmount;


        // ==================================================
        // NET WORTH
        // ==================================================

        const netWorth =
            monetaryAssets +
            propertyAssets;


        // ==================================================
        // RESPONSE
        // ==================================================

        res.json({

            success:
                true,

            data: {

                assets,

                currentWorth,

                buyingPrice,

                sellingPrice,

                salesAmount,

                revenue,

                liabilities,

                profit,

                monetaryAssets,

                propertyAssets,

                netWorth

            },

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