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
// 1. models/dairy.js
//
//    Stores the Dairy/asset's own financial values:
//
//        buyingPrice
//        sellingPrice
//        currentWorth
//        revenue
//
//    `revenue` is calculated from MilkSummary.
//
// 2. models/financials.js
//
//    Stores financial TRANSACTIONS:
//
//        type: "liability"
//        type: "revenue"
//
//    Each transaction belongs to exactly one Dairy record:
//
//        dairy: ObjectId
//
//    `dairyCode` is only a historical snapshot.
//
// 3. models/milkSummary.js
//
//    Used to calculate Dairy.revenue from milk production/sales.
//
// ==========================================================
//
// FINANCIAL RULE
// ----------------------------------------------------------
//
// A Dairy's financial values consist of:
//
//     ITS OWN DAIRY VALUES
//     +
//     FINANCIAL TRANSACTIONS BELONGING TO IT
//
// A farm's totals are:
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


const mongoose =
    require("mongoose");


const Dairy =
    require("../models/dairy");


const Financials =
    require("../models/financials");


const MilkSummary =
    require("../models/milkSummary");


// ==========================================================
// CONSTANTS
// ==========================================================

const FINANCIAL_TYPES =
    Array.isArray(
        Financials.FINANCIAL_TYPES
    )
        ? Financials.FINANCIAL_TYPES
        : [
            "liability",
            "revenue"
        ];


const LIABILITY_TYPE =
    "liability";


const REVENUE_TYPE =
    "revenue";


// ==========================================================
// INTERNAL ERROR HELPER
// ==========================================================

function createError(
    message,
    statusCode = 500
) {

    const error =
        new Error(message);

    error.statusCode =
        statusCode;

    return error;

}


// ==========================================================
// OBJECT ID VALIDATION
// ==========================================================

function isValidObjectId(
    value
) {

    return (

        value &&

        mongoose.Types.ObjectId.isValid(
            value
        )

    );

}


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
            new Date(
                startDate
            );


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
            new Date(
                endDate
            );


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
        Number(
            value
        );


    return Number.isFinite(
        parsed
    )
        ? parsed
        : 0;

}


// ==========================================================
// USER VALIDATION
// ==========================================================

