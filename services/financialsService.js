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
//
// Date filtering applies ONLY to:
//
//     - liabilities
//     - profit/loss
//
// Current worth, sales amount and revenue are current
// values supplied by the Dairy records.
//
// Supported:
//
//     no dates
//         -> lifetime
//
//     start only
//         -> from start date onward
//
//     end only
//         -> up to end date
//
//     both
//         -> selected range
// ==========================================================

function getDateRange(
    startDate,
    endDate
) {

    const range = {};


    // ======================================================
    // START DATE
    // ======================================================

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


    // ======================================================
    // END DATE
    // ======================================================

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


    return Number.isFinite(
        parsed
    )

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
        .toLowerCase() === "sold"

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


    if (
        !result.length
    ) {

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
            "revenue"
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
            "revenue"
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

    // ======================================================
    // VALIDATE DAIRY
    // ======================================================

    const dairy =
        await Dairy.findById(
            dairyId
        );


    if (!dairy) {

        throw new Error(
            "Dairy record not found."
        );

    }


    // ======================================================
    // VALIDATE AMOUNT
    // ======================================================

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


    // ======================================================
    // VALIDATE DESCRIPTION
    // ======================================================

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


    // ======================================================
    // CREATE LIABILITY
    // ======================================================

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
//
// "disposed" records are excluded from financial analysis.
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
// IDENTIFY FARM
// ==========================================================
//
// A farm is a Dairy record with a negative code.
//
// Example:
//
//     code: -101
// ==========================================================

function isFarm(
    dairy
) {

    return (

        dairy?.code !== null &&

        dairy?.code !== undefined &&

        dairy?.code !== "" &&

        Number(
            dairy.code
        ) < 0

    );

}


// ==========================================================
// IDENTIFY STANDALONE ASSET
// ==========================================================
//
// A standalone asset is a Dairy record that:
//
//     has NO code
//
// AND:
//
//     has NO assetCode
//
// This is intentionally different from a farm asset.
//
// A farm asset has an assetCode that identifies its farm.
// ==========================================================

function isStandaloneAsset(
    dairy
) {

    const noCode = (

        dairy?.code === null ||

        dairy?.code === undefined ||

        dairy?.code === ""

    );


    const noAssetCode = (

        dairy?.assetCode === null ||

        dairy?.assetCode === undefined ||

        dairy?.assetCode === ""

    );


    return (

        noCode &&

        noAssetCode

    );

}


// ==========================================================
// IDENTIFY FARM ASSET
// ==========================================================
//
// A farm asset has an assetCode.
//
// The assetCode is matched against the farm's negative
// code.
//
// Example:
//
//     Farm:
//         code = -101
//
//     Asset:
//         assetCode = -101
// ==========================================================

function isFarmAsset(
    dairy
) {

    return (

        dairy?.assetCode !== null &&

        dairy?.assetCode !== undefined &&

        dairy?.assetCode !== ""

    );

}


// ==========================================================
// GET FINANCIAL STRUCTURE
// ==========================================================
//
// Returns:
//
//     farms[]
//
//         farm
//         assets[]
//
//     standaloneAssets[]
//
// Standalone assets are records with:
//
//     no code
//     no assetCode
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


    const farmAssets =
        farms.map(

            farm => ({

                ...farm,

                assets:
                    dairies.filter(

                        dairy =>

                            isFarmAsset(
                                dairy
                            ) &&

                            Number(
                                dairy.assetCode
                            ) ===
                            Number(
                                farm.code
                            )

                    )

            })

        );


    return {

        farms:
            farmAssets,

        standaloneAssets

    };

}


// ==========================================================
// CALCULATE INDIVIDUAL PROFIT / LOSS
// ==========================================================
//
// FINANCIAL RULE:
//
// SOLD
//
//     sellingPrice
//     - buyingPrice
//     - liabilities
//     + revenue
//
// NOT SOLD
//
//     - liabilities
//     + revenue
//
// Therefore:
//
// SOLD:
//     profit = selling - buying - liabilities + revenue
//
// UNSOLD:
//     profit = -liabilities + revenue
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
    // NOT SOLD
    // ======================================================

    if (
        !isSold(
            dairy
        )
    ) {

        return (

            -liabilities +

            revenue

        );

    }


    // ======================================================
    // SOLD
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
//
// Sales amount represents the selling price.
//
// Only sold records contribute to sales.
// ==========================================================

function getSalesAmount(
    dairy
) {

    if (
        !isSold(
            dairy
        )
    ) {

        return 0;

    }


    return number(
        dairy?.sellingPrice
    );

}


// ==========================================================
// BUILD FINANCIAL RECORD
// ==========================================================
//
// This helper keeps the financial representation consistent
// across:
//
//     - individual dairy records
//     - farm assets
//
// currentWorth remains the CURRENT WORTH stored on the Dairy
// record.
//
// liabilities are reported separately.
// ==========================================================

function buildFinancialRecord(
    dairy,
    liabilities
) {

    const currentWorth =
        number(
            dairy?.currentWorth
        );


    const totalLiabilities =
        number(
            liabilities
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
            totalLiabilities
        );


    return {

        ...dairy,

        currentWorth,

        salesAmount,

        revenue,

        totalLiabilities,

        profit

    };

}


// ==========================================================
// GET INDIVIDUAL DAIRY FINANCIAL RECORD
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


    const liabilities =
        await getLiabilityTotal(
            dairyId,
            startDate,
            endDate
        );


    return buildFinancialRecord(
        dairy,
        liabilities
    );

}


