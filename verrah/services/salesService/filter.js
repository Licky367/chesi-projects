// ==========================================================
// verrah/services/salesService/filter.js
//
// VERRAH COSMETICS
// SALES FILTER SERVICE
//
// Handles:
// - Nairobi date
// - Date validation
// - Period normalization
// - Date ranges
// - Tab-specific date/period filter state
// - Global substation filter
// - Admin substation selection
// - Staff assigned-substation enforcement
// - Filter labels
// ==========================================================


const TIME_ZONE =
    "Africa/Nairobi";


// ==========================================================
// TAB CONFIGURATION
// ==========================================================

const TAB_CONFIG = {

    summary: {

        dateKey:
            "summaryDate",

        periodKey:
            "summaryPeriod"

    },

    "staff-sales": {

        dateKey:
            "staffSalesDate",

        periodKey:
            "staffSalesPeriod"

    },

    products: {

        dateKey:
            "productsDate",

        periodKey:
            "productsPeriod"

    },

    arrears: {

        dateKey:
            "arrearsDate",

        periodKey:
            "arrearsPeriod"

    }

};


// ==========================================================
// CURRENT DATE IN KENYA
// ==========================================================

function getCurrentNairobiDate() {

    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone:
                TIME_ZONE,

            year:
                "numeric",

            month:
                "2-digit",

            day:
                "2-digit"
        }
    ).format(
        new Date()
    );

}


// ==========================================================
// DATE VALIDATION
// ==========================================================

function isValidDateString(
    value
) {

    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {

        return false;

    }


    const [
        year,
        month,
        day
    ] =
        value
            .split("-")
            .map(Number);


    // ======================================================
    // BASIC CALENDAR VALIDATION
    //
    // Prevents JavaScript Date.parse() from accepting
    // invalid dates such as 2026-02-31.
    // ======================================================

    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );


    return (

        date.getUTCFullYear() === year &&

        date.getUTCMonth() === month - 1 &&

        date.getUTCDate() === day

    );

}


// ==========================================================
// PERIOD NORMALIZATION
// ==========================================================

function normalizePeriod(
    value
) {

    return [

        "day",

        "month",

        "year"

    ].includes(value)

        ? value

        : "month";

}


// ==========================================================
// DATE NORMALIZATION
// ==========================================================

function normalizeDate(
    value
) {

    return isValidDateString(
        value
    )

        ? value

        : getCurrentNairobiDate();

}


// ==========================================================
// CONVERT KENYA LOCAL DATE TO UTC
// ==========================================================
//
// Kenya uses UTC+03:00.
//
// The returned Date represents the corresponding UTC
// instant for the supplied Nairobi calendar date.
//
// IMPORTANT:
// The end boundary is intentionally treated as the START
// of the next period rather than 23:59:59.999.
//
// This works correctly with MongoDB:
//
//     createdAt >= startDate
//     createdAt <  endDate
//
// ==========================================================

function kenyaDateToUtc(
    dateString,
    endOfDay = false
) {

    return new Date(

        `${dateString}T${
            endOfDay
                ? "23:59:59.999"
                : "00:00:00.000"
        }+03:00`

    );

}


// ==========================================================
// DATE RANGE
// ==========================================================

