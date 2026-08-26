// ==========================================================
// services/financialsService.js
// ==========================================================
//
// CENTRAL FINANCIAL BUSINESS-LOGIC SERVICE
//
// ==========================================================
//
// FINANCIAL DATA SOURCES
// ----------------------------------------------------------
//
// models/dairy.js
//     Own financial values:
//
//         buyingPrice
//         sellingPrice
//         currentWorth
//         revenue
//
// models/financials.js
//     Financial transactions:
//
//         type: "liability"
//         type: "revenue"
//
// models/milkSummary.js
//     Milk-production revenue calculation.
//
// ==========================================================
//
// FARM TOTAL RULE
// ----------------------------------------------------------
//
// A farm total is:
//
//     FARM OWN VALUE
//     +
//     ALL ASSIGNED ASSET VALUES
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
// ==========================================================


const mongoose = require("mongoose");

const Dairy = require("../models/dairy");

const Financials = require("../models/financials");

const MilkSummary = require("../models/milkSummary");


// ==========================================================
// CONSTANTS
// ==========================================================

const FINANCIAL_TYPES =
    Array.isArray(Financials.FINANCIAL_TYPES)
        ? Financials.FINANCIAL_TYPES
        : [
            "liability",
            "revenue"
        ];


const LIABILITY_TYPE = "liability";

const REVENUE_TYPE = "revenue";


// ==========================================================
// ERROR HELPER
// ==========================================================

function createError(
    message,
    statusCode = 500
) {

    const error = new Error(message);

    error.statusCode = statusCode;

    return error;

}


// ==========================================================
// OBJECT ID
// ==========================================================

function isValidObjectId(value) {

    return Boolean(

        value &&

        mongoose.Types.ObjectId.isValid(value)

    );

}


// ==========================================================
// NUMBER
// ==========================================================

function number(value) {

    const parsed = Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : 0;

}


// ==========================================================
// DATE RANGE
// ==========================================================

function getDateRange(
    startDate,
    endDate
) {

    const range = {};

    if (startDate) {

        const start = new Date(startDate);

        if (
            Number.isNaN(
                start.getTime()
            )
        ) {

            throw createError(
                "Invalid start date.",
                400
            );

        }

        start.setHours(
            0,
            0,
            0,
            0
        );

        range.$gte = start;

    }


    if (endDate) {

        const end = new Date(endDate);

        if (
            Number.isNaN(
                end.getTime()
            )
        ) {

            throw createError(
                "Invalid end date.",
                400
            );

        }

        end.setHours(
            23,
            59,
            59,
            999
        );

        range.$lte = end;

    }


    return range;

}


// ==========================================================
// USER VALIDATION
// ==========================================================

function validateUserId(
    userId,
    transactionName
) {

    if (
        !isValidObjectId(userId)
    ) {

        throw createError(
            `A valid user is required to record ${transactionName}.`,
            401
        );

    }

    return userId;

}


// ==========================================================
// AMOUNT VALIDATION
// ==========================================================

function validateAmount(
    amount,
    transactionName
) {

    const numericAmount =
        Number(amount);

    if (

        !Number.isFinite(
            numericAmount
        ) ||

        numericAmount <= 0

    ) {

        throw createError(
            `${transactionName} amount must be greater than zero.`,
            400
        );

    }

    return numericAmount;

}


// ==========================================================
// DESCRIPTION VALIDATION
// ==========================================================

function validateDescription(
    description,
    transactionName
) {

    const cleanDescription =
        String(description || "").trim();

    if (!cleanDescription) {

        throw createError(
            `${transactionName} description is required.`,
            400
        );

    }

    return cleanDescription;

}


// ==========================================================
// TRANSACTION DATE
// ==========================================================

function resolveTransactionDate(
    date,
    transactionName
) {

    if (!date) {

        return new Date();

    }

    const parsedDate =
        new Date(date);

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {

        throw createError(
            `Invalid ${transactionName} date.`,
            400
        );

    }

    return parsedDate;

}


// ==========================================================
// DAIRY
// ==========================================================

async function getDairy(
    dairyId
) {

    if (
        !isValidObjectId(dairyId)
    ) {

        throw createError(
            "Invalid Dairy ID.",
            400
        );

    }

    const dairy =
        await Dairy.findById(
            dairyId
        );

    if (!dairy) {

        throw createError(
            "Dairy record not found.",
            404
        );

    }

    return dairy;

}


