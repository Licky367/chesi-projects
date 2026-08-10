// ==========================================================
// services/financialsService.js
// ==========================================================

const Dairy = require("../models/dairy");
const Financials = require("../models/financials");


// ==========================================================
// DATE HELPERS
// ==========================================================

function getDateRange(startDate, endDate) {

    const range = {};

    if (startDate) {

        const start = new Date(startDate);

        if (!Number.isNaN(start.getTime())) {

            start.setHours(
                0,
                0,
                0,
                0
            );

            range.$gte = start;

        }

    }


    if (endDate) {

        const end = new Date(endDate);

        if (!Number.isNaN(end.getTime())) {

            end.setHours(
                23,
                59,
                59,
                999
            );

            range.$lte = end;

        }

    }


    return range;

}


// ==========================================================
// NUMBER HELPER
// ==========================================================

function number(value) {

    return Number(value) || 0;

}


// ==========================================================
// GET LIABILITY TOTAL
// ==========================================================

async function getLiabilityTotal(
    dairyId,
    startDate,
    endDate
) {

    const query = {

        dairy: dairyId

    };


    const dateRange =
        getDateRange(
            startDate,
            endDate
        );


    if (Object.keys(dateRange).length) {

        query.createdAt =
            dateRange;

    }


    const result =
        await Financials.aggregate([

            {

                $match: query

            },

            {

                $group: {

                    _id: null,

                    total: {

                        $sum: "$amount"

                    }

                }

            }

        ]);


    return result.length

        ? number(
            result[0].total
        )

        : 0;

}


// ==========================================================
// GET LIABILITY RECORDS
// ==========================================================

