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
// Uses:
//     staffSalesDate
//     staffSalesPeriod
//     substation
//
// Staff:
//     filter.substation is forced from assignedSubstation.
//
// Admin:
//     filter.substation is optional.
//     null = all substations.
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
// FETCH STAFF SALES
// ======================================================

return StaffSale.find(
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

}

// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

getStaffSales

};