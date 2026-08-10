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
// It does NOT affect currentWorth.
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

function number(value) {

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
//
// Returns liabilities belonging to ONE dairy/asset.
//
// The date filter applies to the liability records.
//
// This function does NOT affect currentWorth.
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
            "sellingPrice"
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
            "sellingPrice"
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
// A standalone asset has:
//
//     no code
//     no assetCode
// ==========================================================

function isStandaloneAsset(
    dairy
) {

    return (

        (
            dairy?.code === null ||
            dairy?.code === undefined ||
            dairy?.code === ""
        )

        &&

        (
            dairy?.assetCode === null ||
            dairy?.assetCode === undefined ||
            dairy?.assetCode === ""
        )

    );

}


// ==========================================================
// IDENTIFY FARM ASSET
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
//         farm
//         assets[]
//
//     standaloneAssets[]
//
// Current values are never date filtered.
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
//     SOLD
//         sellingPrice
//         - buyingPrice
//         - liabilities
//
//     NOT SOLD
//         -liabilities
//
// Therefore an unsold item carrying:
//
//     KSh 50,000 liabilities
//
// contributes:
//
//     -KSh 50,000
//
// The liability value supplied here is already filtered
// according to the selected period.
// ==========================================================

function calculateProfit(
    dairy,
    liabilityTotal
) {

    const liabilities =
        number(
            liabilityTotal
        );


    // ======================================================
    // NOT SOLD
    // ======================================================

    if (
        !isSold(
            dairy
        )
    ) {

        return -liabilities;

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

        liabilities

    );

}


// ==========================================================
// GET INDIVIDUAL DAIRY FINANCIAL RECORD
// ==========================================================
//
// currentWorth:
//
//     always current
//
// totalLiabilities:
//
//     selected period
//
// profit:
//
//     selected period
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
                "sellingPrice"
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


    const profit =
        calculateProfit(
            dairy,
            liabilities
        );


    return {

        ...dairy,

        currentWorth:
            number(
                dairy.currentWorth
            ),

        totalLiabilities:
            liabilities,

        profit

    };

}