function validateUserId(
    userId,
    transactionName
) {

    if (
        !isValidObjectId(
            userId
        )
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
        Number(
            amount
        );


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
        String(
            description || ""
        )
        .trim();


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
        new Date(
            date
        );


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
// DAIRY VALIDATION
// ==========================================================

async function getDairy(
    dairyId
) {

    if (
        !isValidObjectId(
            dairyId
        )
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
// FINANCIAL TYPE VALIDATION
// ==========================================================

function validateFinancialType(
    type
) {

    const normalized =
        String(
            type || ""
        )
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
// STATUS HELPERS
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
// SALES AMOUNT
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
// FARM IDENTIFICATION
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


    const code =
        Number(
            dairy.code
        );


    return (

        Number.isFinite(
            code
        ) &&

        code < 0

    );

}


// ==========================================================
// FARM ASSET IDENTIFICATION
// ==========================================================

function isFarmAsset(
    dairy
) {

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
// LIABILITY QUERY
// ==========================================================

function buildLiabilityQuery(
    dairyId,
    startDate,
    endDate
) {

    const query = {

        dairy:
            dairyId,

        type:
            LIABILITY_TYPE

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
// REVENUE TRANSACTION QUERY
// ==========================================================

function buildRevenueQuery(
    dairyId,
    startDate,
    endDate
) {

    const query = {

        dairy:
            dairyId,

        type:
            REVENUE_TYPE

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
// GET REVENUE TRANSACTION TOTAL
// ==========================================================
//
// IMPORTANT:
//
// This is separate from Dairy.revenue.
//
// Dairy.revenue comes from MilkSummary.
//
// Financials revenue comes from:
//
//     Financials.type === "revenue"
//
// Both are included in total revenue.
// ==========================================================

async function getRevenueTransactionTotal(
    dairyId,
    startDate,
    endDate
) {

    const query =
        buildRevenueQuery(
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

    if (
        !isValidObjectId(
            dairyId
        )
    ) {

        throw createError(
            "Invalid Dairy ID.",
            400
        );

    }


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
// GET REVENUE TRANSACTION RECORDS
// ==========================================================

async function getRevenues(
    dairyId,
    startDate,
    endDate
) {

    if (
        !isValidObjectId(
            dairyId
        )
    ) {

        throw createError(
            "Invalid Dairy ID.",
            400
        );

    }


    const query =
        buildRevenueQuery(
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

    const query = {

        type:
            LIABILITY_TYPE

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
// GET ALL REVENUE TRANSACTIONS
// ==========================================================

async function getAllRevenues(
    startDate,
    endDate
) {

    const query = {

        type:
            REVENUE_TYPE

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
// RECORD REVENUE TRANSACTION
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
        !isFarm(
            farm
        )
    ) {

        return [];

    }


    const farmCode =
        Number(
            farm.code
        );


    return allDairies.filter(

        dairy => (

            !isFarm(
                dairy
            ) &&

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
// CALCULATE REVENUE FROM MILK SUMMARY
// ==========================================================
//
// This calculates Dairy.revenue.
//
// It does NOT create Financials revenue records.
//
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
                    revenueMap.get(
                        key
                    ) || 0
                ) +
                dailyRevenue

            );

        }

    }


    return revenueMap;

}


// ==========================================================
// CALCULATE AND STORE REVENUE
// ==========================================================
//
// Updates Dairy.revenue from MilkSummary.
//
// Financials revenue transactions are NOT written here.
//
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

                $ne:
                    "disposed"

            }

        })

        .select(
            "_id name code assetCode revenue"
        )

        .lean();


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

    return calculateAndStoreRevenue(
        startDate,
        endDate
    );

}


// ==========================================================
// CALCULATE PROFIT / LOSS
// ==========================================================
//
// TOTAL REVENUE:
//
//     Dairy.revenue
//     +
//     Financials revenue transactions
//
// UNSOLD:
//
//     totalRevenue - liabilities
//
// SOLD:
//
//     sellingPrice
//     - buyingPrice
//     - liabilities
//     + totalRevenue
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


    const milkRevenue =
        number(
            dairy?.revenue
        );


    const transactionRevenue =
        number(
            revenueTransactionTotal
        );


    const totalRevenue =
        milkRevenue +
        transactionRevenue;


    if (
        !isSold(
            dairy
        )
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

        buyingPrice -

        liabilities +

        totalRevenue

    );

}


// ==========================================================
// BUILD FINANCIAL DATA
// ==========================================================
//
// Represents ONE Dairy record.
//
// It does not include child assets.
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


    const milkRevenue =
        number(
            dairy?.revenue
        );


    // ------------------------------------------------------
    // IMPORTANT
    //
    // Revenue is BOTH:
    //
    //     Dairy.revenue
    //     +
    //     Financials revenue transactions
    // ------------------------------------------------------

    const revenue =
        milkRevenue +
        revenueTransactions;


    const salesAmount =
        getSalesAmount(
            dairy
        );


    const profit =
        calculateProfit(

            dairy,

            liabilities,

            revenueTransactions

        );


    const monetaryAssets =
        revenue +
        salesAmount;


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

        // Total revenue from both sources
        revenue,

        // Kept separately so callers can see the sources
        milkRevenue,

        revenueTransactions,

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
        !isFarm(
            dairy
        )
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
        !isStandaloneAsset(
            dairy
        )
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
// GET FARM FINANCIAL TOTALS
// ==========================================================
//
// FARM TOTAL:
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
        !isFarm(
            farm
        )
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
    // FARM'S OWN VALUES
    // ------------------------------------------------------

    const farmFinancial =
        await buildFinancialData(

            farm,

            startDate,

            endDate

        );


    // ------------------------------------------------------
    // INITIAL TOTALS
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


    let totalRevenueTransactions =
        number(
            farmFinancial.revenueTransactions
        );


    let totalMilkRevenue =
        number(
            farmFinancial.milkRevenue
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


    // ------------------------------------------------------
    // ADD EACH ASSIGNED ASSET
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


        totalRevenueTransactions +=
            number(
                financial.revenueTransactions
            );


        totalMilkRevenue +=
            number(
                financial.milkRevenue
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

        farmMilkRevenue:
            farmFinancial.milkRevenue,

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

        milkRevenue:
            totalMilkRevenue,

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
// GET FINANCIAL SUMMARY
// ==========================================================
//
// Each farm is counted once as:
//
//     FARM + CHILDREN
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


    let totalMilkRevenue =
        0;


    let totalRevenueTransactions =
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


        totalMilkRevenue +=
            number(
                financial.milkRevenue
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


    let standaloneMilkRevenue =
        0;


    let standaloneRevenueTransactions =
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


        standaloneMilkRevenue +=
            number(
                financial.milkRevenue
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
    // ADD STANDALONE VALUES
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


    totalMilkRevenue +=
        standaloneMilkRevenue;


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

            // Combined revenue
            revenue:
                totalRevenue,

            // Revenue source breakdown
            milkRevenue:
                totalMilkRevenue,

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

            milkRevenue:
                standaloneMilkRevenue,

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
// GET LIABILITY HISTORY
// ==========================================================
//
// Groups liability transactions by:
//
//     standalone
//     farm
//
// Revenue transactions do NOT enter this history.
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
        // LIABILITY ON FARM ASSET
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
            isFarm(
                dairy
            )
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
// GET REVENUE HISTORY
// ==========================================================
//
// Same grouping logic as liability history, but for:
//
//     type: "revenue"
//
// ==========================================================

async function getRevenueHistory(
    startDate,
    endDate
) {

    const records =
        await getAllRevenues(

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
        // STANDALONE REVENUE
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
        // REVENUE DIRECTLY ON FARM
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
        // REVENUE ON FARM ASSET
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

                    revenues:
                        []

                }

            );

        }


        const group =
            farms.get(
                farmCode
            );


        if (
            isFarm(
                dairy
            )
        ) {

            group.farm =
                dairy;

        }


        group.revenues.push(
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
    // Date
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

    getRevenues,

    getAllLiabilities,

    getAllRevenues,

    getLiabilityHistory,

    getRevenueHistory,


    // ------------------------------------------------------
    // Financial totals
    // ------------------------------------------------------

    getLiabilityTotal,

    getRevenueTransactionTotal,


    // ------------------------------------------------------
    // Revenue calculation
    // ------------------------------------------------------

    updateDairyRevenues,

    refreshRevenue,

    calculateRevenueMap,

    calculateAndStoreRevenue,


    // ------------------------------------------------------
    // Financial classification helpers
    // ------------------------------------------------------

    isSold,

    isPropertyAsset,

    isFarm,

    isFarmAsset,

    isStandaloneAsset,

    getSalesAmount

};