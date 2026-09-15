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
     * DATE RANGE
     * ------------------------------------------------------
     *
     * The filter works against Liability.createdAt.
     *
     * day:
     *   only the selected date
     *
     * month:
     *   the entire selected month
     *
     * year:
     *   the entire selected year
     * ------------------------------------------------------
     */

    const selectedDate =
        new Date(`${date}T00:00:00`);


    if (Number.isNaN(selectedDate.getTime())) {

        return [];

    }


    let startDate;
    let endDate;


    if (period === "day") {

        startDate =
            new Date(selectedDate);

        endDate =
            new Date(selectedDate);

        endDate.setDate(
            endDate.getDate() + 1
        );

    }


    else if (period === "year") {

        startDate =
            new Date(
                selectedDate.getFullYear(),
                0,
                1
            );

        endDate =
            new Date(
                selectedDate.getFullYear() + 1,
                0,
                1
            );

    }


    else {

        /*
         * Default to month.
         */

        startDate =
            new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                1
            );

        endDate =
            new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth() + 1,
                1
            );

    }


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
     * Admin sees liabilities from all substations.
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