// ==========================================================
// services/financialsService.js
// ==========================================================
//
// CENTRAL FINANCIAL BUSINESS-LOGIC SERVICE
//
// FINANCIAL HIERARCHY
// ----------------------------------------------------------
//
// A Dairy Farm consists of:
//
//     FARM
//       ├── Dairy / Asset A
//       ├── Dairy / Asset B
//       └── Dairy / Asset C
//
// IMPORTANT:
//
// A farm's financial total is:
//
//     FARM OWN VALUE
//     +
//     ALL ASSIGNED DAIRY VALUES
//
// This applies to:
//
//     buyingPrice
//     sellingPrice
//     currentWorth
//     revenue
//     liabilities
//     salesAmount
//     profit
//     monetaryAssets
//     propertyAssets
//     netWorth
//
// Therefore:
//
//     farm.totalRevenue
//         = farm.revenue
//         + asset revenues
//
//     farm.totalLiabilities
//         = farm liabilities
//         + asset liabilities
//
//     farm.totalNetWorth
//         = farm netWorth
//         + asset netWorth
//
// etc.
//
// IMPORTANT:
// ----------------------------------------------------------
//
// A farm's stored `revenue` represents the farm record itself.
// It must NOT be replaced by the aggregate revenue of its
// children.
//
// The aggregation happens only when calculating the farm's
// financial totals.
//
// ==========================================================


const Dairy =
    require("../models/dairy");

const Financials =
    require("../models/financials");

const MilkSummary =
    require("../models/milkSummary");


// ==========================================================
// DATE HELPERS
// ==========================================================

function getDateRange(
    startDate,
    endDate
) {

    const range = {};


    if (startDate) {

        const start =
            new Date(startDate);


        if (
            !Number.isNaN(
                start.getTime()
            )
        ) {

            start.setHours(
                0,
                0,
                0,
                0
            );


            range.$gte =
                start;

        }

    }


    if (endDate) {

        const end =
            new Date(endDate);


        if (
            !Number.isNaN(
                end.getTime()
            )
        ) {

            end.setHours(
                23,
                59,
                59,
                999
            );


            range.$lte =
                end;

        }

    }


    return range;

}


// ==========================================================
// NUMBER HELPER
// ==========================================================

function number(
    value
) {

    const parsed =
        Number(value);


    return Number.isFinite(parsed)
        ? parsed
        : 0;

}


// ==========================================================
// STATUS HELPER
// ==========================================================

function isSold(
    dairy
) {

    return (

        String(
            dairy?.status || ""
        )
        .trim()
        .toLowerCase() ===
        "sold"

    );

}


// ==========================================================
// PROPERTY ASSET CHECK
// ==========================================================

function isPropertyAsset(
    dairy
) {

    if (!dairy) {

        return false;

    }


    return !isSold(
        dairy
    );

}


// ==========================================================
// MONETARY ASSET CHECK
// ==========================================================

function isMonetaryAsset(
    dairy
) {

    if (!dairy) {

        return false;

    }


    const revenue =
        number(
            dairy?.revenue
        );


    const salesAmount =
        getSalesAmount(
            dairy
        );


    return (
        revenue !== 0 ||
        salesAmount !== 0
    );

}


// ==========================================================
// FARM IDENTIFICATION
// ==========================================================
//
// Dairy Farm:
//
//     code < 0
//
// ==========================================================

function isFarm(
    dairy
) {

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
        Number(dairy.code) < 0
    );

}


// ==========================================================
// FARM ASSET IDENTIFICATION
// ==========================================================
//
// Assigned farm asset:
//
//     assetCode = farm.code
//
// ==========================================================

function isFarmAsset(
    dairy
) {

    if (!dairy) {

        return false;

    }


    return (

        dairy.assetCode !== null &&

        dairy.assetCode !== undefined &&

        dairy.assetCode !== ""

    );

}


// ==========================================================
// STANDALONE ASSET IDENTIFICATION
// ==========================================================

