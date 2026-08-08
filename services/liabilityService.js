const Financial = require("../models/financials");


/* =========================================================
   EAT DATE HELPERS
========================================================= */

function getEATDateParts() {

    const now = new Date();

    const formatter = new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "Africa/Nairobi",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    );

    const parts = formatter.formatToParts(now);

    const values = {};

    for (const part of parts) {

        if (part.type !== "literal") {

            values[part.type] = part.value;

        }

    }

    return {

        day:
            `${values.year}-${values.month}-${values.day}`,

        month:
            `${values.year}-${values.month}`,

        year:
            Number(values.year)

    };

}


/* =========================================================
   CREATE LIABILITY
========================================================= */

exports.createLiability = async ({
    type,
    amount,
    description
}) => {

    const {
        day
    } = getEATDateParts();


    /* =====================================================
       FIND TODAY'S DAILY FINANCIAL RECORD
    ====================================================== */

    let financial =
        await Financial.findOne({

            periodType: "daily",

            day

        });


    /* =====================================================
       CREATE DAILY RECORD IF IT DOES NOT EXIST
    ====================================================== */

    if (!financial) {

        financial = new Financial({

            periodType: "daily",

            day,

            liability: [],

            liabilities: 0,

            maintenanceCost: 0,

            medicalCost: 0,

            milkCash: 0,

            totalExpenses: 0,

            profit: 0,

            locked: false

        });

    }


    /* =====================================================
       CREATE LIABILITY ENTRY
    ====================================================== */

    financial.liability.push({

        type,

        amount,

        description,

        /*
         * JavaScript Date represents the exact instant.
         * MongoDB stores it in UTC.
         * It will be displayed as EAT when retrieved.
         */
        time: new Date()

    });


    /* =====================================================
       RECALCULATE TOTAL LIABILITIES
    ====================================================== */

    const totalLiabilities =
        financial.liability.reduce(

            (total, item) => {

                return total +
                    (Number(item.amount) || 0);

            },

            0

        );


    financial.liabilities =
        totalLiabilities;


    /* =====================================================
       RECALCULATE TOTAL EXPENSES
    ====================================================== */

    financial.totalExpenses =

        (Number(financial.maintenanceCost) || 0)

        +

        (Number(financial.medicalCost) || 0)

        +

        totalLiabilities;


    /* =====================================================
       RECALCULATE PROFIT
    ====================================================== */

    financial.profit =

        (Number(financial.milkCash) || 0)

        -

        financial.totalExpenses;


    /* =====================================================
       SAVE
    ====================================================== */

    return financial.save();

};


/* =========================================================
   GET LIABILITY SUMMARY
========================================================= */

exports.getLiabilitySummary = async () => {

    const financialRecords =
        await Financial.find({

            "liability.0": {
                $exists: true
            }

        })
        .select("liability")
        .lean();


    /* =====================================================
       FLATTEN LIABILITY ENTRIES
    ====================================================== */

    const liabilities = [];


    for (
        const financial of financialRecords
    ) {

        if (
            !Array.isArray(
                financial.liability
            )
        ) {

            continue;

        }


        for (
            const liability
            of financial.liability
        ) {

            liabilities.push({

                _id: liability._id,

                type: liability.type,

                amount: liability.amount,

                description:
                    liability.description,

                time: liability.time

            });

        }

    }


    /* =====================================================
       NEWEST FIRST
    ====================================================== */

    liabilities.sort(
        (a, b) =>
            new Date(b.time) -
            new Date(a.time)
    );


    return liabilities;

};