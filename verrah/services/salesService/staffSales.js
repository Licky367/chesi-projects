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
// The filter object has already been resolved by filter.js.
//
// ADMIN:
//     filter.substation === null
//         -> all substations
//
//     filter.substation === selected ID
//         -> selected substation
//
// STAFF:
//     filter.substation === assignedSubstation
//         -> assigned substation only
//
// The staff user cannot override this through the query string.
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
    // APPLY RESOLVED SUBSTATION RESTRICTION
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
// GET SALES FOR RANGE
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
            "totalAmount substation"
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
    // GROUP SALES BY SUBSTATION
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
//
// The DATE/PERIOD filter controls the displayed sales.
//
// The selected date is also used as the reference date for:
//
//     day
//     month
//     year
//
// The SUBSTATION restriction comes entirely from filter.js.
//
// There is NO substation selector for staff in the EJS.
//
// Admin:
//     no selected substation -> all substations
//
// Staff:
//     assignedSubstation -> assigned substation only
// ==========================================================

async function getStaffSales(
    filter
) {

    // ======================================================
    // LOAD SUBSTATIONS
    //
// Used for the bySubstation totals.
// ======================================================

    const substations =
        await substationService.list();


    // ======================================================
    // DISPLAY SALES
    //
// Uses the currently selected Staff Sales date + period.
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
// Based on the selected staff-sales date.
// ======================================================

    const dayRange =
        require("./filter").getDateRange(

            filter.date,

            "day"

        );


    // ======================================================
    // MONTH RANGE
    //
// Based on the selected staff-sales date.
// ======================================================

    const monthRange =
        require("./filter").getDateRange(

            filter.date,

            "month"

        );


    // ======================================================
    // YEAR RANGE
//
// Based on the selected staff-sales date.
// ======================================================

    const yearRange =
        require("./filter").getDateRange(

            filter.date,

            "year"

        );


    // ======================================================
    // FETCH FILTERED TOTALS
//
// IMPORTANT:
//
// Every range uses the SAME resolved filter.
//
// Therefore staff assigned-substation restrictions remain
// applied to all totals.
//
// Admin with no selected substation gets all substations.
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


        // ==================================================
        // SUBSTATION TOTALS
        //
        // These are available to the page if needed.
        // ==================================================

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
    // ATTACH TOTALS TO SALES ARRAY
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