// ==========================================================
// FINANCIAL TYPE
// ==========================================================

function validateFinancialType(type) {

    const normalized =
        String(type || "")
            .trim()
            .toLowerCase();

    if (
        !FINANCIAL_TYPES.includes(
            normalized
        )
    ) {

        throw createError(
            `Invalid financial transaction type: ${normalized}.`,
            400
        );

    }

    return normalized;

}


// ==========================================================
// SOLD
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
// PROPERTY ASSET
// ==========================================================
//
// Unsold Dairy records are property assets.
//
// Sold records are not property assets because their
// current financial value is represented through the sale.
// ==========================================================

function isPropertyAsset(dairy) {

    if (!dairy) {

        return false;

    }

    return !isSold(dairy);

}


// ==========================================================
// SALES AMOUNT
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
// MONETARY ASSET
// ==========================================================
//
// Monetary value consists of:
//
//     revenue
//     +
//     salesAmount
//
// ==========================================================

function isMonetaryAsset(dairy) {

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
// PROPERTY ASSET VALUE
// ==========================================================
//
// IMPORTANT:
//
// This function is intentionally defined at module scope.
// It is also exported at the bottom of this file.
//
// ==========================================================

function getPropertyAssetValue(dairy) {

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
// MONETARY ASSET VALUE
// ==========================================================

function getMonetaryAssetValue(dairy) {

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
// FARM
// ==========================================================
//
// Farm:
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

    const code =
        Number(dairy.code);

    return (

        Number.isFinite(code) &&

        code < 0

    );

}


// ==========================================================
// FARM ASSET
// ==========================================================
//
// Assigned asset:
//
//     assetCode = farm.code
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

    return true;

}


// ==========================================================
// STANDALONE ASSET
// ==========================================================
//
// Standalone:
//
//     code = null
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
// TRANSACTION QUERY
// ==========================================================

function buildTransactionQuery(
    dairyId,
    type,
    startDate,
    endDate
) {

    const query = {

        dairy: dairyId,

        type

    };

    const dateRange =
        getDateRange(
            startDate,
            endDate
        );

    if (
        Object.keys(dateRange).length
    ) {

        query.createdAt =
            dateRange;

    }

    return query;

}


// ==========================================================
// GET TRANSACTION TOTAL
// ==========================================================
//
// Works for BOTH:
//
//     liability
//     revenue
//
// ==========================================================

async function getFinancialTransactionTotal(
    dairyId,
    type,
    startDate,
    endDate
) {

    const normalizedType =
        validateFinancialType(type);

    const query =
        buildTransactionQuery(
            dairyId,
            normalizedType,
            startDate,
            endDate
        );

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

    if (!result.length) {

        return 0;

    }

    return number(
        result[0].total
    );

}


// ==========================================================
// LIABILITY TOTAL
// ==========================================================

async function getLiabilityTotal(
    dairyId,
    startDate,
    endDate
) {

    return getFinancialTransactionTotal(

        dairyId,

        LIABILITY_TYPE,

        startDate,

        endDate

    );

}


// ==========================================================
// REVENUE TRANSACTION TOTAL
// ==========================================================
//
// IMPORTANT:
//
// This reads Financials:
//
//     type: "revenue"
//
// It is separate from Dairy.revenue, which is calculated
// from milk production.
//
// ==========================================================

async function getRevenueTransactionTotal(
    dairyId,
    startDate,
    endDate
) {

    return getFinancialTransactionTotal(

        dairyId,

        REVENUE_TYPE,

        startDate,

        endDate

    );

}


// ==========================================================
// GET TRANSACTION RECORDS
// ==========================================================

async function getFinancialTransactions(
    dairyId,
    type,
    startDate,
    endDate
) {

    if (
        !isValidObjectId(dairyId)
    ) {

        throw createError(
            "Invalid Dairy ID.",
            400
        );

    }

    const normalizedType =
        validateFinancialType(type);

    const query =
        buildTransactionQuery(
            dairyId,
            normalizedType,
            startDate,
            endDate
        );

    return Financials.find(query)

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
            createdAt: -1
        })

        .lean();

}


