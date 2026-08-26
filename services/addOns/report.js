// ==========================================================
// services/addOns/report.js
// CASH FLOW / FINANCIAL REPORT SERVICE
// =========================================================
//
// URL:
//
//     /cash/:id
//
// PURPOSE
// ----------------------------------------------------------
//
// Displays the financial history belonging to one Dairy.
//
// Financial transaction types:
//
//     revenue
//     liability
//
// DISPLAY RULE:
//
//     revenue
//         positive
//         green
//
//     liability
//         negative
//         red
//
// WEEK FILTER:
//
//     A date is supplied by the user.
//
//     getWeekRangeFromDate()
//     determines the Monday -> Sunday range containing that date.
//
// ==========================================================


const mongoose =
    require("mongoose");


// ==========================================================
// MODELS
// ==========================================================

const Financials =
    require("../../models/financials");

const Dairy =
    require("../../models/dairy");


// ==========================================================
// ERROR HELPER
// ==========================================================

function createError(
    message,
    statusCode = 500
) {

    const error =
        new Error(message);

    error.statusCode =
        statusCode;

    return error;

}


// ==========================================================
// OBJECT ID VALIDATION
// ==========================================================

function isValidObjectId(id) {

    return mongoose.Types.ObjectId.isValid(
        id
    );

}


// ==========================================================
// GET WEEK RANGE FROM DATE
// ==========================================================
//
// The week is:
//
//     Monday
//         ↓
//     Tuesday
//         ↓
//     Wednesday
//         ↓
//     Thursday
//         ↓
//     Friday
//         ↓
//     Saturday
//         ↓
//     Sunday
//
// The returned end date is exclusive.
//
// Therefore:
//
//     start = Monday 00:00:00
//
//     end   = following Monday 00:00:00
//
// This makes MongoDB date filtering straightforward:
//
//     createdAt >= start
//     createdAt < end
//
// ==========================================================

function getWeekRangeFromDate(
    inputDate
) {

    const date =
        new Date(
            inputDate
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        throw createError(
            "Invalid date.",
            400
        );

    }


    // ------------------------------------------------------
    // Clone the supplied date.
    // ------------------------------------------------------

    const start =
        new Date(
            date
        );


    // ------------------------------------------------------
    // JavaScript:
//
//     Sunday = 0
//     Monday = 1
//     Tuesday = 2
//     ...
//
//     Convert it into a Monday-based offset.
// ------------------------------------------------------

    const day =
        start.getDay();


    const daysFromMonday =
        day === 0
            ? 6
            : day - 1;


    // ------------------------------------------------------
    // Move to Monday.
    // ------------------------------------------------------

    start.setDate(
        start.getDate() -
        daysFromMonday
    );


    // ------------------------------------------------------
    // Start at midnight.
    // ------------------------------------------------------

    start.setHours(
        0,
        0,
        0,
        0
    );


    // ------------------------------------------------------
    // End is the following Monday.
    // ------------------------------------------------------

    const end =
        new Date(
            start
        );


    end.setDate(
        end.getDate() + 7
    );


    return {
        start,
        end
    };

}


// ==========================================================
// FORMAT DATE FOR INPUT
// ==========================================================
//
// Converts a Date into:
//
//     YYYY-MM-DD
//
// Used by the EJS date input.
//
// ==========================================================

function formatDateForInput(
    date
) {

    if (!date) {

        return "";

    }


    const value =
        new Date(
            date
        );


    if (
        Number.isNaN(
            value.getTime()
        )
    ) {

        return "";

    }


    const year =
        value.getFullYear();


    const month =
        String(
            value.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            value.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


// ==========================================================
// GET REPORT
// ==========================================================

async function getReport(
    dairyId,
    selectedDate
) {

    // ======================================================
    // VALIDATE DAIRY ID
    // ======================================================

    if (
        !dairyId ||
        !isValidObjectId(
            dairyId
        )
    ) {

        throw createError(
            "Invalid Dairy ID.",
            400
        );

    }


    // ======================================================
    // FIND DAIRY
    // ======================================================

    const dairy =
        await Dairy.findById(
            dairyId
        ).lean();


    if (!dairy) {

        throw createError(
            "Dairy not found.",
            404
        );

    }


    // ======================================================
    // SELECT DATE
    // ======================================================
    //
    // If the user supplied a date, use it.
    //
    // Otherwise use today.
    //
    // ======================================================

    const reportDate =
        selectedDate
            ? new Date(
                selectedDate
            )
            : new Date();


    if (
        Number.isNaN(
            reportDate.getTime()
        )
    ) {

        throw createError(
            "Invalid report date.",
            400
        );

    }


    // ======================================================
    // WEEK RANGE
    // ======================================================

    const {
        start,
        end
    } =
        getWeekRangeFromDate(
            reportDate
        );


    // ======================================================
    // GET FINANCIAL TRANSACTIONS
    // ======================================================
    //
    // IMPORTANT:
    //
    // `dairy` is the authoritative relationship.
    //
    // We do NOT retrieve transactions by dairyCode.
    //
    // ======================================================

    const transactions =
        await Financials.find({

            dairy:
                dairy._id,

            createdAt: {

                $gte:
                    start,

                $lt:
                    end

            }

        })
        .sort({

            createdAt:
                -1

        })
        .lean();


    // ======================================================
    // CALCULATE TOTALS
    // ======================================================

    let revenueTotal =
        0;


    let liabilityTotal =
        0;


    const cashFlows =
        transactions.map(
            function(transaction) {

                const amount =
                    Number(
                        transaction.amount
                    ) || 0;


                const type =
                    transaction.type;


                // ------------------------------------------------
                // REVENUE
                // ------------------------------------------------

                if (
                    type === "revenue"
                ) {

                    revenueTotal +=
                        amount;


                    return {

                        _id:
                            transaction._id,

                        date:
                            transaction.createdAt,

                        cashFlow:
                            amount,

                        description:
                            transaction.description,

                        type:
                            "revenue"

                    };

                }


                // ------------------------------------------------
                // LIABILITY
                // ------------------------------------------------

                if (
                    type === "liability"
                ) {

                    liabilityTotal +=
                        amount;


                    return {

                        _id:
                            transaction._id,

                        date:
                            transaction.createdAt,

                        cashFlow:
                            -amount,

                        description:
                            transaction.description,

                        type:
                            "liability"

                    };

                }


                // ------------------------------------------------
                // This should never happen because the model
                // validates the financial type.
                // ------------------------------------------------

                return {

                    _id:
                        transaction._id,

                    date:
                        transaction.createdAt,

                    cashFlow:
                        0,

                    description:
                        transaction.description,

                    type:
                        type

                };

            }
        );


    // ======================================================
    // NET CASH FLOW
    // ======================================================

    const netCashFlow =
        revenueTotal -
        liabilityTotal;


    // ======================================================
    // REPORT LABEL
    // ======================================================

    const weekStart =
        new Date(
            start
        );


    const weekEnd =
        new Date(
            end
        );


    weekEnd.setDate(
        weekEnd.getDate() - 1
    );


    return {

        dairy,

        cashFlows,

        selectedDate:
            formatDateForInput(
                reportDate
            ),

        weekStart,

        weekEnd,

        revenueTotal,

        liabilityTotal,

        netCashFlow,

        transactionCount:
            cashFlows.length

    };

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getReport,

    getWeekRangeFromDate,

    formatDateForInput

};