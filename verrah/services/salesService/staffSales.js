// ==========================================================
// verrah/services/salesService/staffSales.js
//
// VERRAH COSMETICS
// STAFF SALES / SALES REPORT SERVICE
// ==========================================================
//
// SUBSTATION SOURCE:
//
//     StaffSale.salesSubstation
//
// IMPORTANT:
//
//     salesSubstation is the ONLY authoritative substation
//     for staff sales.
//
//     soldBy.assignedSubstation is NOT used.
//
// This rule is used consistently for:
//
//     1. Filtering
//     2. Grouping
//     3. Displaying
//     4. Daily cash sales
//
// ==========================================================


const StaffSale =
    require("../../models/staff-sales");

const Substation =
    require("../../models/substations");

const substationService =
    require("../substationService");

const filterService =
    require("./filter");


// ==========================================================
// GET SALE SUBSTATION
// ==========================================================
//
// The authoritative source is:
//
//     sale.salesSubstation
//
// No fallback to:
//
//     sale.soldBy.assignedSubstation
//
// ==========================================================

function getSaleSubstation(
    sale
) {

    if (
        !sale ||
        !sale.salesSubstation
    ) {

        return null;

    }


    return sale.salesSubstation;

}


// ==========================================================
// GET SALE SUBSTATION ID
// ==========================================================
//
// Handles both:
//
//     salesSubstation: ObjectId
//
// and populated:
//
//     salesSubstation: {
//         _id,
//         name
//     }
//
// ==========================================================

function getSaleSubstationId(
    sale
) {

    const substation =
        getSaleSubstation(
            sale
        );


    if (!substation) {

        return null;

    }


    if (
        typeof substation === "object" &&
        substation._id
    ) {

        return String(
            substation._id
        );

    }


    return String(
        substation
    );

}


// ==========================================================
// CALCULATE TOTAL
// ==========================================================

function calculateTotal(
    sales
) {

    return sales.reduce(

        (
            total,
            sale
        ) => {

            return total +
                Number(
                    sale.totalAmount || 0
                );

        },

        0

    );

}


// ==========================================================
// BUILD SALES QUERY
// ==========================================================
//
// Substation filtering uses ONLY:
//
//     StaffSale.salesSubstation
//
// There is NO:
//
//     User lookup
//     soldBy.assignedSubstation fallback
//
// ==========================================================

function buildSalesQuery(
    filter,
    startDate,
    endDate
) {

    const query = {

        createdAt: {

            $gte:
                startDate,

            $lt:
                endDate

        }

    };


    // ======================================================
    // SUBSTATION FILTER
    // ======================================================

    if (
        filter &&
        filter.substation
    ) {

        query.salesSubstation =
            filter.substation;

    }


    return query;

}


// ==========================================================
// GET SALES FOR DATE RANGE
// ==========================================================

async function getSalesForRange(
    filter,
    startDate,
    endDate
) {

    const query =
        buildSalesQuery(

            filter,

            startDate,

            endDate

        );


    return StaffSale.find(
        query
    )

        .select(
            "totalAmount soldBy createdAt products salesName salesSubstation"
        )

        .populate({

            path:
                "soldBy",

            select:
                "name fullName username"

        })

        .populate({

            path:
                "salesSubstation",

            select:
                "name"

        })

        .sort({

            createdAt:
                -1

        })

        .lean();

}


// ==========================================================
// CALCULATE TOTALS PER SUBSTATION
// ==========================================================
//
// Uses ONLY:
//
//     sale.salesSubstation
//
// No fallback is used.
//
// ==========================================================

function calculateSubstationTotals(
    sales,
    substations
) {

    const totals =
        new Map();


    // ======================================================
    // GROUP SALES
    // ======================================================

    sales.forEach(

        sale => {

            const substationId =
                getSaleSubstationId(
                    sale
                );


            if (
                !substationId
            ) {

                return;

            }


            const currentTotal =
                totals.get(
                    substationId
                ) || 0;


            totals.set(

                substationId,

                currentTotal +
                    Number(
                        sale.totalAmount || 0
                    )

            );

        }

    );


    // ======================================================
    // ATTACH SUBSTATION NAMES
    // ======================================================

    return substations

        .map(

            substation => {

                const substationId =
                    String(
                        substation._id
                    );


                return {

                    substationId:
                        substation._id,

                    substationName:
                        substation.name,

                    total:
                        Number(
                            totals.get(
                                substationId
                            ) || 0
                        )

                };

            }

        )

        .filter(

            item =>
                item.total > 0

        );

}


// ==========================================================
// UPDATE DAILY CASH SALES
// ==========================================================
//
// DATABASE UPDATE ONLY.
//
// For each substation:
//
//     dailyCashSales = [
//         {
//             _id: auto-generated,
//             amount: cumulative sales for the day,
//             date: selected day,
//             isDeposited: existing value / false for new record
//         }
//     ]
//
// The frontend sales data is NOT modified.
//
// Existing daily records are preserved. Only the amount for
// the matching date is updated.
//
// ==========================================================

