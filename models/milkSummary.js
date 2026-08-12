// ==========================================================
// models/milkSummary.js
// ==========================================================

const mongoose = require("mongoose");


// ==========================================================
// COW DAILY PRODUCTION
// ==========================================================
//
// One entry represents the total milk produced by one cow
// during the summary day.
//
// Example:
//
// cowProduction: [
//
//     {
//         dairy: ObjectId("..."),
//         cowCode: 24,
//         farmCode: -101,
//         liters: 18
//     }
//
// ]
// ==========================================================

const cowProductionSchema =
    new mongoose.Schema(

        {

            dairy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Dairy",

                required:
                    true

            },


            cowCode: {

                type:
                    Number,

                default:
                    null

            },


            farmCode: {

                type:
                    Number,

                required:
                    true

            },


            liters: {

                type:
                    Number,

                required:
                    true,

                min:
                    0,

                default:
                    0

            }

        },

        {

            _id:
                false

        }

    );


// ==========================================================
// FARM DAILY PRODUCTION
// ==========================================================
//
// One entry represents the total milk produced by an
// entire Dairy Farm during the summary day.
//
// Example:
//
// farmProduction: [
//
//     {
//         farm: ObjectId("..."),
//         farmCode: -101,
//         liters: 145
//     }
//
// ]
// ==========================================================

const farmProductionSchema =
    new mongoose.Schema(

        {

            farm: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Dairy",

                required:
                    true

            },


            farmCode: {

                type:
                    Number,

                required:
                    true

            },


            liters: {

                type:
                    Number,

                required:
                    true,

                min:
                    0,

                default:
                    0

            }

        },

        {

            _id:
                false

        }

    );


// ==========================================================
// DAILY SALE
// ==========================================================

const saleSchema =
    new mongoose.Schema(

        {

            customerName: {

                type:
                    String,

                required:
                    true,

                trim:
                    true

            },


            liters: {

                type:
                    Number,

                required:
                    true,

                min:
                    0

            },


            price: {

                type:
                    Number,

                required:
                    true,

                default:
                    50

            },


            cash: {

                type:
                    Number,

                required:
                    true,

                default:
                    0

            },


            standingOrderId: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "StandingOrder",

                default:
                    null

            },


            createdAt: {

                type:
                    Date,

                default:
                    Date.now

            }

        },

        {

            _id:
                false

        }

    );


// ==========================================================
// DAILY MILK SUMMARY
// ==========================================================

const milkSummarySchema =
    new mongoose.Schema(

        {

            // ==================================================
            // DAY
            // ==================================================

            day: {

                type:
                    String,

                required:
                    true,

                unique:
                    true,

                index:
                    true

            },


            // ==================================================
            // MONTH
            // ==================================================

            month: {

                type:
                    String,

                index:
                    true

            },


            // ==================================================
            // MILK PRICE
            // ==================================================

            price: {

                type:
                    Number,

                default:
                    50,

                min:
                    0

            },


            // ==================================================
            // TOTAL PRODUCED
            //
            // Total milk produced by all cows across all
            // Dairy Farms for this day.
            // ==================================================

            produced: {

                type:
                    Number,

                default:
                    0,

                min:
                    0

            },


            // ==================================================
            // TOTAL CONSUMED / SOLD
            // ==================================================

            consumed: {

                type:
                    Number,

                default:
                    0,

                min:
                    0

            },


            // ==================================================
            // AVAILABLE MILK
            // ==================================================

            available: {

                type:
                    Number,

                default:
                    0,

                min:
                    0

            },


            // ==================================================
            // TOTAL CASH
            // ==================================================

            cash: {

                type:
                    Number,

                default:
                    0,

                min:
                    0

            },


            // ==================================================
            // LOCK
            // ==================================================

            locked: {

                type:
                    Boolean,

                default:
                    false

            },


            // ==================================================
            // COW PRODUCTION
            // ==================================================

            cowProduction: {

                type:
                    [cowProductionSchema],

                default:
                    []

            },


            // ==================================================
            // FARM PRODUCTION
            // ==================================================

            farmProduction: {

                type:
                    [farmProductionSchema],

                default:
                    []

            },


            // ==================================================
            // SALES
            // ==================================================

            sales: {

                type:
                    [saleSchema],

                default:
                    []

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
// INDEX FARM PRODUCTION
// ==========================================================

milkSummarySchema.index({

    month:
        1

});


// ==========================================================
// EXPORT
// ==========================================================

const MilkSummary =
    mongoose.models.MilkSummary ||

    mongoose.model(
        "MilkSummary",
        milkSummarySchema
    );


module.exports =
    MilkSummary;