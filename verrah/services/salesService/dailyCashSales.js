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

        return [];

    }


    // ======================================================
    // VALIDATE SUBSTATION ID
    // ======================================================

    if (
        !mongoose.Types.ObjectId.isValid(
            filter.substation
        )
    ) {

        return [];

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

        return [];

    }


    // ======================================================
    // DAILY CASH SALES
    // ======================================================

    const dailyCashSales =
        Array.isArray(
            substation.dailyCashSales
        )
            ? substation.dailyCashSales
            : [];


    // ======================================================
    // DATE FILTER
    // ======================================================

    const startDate =
        filter.startDate;

    const endDate =
        filter.endDate;


    const filteredSales =
        dailyCashSales.filter(
            sale => {

                if (
                    !sale ||
                    !sale.date
                ) {

                    return false;

                }


                const saleDate =
                    new Date(
                        sale.date
                    );


                if (
                    Number.isNaN(
                        saleDate.getTime()
                    )
                ) {

                    return false;

                }


                return (

                    saleDate >=
                        startDate &&

                    saleDate <
                        endDate

                );

            }
        );


    // ======================================================
    // NEWEST FIRST
    // ======================================================

    filteredSales.sort(
        (
            first,
            second
        ) => {

            return (

                new Date(
                    second.date
                ).getTime()

                -

                new Date(
                    first.date
                ).getTime()

            );

        }
    );


    // ======================================================
    // RETURN
    // ======================================================

    return filteredSales;

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getDailyCashSales

};