// ==========================================================
// GET FARM FINANCIAL TOTALS
// ==========================================================
//
// IMPORTANT FINANCIAL RULES:
//
// 1. Farm's OWN liabilities are NOT included in
//    totalLiabilities.
//
// 2. Farm's OWN profit/loss is NOT included in
//    totalProfit.
//
// 3. Farm ASSET liabilities ARE included in
//    totalLiabilities.
//
// 4. Farm ASSET profit/loss IS included in
//    totalProfit.
//
// Therefore:
//
//     farmLiabilities
//         = farm's own liability
//
//     farmProfit
//         = farm's own profit/loss
//
//     totalLiabilities
//         = SUM(asset liabilities)
//
//     totalProfit
//         = SUM(asset profit/loss)
//
// This keeps the farm record itself separate from the
// financial performance of the assets belonging to it.
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
    // FARM'S OWN LIABILITIES
    // ======================================================
    //
    // Retained separately.
    //
    // NOT included in totalLiabilities.
    // ======================================================

    const farmLiabilities =
        await getLiabilityTotal(
            farm._id,
            startDate,
            endDate
        );


    // ======================================================
    // FARM'S OWN PROFIT / LOSS
    // ======================================================
    //
    // Retained separately.
    //
    // NOT included in totalProfit.
    // ======================================================

    const farmProfit =
        calculateProfit(
            farm,
            farmLiabilities
        );


    // ======================================================
    // ASSET TOTALS
    // ======================================================

    let totalLiabilities =
        0;


    let totalProfit =
        0;


    // ======================================================
    // FARM ASSET FINANCIALS
    // ======================================================

    const assetFinancials =
        [];


    for (
        const asset of assets
    ) {

        // --------------------------------------------------
        // ASSET LIABILITIES
        // --------------------------------------------------

        const liabilities =
            await getLiabilityTotal(
                asset._id,
                startDate,
                endDate
            );


        // --------------------------------------------------
        // ASSET PROFIT / LOSS
        // --------------------------------------------------

        const profit =
            calculateProfit(
                asset,
                liabilities
            );


        // --------------------------------------------------
        // ONLY ASSET LIABILITIES COUNT
        // --------------------------------------------------

        totalLiabilities +=
            liabilities;


        // --------------------------------------------------
        // ONLY ASSET PROFIT COUNTS
        // --------------------------------------------------

        totalProfit +=
            profit;


        // --------------------------------------------------
        // STORE ASSET FINANCIAL DATA
        // --------------------------------------------------

        assetFinancials.push({

            ...asset,

            currentWorth:
                number(
                    asset.currentWorth
                ),

            totalLiabilities:
                liabilities,

            profit

        });

    }


    // ======================================================
    // RETURN FARM FINANCIALS
    // ======================================================

    return {

        // --------------------------------------------------
        // FARM
        // --------------------------------------------------

        farm: {

            ...farm,

            currentWorth:
                number(
                    farm.currentWorth
                )

        },


        // --------------------------------------------------
        // FARM'S OWN LIABILITY
        //
        // Separate only.
        // --------------------------------------------------

        farmLiabilities,


        // --------------------------------------------------
        // FARM'S OWN PROFIT / LOSS
        //
        // Separate only.
        //
        // IMPORTANT:
        //
        // This value is NOT used by the summary's
        // totalProfit.
        // --------------------------------------------------

        farmProfit,


        // --------------------------------------------------
        // FARM ASSET LIABILITIES ONLY
        // --------------------------------------------------

        totalLiabilities,


        // --------------------------------------------------
        // FARM ASSET PROFIT / LOSS ONLY
        // --------------------------------------------------

        profit:
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
// CORE RULES:
//
// 1. CURRENT NET WORTH
//
//    Always current.
//
// 2. LIABILITIES
//
//    Respect the selected date range.
//
// 3. FARM TOTAL LIABILITIES
//
//    Include ONLY liabilities belonging to farm assets.
//
//    DO NOT include farm's own liabilities.
//
// 4. FARM TOTAL PROFIT
//
//    Include ONLY profit/loss from farm assets.
//
//    DO NOT include the farm record's own profit/loss.
//
// 5. STANDALONE ASSETS
//
//    Their liabilities and profit/loss are included normally.
//
// 6. NO DATE FILTER
//
//    Liability/profit analysis uses lifetime records.
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
        // CURRENT NET WORTH
        //
        // Farm currentWorth is always current.
        // --------------------------------------------------

        totalCurrentWorth +=
            number(
                farm.currentWorth
            );


        // --------------------------------------------------
        // FARM ASSET LIABILITIES ONLY
        //
        // farmLiabilities is deliberately NOT used here.
        // --------------------------------------------------

        totalLiabilities +=
            financial.totalLiabilities;


        // --------------------------------------------------
        // FARM ASSET PROFIT/LOSS ONLY
        //
        // financial.profit contains ONLY the profits/losses
        // of the farm's assets.
        //
        // financial.farmProfit is deliberately NOT added.
        // --------------------------------------------------

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

        // --------------------------------------------------
        // FILTERED LIABILITY
        // --------------------------------------------------

        const liabilities =
            await getLiabilityTotal(

                asset._id,

                startDate,

                endDate

            );


        // --------------------------------------------------
        // PROFIT / LOSS
        // --------------------------------------------------

        const profit =
            calculateProfit(

                asset,

                liabilities

            );


        // --------------------------------------------------
        // CURRENT NET WORTH
        // --------------------------------------------------

        standaloneCurrentWorth +=
            number(
                asset.currentWorth
            );


        // --------------------------------------------------
        // LIABILITY
        // --------------------------------------------------

        standaloneLiabilities +=
            liabilities;


        // --------------------------------------------------
        // PROFIT
        // --------------------------------------------------

        standaloneProfit +=
            profit;


        // --------------------------------------------------
        // STORE ASSET FINANCIAL DATA
        // --------------------------------------------------

        standaloneFinancials.push({

            ...asset,

            currentWorth:
                number(
                    asset.currentWorth
                ),

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


    totalProfit +=
        standaloneProfit;


    // ======================================================
    // RETURN SUMMARY
    // ======================================================
    //
    // Aligns with financialsController.js:
    //
    //     summary
    //
    // containing:
    //
    //     totals
    //     farms
    //     standalone
    //
    // Date filters are handled by the controller and passed
    // into the service.
    // ==========================================================

    return {

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
// IMPORTANT:
//
// Farm-owned liabilities remain visible in history.
//
// Excluding farm-owned liabilities from
// totalLiabilities does NOT remove them from history.
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