// ==========================================================
// services/milkRevenueService.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Calculates and synchronizes revenue for individual Dairy
// records from MilkSummary records.
//
// REVENUE FORMULA
// ----------------------------------------------------------
//
// For each cow:
//
//     cowRevenue =
//         (cowLitres / totalProduced)
//         ×
//         totalSalesCash
//
// Where:
//
//     cowLitres
//         = cowProduction.liters
//
//     totalProduced
//         = MilkSummary.produced
//
//     totalSalesCash
//         = sum of MilkSummary.sales[].cash
//
// The resulting revenue is stored in:
//
//     Dairy.revenue
//
// IMPORTANT
// ----------------------------------------------------------
// Revenue is REBUILT rather than incremented.
//
// This prevents duplicate revenue when a MilkSummary is
// edited or saved multiple times.
//
// ==========================================================

const Dairy =
    require("../models/dairy");

const MilkSummary =
    require("../models/milkSummary");


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
// GET TOTAL SALES CASH
// ==========================================================
//
// Adds all cash values from:
//
//     summary.sales[]
//
// ==========================================================

function getTotalSalesCash(summary) {

    const sales =
        Array.isArray(
            summary?.sales
        )
            ? summary.sales
            : [];

    return sales.reduce(

        (
            total,
            sale
        ) => {

            const cash =
                number(
                    sale?.cash
                );

            return (
                total +
                Math.max(
                    0,
                    cash
                )
            );

        },

        0

    );

}


// ==========================================================
// GET TOTAL PRODUCTION
// ==========================================================
//
// We primarily use:
//
//     summary.produced
//
// If produced is unavailable or zero, we calculate the total
// from cowProduction.
//
// ==========================================================

function getTotalProduced(summary) {

    const storedProduced =
        number(
            summary?.produced
        );

    if (
        storedProduced > 0
    ) {

        return storedProduced;

    }


    const production =
        Array.isArray(
            summary?.cowProduction
        )
            ? summary.cowProduction
            : [];


    return production.reduce(

        (
            total,
            entry
        ) => {

            const liters =
                number(
                    entry?.liters
                );

            return (
                total +
                Math.max(
                    0,
                    liters
                )
            );

        },

        0

    );

}


// ==========================================================
// CALCULATE DAILY COW REVENUE
// ==========================================================
//
// Returns:
//
//     Map<DairyId, revenue>
//
// ==========================================================

function calculateDailyCowRevenue(summary) {

    const revenueMap =
        new Map();


    const production =
        Array.isArray(
            summary?.cowProduction
        )
            ? summary.cowProduction
            : [];


    if (!production.length) {

        return revenueMap;

    }


    const totalProduced =
        getTotalProduced(
            summary
        );


    if (
        totalProduced <= 0
    ) {

        return revenueMap;

    }


    const totalSalesCash =
        getTotalSalesCash(
            summary
        );


    if (
        totalSalesCash <= 0
    ) {

        return revenueMap;

    }


    for (
        const entry of production
    ) {

        if (
            !entry?.dairy
        ) {

            continue;

        }


        const liters =
            number(
                entry.liters
            );


        if (
            liters <= 0
        ) {

            continue;

        }


        // ==================================================
        // USER-DEFINED FORMULA
        // ==================================================

        const dailyRevenue =

            (
                liters /
                totalProduced
            ) *
            totalSalesCash;


        if (
            !Number.isFinite(
                dailyRevenue
            )
        ) {

            continue;

        }


        const dairyId =
            String(
                entry.dairy
            );


        const existing =
            revenueMap.get(
                dairyId
            ) || 0;


        revenueMap.set(

            dairyId,

            existing +
            dailyRevenue

        );

    }


    return revenueMap;

}


// ==========================================================
// CALCULATE ALL DAIRY REVENUE
// ==========================================================
//
// Reads every MilkSummary and accumulates revenue per Dairy.
//
// Result:
//
//     Map<DairyId, totalRevenue>
//
// ==========================================================

async function calculateAllDairyRevenue() {

    const summaries =
        await MilkSummary.find({})

            .select(
                [
                    "day",
                    "produced",
                    "sales",
                    "cowProduction"
                ].join(" ")
            )

            .lean();


    const revenueMap =
        new Map();


    for (
        const summary of summaries
    ) {

        const dailyRevenue =
            calculateDailyCowRevenue(
                summary
            );


        for (
            const [
                dairyId,
                revenue
            ]
            of dailyRevenue.entries()
        ) {

            const existing =
                revenueMap.get(
                    dairyId
                ) || 0;


            revenueMap.set(

                dairyId,

                existing +
                revenue

            );

        }

    }


    return revenueMap;

}


