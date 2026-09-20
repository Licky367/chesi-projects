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

    return (

        typeof value === "string" &&

        /^\d{4}-\d{2}-\d{2}$/.test(
            value
        ) &&

        !Number.isNaN(
            Date.parse(
                `${value}T00:00:00+03:00`
            )
        )

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
// The value may come from:
// - Admin query: query.substation
// - Staff account: user.assignedSubstation
//
// We deliberately keep the value as-is here because the
// services querying MongoDB can use the ObjectId/string
// directly with Mongoose.
// ==========================================================

function normalizeSubstationId(
    value
) {

    if (
        value === undefined ||
        value === null
    ) {

        return null;

    }


    if (
        typeof value === "string"
    ) {

        const trimmed =
            value.trim();


        return trimmed
            ? trimmed
            : null;

    }


    return value;

}


// ==========================================================
// GLOBAL SUBSTATION FILTER
//
// ADMIN
// -----
// Admins may choose:
//     ?substation=<id>
//
// Empty value:
//     All substations
//
// STAFF
// -----
// Staff do NOT control this through the query string.
//
// Their assignedSubstation is always used.
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
// IMPORTANT:
//
// Date/period remain TAB-SPECIFIC.
//
// Substation is GLOBAL and therefore does not depend on the
// active tab.
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
// All four receive the same `substation` value.
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