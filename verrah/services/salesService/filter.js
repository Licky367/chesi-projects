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
// - Tab filter state
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

function isValidDateString(value) {

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

function normalizePeriod(value) {

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

function normalizeDate(value) {

    return isValidDateString(value)

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
                .slice(0, 10);


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
// FILTER STATE
// ==========================================================

function getFilterState(

    query = {},

    tab

) {

    const config =
        TAB_CONFIG[tab];


    if (!config) {

        throw new Error(
            `Unknown sales tab: ${tab}`
        );

    }


    const date =
        normalizeDate(
            query[config.dateKey]
        );


    const period =
        normalizePeriod(
            query[config.periodKey]
        );


    const range =
        getDateRange(

            date,

            period

        );


    return {

        date:
            range.date,

        period:
            range.period,

        startDate:
            range.startDate,

        endDate:
            range.endDate

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

    }[filter.period];


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

    getFilterState,

    getFilterLabel

};