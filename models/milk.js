// ==========================================================
// models/milk.js
// ==========================================================

const mongoose = require("mongoose");


// ==========================================================
// MAIN MILK SCHEMA
// ==========================================================

const milkSchema = new mongoose.Schema(

    {

        // ==================================================
        // COW / ANIMAL
        //
        // This references the individual animal that
        // produced the milk.
        // ==================================================

        dairy: {

            type:
                mongoose.Schema.Types.ObjectId,

            ref:
                "Dairy",

            required:
                true,

            index:
                true

        },


        // ==================================================
        // WHO RECORDED IT
        // ==================================================

        recordedBy: {

            type:
                mongoose.Schema.Types.ObjectId,

            ref:
                "User",

            default:
                null,

            index:
                true

        },


        // ==================================================
        // RECORDER TYPE
        // ==================================================

        recordedByType: {

            type:
                String,

            enum: [
                "user",
                "system"
            ],

            default:
                "user",

            index:
                true

        },


        // ==================================================
        // BACKWARDS COMPATIBILITY
        //
        // Existing service code may still use
        // recordedBySystem.
        // ==================================================

        recordedBySystem: {

            type:
                Boolean,

            default:
                false

        },


        // ==================================================
        // MILK QUANTITY
        // ==================================================

        liters: {

            type:
                Number,

            required:
                true,

            min:
                0

        },


        // ==================================================
        // REMARKS
        // ==================================================

        remarks: {

            type:
                String,

            default:
                "",

            trim:
                true

        },


        // ==================================================
        // DATE
        // ==================================================

        date: {

            type:
                Date,

            default:
                Date.now,

            index:
                true

        },


        // ==================================================
        // KENYA DAY
        //
        // YYYY-MM-DD
        // ==================================================

        day: {

            type:
                String,

            index:
                true

        },


        // ==================================================
        // KENYA MONTH
        //
        // YYYY-MM
        // ==================================================

        month: {

            type:
                String,

            index:
                true

        },


        // ==================================================
        // MILKING SESSION
        // ==================================================

        session: {

            type:
                String,

            enum: [
                "morning",
                "evening"
            ],

            required:
                true,

            index:
                true

        }

    },

    {

        timestamps:
            true,

        minimize:
            false

    }

);


// ==========================================================
// NORMALIZE RECORDER TYPE
// ==========================================================

milkSchema.pre(
    "validate",
    function(next) {

        if (
            this.recordedBySystem === true
        ) {

            this.recordedByType =
                "system";

        }

        else {

            this.recordedByType =
                "user";

        }


        next();

    }
);


// ==========================================================
// NORMALIZE DATE KEYS
//
// AFRICA/NAIROBI
// ==========================================================

milkSchema.pre(
    "save",
    function(next) {

        const d =
            new Date(
                this.date
            );


        const formatter =
            new Intl.DateTimeFormat(
                "en-CA",
                {

                    timeZone:
                        "Africa/Nairobi",

                    year:
                        "numeric",

                    month:
                        "2-digit",

                    day:
                        "2-digit"

                }
            );


        const day =
            formatter.format(d);


        this.day =
            day;


        this.month =
            day.slice(0, 7);


        next();

    }
);


// ==========================================================
// DAILY REPORT
// ==========================================================

milkSchema.statics.getDailyReport =
async function(day) {

    const records =
        await this.find({

            day

        })

        .populate(
            "dairy"
        )

        .populate(
            "recordedBy",
            "name"
        )

        .lean();


    const total =
        records.reduce(

            (
                sum,
                record
            ) =>

                sum +
                Number(
                    record.liters ||
                    0
                ),

            0

        );


    return {

        records,

        stats: {

            total

        }

    };

};


// ==========================================================
// MONTHLY REPORT
// ==========================================================

milkSchema.statics.getMonthlyReport =
async function(month) {

    const grouped =
        await this.aggregate([

            {

                $match: {

                    month

                }

            },

            {

                $group: {

                    _id:
                        "$dairy",

                    total: {

                        $sum:
                            "$liters"

                    },

                    days: {

                        $addToSet:
                            "$day"

                    }

                }

            },

            {

                $project: {

                    _id:
                        0,

                    dairy:
                        "$_id",

                    total:
                        1,

                    avg: {

                        $cond: [

                            {

                                $gt: [

                                    {
                                        $size:
                                            "$days"
                                    },

                                    0

                                ]

                            },

                            {

                                $divide: [

                                    "$total",

                                    {
                                        $size:
                                            "$days"
                                    }

                                ]

                            },

                            0

                        ]

                    }

                }

            }

        ]);


    return {

        records:
            grouped

    };

};


// ==========================================================
// INDEXES
// ==========================================================

// One morning record and one evening record
// per cow per day.

milkSchema.index(

    {

        dairy:
            1,

        day:
            1,

        session:
            1

    },

    {

        unique:
            true

    }

);


// ==========================================================
// MONTHLY COW LOOKUP
// ==========================================================

milkSchema.index({

    dairy:
        1,

    month:
        1

});


// ==========================================================
// DATE LOOKUP
// ==========================================================

milkSchema.index({

    date:
        -1

});


// ==========================================================
// DAY LOOKUP
// ==========================================================

milkSchema.index({

    day:
        1

});


// ==========================================================
// MODEL
// ==========================================================

const Milk =
    mongoose.models.Milk ||

    mongoose.model(
        "Milk",
        milkSchema
    );


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    Milk;