// ==========================================================
// GET FARM FINANCIAL TOTALS
// ==========================================================
//
// The FARM RECORD itself is financially meaningful.
//
// Therefore:
//
//     farm currentWorth
//     farm liabilities
//     farm salesAmount
//     farm revenue
//     farm profit
//
// are included.
//
// Farm assets are also included.
//
// Thus:
//
//     totalCurrentWorth
//         = farm currentWorth
//         + all asset currentWorth
//
//     totalLiabilities
//         = farm own liabilities
//         + all asset liabilities
//
//     totalSalesAmount
//         = farm sales
//         + all asset sales
//
//     totalRevenue
//         = farm revenue
//         + all asset revenue
//
//     totalProfit
//         = farm profit
//         + all asset profit
// ==========================================================

async function getFarmFinancialTotals(
    farm,
    allDairies,
    startDate,
    endDate
) {

    // ======================================================
    // FIND ASSETS BELONGING TO THIS FARM
    // ======================================================

    const assets =
        allDairies.filter(

            dairy =>

                isFarmAsset(
                    dairy
                ) &&

                Number(
                    dairy.assetCode
                ) ===
                Number(
                    farm.code
                )

        );


    // ======================================================
    // FARM'S OWN LIABILITY
    // ======================================================

    const farmLiabilities =
        await getLiabilityTotal(
            farm._id,
            startDate,
            endDate
        );


    // ======================================================
    // FARM'S OWN PROFIT
    // ======================================================

    const farmProfit =
        calculateProfit(
            farm,
            farmLiabilities
        );


    // ======================================================
    // FARM'S OWN SALES
    // ======================================================

    const farmSalesAmount =
        getSalesAmount(
            farm
        );


    // ======================================================
    // FARM'S OWN REVENUE
    // ======================================================

    const farmRevenue =
        number(
            farm.revenue
        );


    // ======================================================
    // START TOTALS
    // ======================================================

    let totalCurrentWorth =
        number(
            farm.currentWorth
        );


    let totalLiabilities =
        farmLiabilities;


    let totalSalesAmount =
        farmSalesAmount;


    let totalRevenue =
        farmRevenue;


    let totalProfit =
        farmProfit;


    // ======================================================
    // FARM ASSET FINANCIALS
    // ======================================================

    const assetFinancials =
        [];


    for (
        const asset of assets
    ) {

        // --------------------------------------------------
        // ASSET LIABILITY
        // --------------------------------------------------

        const liabilities =
            await getLiabilityTotal(
                asset._id,
                startDate,
                endDate
            );


        // --------------------------------------------------
        // ASSET PROFIT
        // --------------------------------------------------

        const profit =
            calculateProfit(
                asset,
                liabilities
            );


        // --------------------------------------------------
        // ASSET SALES
        // --------------------------------------------------

        const salesAmount =
            getSalesAmount(
                asset
            );


        // --------------------------------------------------
        // ASSET REVENUE
        // --------------------------------------------------

        const revenue =
            number(
                asset.revenue
            );


        // --------------------------------------------------
        // ASSET CURRENT WORTH
        // --------------------------------------------------

        const currentWorth =
            number(
                asset.currentWorth
            );


        // --------------------------------------------------
        // ADD ASSET CURRENT WORTH
        // --------------------------------------------------

        totalCurrentWorth +=
            currentWorth;


        // --------------------------------------------------
        // ADD ASSET LIABILITIES
        // --------------------------------------------------

        totalLiabilities +=
            liabilities;


        // --------------------------------------------------
        // ADD ASSET SALES
        // --------------------------------------------------

        totalSalesAmount +=
            salesAmount;


        // --------------------------------------------------
        // ADD ASSET REVENUE
        // --------------------------------------------------

        totalRevenue +=
            revenue;


        // --------------------------------------------------
        // ADD ASSET PROFIT
        // --------------------------------------------------

        totalProfit +=
            profit;


        // --------------------------------------------------
        // STORE ASSET FINANCIAL DATA
        // --------------------------------------------------

        assetFinancials.push({

            ...asset,

            currentWorth,

            salesAmount,

            revenue,

            totalLiabilities:
                liabilities,

            profit

        });

    }


    // ======================================================
    // RETURN FARM FINANCIALS
    // ======================================================

    return {

        farm: {

            ...farm,

            currentWorth:
                number(
                    farm.currentWorth
                ),

            salesAmount:
                farmSalesAmount,

            revenue:
                farmRevenue,

            totalLiabilities:
                farmLiabilities,

            profit:
                farmProfit

        },


        // --------------------------------------------------
        // FARM'S OWN VALUES
        // --------------------------------------------------

        farmLiabilities,

        farmSalesAmount,

        farmRevenue,

        farmProfit,


        // --------------------------------------------------
        // COMPLETE FARM TOTALS
        //
        // Farm + its assets.
        // --------------------------------------------------

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


        // --------------------------------------------------
        // FARM ASSETS
        // --------------------------------------------------

        assets:
            assetFinancials

    };

}