// ==========================================================
// GET LIABILITIES
// ==========================================================

async function getLiabilities(
    dairyId,
    startDate,
    endDate
) {

    return getFinancialTransactions(

        dairyId,

        LIABILITY_TYPE,

        startDate,

        endDate

    );

}


// ==========================================================
// GET REVENUE TRANSACTIONS
// ==========================================================

async function getRevenueTransactions(
    dairyId,
    startDate,
    endDate
) {

    return getFinancialTransactions(

        dairyId,

        REVENUE_TYPE,

        startDate,

        endDate

    );

}


// ==========================================================
// GET ALL TRANSACTIONS OF A TYPE
// ==========================================================

async function getAllFinancialTransactions(
    type,
    startDate,
    endDate
) {

    const normalizedType =
        validateFinancialType(type);

    const query = {

        type:
            normalizedType

    };

    const dateRange =
        getDateRange(
            startDate,
            endDate
        );

    if (
        Object.keys(dateRange).length
    ) {

        query.createdAt =
            dateRange;

    }

    return Financials.find(query)

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
            createdAt: -1
        })

        .lean();

}


// ==========================================================
// GET ALL LIABILITIES
// ==========================================================

async function getAllLiabilities(
    startDate,
    endDate
) {

    return getAllFinancialTransactions(

        LIABILITY_TYPE,

        startDate,

        endDate

    );

}


// ==========================================================
// GET ALL REVENUE TRANSACTIONS
// ==========================================================

async function getAllRevenueTransactions(
    startDate,
    endDate
) {

    return getAllFinancialTransactions(

        REVENUE_TYPE,

        startDate,

        endDate

    );

}


// ==========================================================
// RECORD LIABILITY
// ==========================================================

async function recordLiability({

    dairyId,

    amount,

    description,

    userId,

    date

}) {

    const user =
        validateUserId(
            userId,
            "liability"
        );

    const dairy =
        await getDairy(
            dairyId
        );

    const liabilityAmount =
        validateAmount(
            amount,
            "Liability"
        );

    const cleanDescription =
        validateDescription(
            description,
            "Liability"
        );

    const createdAt =
        resolveTransactionDate(
            date,
            "liability"
        );

    return Financials.create({

        dairy:
            dairy._id,

        dairyCode:
            dairy.code ?? null,

        type:
            LIABILITY_TYPE,

        amount:
            liabilityAmount,

        description:
            cleanDescription,

        recordedBy:
            user,

        recordedByName:
            user.name || "",

        createdAt,

        updatedAt:
            createdAt

    });

}


// ==========================================================
// RECORD REVENUE
// ==========================================================

async function recordRevenue({

    dairyId,

    amount,

    description,

    userId,

    date

}) {

    const user =
        validateUserId(
            userId,
            "revenue"
        );

    const dairy =
        await getDairy(
            dairyId
        );

    const revenueAmount =
        validateAmount(
            amount,
            "Revenue"
        );

    const cleanDescription =
        validateDescription(
            description,
            "Revenue"
        );

    const createdAt =
        resolveTransactionDate(
            date,
            "revenue"
        );

    return Financials.create({

        dairy:
            dairy._id,

        dairyCode:
            dairy.code ?? null,

        type:
            REVENUE_TYPE,

        amount:
            revenueAmount,

        description:
            cleanDescription,

        recordedBy:
            user,

        recordedByName:
            user.name || "",

        createdAt,

        updatedAt:
            createdAt

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

        code: 1,

        name: 1

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
        Number(farm.code);

    return allDairies.filter(

        dairy => (

            !isFarm(dairy) &&

            isFarmAsset(dairy) &&

            Number(dairy.assetCode) ===
            farmCode

        )

    );

}


// ==========================================================
// MILK REVENUE MAP
// ==========================================================

async function calculateRevenueMap(
    startDate,
    endDate
) {

    let summaries =
        await MilkSummary.find({})

        .select(
            "day month cowProduction sales farmTotal"
        )

        .lean();


    // ------------------------------------------------------
    // DATE FILTER
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

            if (
                Number.isNaN(
                    start.getTime()
                )
            ) {

                throw createError(
                    "Invalid revenue start date.",
                    400
                );

            }

            start.setHours(
                0,
                0,
                0,
                0
            );

        }


        if (end) {

            if (
                Number.isNaN(
                    end.getTime()
                )
            ) {

                throw createError(
                    "Invalid revenue end date.",
                    400
                );

            }

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
    // MAP
    // ------------------------------------------------------

    const revenueMap =
        new Map();


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
                ) => (

                    total +
                    number(
                        item?.liters
                    )

                ),

                0

            );


        const totalCash =
            sales.reduce(

                (
                    total,
                    sale
                ) => (

                    total +
                    number(
                        sale?.cash
                    )

                ),

                0

            );


        if (

            totalProduction <= 0 ||

            totalCash <= 0

        ) {

            continue;

        }


        for (
            const productionRecord
            of production
        ) {

            const dairyId =
                productionRecord?.dairy;


            if (!dairyId) {

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


            revenueMap.set(

                key,

                (
                    revenueMap.get(key) ||
                    0
                ) +
                dailyRevenue

            );

        }

    }


    return revenueMap;

}