async function getLiabilities(
    dairyId,
    startDate,
    endDate
) {

    const query = {

        dairy: dairyId

    };


    const dateRange =
        getDateRange(
            startDate,
            endDate
        );


    if (Object.keys(dateRange).length) {

        query.createdAt =
            dateRange;

    }


    return Financials.find(query)

        .populate(
            "dairy",
            "name code status buyingPrice currentWorth"
        )

        .populate(
            "recordedBy",
            "name email"
        )

        .sort({
            createdAt: -1
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


    if (Object.keys(dateRange).length) {

        query.createdAt =
            dateRange;

    }


    return Financials.find(query)

        .populate(
            "dairy",
            "name code status buyingPrice currentWorth"
        )

        .populate(
            "recordedBy",
            "name email"
        )

        .sort({
            createdAt: -1
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
        !String(description).trim()
    ) {

        throw new Error(
            "Liability description is required."
        );

    }


    return Financials.create({

        dairy: dairy._id,

        amount:
            liabilityAmount,

        description:
            String(description).trim(),

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
            $ne: "disposed"
        }

    })

    .select(
        "name code assetCode type status buyingPrice currentWorth description"
    )

    .sort({

        code: 1,

        name: 1

    })

    .lean();

}


// ==========================================================
// GET FARM STRUCTURE
//
// Returns farms and the assets belonging to each farm.
//
// A farm's own liability is NOT excluded.
// It is included separately when calculating totals.
// ==========================================================

async function getFinancialStructure() {

    const dairies =
        await getAllDairies();


    const farms =
        dairies.filter(
            dairy =>
                Number(dairy.code) < 0
        );


    const standaloneAssets =
        dairies.filter(
            dairy =>
                (
                    dairy.code === null ||
                    dairy.code === undefined
                ) &&
                (
                    dairy.assetCode === null ||
                    dairy.assetCode === undefined
                )
        );


    const farmAssets =
        farms.map(
            farm => ({

                ...farm,

                assets:
                    dairies.filter(
                        dairy =>

                            dairy.assetCode !== null &&

                            dairy.assetCode !== undefined &&

                            Number(
                                dairy.assetCode
                            ) === Number(
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
// CALCULATE INDIVIDUAL PROFIT
//
// Profit is ONLY available for sold records.
//
// Formula:
//
// sellingPrice
// - buyingPrice
// - liabilities
//
// If not sold:
//
// profit = null
// ==========================================================

function calculateProfit(
    dairy,
    liabilityTotal
) {

    if (
        !dairy ||
        dairy.status !== "sold"
    ) {

        return null;

    }


    const sellingPrice =
        number(
            dairy.sellingPrice
        );


    const buyingPrice =
        number(
            dairy.buyingPrice
        );


    return (

        sellingPrice -

        buyingPrice -

        number(
            liabilityTotal
        )

    );

}


// ==========================================================
// GET INDIVIDUAL FINANCIAL RECORD
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
            "name code assetCode type status buyingPrice currentWorth sellingPrice"
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


    const profit =
        calculateProfit(
            dairy,
            liabilities
        );


    return {

        ...dairy,

        totalLiabilities:
            liabilities,

        profit

    };

}


// ==========================================================
// GET FARM FINANCIAL TOTALS
//
// Includes:
//
// 1. Farm's own liability
// 2. Liabilities of assets inside farm
// 3. Farm's own profit if sold
// 4. Profit of sold assets inside farm
//
// Unsold records contribute NO profit.
// ==========================================================

async function getFarmFinancialTotals(
    farm,
    allDairies,
    startDate,
    endDate
) {

    const assets =
        allDairies.filter(
            dairy =>

                dairy.assetCode !== null &&

                dairy.assetCode !== undefined &&

                Number(
                    dairy.assetCode
                ) === Number(
                    farm.code
                )
        );


    const farmLiabilities =
        await getLiabilityTotal(
            farm._id,
            startDate,
            endDate
        );


    let totalLiabilities =
        farmLiabilities;


    let totalProfit = 0;


    const farmProfit =
        calculateProfit(
            farm,
            farmLiabilities
        );


    if (farmProfit !== null) {

        totalProfit +=
            farmProfit;

    }


    const assetFinancials =
        [];


    for (
        const asset of assets
    ) {

        const liabilities =
            await getLiabilityTotal(
                asset._id,
                startDate,
                endDate
            );


        totalLiabilities +=
            liabilities;


        const profit =
            calculateProfit(
                asset,
                liabilities
            );


        if (profit !== null) {

            totalProfit +=
                profit;

        }


        assetFinancials.push({

            ...asset,

            totalLiabilities:
                liabilities,

            profit

        });

    }


    return {

        farm,

        farmLiabilities,

        totalLiabilities,

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

    const dairies =
        await getAllDairies();


    const farms =
        dairies.filter(
            dairy =>
                Number(dairy.code) < 0
        );


    const standaloneAssets =
        dairies.filter(
            dairy =>

                (
                    dairy.code === null ||
                    dairy.code === undefined
                ) &&

                (
                    dairy.assetCode === null ||
                    dairy.assetCode === undefined
                )

        );


    let totalCurrentWorth = 0;

    let totalLiabilities = 0;

    let totalProfit = 0;


    // ======================================================
    // FARM TOTALS
    // ======================================================

    const farmFinancials = [];


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
            number(
                farm.currentWorth
            );


        totalLiabilities +=
            financial.totalLiabilities;


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

    let standaloneProfit =
        0;


    for (
        const asset of standaloneAssets
    ) {

        const liabilities =
            await getLiabilityTotal(
                asset._id,
                startDate,
                endDate
            );


        const profit =
            calculateProfit(
                asset,
                liabilities
            );


        standaloneCurrentWorth +=
            number(
                asset.currentWorth
            );


        standaloneLiabilities +=
            liabilities;


        if (profit !== null) {

            standaloneProfit +=
                profit;

        }


        standaloneFinancials.push({

            ...asset,

            totalLiabilities:
                liabilities,

            profit

        });

    }


    totalCurrentWorth +=
        standaloneCurrentWorth;


    totalLiabilities +=
        standaloneLiabilities;


    totalProfit +=
        standaloneProfit;


    return {

        filters: {

            startDate:
                startDate || "",

            endDate:
                endDate || ""

        },

        totals: {

            currentWorth:
                totalCurrentWorth,

            liabilities:
                totalLiabilities,

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

            profit:
                standaloneProfit,

            assets:
                standaloneFinancials

        }

    };

}


// ==========================================================
// GET LIABILITY HISTORY
//
// Includes:
//
// - Standalone assets
// - Farm's own liabilities
// - Assets belonging to each farm
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

        if (!record.dairy) {

            continue;

        }


        const dairy =
            record.dairy;


        // ==================================================
        // STANDALONE ASSET
        // ==================================================

        if (

            (
                dairy.code === null ||
                dairy.code === undefined
            ) &&

            (
                dairy.assetCode === null ||
                dairy.assetCode === undefined
            )

        ) {

            standalone.push(
                record
            );

            continue;

        }


        // ==================================================
        // FARM OR FARM ASSET
        // ==================================================

        let farmCode;


        if (
            Number(dairy.code) < 0
        ) {

            farmCode =
                Number(dairy.code);

        } else if (
            dairy.assetCode !== null &&
            dairy.assetCode !== undefined
        ) {

            farmCode =
                Number(
                    dairy.assetCode
                );

        }


        if (
            farmCode === undefined
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

                    farm: null,

                    liabilities: []

                }
            );

        }


        const group =
            farms.get(
                farmCode
            );


        if (
            Number(dairy.code) < 0
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
            [...farms.values()]

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