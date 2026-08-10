// ==========================================================
// services/financialsService.js
// ==========================================================

const Dairy =
    require("../models/dairy");

const Financials =
    require("../models/financials");


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
// DATE RANGE
// ==========================================================
//
// Dates apply to financial transactions:
//
//     liabilities
//     revenue
//
// Current asset values are NOT date filtered.
//
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
// FARM IDENTIFICATION
// ==========================================================
//
// code < 0
//     = Dairy Farm
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
// assetCode < 0
//     = belongs to a Dairy Farm
//
// The actual relationship is:
//
//     asset.assetCode === farm.code
//
// ==========================================================

function isFarmAsset(dairy) {

    if (!dairy) {

        return false;

    }


    if (

        dairy.assetCode === null ||

        dairy.assetCode === undefined ||

        dairy.assetCode === ""

    ) {

        return false;

    }


    return (
        Number(
            dairy.assetCode
        ) < 0
    );

}


// ==========================================================
// STANDALONE ASSET IDENTIFICATION
// ==========================================================
//
// Standalone:
//
//     code      === null
//     assetCode === null
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
// SOLD STATUS
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
// LIABILITY QUERY
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
// GET LIABILITY RECORDS FOR ONE DAIRY
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


    const cleanDescription =
        String(
            description || ""
        ).trim();


    if (!cleanDescription) {

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
            cleanDescription,

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
// Required financial formula:
//
//     sellingPrice
//     - buyingPrice
//     - liabilities
//     + revenue
//
// ==========================================================

function calculateProfit(
    dairy,
    liabilities
) {

    const sellingPrice =
        number(
            dairy?.sellingPrice
        );


    const buyingPrice =
        number(
            dairy?.buyingPrice
        );


    const liabilityTotal =
        number(
            liabilities
        );


    const revenue =
        number(
            dairy?.revenue
        );


    return (

        sellingPrice

        -

        buyingPrice

        -

        liabilityTotal

        +

        revenue

    );

}


// ==========================================================
// BUILD FINANCIAL DATA
// ==========================================================
//
// Current values:
//
//     currentWorth
//     buyingPrice
//     sellingPrice
//
// Filtered values:
//
//     liabilities
//     revenue
//
// Profit:
//
//     sellingPrice
//     - buyingPrice
//     - liabilities
//     + revenue
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


    const revenue =
        number(
            dairy?.revenue
        );


    const profit =
        calculateProfit(

            dairy,

            liabilities

        );


    return {

        ...dairy,

        currentWorth,

        buyingPrice,

        sellingPrice,

        revenue,

        liabilities,

        // Backwards-compatible name.
        totalLiabilities:
            liabilities,

        // Backwards-compatible name.
        salesAmount:
            sellingPrice,

        profit

    };

}


// ==========================================================
// GET INDIVIDUAL DAIRY FINANCIAL
// ==========================================================
//
// Used by:
//
//     /financials/dairy/:id
//
// If the selected record is a farm, its financial
// totals include the farm and its farm-owned assets.
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
        isFarm(dairy)
    ) {

        const allDairies =
            await getAllDairies();


        return getFarmFinancialTotals(

            dairy,

            allDairies,

            startDate,

            endDate

        );

    }


    return buildFinancialData(

        dairy,

        startDate,

        endDate

    );

}


// ==========================================================
// GET INDIVIDUAL STANDALONE FINANCIAL
// ==========================================================
//
// Kept for compatibility with the individual standalone
// API if it is used elsewhere.
//
// The collection page does NOT use this method.
//
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
// GET ALL STANDALONE FINANCIALS
// ==========================================================
//
// THIS IS THE METHOD USED BY:
//
//     GET /financials/standalone
//
// Standalone definition:
//
//     code      === null
//     assetCode === null
//
// Returns:
//
//     assets[]
//
//     currentWorth
//     buyingPrice
//     sellingPrice
//     revenue
//     liabilities
//     profit
//
// ==========================================================