function isStandaloneAsset(
    dairy
) {

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
// LIABILITY QUERY BUILDER
// ==========================================================

function buildLiabilityQuery(
    dairyId,
    startDate,
    endDate
) {

    const query = {

        dairy:
            dairyId

    };


    const dateRange =
        getDateRange(
            startDate,
            endDate
        );


    if (
        Object.keys(
            dateRange
        ).length
    ) {

        query.createdAt =
            dateRange;

    }


    return query;

}


// ==========================================================
// GET LIABILITY TOTAL
// ==========================================================

async function getLiabilityTotal(
    dairyId,
    startDate,
    endDate
) {

    const query =
        buildLiabilityQuery(
            dairyId,
            startDate,
            endDate
        );


    const result =
        await Financials.aggregate([

            {
                $match:
                    query
            },

            {
                $group: {

                    _id:
                        null,

                    total: {

                        $sum:
                            "$amount"

                    }

                }

            }

        ]);


    if (!result.length) {

        return 0;

    }


    return number(
        result[0].total
    );

}


// ==========================================================
// GET LIABILITY RECORDS
// ==========================================================

async function getLiabilities(
    dairyId,
    startDate,
    endDate
) {

    const query =
        buildLiabilityQuery(
            dairyId,
            startDate,
            endDate
        );


    return Financials.find(
        query
    )

    .populate(
        "dairy",
        [
            "name",
            "code",
            "assetCode",
            "type",
            "status",
            "buyingPrice",
            "currentWorth",
            "sellingPrice",
            "revenue",
            "description"
        ].join(" ")
    )

    .populate(
        "recordedBy",
        "name email"
    )

    .sort({
        createdAt:
            -1
    })

    .lean();

}


// ==========================================================
// GET ALL LIABILITY RECORDS
// ==========================================================

async function getAllLiabilities(
    startDate,
    endDate
) {

    const query = {};


    const dateRange =
        getDateRange(
            startDate,
            endDate
        );


    if (
        Object.keys(
            dateRange
        ).length
    ) {

        query.createdAt =
            dateRange;

    }


    return Financials.find(
        query
    )

    .populate(
        "dairy",
        [
            "name",
            "code",
            "assetCode",
            "type",
            "status",
            "buyingPrice",
            "currentWorth",
            "sellingPrice",
            "revenue",
            "description"
        ].join(" ")
    )

    .populate(
        "recordedBy",
        "name email"
    )

    .sort({
        createdAt:
            -1
    })

    .lean();

}


// ==========================================================
// RECORD LIABILITY
// ==========================================================

async function recordLiability({

    dairyId,

    amount,

    description,

    userId

}) {

    const dairy =
        await Dairy.findById(
            dairyId
        );


    if (!dairy) {

        throw new Error(
            "Dairy record not found."
        );

    }


    const liabilityAmount =
        Number(amount);


    if (

        !Number.isFinite(
            liabilityAmount
        ) ||

        liabilityAmount <= 0

    ) {

        throw new Error(
            "Liability amount must be greater than zero."
        );

    }


    if (

        !description ||

        !String(
            description
        ).trim()

    ) {

        throw new Error(
            "Liability description is required."
        );

    }


    return Financials.create({

        dairy:
            dairy._id,

        amount:
            liabilityAmount,

        description:
            String(
                description
            ).trim(),

        recordedBy:
            userId || null

    });

}


// ==========================================================
// GET ALL DAIRIES
// ==========================================================

async function getAllDairies() {

    return Dairy.find({

        status: {

            $ne:
                "disposed"

        }

    })

    .select(
        [
            "_id",
            "name",
            "code",
            "assetCode",
            "type",
            "status",
            "buyingPrice",
            "currentWorth",
            "sellingPrice",
            "revenue",
            "description"
        ].join(" ")
    )

    .sort({

        code:
            1,

        name:
            1

    })

    .lean();

}


// ==========================================================
// GET FARM ASSETS
// ==========================================================

function getFarmAssets(
    farm,
    allDairies
) {

    if (
        !isFarm(farm)
    ) {

        return [];

    }


    const farmCode =
        Number(
            farm.code
        );


    return allDairies.filter(

        dairy => (

            !isFarm(dairy) &&

            isFarmAsset(
                dairy
            ) &&

            Number(
                dairy.assetCode
            ) ===
            farmCode

        )

    );

}


// ==========================================================
// CALCULATE AND STORE REVENUE
// ==========================================================
//
// Revenue is calculated from MilkSummary.
//
// Each production record is allocated:
//
//     cow revenue
//
//     =
//
//     cow litres
//     /
//     total production
//     ×
//     total milk sales cash
//
// IMPORTANT:
//
// Every Dairy record receives only its OWN calculated revenue.
//
// Farm revenue is NOT replaced with the sum of its assets.
//
// The farm total is aggregated later:
//
//     farm revenue
//     +
//     asset revenues
//
// ==========================================================

async function calculateAndStoreRevenue(
    startDate,
    endDate
) {

    const query = {};


    // ------------------------------------------------------
    // GET SUMMARIES
    // ------------------------------------------------------

    let summaries =
        await MilkSummary.find(
            query
        )
        .select(
            "day month cowProduction sales farmTotal"
        )
        .lean();


    // ------------------------------------------------------
    // FILTER BY DATE
    // ------------------------------------------------------

    if (
        startDate ||
        endDate
    ) {

        const start =
            startDate
                ? new Date(startDate)
                : null;


        const end =
            endDate
                ? new Date(endDate)
                : null;


        if (start) {

            start.setHours(
                0,
                0,
                0,
                0
            );

        }


        if (end) {

            end.setHours(
                23,
                59,
                59,
                999
            );

        }


        summaries =
            summaries.filter(
                summary => {

                    if (
                        !summary.day
                    ) {

                        return false;

                    }


                    const summaryDate =
                        new Date(
                            `${summary.day}T12:00:00`
                        );


                    if (
                        Number.isNaN(
                            summaryDate.getTime()
                        )
                    ) {

                        return false;

                    }


                    if (
                        start &&
                        summaryDate < start
                    ) {

                        return false;

                    }


                    if (
                        end &&
                        summaryDate > end
                    ) {

                        return false;

                    }


                    return true;

                }
            );

    }


    // ------------------------------------------------------
    // REVENUE MAP
    // ------------------------------------------------------

    const revenueMap =
        new Map();


    // ------------------------------------------------------
    // PROCESS SUMMARIES
    // ------------------------------------------------------

    for (
        const summary of summaries
    ) {

        const production =
            Array.isArray(
                summary.cowProduction
            )
                ? summary.cowProduction
                : [];


        const sales =
            Array.isArray(
                summary.sales
            )
                ? summary.sales
                : [];


        const totalProduction =
            production.reduce(

                (
                    total,
                    item
                ) => {

                    return (

                        total +

                        number(
                            item?.liters
                        )

                    );

                },

                0

            );


        const totalCash =
            sales.reduce(

                (
                    total,
                    sale
                ) => {

                    return (

                        total +

                        number(
                            sale?.cash
                        )

                    );

                },

                0

            );


        if (
            totalProduction <= 0 ||
            totalCash <= 0
        ) {

            continue;

        }


        // --------------------------------------------------
        // ALLOCATE SALES TO DAIRY RECORDS
        // --------------------------------------------------

        for (
            const productionRecord
            of production
        ) {

            const dairyId =
                productionRecord?.dairy;


            if (
                !dairyId
            ) {

                continue;

            }


            const liters =
                number(
                    productionRecord?.liters
                );


            if (
                liters <= 0
            ) {

                continue;

            }


            const productionShare =
                liters /
                totalProduction;


            const dailyRevenue =
                productionShare *
                totalCash;


            if (
                !Number.isFinite(
                    dailyRevenue
                )
            ) {

                continue;

            }


            const key =
                dairyId.toString();


            const currentRevenue =
                revenueMap.get(
                    key
                ) || 0;


            revenueMap.set(

                key,

                currentRevenue +
                dailyRevenue

            );

        }

    }


    // ------------------------------------------------------
    // GET DAIRIES
    // ------------------------------------------------------

    const dairies =
        await Dairy.find({

            status: {

                $ne:
                    "disposed"

            }

        })

        .select(
            "_id name code assetCode revenue"
        )

        .lean();


    // ------------------------------------------------------
    // SAVE OWN REVENUE
    // ------------------------------------------------------
    //
    // Every Dairy record receives its own revenue.
    //
    // Farms are NOT recalculated from their children here.
    //
    // This is essential because the farm's own revenue must
    // remain separate from the revenue of its assigned assets.
    //
    // If the farm itself appears in MilkSummary, that revenue
    // belongs to the farm.
    //
    // ------------------------------------------------------

    const bulkOperations =
        [];


    for (
        const dairy of dairies
    ) {

        const key =
            dairy._id.toString();


        const calculatedRevenue =
            number(
                revenueMap.get(
                    key
                )
            );


        bulkOperations.push({

            updateOne: {

                filter: {

                    _id:
                        dairy._id

                },

                update: {

                    $set: {

                        revenue:
                            calculatedRevenue

                    }

                }

            }

        });

    }


    if (
        bulkOperations.length
    ) {

        await Dairy.bulkWrite(
            bulkOperations,
            {
                ordered:
                    false
            }
        );

    }


    return revenueMap;

}


// ==========================================================
// REFRESH REVENUE
// ==========================================================

async function refreshRevenue(
    startDate,
    endDate
) {

    await calculateAndStoreRevenue(
        startDate,
        endDate
    );

}


// ==========================================================
// CALCULATE PROFIT / LOSS
// ==========================================================
//
// UNSOLD:
//
//     revenue - liabilities
//
// SOLD:
//
//     sellingPrice
//     - buyingPrice
//     - liabilities
//     + revenue
//
// ==========================================================

function calculateProfit(
    dairy,
    liabilityTotal
) {

    const liabilities =
        number(
            liabilityTotal
        );


    const revenue =
        number(
            dairy?.revenue
        );


    if (
        !isSold(dairy)
    ) {

        return (

            revenue -

            liabilities

        );

    }


    const sellingPrice =
        number(
            dairy?.sellingPrice
        );


    const buyingPrice =
        number(
            dairy?.buyingPrice
        );


    return (

        sellingPrice -

        buyingPrice -

        liabilities +

        revenue

    );

}


// ==========================================================
// GET SALES AMOUNT
// ==========================================================

function getSalesAmount(
    dairy
) {

    if (
        !isSold(dairy)
    ) {

        return 0;

    }


    return number(
        dairy?.sellingPrice
    );

}


// ==========================================================
// GET PROPERTY ASSET VALUE
// ==========================================================

function getPropertyAssetValue(
    dairy
) {

    if (
        !isPropertyAsset(dairy)
    ) {

        return 0;

    }


    return number(
        dairy?.currentWorth
    );

}


// ==========================================================
// GET MONETARY ASSET VALUE
// ==========================================================
//
//     monetaryAssets
//
//         =
//
//     revenue
//     +
//     salesAmount
//
// ==========================================================

function getMonetaryAssetValue(
    dairy
) {

    if (!dairy) {

        return 0;

    }


    const revenue =
        number(
            dairy?.revenue
        );


    const salesAmount =
        getSalesAmount(
            dairy
        );


    return (

        revenue +

        salesAmount

    );

}


// ==========================================================
// BUILD FINANCIAL DATA
// ==========================================================
//
// This function always represents the financial value of
// ONE Dairy record only.
//
// It does NOT include child assets.
//
// ==========================================================

async function buildFinancialData(
    dairy,
    startDate,
    endDate
) {

    const liabilities =
        await getLiabilityTotal(

            dairy._id,

            startDate,

            endDate

        );


    const salesAmount =
        getSalesAmount(
            dairy
        );


    const revenue =
        number(
            dairy?.revenue
        );


    const profit =
        calculateProfit(

            dairy,

            liabilities

        );


    const currentWorth =
        number(
            dairy?.currentWorth
        );


    const buyingPrice =
        number(
            dairy?.buyingPrice
        );


    const sellingPrice =
        number(
            dairy?.sellingPrice
        );


    const monetaryAssets =
        getMonetaryAssetValue(
            dairy
        );


    const propertyAssets =
        getPropertyAssetValue(
            dairy
        );


    const netWorth =
        monetaryAssets +
        propertyAssets;


    return {

        ...dairy,

        currentWorth,

        buyingPrice,

        sellingPrice,

        salesAmount,

        revenue,

        totalLiabilities:
            liabilities,

        profit,

        monetaryAssets,

        propertyAssets,

        netWorth

    };

}


// ==========================================================
// GET FINANCIAL STRUCTURE
// ==========================================================

async function getFinancialStructure() {

    await refreshRevenue();


    const dairies =
        await getAllDairies();


    const farms =
        dairies.filter(
            isFarm
        );


    const standaloneAssets =
        dairies.filter(
            isStandaloneAsset
        );


    const farmStructure =
        farms.map(
            farm => {

                const assets =
                    getFarmAssets(
                        farm,
                        dairies
                    );


                return {

                    ...farm,

                    assets

                };

            }
        );


    return {

        farms:
            farmStructure,

        standaloneAssets

    };

}


// ==========================================================
// GET INDIVIDUAL DAIRY FINANCIAL
// ==========================================================

async function getDairyFinancial(
    dairyId,
    startDate,
    endDate
) {

    await refreshRevenue();


    const dairy =
        await Dairy.findById(
            dairyId
        )

        .select(
            [
                "_id",
                "name",
                "code",
                "assetCode",
                "type",
                "status",
                "buyingPrice",
                "currentWorth",
                "sellingPrice",
                "revenue",
                "description"
            ].join(" ")
        )

        .lean();


    if (!dairy) {

        throw new Error(
            "Dairy record not found."
        );

    }


    if (
        !isFarm(dairy)
    ) {

        return buildFinancialData(

            dairy,

            startDate,

            endDate

        );

    }


    const allDairies =
        await getAllDairies();


    return getFarmFinancialTotals(

        dairy,

        allDairies,

        startDate,

        endDate

    );

}


// ==========================================================
// GET STANDALONE FINANCIAL
// ==========================================================

async function getStandaloneFinancial(
    dairyId,
    startDate,
    endDate
) {

    await refreshRevenue();


    const dairy =
        await Dairy.findById(
            dairyId
        )

        .select(
            [
                "_id",
                "name",
                "code",
                "assetCode",
                "type",
                "status",
                "buyingPrice",
                "currentWorth",
                "sellingPrice",
                "revenue",
                "description"
            ].join(" ")
        )

        .lean();


    if (!dairy) {

        throw new Error(
            "Standalone asset not found."
        );

    }


    if (
        !isStandaloneAsset(dairy)
    ) {

        throw new Error(
            "Selected record is not a standalone asset."
        );

    }


    return buildFinancialData(

        dairy,

        startDate,

        endDate

    );

}


// ==========================================================
// GET FARM FINANCIAL TOTALS
// ==========================================================
//
// THIS IS THE IMPORTANT CHANGE.
//
// A farm's total is:
//
//     FARM OWN VALUE
//     +
//     ALL FARM ASSET VALUES
//
// No farm financial field is excluded.
//
// Example:
//
//     Farm:
//         currentWorth = 100,000
//         revenue      = 20,000
//         buyingPrice  = 80,000
//
//     Cow A:
//         currentWorth = 50,000
//         revenue      = 10,000
//         buyingPrice  = 40,000
//
//     Cow B:
//         currentWorth = 30,000
//         revenue      = 5,000
//         buyingPrice  = 20,000
//
//     TOTAL FARM:
//
//         currentWorth = 180,000
//         revenue      = 35,000
//         buyingPrice  = 140,000
//
// ==========================================================

async function getFarmFinancialTotals(
    farm,
    allDairies,
    startDate,
    endDate
) {

    if (
        !isFarm(farm)
    ) {

        throw new Error(
            "Selected record is not a Dairy Farm."
        );

    }


    const assets =
        getFarmAssets(

            farm,

            allDairies

        );


    // ------------------------------------------------------
    // FARM'S OWN FINANCIAL VALUES
    // ------------------------------------------------------

    const farmFinancial =
        await buildFinancialData(

            farm,

            startDate,

            endDate

        );


    // ------------------------------------------------------
    // START TOTALS WITH FARM ITSELF
    // ------------------------------------------------------

    let totalBuyingPrice =
        number(
            farmFinancial.buyingPrice
        );


    let totalSellingPrice =
        number(
            farmFinancial.sellingPrice
        );


    let totalCurrentWorth =
        number(
            farmFinancial.currentWorth
        );


    let totalLiabilities =
        number(
            farmFinancial.totalLiabilities
        );


    let totalSalesAmount =
        number(
            farmFinancial.salesAmount
        );


    let totalRevenue =
        number(
            farmFinancial.revenue
        );


    let totalProfit =
        number(
            farmFinancial.profit
        );


    let monetaryAssets =
        number(
            farmFinancial.monetaryAssets
        );


    let propertyAssets =
        number(
            farmFinancial.propertyAssets
        );


    const assetFinancials =
        [];


    // ======================================================
    // PROCESS EVERY FARM ASSET
    // ======================================================

    for (
        const asset of assets
    ) {

        const financial =
            await buildFinancialData(

                asset,

                startDate,

                endDate

            );


        // --------------------------------------------------
        // BUYING PRICE
        // --------------------------------------------------

        totalBuyingPrice +=
            number(
                financial.buyingPrice
            );


        // --------------------------------------------------
        // SELLING PRICE
        // --------------------------------------------------

        totalSellingPrice +=
            number(
                financial.sellingPrice
            );


        // --------------------------------------------------
        // CURRENT WORTH
        // --------------------------------------------------

        totalCurrentWorth +=
            number(
                financial.currentWorth
            );


        // --------------------------------------------------
        // LIABILITIES
        // --------------------------------------------------

        totalLiabilities +=
            number(
                financial.totalLiabilities
            );


        // --------------------------------------------------
        // SALES
        // --------------------------------------------------

        totalSalesAmount +=
            number(
                financial.salesAmount
            );


        // --------------------------------------------------
        // REVENUE
        // --------------------------------------------------

        totalRevenue +=
            number(
                financial.revenue
            );


        // --------------------------------------------------
        // PROFIT
        // --------------------------------------------------

        totalProfit +=
            number(
                financial.profit
            );


        // --------------------------------------------------
        // MONETARY ASSETS
        // --------------------------------------------------

        monetaryAssets +=
            number(
                financial.monetaryAssets
            );


        // --------------------------------------------------
        // PROPERTY ASSETS
        // --------------------------------------------------

        propertyAssets +=
            number(
                financial.propertyAssets
            );


        assetFinancials.push(
            financial
        );

    }


    // ======================================================
    // NET WORTH
    // ======================================================
    //
    // IMPORTANT:
    //
    // Net worth is derived from the combined monetary and
    // property assets.
    //
    // ======================================================

    const netWorth =
        monetaryAssets +
        propertyAssets;


    // ======================================================
    // SORT ASSETS
    // ======================================================

    assetFinancials.sort(

        (a, b) => {

            const profitDifference =

                number(
                    b.profit
                ) -

                number(
                    a.profit
                );


            if (
                profitDifference !== 0
            ) {

                return profitDifference;

            }


            return (

                number(
                    b.currentWorth
                ) -

                number(
                    a.currentWorth
                )

            );

        }

    );


    // ======================================================
    // RETURN
    // ======================================================

    return {

        // --------------------------------------------------
        // FARM ITSELF
        // --------------------------------------------------

        ...farmFinancial,

        farm:
            farmFinancial,

        farmBuyingPrice:
            farmFinancial.buyingPrice,

        farmSellingPrice:
            farmFinancial.sellingPrice,

        farmCurrentWorth:
            farmFinancial.currentWorth,

        farmLiabilities:
            farmFinancial.totalLiabilities,

        farmSalesAmount:
            farmFinancial.salesAmount,

        farmRevenue:
            farmFinancial.revenue,

        farmProfit:
            farmFinancial.profit,

        farmMonetaryAssets:
            farmFinancial.monetaryAssets,

        farmPropertyAssets:
            farmFinancial.propertyAssets,

        farmNetWorth:
            farmFinancial.netWorth,

        // --------------------------------------------------
        // COMBINED FARM + ASSETS
        // --------------------------------------------------

        buyingPrice:
            totalBuyingPrice,

        sellingPrice:
            totalSellingPrice,

        currentWorth:
            totalCurrentWorth,

        totalCurrentWorth,

        totalLiabilities,

        salesAmount:
            totalSalesAmount,

        revenue:
            totalRevenue,

        profit:
            totalProfit,

        monetaryAssets,

        propertyAssets,

        netWorth,

        assets:
            assetFinancials

    };

}


// ==========================================================
// GET FINANCIAL SUMMARY
// ==========================================================
//
// The global summary treats every farm as one hierarchical
// financial unit.
//
// Therefore:
//
//     FARM
//     + children
//
// is counted once.
//
// Standalone assets are then added separately.
//
// ==========================================================

async function getFinancialSummary(
    startDate,
    endDate
) {

    await refreshRevenue();


    const dairies =
        await getAllDairies();


    const farms =
        dairies.filter(
            isFarm
        );


    const standaloneAssets =
        dairies.filter(
            isStandaloneAsset
        );


    let totalBuyingPrice =
        0;


    let totalSellingPrice =
        0;


    let totalCurrentWorth =
        0;


    let totalLiabilities =
        0;


    let totalSalesAmount =
        0;


    let totalRevenue =
        0;


    let totalProfit =
        0;


    let totalMonetaryAssets =
        0;


    let totalPropertyAssets =
        0;


    const farmFinancials =
        [];


    // ======================================================
    // FARMS
    // ======================================================

    for (
        const farm of farms
    ) {

        const financial =
            await getFarmFinancialTotals(

                farm,

                dairies,

                startDate,

                endDate

            );


        farmFinancials.push(
            financial
        );


        totalBuyingPrice +=
            number(
                financial.buyingPrice
            );


        totalSellingPrice +=
            number(
                financial.sellingPrice
            );


        totalCurrentWorth +=
            number(
                financial.totalCurrentWorth
            );


        totalLiabilities +=
            number(
                financial.totalLiabilities
            );


        totalSalesAmount +=
            number(
                financial.salesAmount
            );


        totalRevenue +=
            number(
                financial.revenue
            );


        totalProfit +=
            number(
                financial.profit
            );


        totalMonetaryAssets +=
            number(
                financial.monetaryAssets
            );


        totalPropertyAssets +=
            number(
                financial.propertyAssets
            );

    }


    // ======================================================
    // STANDALONE ASSETS
    // ======================================================

    const standaloneFinancials =
        [];


    let standaloneBuyingPrice =
        0;


    let standaloneSellingPrice =
        0;


    let standaloneCurrentWorth =
        0;


    let standaloneLiabilities =
        0;


    let standaloneSalesAmount =
        0;


    let standaloneRevenue =
        0;


    let standaloneProfit =
        0;


    let standaloneMonetaryAssets =
        0;


    let standalonePropertyAssets =
        0;


    for (
        const asset of standaloneAssets
    ) {

        const financial =
            await buildFinancialData(

                asset,

                startDate,

                endDate

            );


        standaloneFinancials.push(
            financial
        );


        standaloneBuyingPrice +=
            number(
                financial.buyingPrice
            );


        standaloneSellingPrice +=
            number(
                financial.sellingPrice
            );


        standaloneCurrentWorth +=
            number(
                financial.currentWorth
            );


        standaloneLiabilities +=
            number(
                financial.totalLiabilities
            );


        standaloneSalesAmount +=
            number(
                financial.salesAmount
            );


        standaloneRevenue +=
            number(
                financial.revenue
            );


        standaloneProfit +=
            number(
                financial.profit
            );


        standaloneMonetaryAssets +=
            number(
                financial.monetaryAssets
            );


        standalonePropertyAssets +=
            number(
                financial.propertyAssets
            );

    }


    // ======================================================
    // ADD STANDALONE TOTALS
    // ======================================================

    totalBuyingPrice +=
        standaloneBuyingPrice;


    totalSellingPrice +=
        standaloneSellingPrice;


    totalCurrentWorth +=
        standaloneCurrentWorth;


    totalLiabilities +=
        standaloneLiabilities;


    totalSalesAmount +=
        standaloneSalesAmount;


    totalRevenue +=
        standaloneRevenue;


    totalProfit +=
        standaloneProfit;


    totalMonetaryAssets +=
        standaloneMonetaryAssets;


    totalPropertyAssets +=
        standalonePropertyAssets;


    // ======================================================
    // TOTAL NET WORTH
    // ======================================================

    const totalNetWorth =
        totalMonetaryAssets +
        totalPropertyAssets;


    // ======================================================
    // SORT FARMS
    // ======================================================

    farmFinancials.sort(

        (a, b) => {

            const profitDifference =

                number(
                    b.profit
                ) -

                number(
                    a.profit
                );


            if (
                profitDifference !== 0
            ) {

                return profitDifference;

            }


            return (

                number(
                    b.currentWorth
                ) -

                number(
                    a.currentWorth
                )

            );

        }

    );


    // ======================================================
    // SORT STANDALONE ASSETS
    // ======================================================

    standaloneFinancials.sort(

        (a, b) => {

            const profitDifference =

                number(
                    b.profit
                ) -

                number(
                    a.profit
                );


            if (
                profitDifference !== 0
            ) {

                return profitDifference;

            }


            return (

                number(
                    b.currentWorth
                ) -

                number(
                    a.currentWorth
                )

            );

        }

    );


    // ======================================================
    // RETURN
    // ======================================================

    return {

        totals: {

            buyingPrice:
                totalBuyingPrice,

            sellingPrice:
                totalSellingPrice,

            currentWorth:
                totalCurrentWorth,

            liabilities:
                totalLiabilities,

            salesAmount:
                totalSalesAmount,

            revenue:
                totalRevenue,

            profit:
                totalProfit,

            monetaryAssets:
                totalMonetaryAssets,

            propertyAssets:
                totalPropertyAssets,

            netWorth:
                totalNetWorth

        },


        farms:
            farmFinancials,


        standalone: {

            buyingPrice:
                standaloneBuyingPrice,

            sellingPrice:
                standaloneSellingPrice,

            currentWorth:
                standaloneCurrentWorth,

            liabilities:
                standaloneLiabilities,

            salesAmount:
                standaloneSalesAmount,

            revenue:
                standaloneRevenue,

            profit:
                standaloneProfit,

            monetaryAssets:
                standaloneMonetaryAssets,

            propertyAssets:
                standalonePropertyAssets,

            netWorth:
                (
                    standaloneMonetaryAssets +
                    standalonePropertyAssets
                ),

            assets:
                standaloneFinancials

        }

    };

}


// ==========================================================
// GET LIABILITY HISTORY
// ==========================================================

async function getLiabilityHistory(
    startDate,
    endDate
) {

    const records =
        await getAllLiabilities(

            startDate,

            endDate

        );


    const standalone =
        [];


    const farms =
        new Map();


    for (
        const record of records
    ) {

        if (
            !record.dairy
        ) {

            continue;

        }


        const dairy =
            record.dairy;


        // --------------------------------------------------
        // STANDALONE LIABILITY
        // --------------------------------------------------

        if (
            isStandaloneAsset(
                dairy
            )
        ) {

            standalone.push(
                record
            );

            continue;

        }


        let farmCode;


        // --------------------------------------------------
        // LIABILITY DIRECTLY ON FARM
        // --------------------------------------------------

        if (
            isFarm(dairy)
        ) {

            farmCode =
                Number(
                    dairy.code
                );

        }


        // --------------------------------------------------
        // LIABILITY ON FARM ASSET
        // --------------------------------------------------

        else if (
            isFarmAsset(dairy)
        ) {

            farmCode =
                Number(
                    dairy.assetCode
                );

        }


        if (

            farmCode === undefined ||

            Number.isNaN(
                farmCode
            )

        ) {

            continue;

        }


        if (
            !farms.has(
                farmCode
            )
        ) {

            farms.set(

                farmCode,

                {

                    farm:
                        null,

                    liabilities:
                        []

                }

            );

        }


        const group =
            farms.get(
                farmCode
            );


        if (
            isFarm(dairy)
        ) {

            group.farm =
                dairy;

        }


        group.liabilities.push(
            record
        );

    }


    return {

        standalone,

        farms:
            [
                ...farms.values()
            ]

    };

}


// ==========================================================
// PUBLIC REVENUE REFRESH
// ==========================================================

async function updateDairyRevenues() {

    return refreshRevenue();

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getDateRange,

    getAllDairies,

    getFinancialStructure,

    recordLiability,

    getLiabilities,

    getAllLiabilities,

    getDairyFinancial,

    getStandaloneFinancial,

    getFarmFinancialTotals,

    getFinancialSummary,

    getLiabilityHistory,

    updateDairyRevenues,

    refreshRevenue,

    // ------------------------------------------------------
    // Financial classification helpers
    // ------------------------------------------------------

    isSold,

    isPropertyAsset,

    isMonetaryAsset,

    getSalesAmount,

    getPropertyAssetValue,

    getMonetaryAssetValue

};