// ==========================================================
// SYNCHRONIZE ALL DAIRY REVENUE
// ==========================================================
//
// This completely rebuilds Dairy.revenue from MilkSummary.
//
// This is deliberately NOT:
//
//     $inc
//
// because $inc could duplicate revenue when a summary is
// edited and saved again.
//
// ==========================================================

async function syncAllDairyRevenue() {

    const revenueMap =
        await calculateAllDairyRevenue();


    const dairies =
        await Dairy.find({

            code: {

                $gt: 0

            }

        })

        .select(
            "_id"
        )

        .lean();


    if (!dairies.length) {

        return {

            updated:
                0,

            totalRevenue:
                0

        };

    }


    const operations =
        dairies.map(

            dairy => {

                const revenue =
                    number(

                        revenueMap.get(
                            String(
                                dairy._id
                            )
                        )

                    );


                return {

                    updateOne: {

                        filter: {

                            _id:
                                dairy._id

                        },

                        update: {

                            $set: {

                                revenue:
                                    Math.max(
                                        0,
                                        revenue
                                    )

                            }

                        }

                    }

                };

            }

        );


    const result =
        await Dairy.bulkWrite(
            operations
        );


    let totalRevenue =
        0;


    for (
        const revenue
        of revenueMap.values()
    ) {

        totalRevenue +=
            number(
                revenue
            );

    }


    return {

        updated:
            result.modifiedCount || 0,

        totalRevenue

    };

}


// ==========================================================
// SYNCHRONIZE ONE DAIRY
// ==========================================================
//
// Useful when you only want to rebuild the revenue of one
// cow rather than every cow.
//
// ==========================================================

async function syncDairyRevenue(
    dairyId
) {

    if (!dairyId) {

        throw new Error(
            "Dairy ID is required."
        );

    }


    const summaries =
        await MilkSummary.find({

            "cowProduction.dairy":
                dairyId

        })

        .select(
            [
                "day",
                "produced",
                "sales",
                "cowProduction"
            ].join(" ")
        )

        .lean();


    let totalRevenue =
        0;


    const targetId =
        String(
            dairyId
        );


    for (
        const summary of summaries
    ) {

        const dailyRevenue =
            calculateDailyCowRevenue(
                summary
            );


        totalRevenue +=
            number(

                dailyRevenue.get(
                    targetId
                ) || 0

            );

    }


    await Dairy.updateOne(

        {

            _id:
                dairyId

        },

        {

            $set: {

                revenue:
                    Math.max(
                        0,
                        totalRevenue
                    )

            }

        }

    );


    return totalRevenue;

}


// ==========================================================
// SYNCHRONIZE REVENUE FOR ONE DAY
// ==========================================================
//
// This recalculates the Dairy revenue for all cows appearing
// in a particular day's summary.
//
// IMPORTANT
// ----------------------------------------------------------
// It does not simply add the day's revenue.
//
// It rebuilds each affected Dairy's TOTAL revenue from all
// MilkSummary records.
//
// Therefore editing a previous day remains safe.
//
// ==========================================================

async function syncRevenueForDay(
    day
) {

    if (
        !day ||
        typeof day !== "string"
    ) {

        throw new Error(
            "A valid summary day is required."
        );

    }


    const summary =
        await MilkSummary.findOne({

            day

        })

        .select(
            [
                "day",
                "produced",
                "sales",
                "cowProduction"
            ].join(" ")
        )

        .lean();


    if (!summary) {

        return {

            day,

            updated:
                0

        };

    }


    const dairyIds =
        [
            ...new Set(

                (
                    summary.cowProduction || []

                )

                .filter(
                    entry =>
                        entry?.dairy
                )

                .map(

                    entry =>
                        String(
                            entry.dairy
                        )

                )

            )

        ];


    for (
        const dairyId
        of dairyIds
    ) {

        await syncDairyRevenue(
            dairyId
        );

    }


    return {

        day,

        updated:
            dairyIds.length

    };

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getTotalSalesCash,

    getTotalProduced,

    calculateDailyCowRevenue,

    calculateAllDairyRevenue,

    syncAllDairyRevenue,

    syncDairyRevenue,

    syncRevenueForDay

};