function getDateRange(
    dateString,
    period
) {

    const date =
        normalizeDate(
            dateString
        );


    const mode =
        normalizePeriod(
            period
        );


    const [

        year,

        month,

        day

    ] =
        date
            .split("-")
            .map(Number);


    let startDate;

    let endDate;


    // ======================================================
    // DAY
    // ======================================================

    if (
        mode === "day"
    ) {

        startDate =
            kenyaDateToUtc(
                date
            );


        const nextDay =
            new Date(
                Date.UTC(
                    year,
                    month - 1,
                    day + 1
                )
            );


        const nextDate =
            nextDay
                .toISOString()
                .slice(
                    0,
                    10
                );


        endDate =
            kenyaDateToUtc(
                nextDate
            );

    }


    // ======================================================
    // MONTH
    // ======================================================

    else if (
        mode === "month"
    ) {

        const monthStart =
            `${year}-${String(month).padStart(2, "0")}-01`;


        let nextYear =
            year;


        let nextMonth =
            month + 1;


        if (
            nextMonth === 13
        ) {

            nextMonth =
                1;

            nextYear +=
                1;

        }


        const nextMonthStart =
            `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;


        startDate =
            kenyaDateToUtc(
                monthStart
            );


        endDate =
            kenyaDateToUtc(
                nextMonthStart
            );

    }


    // ======================================================
    // YEAR
    // ======================================================

    else {

        const yearStart =
            `${year}-01-01`;


        const nextYearStart =
            `${year + 1}-01-01`;


        startDate =
            kenyaDateToUtc(
                yearStart
            );


        endDate =
            kenyaDateToUtc(
                nextYearStart
            );

    }


    return {

        startDate,

        endDate,

        date,

        period:
            mode

    };

}


// ==========================================================
// NORMALIZE SUBSTATION ID
//
// Values may come from:
//
// ADMIN:
//     query.substation
//
// STAFF:
//     user.assignedSubstation
//
// assignedSubstation may be:
//
//     ObjectId
//     string
//     populated object containing _id
//
// Always return the actual ID value.
// ==========================================================

function normalizeSubstationId(
    value
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return null;

    }


    // ======================================================
    // POPULATED MONGOOSE DOCUMENT / OBJECT
    // ======================================================

    if (
        typeof value === "object" &&
        value._id
    ) {

        return String(
            value._id
        ).trim();

    }


    // ======================================================
    // MONGOOSE OBJECTID
    // ======================================================

    if (
        typeof value === "object" &&
        typeof value.toString === "function"
    ) {

        const id =
            value
                .toString()
                .trim();


        return id
            ? id
            : null;

    }


    // ======================================================
    // STRING
    // ======================================================

    if (
        typeof value === "string"
    ) {

        const trimmed =
            value.trim();


        return trimmed
            ? trimmed
            : null;

    }


    return null;

}


// ==========================================================
// GLOBAL SUBSTATION FILTER
//
// ADMIN
// -----
// Admins may choose:
//
//     ?substation=<id>
//
// Empty value:
//
//     All substations
//
// STAFF
// -----
// Staff do NOT control this through the query string.
//
// Their assignedSubstation is ALWAYS used.
//
// This prevents a staff user from manually changing the
// substation query parameter to access another substation.
// ==========================================================

function getSubstationFilter(
    query = {},
    user = {}
) {

    const role =
        user &&
        user.role;


    // ======================================================
    // STAFF
    // ======================================================

    if (
        role === "staff"
    ) {

        return {

            substation:
                normalizeSubstationId(
                    user.assignedSubstation
                ),

            isRestricted:
                true,

            isAdmin:
                false

        };

    }


    // ======================================================
    // ADMIN
    // ======================================================

    if (
        role === "admin"
    ) {

        return {

            substation:
                normalizeSubstationId(
                    query.substation
                ),

            isRestricted:
                false,

            isAdmin:
                true

        };

    }


    // ======================================================
    // OTHER ROLES
    // ======================================================

    return {

        substation:
            null,

        isRestricted:
            false,

        isAdmin:
            false

    };

}


// ==========================================================
// FILTER STATE
//
// Date/period remain TAB-SPECIFIC.
//
// Substation is GLOBAL.
//
// Example:
//
// summary:
//     summaryDate
//     summaryPeriod
//
// staff-sales:
//     staffSalesDate
//     staffSalesPeriod
//
// products:
//     productsDate
//     productsPeriod
//
// arrears:
//     arrearsDate
//     arrearsPeriod
//
// All four receive the same global substation value.
// ==========================================================

function getFilterState(
    query = {},
    tab,
    user = {}
) {

    const config =
        TAB_CONFIG[tab];


    if (!config) {

        throw new Error(
            `Unknown sales tab: ${tab}`
        );

    }


    // ======================================================
    // TAB-SPECIFIC DATE FILTER
    // ======================================================

    const date =
        normalizeDate(
            query[
                config.dateKey
            ]
        );


    const period =
        normalizePeriod(
            query[
                config.periodKey
            ]
        );


    const range =
        getDateRange(
            date,
            period
        );


    // ======================================================
    // GLOBAL SUBSTATION FILTER
    // ======================================================

    const substationFilter =
        getSubstationFilter(
            query,
            user
        );


    return {

        // --------------------------------------------------
        // Date range
        // --------------------------------------------------

        date:
            range.date,

        period:
            range.period,

        startDate:
            range.startDate,

        endDate:
            range.endDate,


        // --------------------------------------------------
        // Global substation
        // --------------------------------------------------

        substation:
            substationFilter.substation,


        // --------------------------------------------------
        // Access/filter state
        // --------------------------------------------------

        isSubstationRestricted:
            substationFilter.isRestricted,

        isAdmin:
            substationFilter.isAdmin

    };

}


// ==========================================================
// FILTER LABEL
// ==========================================================

function getFilterLabel(
    filter
) {

    const periodName = {

        day:
            "Day",

        month:
            "Month",

        year:
            "Year"

    }[
        filter.period
    ];


    return `${periodName}: ${filter.date}`;

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    TIME_ZONE,

    TAB_CONFIG,

    getCurrentNairobiDate,

    isValidDateString,

    normalizePeriod,

    normalizeDate,

    kenyaDateToUtc,

    getDateRange,

    normalizeSubstationId,

    getSubstationFilter,

    getFilterState,

    getFilterLabel

};