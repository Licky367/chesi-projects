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
// FALLBACK:
//
//     StaffSale.soldBy.assignedSubstation
//
// RULE:
//
//     If salesSubstation exists, use it.
//     If salesSubstation is missing, use assignedSubstation.
//
// This rule is used consistently for filtering, grouping,
// and displaying staff sales.
// ==========================================================


const mongoose =
    require("mongoose");

const StaffSale =
    require("../../models/staff-sales");

const substationService =
    require("../substationService");

const filterService =
    require("./filter");


// ==========================================================
// USER MODEL
// ==========================================================

const VerrahUser =
    mongoose.model(
        "VerrahUser"
    );


// ==========================================================
// GET SALE SUBSTATION
// ==========================================================
//
// Priority:
//
//     1. salesSubstation
//     2. soldBy.assignedSubstation
//
// ==========================================================

function getSaleSubstation(
    sale
) {

    if (
        sale &&
        sale.salesSubstation
    ) {

        return sale.salesSubstation;

    }


    if (
        sale &&
        sale.soldBy &&
        sale.soldBy.assignedSubstation
    ) {

        return sale.soldBy.assignedSubstation;

    }


    return null;

}


// ==========================================================
// GET SALE SUBSTATION ID
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
// GET STAFF IDS FOR SUBSTATION
// ==========================================================
//
// This remains useful for resolving the fallback:
//
//     soldBy.assignedSubstation
//
// ==========================================================

async function getStaffIdsForSubstation(
    substationId
) {

    if (
        !substationId
    ) {

        return [];

    }


    const users =
        await VerrahUser.find({

            assignedSubstation:
                substationId

        })

            .select(
                "_id"
            )

            .lean();


    return users.map(

        user =>
            user._id

    );

}


// ==========================================================
// BUILD SALES QUERY
// ==========================================================
//
// Substation filter:
//
//     salesSubstation
//
// OR, when salesSubstation is missing:
//
//     soldBy.assignedSubstation
//
// ==========================================================

async function buildSalesQuery(
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

        const substationId =
            filter.substation;


        const staffIds =
            await getStaffIdsForSubstation(

                substationId

            );


        // ==================================================
        // MATCH EITHER:
        //
        //     salesSubstation
        //
        // OR:
        //
        //     soldBy.assignedSubstation
        //
        // ==================================================

        query.$or = [

            {
                salesSubstation:
                    substationId
            },

            {
                salesSubstation:
                    {
                        $exists:
                            false
                    },

                soldBy:
                    {
                        $in:
                            staffIds
                    }
            }

        ];

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
        await buildSalesQuery(

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
                "name fullName username assignedSubstation"

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
// Uses:
//
//     sale.salesSubstation
//
// and falls back to:
//
//     sale.soldBy.assignedSubstation
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
        await buildSalesQuery(

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
                    "name fullName username assignedSubstation"

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