// ==========================================================
// services/liability.js
// LIABILITY SERVICE
// VERRAH COSMETICS
// ==========================================================

const Liability = require("../models/liability");


// ==========================================================
// CREATE LIABILITY
// ==========================================================

exports.createLiability = async function ({
    name,
    amount,
    recordedBy,
    substation
}) {

    const liability =
        new Liability({

            name,

            amount,

            recordedBy,

            substation

        });


    return liability.save();

};


// ==========================================================
// GET LIABILITY RECORDS
// ==========================================================

exports.getLiabilities = async function ({
    user,
    date,
    period
}) {

    /*
     * ------------------------------------------------------
     * VALIDATE DATE
     * ------------------------------------------------------
     */

    if (
        typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {

        return [];

    }


    const [
        year,
        month,
        day
    ] = date
        .split("-")
        .map(Number);


    /*
     * ------------------------------------------------------
     * VALIDATE DATE VALUES
     * ------------------------------------------------------
     */

    const testDate =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );


    if (
        Number.isNaN(testDate.getTime()) ||
        testDate.getUTCFullYear() !== year ||
        testDate.getUTCMonth() !== month - 1 ||
        testDate.getUTCDate() !== day
    ) {

        return [];

    }


    /*
     * ------------------------------------------------------
     * DATE RANGE
     * ------------------------------------------------------
     *
     * The selected date is interpreted as a Kenya date.
     *
     * Kenya:
     *     UTC+3
     *
     * We convert the beginning/end of the selected period
     * into UTC Date objects before querying MongoDB.
     *
     * day:
     *     selected date only
     *
     * month:
     *     entire selected month
     *
     * year:
     *     entire selected year
     * ------------------------------------------------------
     */

    let startLocal;
    let endLocal;


    if (period === "day") {

        startLocal = {
            year,
            month,
            day
        };


        const nextDay =
            new Date(
                Date.UTC(
                    year,
                    month - 1,
                    day + 1
                )
            );


        endLocal = {
            year: nextDay.getUTCFullYear(),
            month: nextDay.getUTCMonth() + 1,
            day: nextDay.getUTCDate()
        };

    }


    else if (period === "year") {

        startLocal = {
            year,
            month: 1,
            day: 1
        };


        endLocal = {
            year: year + 1,
            month: 1,
            day: 1
        };

    }


    else {

        /*
         * --------------------------------------------------
         * MONTH
         * --------------------------------------------------
         *
         * Month is also the default when an invalid period
         * is supplied.
         * --------------------------------------------------
         */

        startLocal = {
            year,
            month,
            day: 1
        };


        const nextMonth =
            new Date(
                Date.UTC(
                    year,
                    month,
                    1
                )
            );


        endLocal = {
            year: nextMonth.getUTCFullYear(),
            month: nextMonth.getUTCMonth() + 1,
            day: 1
        };

    }


    /*
     * ------------------------------------------------------
     * CONVERT KENYA MIDNIGHT TO UTC
     * ------------------------------------------------------
     *
     * Kenya is UTC+3.
     *
     * Example:
     *
     * Kenya:
     *     2026-09-20 00:00
     *
     * UTC:
     *     2026-09-19 21:00
     *
     * This gives MongoDB the correct boundaries for records
     * created according to Kenya time.
     * ------------------------------------------------------
     */

    function kenyaMidnightToUTC({
        year,
        month,
        day
    }) {

        return new Date(
            Date.UTC(
                year,
                month - 1,
                day,
                -3,
                0,
                0,
                0
            )
        );

    }


    const startDate =
        kenyaMidnightToUTC(startLocal);


    const endDate =
        kenyaMidnightToUTC(endLocal);


    /*
     * ------------------------------------------------------
     * QUERY
     * ------------------------------------------------------
     */

    const query = {

        createdAt: {

            $gte: startDate,

            $lt: endDate

        }

    };


    /*
     * ------------------------------------------------------
     * STAFF ACCESS
     * ------------------------------------------------------
     *
     * Staff can only see liabilities belonging to their
     * assigned substation.
     *
     * Admin can see liabilities from all substations.
     * ------------------------------------------------------
     */

    if (
        user &&
        user.role === "staff"
    ) {

        query.substation =
            user.assignedSubstation;

    }


    /*
     * ------------------------------------------------------
     * FETCH RECORDS
     * ------------------------------------------------------
     */

    return Liability
        .find(query)

        .populate(
            "recordedBy",
            "name phone"
        )

        .populate(
            "substation",
            "name location"
        )

        .sort({
            createdAt: -1
        })

        .lean();

};