// ==========================================================
// verrah/services/salesService/staffSales.js
//
// VERRAH COSMETICS
// STAFF SALES / SALES REPORT SERVICE
// ==========================================================
//
// STAFF SALE SUBSTATION RELATIONSHIP:
//
//     StaffSale
//         soldBy
//             ↓
//         VerrahUser
//             assignedSubstation
//
// IMPORTANT:
//
// StaffSale DOES NOT have a substation field.
//
// Therefore, substation filtering is performed through:
//
//     StaffSale.soldBy
//             ↓
//     VerrahUser.assignedSubstation
//
// ==========================================================


const mongoose =
    require("mongoose");

const StaffSale =
    require("../../models/staff-sales");

const substationService =
    require("../substationService");


// ==========================================================
// USER MODEL
// ==========================================================
//
// StaffSale.soldBy references:
//
//     "VerrahUser"
//
// We retrieve the registered Mongoose model directly so this
// service does not depend on whether models/user.js exports
// the model under the name User or VerrahUser.
// ==========================================================

const VerrahUser =
    mongoose.model(
        "VerrahUser"
    );


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
// Finds users whose:
//
//     assignedSubstation
//
// matches the requested substation.
//
// The returned IDs are then used against:
//
//     StaffSale.soldBy
//
// ==========================================================

async function getStaffIdsForSubstation(
    substationId
) {

    if (
        !substationId
    ) {

        return null;

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
// Date filtering:
//
//     createdAt >= startDate
//     createdAt <  endDate
//
// Substation filtering:
//
//     StaffSale.soldBy
//         IN users assigned to selected substation
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
    //
    // filter.substation is already resolved by filter.js:
    //
    // ADMIN:
    //     selected substation ID
    //
    // STAFF:
    //     assigned substation ID
    //
    // ADMIN WITH ALL SUBSTATIONS:
    //     null
    //
    // ======================================================

    if (
        filter &&
        filter.substation
    ) {

        const staffIds =
            await getStaffIdsForSubstation(

                filter.substation

            );


        // ==================================================
        // NO STAFF ASSIGNED TO THIS SUBSTATION
        //
        // Return an impossible StaffSale query rather than
        // accidentally returning all sales.
        // ==================================================

        if (
            !staffIds ||
            staffIds.length === 0
        ) {

            query.soldBy = {

                $in: []

            };

        } else {

            query.soldBy = {

                $in:
                    staffIds

            };

        }

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
            "totalAmount soldBy createdAt products salesName"
        )

        .populate({

            path:
                "soldBy",

            select:
                "name fullName username assignedSubstation"

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
// The substation comes from:
//
//     sale.soldBy.assignedSubstation
//
// NOT:
//
//     sale.substation
//
// ==========================================================

function calculateSubstationTotals(
    sales,
    substations
) {

    const totals =
        new Map();


    // ======================================================
    // GROUP SALES USING STAFF ASSIGNED SUBSTATION
    // ======================================================

    sales.forEach(

        sale => {

            if (
                !sale.soldBy ||
                !sale.soldBy.assignedSubstation
            ) {

                return;

            }


            const substationId =
                String(

                    sale
                        .soldBy
                        .assignedSubstation

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
// ==========================================================
//
// Uses:
//
//     staffSalesDate
//     staffSalesPeriod
//
// Substation:
//
//     ADMIN
//         no selection
//             -> all substations
//
//         selected substation
//             -> staff whose assignedSubstation matches
//
//     STAFF
//         -> staff user's assigned substation
//
// ==========================================================

async function getStaffSales(
    filter
) {

    // ======================================================
    // LOAD SUBSTATIONS
    //
    // Used for bySubstation totals.
    // ======================================================

    const substations =
        await substationService.list();


    // ======================================================
    // FETCH DISPLAY SALES
    //
    // Uses the exact date range selected in the Staff Sales
    // filter.
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

    const filterService =
        require("./filter");


    const dayRange =
        filterService.getDateRange(

            filter.date,

            "day"

        );


    // ======================================================
    // MONTH RANGE
    //
    // Based on the selected staff-sales date.
    // ======================================================

    const monthRange =
        filterService.getDateRange(

            filter.date,

            "month"

        );


    // ======================================================
    // YEAR RANGE
    //
    // Based on the selected staff-sales date.
    // ======================================================

    const yearRange =
        filterService.getDateRange(

            filter.date,

            "year"

        );


    // ======================================================
    // FETCH FILTERED TOTALS
    //
    // ALL THREE USE THE SAME SUBSTATION FILTER.
    //
    // The selected substation is resolved through:
    //
    //     User.assignedSubstation
    //
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
    // ATTACH TOTALS TO SALES ARRAY
    //
    // Keeps compatibility with the existing page.js:
    //
    //     staffSales
    //
    // and:
    //
    //     staffSales.totals
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