// ==========================================================
// verrah/services/salesService/staffSales.js
//
// VERRAH COSMETICS
// STAFF SALES / SALES REPORT SERVICE
// ==========================================================


const StaffSale =
    require("../../models/staff-sales");

const substationService =
    require("../substationService");


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
//
// Uses:
//
//     startDate
//     endDate
//     substation
//
// The same query rules are used for:
//
//     Displayed Staff Sales
//     Day total
//     Month total
//     Year total
//
// IMPORTANT:
//
// Staff substation restriction has already been resolved
// by filterService.
//
// Therefore this service never trusts a query-string
// substation value directly.
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

        query.substation =
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
    endDate,
    selectFields =
        "totalAmount substation"
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
            selectFields
        )

        .lean();

}


// ==========================================================
// CALCULATE TOTALS PER SUBSTATION
// ==========================================================

function calculateSubstationTotals(
    sales,
    substations
) {

    const totals =
        new Map();


    // ======================================================
    // ADD SALES TO SUBSTATION TOTALS
    // ======================================================

    sales.forEach(

        sale => {

            if (
                !sale.substation
            ) {

                return;

            }


            const substationId =
                String(
                    sale.substation
                );


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
    // ADD SUBSTATION NAMES
    //
    // Only substations that actually have sales are returned.
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
//
// DATE FILTER
// ------------
//
// Uses the date range already calculated by filterService:
//
//     filter.startDate
//     filter.endDate
//
// SUBSTATION FILTER
// -----------------
//
// Admin:
//
//     filter.substation
//
//     null = all substations
//
// Staff:
//
//     filter.substation
//         = assignedSubstation
//
//
//
// TOTALS
// ------
//
// The totals are calculated around the DATE SELECTED by
// the Staff Sales filter:
//
//     totals.day
//     totals.month
//     totals.year
//
// Therefore:
//
//     Day filter
//         -> day/month/year are based on selected date.
//
//     Month filter
//         -> day/month/year are based on the first date
//            inside the selected month.
//
//     Year filter
//         -> day/month/year are based on the first date
//            inside the selected year.
//
// ==========================================================

async function getStaffSales(
    filter
) {

    // ======================================================
    // LOAD SUBSTATIONS
    //
    // Used only to attach names to bySubstation totals.
    // ======================================================

    const substations =
        await substationService.list();


    // ======================================================
    // FETCH DISPLAY SALES
    //
    // This is the currently selected Staff Sales period.
    //
    // Example:
    //
    // staffSalesDate   = 2026-09-20
    // staffSalesPeriod = month
    //
    // filter.startDate/endDate therefore represent:
    //
    // 2026-09-01 -> 2026-10-01
    // ======================================================

    const sales =
        await getSalesForRange(

            filter,

            filter.startDate,

            filter.endDate,

            "totalAmount substation soldBy products createdAt"

        );


    // ======================================================
    // POPULATE STAFF DETAILS
    //
    // The first query intentionally fetched the fields needed
    // for the sales table. Populate soldBy separately so the
    // returned structure remains compatible with the existing
    // EJS.
    // ======================================================

    const populatedSales =
        await StaffSale.find(

            buildSalesQuery(

                filter,

                filter.startDate,

                filter.endDate

            )

        )

            .populate({

                path:
                    "soldBy",

                select:
                    "name"

            })

            .sort({

                createdAt:
                    -1

            })

            .lean();


    // ======================================================
    // DAY RANGE
    //
    // IMPORTANT:
    //
    // This is calculated from filter.date, NOT from today's
    // actual date.
    //
    // So if the user selects:
    //
    //     15 September 2026
    //
    // the Day total is for:
    //
    //     15 September 2026
    //
    // regardless of today's date.
    // ======================================================

    const dayRange =
        require("./filter").getDateRange(

            filter.date,

            "day"

        );


    // ======================================================
    // MONTH RANGE
    //
    // Based on the selected filter date.
    // ======================================================

    const monthRange =
        require("./filter").getDateRange(

            filter.date,

            "month"

        );


    // ======================================================
    // YEAR RANGE
    //
    // Based on the selected filter date.
    // ======================================================

    const yearRange =
        require("./filter").getDateRange(

            filter.date,

            "year"

        );


    // ======================================================
    // FETCH DAY / MONTH / YEAR SALES
    //
    // ALL THREE USE THE SAME SUBSTATION FILTER.
    //
    // This means an admin selecting a substation gets totals
    // for that substation only.
    //
    // A staff user gets totals for their assigned substation
    // only.
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

        // --------------------------------------------------
        // SELECTED DATE
        // --------------------------------------------------

        day:
            calculateTotal(
                daySales
            ),


        // --------------------------------------------------
        // SELECTED MONTH
        // --------------------------------------------------

        month:
            calculateTotal(
                monthSales
            ),


        // --------------------------------------------------
        // SELECTED YEAR
        // --------------------------------------------------

        year:
            calculateTotal(
                yearSales
            ),


        // --------------------------------------------------
        // TOTALS PER SUBSTATION
        // --------------------------------------------------

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
    // ATTACH TOTALS TO ARRAY
    //
    // Keeps the existing EJS compatible:
    //
    //     staffSales.forEach(...)
    //
    // while also allowing:
    //
    //     staffSales.totals
    // ======================================================

    populatedSales.totals =
        totals;


    // ======================================================
    // RETURN SALES
    // ======================================================

    return populatedSales;

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getStaffSales

};