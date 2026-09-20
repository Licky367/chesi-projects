// ==========================================================
// verrah/services/salesService/staffSales.js
//
// VERRAH COSMETICS
// STAFF SALES / SALES REPORT SERVICE
// ==========================================================

const StaffSale =
require("../../models/staff-sales");

const filterService =
require("./filter");

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
// GET SALES FOR A PERIOD
// ==========================================================
//
// This performs the same substation restriction used by
// getStaffSales().
//
// The period is supplied independently so the service can
// calculate:
//
//     day
//     month
//     year
//
// from the same selected date.
// ==========================================================

async function getPeriodSales(
query,
user,
period
) {

const filter =
    filterService.getFilterState(

        {
            ...query,

            staffSalesPeriod:
                period

        },

        "staff-sales",

        user

    );


const periodQuery = {

    createdAt: {

        $gte:
            filter.startDate,

        $lt:
            filter.endDate

    }

};


// ======================================================
// SUBSTATION FILTER
// ======================================================

if (
    filter &&
    filter.substation
) {

    periodQuery.substation =
        filter.substation;

}


return StaffSale.find(
    periodQuery
)

    .select(
        "totalAmount substation"
    )

    .lean();

}

// ==========================================================
// GET STAFF SALES
//
// Uses:
//
//     staffSalesDate
//     staffSalesPeriod
//     substation
//
// Staff:
//
//     filter.substation is forced from assignedSubstation.
//
// Admin:
//
//     filter.substation is optional.
//     null = all substations.
//
//
//
// ALSO CALCULATES:
//
//     totals.day
//     totals.month
//     totals.year
//
//     totals.bySubstation.day
//     totals.bySubstation.month
//     totals.bySubstation.year
// ==========================================================

async function getStaffSales(
filter
) {

const query = {

    createdAt: {

        $gte:
            filter.startDate,

        $lt:
            filter.endDate

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


// ======================================================
// FETCH DISPLAY SALES
// ======================================================

const sales =
    await StaffSale.find(
        query
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
// LOAD SUBSTATIONS
//
// Used to attach names to the totals.
// ======================================================

const substations =
    await substationService.list();


// ======================================================
// THE FILTER ALREADY CONTAINS THE USER'S SELECTED DATE
//
// Reconstruct a query object using that date so the
// service can independently calculate day/month/year.
// ======================================================

const baseQuery = {

    staffSalesDate:
        filter.date,

    substation:
        filter.substation

};


// ======================================================
// FETCH DAY / MONTH / YEAR SALES
// ======================================================

const [

    daySales,

    monthSales,

    yearSales

] = await Promise.all([

    getPeriodSales(
        baseQuery,
        filter.isSubstationRestricted
            ? {
                role:
                    "staff",

                assignedSubstation:
                    filter.substation

            }
            : {
                role:
                    "admin"

            },
        "day"
    ),

    getPeriodSales(
        baseQuery,
        filter.isSubstationRestricted
            ? {
                role:
                    "staff",

                assignedSubstation:
                    filter.substation

            }
            : {
                role:
                    "admin"

            },
        "month"
    ),

    getPeriodSales(
        baseQuery,
        filter.isSubstationRestricted
            ? {
                role:
                    "staff",

                assignedSubstation:
                    filter.substation

            }
            : {
                role:
                    "admin"

            },
        "year"
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
    // TOTALS PER SUBSTATION
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
//
// This keeps the existing EJS compatible because
// staffSales is still an array.
// ======================================================

sales.totals =
    totals;


// ======================================================
// RETURN SALES
// ======================================================

return sales;

}

// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

getStaffSales

};