async function getStandaloneFinancials(
    startDate,
    endDate
) {

    const dairies =
        await getAllDairies();


    const standaloneAssets =
        dairies.filter(
            isStandaloneAsset
        );


    const assets =
        [];


    let totalCurrentWorth =
        0;


    let totalBuyingPrice =
        0;


    let totalSellingPrice =
        0;


    let totalRevenue =
        0;


    let totalLiabilities =
        0;


    let totalProfit =
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


        assets.push(
            financial
        );


        totalCurrentWorth +=
            number(
                financial.currentWorth
            );


        totalBuyingPrice +=
            number(
                financial.buyingPrice
            );


        totalSellingPrice +=
            number(
                financial.sellingPrice
            );


        totalRevenue +=
            number(
                financial.revenue
            );


        totalLiabilities +=
            number(
                financial.liabilities
            );


        totalProfit +=
            number(
                financial.profit
            );

    }


    // ======================================================
    // SORT
    // ======================================================

    assets.sort(

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

        assets,

        currentWorth:
            totalCurrentWorth,

        buyingPrice:
            totalBuyingPrice,

        sellingPrice:
            totalSellingPrice,

        revenue:
            totalRevenue,

        liabilities:
            totalLiabilities,

        profit:
            totalProfit,

        // Backwards-compatible aliases.
        totalCurrentWorth,

        totalBuyingPrice,

        totalSellingPrice,

        totalRevenue,

        totalLiabilities,

        totalProfit,

        salesAmount:
            totalSellingPrice

    };

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


    let totalBuyingPrice =
        farmFinancial.buyingPrice;


    let totalSellingPrice =
        farmFinancial.sellingPrice;


    let totalRevenue =
        farmFinancial.revenue;


    let totalLiabilities =
        farmFinancial.liabilities;


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


        assetFinancials.push(
            financial
        );


        totalCurrentWorth +=
            financial.currentWorth;


        totalBuyingPrice +=
            financial.buyingPrice;


        totalSellingPrice +=
            financial.sellingPrice;


        totalRevenue +=
            financial.revenue;


        totalLiabilities +=
            financial.liabilities;


        totalProfit +=
            financial.profit;

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
            farmFinancial.liabilities,

        farmRevenue:
            farmFinancial.revenue,

        farmBuyingPrice:
            farmFinancial.buyingPrice,

        farmSellingPrice:
            farmFinancial.sellingPrice,

        farmProfit:
            farmFinancial.profit,

        currentWorth:
            totalCurrentWorth,

        totalCurrentWorth,

        buyingPrice:
            totalBuyingPrice,

        totalBuyingPrice,

        sellingPrice:
            totalSellingPrice,

        totalSellingPrice,

        revenue:
            totalRevenue,

        totalRevenue,

        liabilities:
            totalLiabilities,

        totalLiabilities,

        profit:
            totalProfit,

        totalProfit,

        salesAmount:
            totalSellingPrice,

        totalSalesAmount:
            totalSellingPrice,

        assets:
            assetFinancials

    };

}


// ==========================================================
// GET FINANCIAL STRUCTURE
// ==========================================================
//
// Used by the liability entry page.
//
// Returns:
//
//     farms[]
//         assets[]
//
//     standaloneAssets[]
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
// GET FINANCIAL SUMMARY
// ==========================================================
//
// Current values:
//
//     currentWorth
//     buyingPrice
//     sellingPrice
//
// Filtered:
//
//     revenue
//     liabilities
//     profit
//
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


    let totalBuyingPrice =
        0;


    let totalSellingPrice =
        0;


    let totalRevenue =
        0;


    let totalLiabilities =
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


        totalBuyingPrice +=
            financial.totalBuyingPrice;


        totalSellingPrice +=
            financial.totalSellingPrice;


        totalRevenue +=
            financial.totalRevenue;


        totalLiabilities +=
            financial.totalLiabilities;


        totalProfit +=
            financial.totalProfit;

    }


    const standaloneFinancials =
        [];


    let standaloneCurrentWorth =
        0;


    let standaloneBuyingPrice =
        0;


    let standaloneSellingPrice =
        0;


    let standaloneRevenue =
        0;


    let standaloneLiabilities =
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


        standaloneBuyingPrice +=
            financial.buyingPrice;


        standaloneSellingPrice +=
            financial.sellingPrice;


        standaloneRevenue +=
            financial.revenue;


        standaloneLiabilities +=
            financial.liabilities;


        standaloneProfit +=
            financial.profit;

    }


    totalCurrentWorth +=
        standaloneCurrentWorth;


    totalBuyingPrice +=
        standaloneBuyingPrice;


    totalSellingPrice +=
        standaloneSellingPrice;


    totalRevenue +=
        standaloneRevenue;


    totalLiabilities +=
        standaloneLiabilities;


    totalProfit +=
        standaloneProfit;


    farmFinancials.sort(

        (a, b) => {

            const difference =

                number(
                    b.profit
                ) -

                number(
                    a.profit
                );


            if (
                difference !== 0
            ) {

                return difference;

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

            const difference =

                number(
                    b.profit
                ) -

                number(
                    a.profit
                );


            if (
                difference !== 0
            ) {

                return difference;

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

            buyingPrice:
                totalBuyingPrice,

            sellingPrice:
                totalSellingPrice,

            revenue:
                totalRevenue,

            liabilities:
                totalLiabilities,

            profit:
                totalProfit,

            // Compatibility.
            salesAmount:
                totalSellingPrice

        },


        farms:
            farmFinancials,


        standalone: {

            currentWorth:
                standaloneCurrentWorth,

            buyingPrice:
                standaloneBuyingPrice,

            sellingPrice:
                standaloneSellingPrice,

            revenue:
                standaloneRevenue,

            liabilities:
                standaloneLiabilities,

            profit:
                standaloneProfit,

            // Compatibility.
            salesAmount:
                standaloneSellingPrice,

            assets:
                standaloneFinancials

        }

    };

}


// ==========================================================
// GET LIABILITY HISTORY
// ==========================================================
//
// Groups liabilities into:
//
//     standalone
//
//     farms
//         farm
//         liabilities[]
//
// Farm-owned asset liabilities are grouped under the
// corresponding farm.
//
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


        // ==================================================
        // STANDALONE
        // ==================================================

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


        // ==================================================
        // DETERMINE FARM CODE
        // ==================================================

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
            Array.from(
                farms.values()
            )

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

    getStandaloneFinancials,

    getFarmFinancialTotals,

    getFinancialSummary,

    getLiabilityHistory

};