// ==========================================================
// STORE MILK REVENUE
// ==========================================================

async function calculateAndStoreRevenue(
    startDate,
    endDate
) {

    const revenueMap =
        await calculateRevenueMap(
            startDate,
            endDate
        );


    const dairies =
        await Dairy.find({

            status: {

                $ne: "disposed"

            }

        })

        .select(
            "_id name code assetCode revenue"
        )

        .lean();


    const bulkOperations = [];


    for (
        const dairy of dairies
    ) {

        const key =
            dairy._id.toString();


        const calculatedRevenue =
            number(
                revenueMap.get(key)
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
                ordered: false
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

    return calculateAndStoreRevenue(
        startDate,
        endDate
    );

}


// ==========================================================
// CALCULATE PROFIT
// ==========================================================
//
// IMPORTANT:
//
// Profit now uses:
//
//     Dairy.revenue
//     + Financials revenue transactions
//     - liabilities
//
// SOLD:
//
//     sellingPrice
//     - buyingPrice
//     + Dairy.revenue
//     + Financials revenue
//     - liabilities
//
// UNSOLD:
//
//     Dairy.revenue
//     + Financials revenue
//     - liabilities
//
// ==========================================================

function calculateProfit(
    dairy,
    liabilityTotal,
    revenueTransactionTotal = 0
) {

    const liabilities =
        number(
            liabilityTotal
        );


    const dairyRevenue =
        number(
            dairy?.revenue
        );


    const transactionRevenue =
        number(
            revenueTransactionTotal
        );


    const totalRevenue =
        dairyRevenue +
        transactionRevenue;


    if (
        !isSold(dairy)
    ) {

        return (

            totalRevenue -

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

        buyingPrice +

        totalRevenue -

        liabilities

    );

}


// ==========================================================
// BUILD FINANCIAL DATA
// ==========================================================
//
// Represents ONE Dairy record.
//
// It includes:
//
//     own Dairy values
//     own liabilities
//     own Financials revenue transactions
//
// It does NOT include child assets.
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


    const revenueTransactions =
        await getRevenueTransactionTotal(

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


    const dairyRevenue =
        number(
            dairy?.revenue
        );


    const salesAmount =
        getSalesAmount(
            dairy
        );


    const totalRevenue =
        dairyRevenue +
        revenueTransactions;


    const profit =
        calculateProfit(

            dairy,

            liabilities,

            revenueTransactions

        );


    // ------------------------------------------------------
    // Monetary asset value
    //
    // Includes BOTH revenue sources.
    // ------------------------------------------------------

    const monetaryAssets =
        totalRevenue +
        salesAmount;


    // ------------------------------------------------------
    // Property asset value
    // ------------------------------------------------------

    const propertyAssets =
        getPropertyAssetValue(
            dairy
        );


    // ------------------------------------------------------
    // Net worth
    // ------------------------------------------------------

    const netWorth =
        monetaryAssets +
        propertyAssets;


    return {

        ...dairy,

        currentWorth,

        buyingPrice,

        sellingPrice,

        salesAmount,

        // Dairy's calculated milk revenue
        dairyRevenue,

        // Explicit Financials revenue
        revenueTransactions,

        // Combined revenue
        revenue:
            totalRevenue,

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

        throw createError(
            "Dairy record not found.",
            404
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

        throw createError(
            "Standalone asset not found.",
            404
        );

    }


    if (
        !isStandaloneAsset(dairy)
    ) {

        throw createError(
            "Selected record is not a standalone asset.",
            400
        );

    }


    return buildFinancialData(

        dairy,

        startDate,

        endDate

    );

}


// ==========================================================
// FARM FINANCIAL TOTALS
// ==========================================================
//
// TOTAL:
//
//     FARM OWN VALUE
//     +
//     ALL ASSIGNED ASSET VALUES
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

        throw createError(
            "Selected record is not a Dairy Farm.",
            400
        );

    }


    const assets =
        getFarmAssets(

            farm,

            allDairies

        );


    // ------------------------------------------------------
    // FARM OWN FINANCIALS
    // ------------------------------------------------------

    const farmFinancial =
        await buildFinancialData(

            farm,

            startDate,

            endDate

        );


    // ------------------------------------------------------
    // INITIAL TOTALS = FARM OWN VALUES
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


    let totalRevenueTransactions =
        number(
            farmFinancial.revenueTransactions
        );


    const assetFinancials = [];


    // ------------------------------------------------------
    // ADD EVERY ASSIGNED ASSET
    // ------------------------------------------------------

    for (
        const asset of assets
    ) {

        const financial =
            await buildFinancialData(

                asset,

                startDate,

                endDate

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
                financial.currentWorth
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


        monetaryAssets +=
            number(
                financial.monetaryAssets
            );


        propertyAssets +=
            number(
                financial.propertyAssets
            );


        totalRevenueTransactions +=
            number(
                financial.revenueTransactions
            );


        assetFinancials.push(
            financial
        );

    }


    // ------------------------------------------------------
    // COMBINED NET WORTH
    // ------------------------------------------------------

    const netWorth =
        monetaryAssets +
        propertyAssets;


    // ------------------------------------------------------
    // SORT CHILDREN
    // ------------------------------------------------------

    assetFinancials.sort(

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

                number(b.currentWorth) -

                number(a.currentWorth)

            );

        }

    );


    // ------------------------------------------------------
    // RETURN
    // ------------------------------------------------------

    return {

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

        farmRevenueTransactions:
            farmFinancial.revenueTransactions,

        farmProfit:
            farmFinancial.profit,

        farmMonetaryAssets:
            farmFinancial.monetaryAssets,

        farmPropertyAssets:
            farmFinancial.propertyAssets,

        farmNetWorth:
            farmFinancial.netWorth,

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

        revenueTransactions:
            totalRevenueTransactions,

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
// FINANCIAL SUMMARY
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


    let totalBuyingPrice = 0;

    let totalSellingPrice = 0;

    let totalCurrentWorth = 0;

    let totalLiabilities = 0;

    let totalSalesAmount = 0;

    let totalRevenue = 0;

    let totalRevenueTransactions = 0;

    let totalProfit = 0;

    let totalMonetaryAssets = 0;

    let totalPropertyAssets = 0;


    const farmFinancials = [];


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


        totalRevenueTransactions +=
            number(
                financial.revenueTransactions
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
    // STANDALONE
    // ======================================================

    const standaloneFinancials = [];


    let standaloneBuyingPrice = 0;

    let standaloneSellingPrice = 0;

    let standaloneCurrentWorth = 0;

    let standaloneLiabilities = 0;

    let standaloneSalesAmount = 0;

    let standaloneRevenue = 0;

    let standaloneRevenueTransactions = 0;

    let standaloneProfit = 0;

    let standaloneMonetaryAssets = 0;

    let standalonePropertyAssets = 0;


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


        standaloneRevenueTransactions +=
            number(
                financial.revenueTransactions
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
    // ADD STANDALONE
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


    totalRevenueTransactions +=
        standaloneRevenueTransactions;


    totalProfit +=
        standaloneProfit;


    totalMonetaryAssets +=
        standaloneMonetaryAssets;


    totalPropertyAssets +=
        standalonePropertyAssets;


    // ======================================================
    // NET WORTH
    // ======================================================

    const totalNetWorth =
        totalMonetaryAssets +
        totalPropertyAssets;


    // ======================================================
    // SORT
    // ======================================================

    farmFinancials.sort(

        (a, b) => {

            const difference =
                number(b.profit) -
                number(a.profit);

            if (
                difference !== 0
            ) {

                return difference;

            }

            return (

                number(b.currentWorth) -

                number(a.currentWorth)

            );

        }

    );


    standaloneFinancials.sort(

        (a, b) => {

            const difference =
                number(b.profit) -
                number(a.profit);

            if (
                difference !== 0
            ) {

                return difference;

            }

            return (

                number(b.currentWorth) -

                number(a.currentWorth)

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

            revenueTransactions:
                totalRevenueTransactions,

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

            revenueTransactions:
                standaloneRevenueTransactions,

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
// LIABILITY HISTORY
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


    const standalone = [];

    const farms = new Map();


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
        // STANDALONE
        // --------------------------------------------------

        if (
            isStandaloneAsset(dairy)
        ) {

            standalone.push(
                record
            );

            continue;

        }


        let farmCode;


        // --------------------------------------------------
        // DIRECT FARM LIABILITY
        // --------------------------------------------------

        if (
            isFarm(dairy)
        ) {

            farmCode =
                Number(dairy.code);

        }


        // --------------------------------------------------
        // FARM ASSET LIABILITY
        // --------------------------------------------------

        else if (
            isFarmAsset(dairy)
        ) {

            farmCode =
                Number(dairy.assetCode);

        }


        if (

            farmCode === undefined ||

            Number.isNaN(farmCode)

        ) {

            continue;

        }


        if (
            !farms.has(farmCode)
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
            farms.get(farmCode);


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
// REVENUE HISTORY
// ==========================================================

async function getRevenueHistory(
    startDate,
    endDate
) {

    const records =
        await getAllRevenueTransactions(

            startDate,

            endDate

        );


    const standalone = [];

    const farms = new Map();


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
        // STANDALONE
        // --------------------------------------------------

        if (
            isStandaloneAsset(dairy)
        ) {

            standalone.push(
                record
            );

            continue;

        }


        let farmCode;


        // --------------------------------------------------
        // DIRECT FARM REVENUE
        // --------------------------------------------------

        if (
            isFarm(dairy)
        ) {

            farmCode =
                Number(dairy.code);

        }


        // --------------------------------------------------
        // FARM ASSET REVENUE
        // --------------------------------------------------

        else if (
            isFarmAsset(dairy)
        ) {

            farmCode =
                Number(dairy.assetCode);

        }


        if (

            farmCode === undefined ||

            Number.isNaN(farmCode)

        ) {

            continue;

        }


        if (
            !farms.has(farmCode)
        ) {

            farms.set(

                farmCode,

                {

                    farm: null,

                    revenue: []

                }

            );

        }


        const group =
            farms.get(farmCode);


        if (
            isFarm(dairy)
        ) {

            group.farm =
                dairy;

        }


        group.revenue.push(
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

    // ------------------------------------------------------
    // General
    // ------------------------------------------------------

    getDateRange,

    // ------------------------------------------------------
    // Dairy
    // ------------------------------------------------------

    getAllDairies,

    getFinancialStructure,

    getDairyFinancial,

    getStandaloneFinancial,

    getFarmFinancialTotals,

    getFinancialSummary,

    // ------------------------------------------------------
    // Financial transactions
    // ------------------------------------------------------

    recordLiability,

    recordRevenue,

    getLiabilities,

    getAllLiabilities,

    getRevenueTransactions,

    getAllRevenueTransactions,

    getLiabilityHistory,

    getRevenueHistory,

    // ------------------------------------------------------
    // Transaction totals
    // ------------------------------------------------------

    getLiabilityTotal,

    getRevenueTransactionTotal,

    // ------------------------------------------------------
    // Revenue calculation
    // ------------------------------------------------------

    updateDairyRevenues,

    refreshRevenue,

    // ------------------------------------------------------
    // Profit
    // ------------------------------------------------------

    calculateProfit,

    // ------------------------------------------------------
    // Classification helpers
    // ------------------------------------------------------

    isSold,

    isPropertyAsset,

    isMonetaryAsset,

    isFarm,

    isFarmAsset,

    isStandaloneAsset,

    // ------------------------------------------------------
    // Financial value helpers
    // ------------------------------------------------------

    getSalesAmount,

    getPropertyAssetValue,

    getMonetaryAssetValue

};