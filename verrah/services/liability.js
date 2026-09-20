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
    period,
    substation
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

            year:
                nextDay.getUTCFullYear(),

            month:
                nextDay.getUTCMonth() + 1,

            day:
                nextDay.getUTCDate()

        };

    }


    else if (period === "year") {

        startLocal = {

            year,

            month: 1,

            day: 1

        };


        endLocal = {

            year:
                year + 1,

            month: 1,

            day: 1

        };

    }


    else {

        /*
         * Default to month.
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

            year:
                nextMonth.getUTCFullYear(),

            month:
                nextMonth.getUTCMonth() + 1,

            day: 1

        };

    }


    /*
     * ------------------------------------------------------
     * CONVERT KENYA MIDNIGHT TO UTC
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
     * BASE QUERY
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
     * SUBSTATION FILTER
     * ------------------------------------------------------
     *
     * STAFF:
     *
     * Always restricted to their assigned substation.
     *
     *
     * ADMIN:
     *
     * If a substation was selected, filter by it.
     *
     * If no substation was selected, do NOT add a
     * substation condition. Therefore all substations
     * are returned.
     * ------------------------------------------------------
     */

    if (
        user &&
        user.role === "staff"
    ) {

        query.substation =
            user.assignedSubstation;

    }


    else if (
        user &&
        user.role === "admin" &&
        substation
    ) {

        query.substation =
            substation;

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