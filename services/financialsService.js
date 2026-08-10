// ==========================================================
// services/financialsService.js
// ==========================================================

const Dairy =
    require("../models/dairy");

const Financials =
    require("../models/financials");


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
// A farm asset has an assetCode.
//
// Example:
//
//     Farm:
//         code = -100
//
//     Asset:
//         assetCode = -100
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
// GET FINANCIAL STRUCTURE
// ==========================================================
//
// Used by:
//
//     financialsController.getLiabilityEntryPage()
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
    //
    // For an unsold dairy, buying price and selling price
    // are NOT included in profit/loss.
    //
    // Profit/Loss =
    //
    //     revenue - liabilities
    //
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
    //
    // Profit/Loss =
    //
    //     sellingPrice
    //     - buyingPrice
    //     - liabilities
    //     + revenue
    //
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

function getSalesAmount(dairy) {

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

        totalSalesAmount,

        revenue:
            totalRevenue,

        totalRevenue,

        profit:
            totalProfit,

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

        if (
            isFarm(dairy)
        ) {

            farmCode =
                Number(
                    dairy.code
                );

        }

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

    getLiabilityHistory

};