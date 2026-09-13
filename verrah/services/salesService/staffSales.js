// ==========================================================
// verrah/services/salesService/staffSales.js
//
// VERRAH COSMETICS
// STAFF SALES / SALES REPORT SERVICE
// ==========================================================


const StaffSale =
    require("../../models/staff-sales");


// ==========================================================
// GET STAFF SALES
//
// IMPORTANT:
// Uses ONLY the Staff Sales filter.
//
// staffSalesDate
// staffSalesPeriod
// ==========================================================

async function getStaffSales(
    filter
) {

    return StaffSale.find({

        createdAt: {

            $gte:
                filter.startDate,

            $lt:
                filter.endDate

        }

    })

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

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getStaffSales

};