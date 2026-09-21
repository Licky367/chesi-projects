// ==========================================================
// verrah/services/salesService/dailyCashSales.js
//
// VERRAH COSMETICS
// DAILY CASH SALES SERVICE
//
// Handles:
// - Daily cash sales retrieval
// - Date/period filtering
// - Substation filtering
// - Admin selected-substation access
// - Staff assigned-substation access
// ==========================================================


const mongoose =
    require("mongoose");

const Substation =
    require("../../models/substations");


// ==========================================================
// GET DAILY CASH SALES
// ==========================================================

async function getDailyCashSales(
    filter = {}
) {

    // ======================================================
    // A SUBSTATION MUST BE SELECTED
    // ======================================================
    //
    // Admin:
    //     Comes from filter.substation
    //
    // Staff:
    //     filter.substation is their assignedSubstation
    //
    // Therefore an empty value means:
    //
    //     Admin has not selected a substation.
    //
    // ======================================================

    if (
        !filter.substation
    ) {

        return 0;

    }


    // ======================================================
    // VALIDATE SUBSTATION ID
    // ======================================================

    if (
        !mongoose.Types.ObjectId.isValid(
            filter.substation
        )
    ) {

        return 0;

    }


    // ======================================================
    // LOAD SUBSTATION
    // ======================================================

    const substation =
        await Substation.findById(
            filter.substation,
            {
                dailyCashSales:
                    1
            }
        ).lean();


    if (
        !substation
    ) {

        return 0;

    }


    // ======================================================
    // DAILY CASH SALES
    // ======================================================
    //
    // dailyCashSales is a cumulative total for the day.
    //
    // Example:
    //
    //     Today's cash sales = 15,500
    //
    // The value stored in the substation is simply:
    //
    //     dailyCashSales: 15500
    //
    // ======================================================

    return Number(
        substation.dailyCashSales || 0
    );

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getDailyCashSales

};