// ==========================================================
// services/financialsService.js
// ==========================================================
//
// CENTRAL FINANCIAL BUSINESS-LOGIC SERVICE
//
// Revenue is NOT manually read from dairy.js.
//
// Revenue is calculated from MilkSummary:
//
//     cow revenue
//
//         =
//             (cow litres / total production litres)
//             ×
//             total milk sales cash
//
// The calculated cumulative revenue is then stored in:
//
//     Dairy.revenue
//
// This prevents duplicate revenue additions.
//
// ==========================================================


const mongoose =
    require("mongoose");

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

function number(value) {

    const parsed =
        Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : 0;

}


// ==========================================================
// STATUS HELPER
// ==========================================================

function isSold(dairy) {

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
// FARM IDENTIFICATION
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
        Number(dairy.code) < 0
    );

}


// ==========================================================
// FARM ASSET IDENTIFICATION
// ==========================================================
//
// Farm asset:
//
//     assetCode = farm.code
//
// ==========================================================

function isFarmAsset(dairy) {

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
//
// Standalone asset:
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
//
// Relationship:
//
//     asset.assetCode === farm.code
//
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
// Revenue formula:
//
//     cow revenue
//
//     =
//
//     (cow production / total production)
//     ×
//     total sales cash
//
// MilkSummary structure:
//
//     {
//         day,
//         cowProduction: [
//             {
//                 dairy,
//                 cowCode,
//                 farmCode,
//                 liters
//             }
//         ],
//         sales: [
//             {
//                 liters,
//                 cash
//             }
//         ]
//     }
//
// Revenue is rebuilt from MilkSummary every time.
//
// This is intentional.
//
// We DO NOT:
//
//     dairy.revenue += dailyRevenue
//
// because calling the financial service repeatedly would
// otherwise duplicate revenue.
//
// Instead:
//
//     Dairy.revenue = calculated cumulative revenue
//
// ==========================================================

async function calculateAndStoreRevenue(
    startDate,
    endDate
) {

    // ------------------------------------------------------
    // BUILD DATE FILTER
    // ------------------------------------------------------

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

        // MilkSummary uses "day" as YYYY-MM-DD.
        //
        // Therefore date filtering is handled below using
        // the string day value rather than createdAt.
        //
    }


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
    // FILTER BY DAY WHEN DATE RANGE WAS PROVIDED
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
    //
    // Key:
    //
    //     Dairy._id
    //
    // Value:
    //
    //     cumulative revenue
    //
    // ------------------------------------------------------

    const revenueMap =
        new Map();


    // ------------------------------------------------------
    // PROCESS EVERY MILK SUMMARY
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


        // --------------------------------------------------
        // TOTAL DAILY PRODUCTION
        // --------------------------------------------------

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


        // --------------------------------------------------
        // TOTAL DAILY SALES CASH
        // --------------------------------------------------

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


        // --------------------------------------------------
        // NOTHING TO ALLOCATE
        // --------------------------------------------------

        if (
            totalProduction <= 0 ||
            totalCash <= 0
        ) {

            continue;

        }


        // --------------------------------------------------
        // ALLOCATE SALES CASH TO EACH COW
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


            // ----------------------------------------------
            // COW'S SHARE OF PRODUCTION
            // ----------------------------------------------

            const productionShare =
                liters /
                totalProduction;


            // ----------------------------------------------
            // COW'S DAILY REVENUE
            // ----------------------------------------------

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
    // GET ALL DAIRIES
    // ------------------------------------------------------
    //
    // We need the entire Dairy collection because:
    //
    //     1. cows receive calculated revenue
    //     2. farms receive aggregate revenue
    //
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
    // SAVE ANIMAL REVENUE
    // ------------------------------------------------------
    //
    // IMPORTANT:
    //
    // This resets revenue to the value calculated from
    // MilkSummary.
    //
    // Therefore no duplicate accumulation occurs.
    //
    // ------------------------------------------------------

    const bulkOperations =
        [];


    for (
        const dairy of dairies
    ) {

        if (
            isFarm(dairy)
        ) {

            continue;

        }


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


    // ------------------------------------------------------
    // SAVE ANIMAL REVENUES
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // CALCULATE FARM REVENUE
    // ------------------------------------------------------
    //
    // A farm's revenue is the sum of the revenue of all
    // assets whose assetCode equals the farm's code.
    //
    // ------------------------------------------------------

    const farmRevenueOperations =
        [];


    for (
        const farm of dairies
    ) {

        if (
            !isFarm(farm)
        ) {

            continue;

        }


        const farmCode =
            Number(
                farm.code
            );


        let farmRevenue =
            0;


        for (
            const asset of dairies
        ) {

            if (
                isFarm(asset)
            ) {

                continue;

            }


            if (
                !isFarmAsset(asset)
            ) {

                continue;

            }


            if (
                Number(
                    asset.assetCode
                ) !==
                farmCode
            ) {

                continue;

            }


            const assetRevenue =
                number(
                    revenueMap.get(
                        asset._id.toString()
                    )
                );


            farmRevenue +=
                assetRevenue;

        }


        farmRevenueOperations.push({

            updateOne: {

                filter: {

                    _id:
                        farm._id

                },

                update: {

                    $set: {

                        revenue:
                            farmRevenue

                    }

                }

            }

        });

    }


    // ------------------------------------------------------
    // SAVE FARM REVENUES
    // ------------------------------------------------------

    if (
        farmRevenueOperations.length
    ) {

        await Dairy.bulkWrite(
            farmRevenueOperations,
            {
                ordered:
                    false
            }
        );

    }


    // ------------------------------------------------------
    // RETURN REVENUE MAP
    // ------------------------------------------------------

    return revenueMap;

}


// ==========================================================
// REFRESH REVENUE
// ==========================================================
//
// Public helper.
//
// Can be called by controllers when financial data needs to
// be rebuilt.
//
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
// SOLD:
//
//     sellingPrice
//     - buyingPrice
//     - liabilities
//     + revenue
//
// UNSOLD:
//
//     revenue
//     - liabilities
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


    // ======================================================
    // UNSOLD DAIRY
    // ======================================================

    if (
        !isSold(dairy)
    ) {

        return (

            revenue -

            liabilities

        );

    }


    // ======================================================
    // SOLD DAIRY
    // ======================================================

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
// BUILD FINANCIAL DATA
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


    return {

        ...dairy,

        currentWorth,

        buyingPrice:
            number(
                dairy?.buyingPrice
            ),

        sellingPrice:
            number(
                dairy?.sellingPrice
            ),

        salesAmount,

        revenue,

        totalLiabilities:
            liabilities,

        profit

    };

}


