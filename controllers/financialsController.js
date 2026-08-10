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
//
// Dairy Farm:
//     code < 0
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
//
// Standalone asset:
//
//     code === null
//     assetCode === null
//
// This follows the current Dairy model.
// ==========================================================

function isStandaloneAsset(dairy) {

    if (!dairy) {

        return false;

    }


    const codeIsNull =

        dairy.code === null ||

        dairy.code === undefined;


    const assetCodeIsNull =

        dairy.assetCode === null ||

        dairy.assetCode === undefined;


    return (

        codeIsNull &&

        assetCodeIsNull

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
//
// Converts the financial service response into the
// structure expected by standalone.ejs.
//
// EJS expects:
//
//     currentWorth
//     buyingPrice
//     sellingPrice
//     revenue
//     liabilities
//     profit
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


    /*
     * New field:
     *
     *     sellingPrice
     *
     * Backwards compatibility:
     *
     *     salesAmount
     */

    const sellingPrice =

        number(

            source.sellingPrice !== undefined

                ? source.sellingPrice

                : (

                    source.salesAmount !== undefined

                        ? source.salesAmount

                        : dairy?.sellingPrice

                )

        );


    const revenue =

        number(

            source.revenue

        );


    /*
     * Different financial service versions may expose
     * liabilities under different names.
     */

    const liabilities =

        number(

            source.liabilities !== undefined

                ? source.liabilities

                : (

                    source.totalLiabilities !== undefined

                        ? source.totalLiabilities

                        : 0

                )

        );


    /*
     * The EJS expects profit to follow:
     *
     * sellingPrice
     * - buyingPrice
     * - liabilities
     * + revenue
     */

    const profit =

        number(

            source.profit !== undefined

                ? source.profit

                : (

                    sellingPrice
                    -
                    buyingPrice
                    -
                    liabilities
                    +
                    revenue

                )

        );


    return {

        ...dairy,

        currentWorth,

        buyingPrice,

        sellingPrice,

        revenue,

        liabilities,

        profit

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

        if (!isFarm(farm)) {

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
        // GET FARM LIABILITY RECORDS
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
// STANDALONE ASSETS FINANCIAL PAGE
// ==========================================================
//
// URL:
//
//     GET /financials/standalone
//
// IMPORTANT:
//
// This is a COLLECTION page.
//
// There is NO:
//
//     /financials/standalone/:id
//
// and no:
//
//     ?id=...
//
// is required.
//
// Standalone assets are:
//
//     code === null
//     assetCode === null
//
// Each standalone asset is financially evaluated and then
// returned inside:
//
//     standalone.assets
//
// The EJS also receives collection totals:
//
//     standalone.currentWorth
//     standalone.buyingPrice
//     standalone.sellingPrice
//     standalone.revenue
//     standalone.liabilities
//     standalone.profit
//
// Current values:
//
//     currentWorth
//     buyingPrice
//     sellingPrice
//
// remain current.
//
// Revenue and liabilities:
//
//     are calculated using the selected date filters.
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
        // GET ALL DAIRY RECORDS
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
        // GET FINANCIAL DATA FOR EACH ASSET
        // ==================================================
        //
        // getDairyFinancial() is used here because each
        // standalone asset is still a Dairy model record.
        //
        // The collection page then combines those individual
        // financial records.
        // ==================================================

        const assets =

            await Promise.all(

                standaloneDairies.map(

                    async function(dairy) {

                        const financial =

                            await financialsService
                                .getDairyFinancial(

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
        // CALCULATE COLLECTION TOTALS
        // ==================================================

        let currentWorth = 0;

        let buyingPrice = 0;

        let sellingPrice = 0;

        let revenue = 0;

        let liabilities = 0;

        let profit = 0;


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

            }

        );


        // ==================================================
        // STANDALONE COLLECTION
        // ==================================================

        const standalone = {

            assets,

            currentWorth,

            buyingPrice,

            sellingPrice,

            revenue,

            liabilities,

            profit

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

        if (!isFarm(farm)) {

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
// GET ALL STANDALONE ASSET FINANCIAL DATA
// ==========================================================
//
// URL:
//
//     GET /financials/api/standalone
//
// IMPORTANT:
//
// This is a COLLECTION endpoint.
//
// It does NOT require:
//
//     ?id=...
//
// It returns:
//
//     assets
//     current values
//     filtered revenue
//     filtered liabilities
//     profit/loss
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
        // GET ALL DAIRY RECORDS
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
                                .getDairyFinancial(

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

        let revenue = 0;

        let liabilities = 0;

        let profit = 0;


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

            }

        );


        res.json({

            success:
                true,

            data: {

                assets,

                currentWorth,

                buyingPrice,

                sellingPrice,

                revenue,

                liabilities,

                profit

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