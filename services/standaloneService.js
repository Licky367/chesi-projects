// ==========================================================
// services/standaloneService.js
// ==========================================================
//
// PURPOSE:
//
// Provides all financial data required by:
//
//     views/financials/standalone.ejs
//
// A standalone asset is a Dairy record with:
//
//     code      -> null / undefined / empty
//     assetCode -> null / undefined / empty
//
// IMPORTANT:
//
// This service handles the COLLECTION of standalone assets.
//
// It does NOT handle:
//
//     - farms
//     - farm assets
//     - individual dairy financial pages
//     - global financial summary
//
// ==========================================================


const Dairy =
    require("../models/dairy");

const Financials =
    require("../models/financials");


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
// SOLD STATUS
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
// STANDALONE ASSET IDENTIFICATION
// ==========================================================
//
// A standalone asset:
//
//     code      -> empty
//     assetCode -> empty
//
// A negative code is NOT standalone.
//
// Negative codes represent farms.
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
// DATE RANGE
// ==========================================================
//
// Dates apply to Financials records.
//
// They do NOT alter current Dairy values.
//
// Current values:
//
//     currentWorth
//     buyingPrice
//     sellingPrice
//
// ==========================================================

function getDateRange(
    startDate,
    endDate
) {

    const range = {};


    // ======================================================
    // START
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
    // END
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
// GET LIABILITY TOTAL
// ==========================================================
//
// Gets the liabilities belonging to one standalone asset.
//
// Date filtering applies to liability records.
// ==========================================================

async function getLiabilityTotal(
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
// GET SALES AMOUNT
// ==========================================================
//
// A sale only exists when the Dairy record is sold.
//
// Sales amount:
//
//     sellingPrice
//
// For unsold records:
//
//     0
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
//     - liabilities
//     + revenue
//
// ==========================================================

function calculateProfit(
    dairy,
    liabilities
) {

    const totalLiabilities =
        number(
            liabilities
        );


    const revenue =
        number(
            dairy?.revenue
        );


    // ======================================================
    // UNSOLD
    // ======================================================

    if (
        !isSold(
            dairy
        )
    ) {

        return (

            -totalLiabilities +

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

        totalLiabilities +

        revenue

    );

}


// ==========================================================
// BUILD ONE FINANCIAL RECORD
// ==========================================================
//
// Creates the financial representation of one standalone
// Dairy record.
//
// ==========================================================

function buildFinancialRecord(
    dairy,
    liabilities
) {

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


    const totalLiabilities =
        number(
            liabilities
        );


    const salesAmount =
        getSalesAmount(
            dairy
        );


    const profit =
        calculateProfit(

            dairy,

            totalLiabilities

        );


    return {

        ...dairy,

        currentWorth,

        buyingPrice,

        sellingPrice,

        salesAmount,

        revenue,

        totalLiabilities,

        profit

    };

}


// ==========================================================
// GET ALL STANDALONE DAIRY RECORDS
// ==========================================================
//
// Fetches Dairy records first.
//
// Then identifies standalone records in JavaScript.
//
// This guarantees that the standalone definition remains:
//
//     no code
//     AND
//     no assetCode
//
// ==========================================================

async function getStandaloneDairies() {

    const dairies =
        await Dairy.find({

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

            name:
                1

        })

        .lean();


    return dairies.filter(
        isStandaloneAsset
    );

}


// ==========================================================
// BUILD ALL STANDALONE FINANCIAL RECORDS
// ==========================================================
//
// Every standalone Dairy record receives its own financial
// information.
//
// ==========================================================

async function buildStandaloneFinancials(
    standaloneDairies,
    startDate,
    endDate
) {

    const assets =
        [];


    for (
        const dairy of standaloneDairies
    ) {

        const liabilities =
            await getLiabilityTotal(

                dairy._id,

                startDate,

                endDate

            );


        const financial =
            buildFinancialRecord(

                dairy,

                liabilities

            );


        assets.push(
            financial
        );

    }


    return assets;

}


// ==========================================================
// CALCULATE TOTALS
// ==========================================================
//
// Totals represent ONLY the standalone records displayed
// on standalone.ejs.
//
// ==========================================================

function calculateTotals(
    assets
) {

    let currentWorth =
        0;


    let buyingPrice =
        0;


    let sellingPrice =
        0;


    let salesAmount =
        0;


    let revenue =
        0;


    let liabilities =
        0;


    let profit =
        0;


    for (
        const asset of assets
    ) {

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


        salesAmount +=
            number(
                asset.salesAmount
            );


        revenue +=
            number(
                asset.revenue
            );


        liabilities +=
            number(
                asset.totalLiabilities
            );


        profit +=
            number(
                asset.profit
            );

    }


    return {

        currentWorth,

        buyingPrice,

        sellingPrice,

        salesAmount,

        revenue,

        liabilities,

        profit

    };

}


// ==========================================================
// GET STANDALONE FINANCIALS
// ==========================================================
//
// Main service method used by:
//
//     standaloneController
//
// Returns:
//
//     {
//         assets: [],
//         totals: {}
//     }
//
// ==========================================================

async function getStandaloneFinancials(
    startDate,
    endDate
) {

    // ======================================================
    // GET STANDALONE DAIRIES
    // ======================================================

    const standaloneDairies =
        await getStandaloneDairies();


    // ======================================================
    // BUILD FINANCIAL RECORDS
    // ======================================================

    const assets =
        await buildStandaloneFinancials(

            standaloneDairies,

            startDate,

            endDate

        );


    // ======================================================
    // TOTALS
    // ======================================================

    const totals =
        calculateTotals(
            assets
        );


    // ======================================================
    // RETURN
    // ======================================================

    return {

        assets,

        totals

    };

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getDateRange,

    isStandaloneAsset,

    getStandaloneDairies,

    getStandaloneFinancials,

    calculateProfit,

    getSalesAmount

};