async function updateDailyCashSales(
    daySales,
    filter,
    substations
) {

    const dailySalesBySubstation =
        new Map();


    // ======================================================
    // CALCULATE CUMULATIVE DAY TOTAL PER SUBSTATION
    // ======================================================

    daySales.forEach(

        sale => {

            const substationId =
                getSaleSubstationId(
                    sale
                );


            if (
                !substationId
            ) {

                return;

            }


            const currentTotal =
                dailySalesBySubstation.get(
                    substationId
                ) || 0;


            dailySalesBySubstation.set(

                substationId,

                currentTotal +
                    Number(
                        sale.totalAmount || 0
                    )

            );

        }

    );


    // ======================================================
    // DETERMINE SUBSTATIONS TO UPDATE
    // ======================================================

    let substationsToUpdate =
        substations;


    if (
        filter &&
        filter.substation
    ) {

        const selectedId =
            String(
                filter.substation
            );


        substationsToUpdate =
            substations.filter(

                substation =>
                    String(
                        substation._id
                    ) === selectedId

            );

    }


    // ======================================================
    // UPDATE DATABASE ONLY
    // ======================================================

    await Promise.all(

        substationsToUpdate.map(

            async substation => {

                const substationId =
                    String(
                        substation._id
                    );


                const amount =
                    Number(
                        dailySalesBySubstation.get(
                            substationId
                        ) || 0
                    );


                const existingSubstation =
                    await Substation.findById(
                        substation._id
                    );


                if (
                    !existingSubstation
                ) {

                    return;

                }


                // ==================================================
                // USE THE DATE OF THE SELECTED DAY
                // ==================================================

                const selectedDate =
                    filter &&
                    filter.date
                        ? new Date(
                            filter.date
                        )
                        : new Date();


                selectedDate.setHours(
                    0,
                    0,
                    0,
                    0
                );


                // ==================================================
                // FIND EXISTING RECORD FOR THIS DAY
                // ==================================================

                const existingDailySale =
                    existingSubstation.dailyCashSales.find(

                        dailySale => {

                            const dailyDate =
                                new Date(
                                    dailySale.date
                                );

                            dailyDate.setHours(
                                0,
                                0,
                                0,
                                0
                            );

                            return (
                                dailyDate.getTime() ===
                                selectedDate.getTime()
                            );

                        }

                    );


                if (
                    existingDailySale
                ) {

                    // ----------------------------------------------
                    // UPDATE ONLY THE CUMULATIVE AMOUNT.
                    //
                    // _id remains unchanged.
                    // isDeposited remains unchanged.
                    // ----------------------------------------------

                    existingDailySale.amount =
                        amount;

                } else {

                    // ----------------------------------------------
                    // CREATE ONE DAILY RECORD.
                    //
                    // Mongoose automatically generates _id.
                    // ----------------------------------------------

                    existingSubstation.dailyCashSales.push({

                        amount:
                            amount,

                        date:
                            selectedDate,

                        isDeposited:
                            false

                    });

                }


                // ==================================================
                // SAVE ONLY THE SUBSTATION DOCUMENT
                // ==================================================

                await existingSubstation.save();

            }

        )

    );

}


// ==========================================================
// GET STAFF SALES
// ==========================================================

async function getStaffSales(
    filter
) {

    // ======================================================
    // LOAD SUBSTATIONS
    // ======================================================

    const substations =
        await substationService.list();


    // ======================================================
    // FETCH DISPLAY SALES
    // ======================================================

    const salesQuery =
        buildSalesQuery(

            filter,

            filter.startDate,

            filter.endDate

        );


    const sales =
        await StaffSale.find(
            salesQuery
        )

            .populate({

                path:
                    "soldBy",

                select:
                    "name fullName username"

            })

            .populate({

                path:
                    "salesSubstation",

                select:
                    "name"

            })

            .sort({

                createdAt:
                    -1

            })

            .lean();


    // ======================================================
    // DATE RANGES
    // ======================================================

    const dayRange =
        filterService.getDateRange(

            filter.date,

            "day"

        );


    const monthRange =
        filterService.getDateRange(

            filter.date,

            "month"

        );


    const yearRange =
        filterService.getDateRange(

            filter.date,

            "year"

        );


    // ======================================================
    // FETCH PERIOD TOTALS
    // ======================================================

    const [

        daySales,

        monthSales,

        yearSales

    ] = await Promise.all([

        getSalesForRange(

            filter,

            dayRange.startDate,

            dayRange.endDate

        ),

        getSalesForRange(

            filter,

            monthRange.startDate,

            monthRange.endDate

        ),

        getSalesForRange(

            filter,

            yearRange.startDate,

            yearRange.endDate

        )

    ]);


    // ======================================================
    // UPDATE DAILY CASH SALES
    // ======================================================
    //
    // Only the "day" period is used here.
    //
    // The same salesSubstation source is used throughout.
    //
    // ======================================================

    await updateDailyCashSales(

        daySales,

        filter,

        substations

    );


    // ======================================================
    // CALCULATE TOTALS
    // ======================================================

    const totals = {

        day:
            calculateTotal(
                daySales
            ),

        month:
            calculateTotal(
                monthSales
            ),

        year:
            calculateTotal(
                yearSales
            ),

        bySubstation: {

            day:
                calculateSubstationTotals(
                    daySales,
                    substations
                ),

            month:
                calculateSubstationTotals(
                    monthSales,
                    substations
                ),

            year:
                calculateSubstationTotals(
                    yearSales,
                    substations
                )

        }

    };


    // ======================================================
    // ATTACH TOTALS
    // ======================================================

    sales.totals =
        totals;


    // ======================================================
    // RETURN
    // ======================================================

    return sales;

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getStaffSales

};