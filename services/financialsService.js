// ==========================================================
// services/financialsService.js
// ==========================================================
//
// CENTRAL FINANCIAL BUSINESS-LOGIC SERVICE
//
// IMPORTANT FINANCIAL RULES
// ----------------------------------------------------------
//
// Revenue comes from MilkSummary.
//
// Cow revenue:
//
//     (cow litres / total production litres)
//     ×
//     total milk sales cash
//
// The calculated revenue is stored in:
//
//     Dairy.revenue
//
// For a Dairy Farm:
//
//     farm.revenue
//
// is already the aggregate revenue of its assigned assets.
//
// Therefore:
//
//     FARM REVENUE MUST NOT BE ADDED AGAIN
//     TO THE REVENUE OF ITS ASSETS.
//
// Otherwise totals are doubled.
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
//
// Standalone asset:
//
//     code      = null
//     assetCode = null
//
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
// Revenue is rebuilt from MilkSummary every time.
//
// This prevents duplicate accumulation.
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
        // ALLOCATE SALES TO COWS
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
    // SAVE ASSET REVENUE
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
    // IMPORTANT:
    //
    // Farm revenue is an aggregate of asset revenue.
    //
    // It is therefore NOT an independent revenue stream.
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


            farmRevenue +=
                number(
                    revenueMap.get(
                        asset._id.toString()
                    )
                );

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
// Asset:
//
//     UNSOLD:
//
//         revenue - liabilities
//
//     SOLD:
//
//         sellingPrice
//         - buyingPrice
//         - liabilities
//         + revenue
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
// CALCULATE FARM DIRECT PROFIT
// ==========================================================
//
// IMPORTANT:
//
// farm.revenue is NOT used here.
//
// farm.revenue already contains the revenue of its assets.
//
// Therefore adding it to asset profits would double-count
// revenue.
//
// This function calculates only the farm's own contribution:
//
//     SOLD farm:
//
//         sellingPrice - buyingPrice - direct liabilities
//
//     UNSOLD farm:
//
//         - direct liabilities
//
// ==========================================================

function calculateFarmDirectProfit(
    farm,
    liabilityTotal
) {

    const liabilities =
        number(
            liabilityTotal
        );


    if (
        !isSold(farm)
    ) {

        return (
            -liabilities
        );

    }


    const sellingPrice =
        number(
            farm?.sellingPrice
        );


    const buyingPrice =
        number(
            farm?.buyingPrice
        );


    return (

        sellingPrice -

        buyingPrice -

        liabilities

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
// A farm is a container.
//
// Example:
//
//     FARM
//       ├── Cow A
//       ├── Cow B
//       └── Structure C
//
// The farm.revenue field already represents:
//
//     Cow A revenue
//     + Cow B revenue
//     + Structure C revenue
//
// Therefore:
//
//     totalRevenue
//
// MUST NOT be:
//
//     farm.revenue
//     + Cow A revenue
//     + Cow B revenue
//     + Structure C revenue
//
// Instead:
//
//     totalRevenue
//
// =
//
//     sum of asset revenue
//
// The farm's direct liabilities and sale information are
// still included.
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
    // FARM'S OWN FINANCIAL DATA
    // ------------------------------------------------------

    const farmFinancial =
        await buildFinancialData(

            farm,

            startDate,

            endDate

        );


    // ------------------------------------------------------
    // IMPORTANT:
    //
    // farmFinancial.revenue is an aggregate of assets.
    //
    // Do NOT use it in totalRevenue.
    // ------------------------------------------------------

    let totalCurrentWorth =
        farmFinancial.currentWorth;


    let totalLiabilities =
        farmFinancial.totalLiabilities;


    let totalSalesAmount =
        farmFinancial.salesAmount;


    let totalRevenue =
        0;


    // ------------------------------------------------------
    // FARM DIRECT PROFIT
    //
    // Excludes farm.revenue because that revenue belongs
    // to the assets and will be included below.
    // ------------------------------------------------------

    let totalProfit =
        calculateFarmDirectProfit(

            farm,

            farmFinancial.totalLiabilities

        );


    const assetFinancials =
        [];


    // ======================================================
    // PROCESS ASSETS
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

        ...farmFinancial,

        // --------------------------------------------------
        // FARM-ONLY VALUES
        // --------------------------------------------------

        farm:
            farmFinancial,

        farmLiabilities:
            farmFinancial.totalLiabilities,

        farmSalesAmount:
            farmFinancial.salesAmount,

        // This is the stored aggregate farm revenue.
        // It is provided for display/reference only.
        farmRevenue:
            farmFinancial.revenue,

        farmProfit:
            calculateFarmDirectProfit(

                farm,

                farmFinancial.totalLiabilities

            ),

        // --------------------------------------------------
        // COMBINED FARM + ASSET VALUES
        // --------------------------------------------------

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
            financial.salesAmount;


        totalRevenue +=
            financial.revenue;


        totalProfit +=
            financial.profit;

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


    // ======================================================
    // ADD STANDALONE TOTALS
    // ======================================================

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

    refreshRevenue

};