// ==========================================================
// GET FINANCIAL SUMMARY
// ==========================================================
//
// TOTALS INCLUDE:
//
//     FARM RECORDS
//     FARM ASSETS
//     STANDALONE ASSETS
//
// Therefore:
//
// totalCurrentWorth
//     = all farm currentWorth
//     + all farm asset currentWorth
//     + all standalone currentWorth
//
// totalLiabilities
//     = all farm liabilities
//     + all farm asset liabilities
//     + all standalone liabilities
//
// totalSalesAmount
//     = all sold farm records
//     + all sold farm assets
//     + all sold standalone assets
//
// totalRevenue
//     = all farm revenue
//     + all farm asset revenue
//     + all standalone revenue
//
// totalProfit
//     = all farm profit
//     + all farm asset profit
//     + all standalone profit
//
// Date filtering:
//
//     liabilities -> filtered
//     profit       -> filtered
//
// Current worth remains current.
// ==========================================================

async function getFinancialSummary(
    startDate,
    endDate
) {

    const dairies =
        await getAllDairies();


    // ======================================================
    // SEPARATE FARMS
    // ======================================================

    const farms =
        dairies.filter(
            isFarm
        );


    // ======================================================
    // SEPARATE STANDALONE ASSETS
    // ======================================================

    const standaloneAssets =
        dairies.filter(
            isStandaloneAsset
        );


    // ======================================================
    // TOP-LEVEL TOTALS
    // ======================================================

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


    // ======================================================
    // FARM FINANCIALS
    // ======================================================

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


        // --------------------------------------------------
        // CURRENT WORTH
        // --------------------------------------------------

        totalCurrentWorth +=
            financial.totalCurrentWorth;


        // --------------------------------------------------
        // LIABILITIES
        // --------------------------------------------------

        totalLiabilities +=
            financial.totalLiabilities;


        // --------------------------------------------------
        // SALES
        // --------------------------------------------------

        totalSalesAmount +=
            financial.totalSalesAmount;


        // --------------------------------------------------
        // REVENUE
        // --------------------------------------------------

        totalRevenue +=
            financial.totalRevenue;


        // --------------------------------------------------
        // PROFIT
        // --------------------------------------------------

        totalProfit +=
            financial.totalProfit;

    }


    // ======================================================
    // STANDALONE FINANCIALS
    // ======================================================
    //
    // IMPORTANT:
    //
    // Standalone records are still included here because
    // the financial SUMMARY depends on them.
    //
    // This is NOT standalone.ejs page logic.
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

        // --------------------------------------------------
        // LIABILITY
        // --------------------------------------------------

        const liabilities =
            await getLiabilityTotal(

                asset._id,

                startDate,

                endDate

            );


        // --------------------------------------------------
        // PROFIT
        // --------------------------------------------------

        const profit =
            calculateProfit(

                asset,

                liabilities

            );


        // --------------------------------------------------
        // SALES
        // --------------------------------------------------

        const salesAmount =
            getSalesAmount(
                asset
            );


        // --------------------------------------------------
        // REVENUE
        // --------------------------------------------------

        const revenue =
            number(
                asset.revenue
            );


        // --------------------------------------------------
        // CURRENT WORTH
        // --------------------------------------------------

        const currentWorth =
            number(
                asset.currentWorth
            );


        // --------------------------------------------------
        // ADD STANDALONE TOTALS
        // --------------------------------------------------

        standaloneCurrentWorth +=
            currentWorth;


        standaloneLiabilities +=
            liabilities;


        standaloneSalesAmount +=
            salesAmount;


        standaloneRevenue +=
            revenue;


        standaloneProfit +=
            profit;


        // --------------------------------------------------
        // STORE ASSET FINANCIAL DATA
        // --------------------------------------------------

        standaloneFinancials.push({

            ...asset,

            currentWorth,

            salesAmount,

            revenue,

            totalLiabilities:
                liabilities,

            profit

        });

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
    // SORT FARM RANKING
    // ======================================================
    //
    // Highest profit first.
    //
    // If profit is tied:
    //
    //     highest currentWorth first.
    // ======================================================

    farmFinancials.sort(

        (a, b) => {

            const profitDifference =

                number(b.profit) -

                number(a.profit);


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
    // SORT STANDALONE RANKING
    // ======================================================

    standaloneFinancials.sort(

        (a, b) => {

            const profitDifference =

                number(b.profit) -

                number(a.profit);


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
    // RETURN SUMMARY
    // ==========================================================

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
//
// Date filters apply to liability records only.
//
// Structure:
//
//     standalone[]
//
//     farms[]
//         farm
//         liabilities[]
//
// Farm-owned liabilities remain visible in history.
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
        // STANDALONE ASSET
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


        // --------------------------------------------------
        // FARM ITSELF
        // --------------------------------------------------

        if (
            isFarm(
                dairy
            )
        ) {

            farmCode =
                Number(
                    dairy.code
                );

        }


        // --------------------------------------------------
        // FARM ASSET
        // --------------------------------------------------

        else if (
            isFarmAsset(
                dairy
            )
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


        // ==================================================
        // CREATE FARM GROUP
        // ==================================================

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


        // ==================================================
        // FARM RECORD
        // ==================================================

        if (
            isFarm(
                dairy
            )
        ) {

            group.farm =
                dairy;

        }


        // ==================================================
        // LIABILITY RECORD
        // ==================================================

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

    getFarmFinancialTotals,

    getFinancialSummary,

    getLiabilityHistory

};