// ==========================================================
// GET FINANCIAL STRUCTURE
// ==========================================================
//
// Returns:
//
//     farms[]
//
//     standaloneAssets[]
//
// Each farm contains its own assets.
//
// ==========================================================

async function getFinancialStructure() {

    // Refresh the stored revenue before returning the
    // financial structure.

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
//
// If selected record is:
//
//     Animal / asset
//
// returns that record.
//
// If selected record is:
//
//     Farm
//
// returns:
//
//     farm
//     +
//     farm assets
//     +
//     totals
//
// ==========================================================

async function getDairyFinancial(
    dairyId,
    startDate,
    endDate
) {

    // ------------------------------------------------------
    // Revenue must be current before calculating financials.
    // ------------------------------------------------------

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
// Includes:
//
//     farm itself
//     +
//     all assets belonging to farm
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


    const farmFinancial =
        await buildFinancialData(

            farm,

            startDate,

            endDate

        );


    let totalCurrentWorth =
        farmFinancial.currentWorth;


    let totalLiabilities =
        farmFinancial.totalLiabilities;


    let totalSalesAmount =
        farmFinancial.salesAmount;


    let totalRevenue =
        farmFinancial.revenue;


    let totalProfit =
        farmFinancial.profit;


    const assetFinancials =
        [];


    for (
        const asset of assets
    ) {

        const financial =
            await buildFinancialData(

                asset,

                startDate,

                endDate

            );


        totalCurrentWorth +=
            financial.currentWorth;


        totalLiabilities +=
            financial.totalLiabilities;


        totalSalesAmount +=
            financial.salesAmount;


        totalRevenue +=
            financial.revenue;


        totalProfit +=
            financial.profit;


        assetFinancials.push(
            financial
        );

    }


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


    return {

        ...farmFinancial,

        farm:
            farmFinancial,

        farmLiabilities:
            farmFinancial.totalLiabilities,

        farmSalesAmount:
            farmFinancial.salesAmount,

        farmRevenue:
            farmFinancial.revenue,

        farmProfit:
            farmFinancial.profit,

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

        assets:
            assetFinancials

    };

}


// ==========================================================
// GET FINANCIAL SUMMARY
// ==========================================================

async function getFinancialSummary(
    startDate,
    endDate
) {

    // ------------------------------------------------------
    // Rebuild revenue first.
    // ------------------------------------------------------

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


        totalCurrentWorth +=
            financial.totalCurrentWorth;


        totalLiabilities +=
            financial.totalLiabilities;


        totalSalesAmount +=
            financial.totalSalesAmount;


        totalRevenue +=
            financial.totalRevenue;


        totalProfit +=
            financial.totalProfit;

    }


    // ======================================================
    // STANDALONE ASSETS
    // ======================================================

    const standaloneFinancials =
        [];


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


        standaloneCurrentWorth +=
            financial.currentWorth;


        standaloneLiabilities +=
            financial.totalLiabilities;


        standaloneSalesAmount +=
            financial.salesAmount;


        standaloneRevenue +=
            financial.revenue;


        standaloneProfit +=
            financial.profit;

    }


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
    // SORT STANDALONE
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


    return {

        totals: {

            currentWorth:
                totalCurrentWorth,

            liabilities:
                totalLiabilities,

            salesAmount:
                totalSalesAmount,

            revenue:
                totalRevenue,

            profit:
                totalProfit

        },

        farms:
            farmFinancials,

        standalone: {

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
        // LIABILITY RECORDED DIRECTLY ON FARM
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
        // LIABILITY RECORDED ON FARM ASSET
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

    refreshRevenue

};