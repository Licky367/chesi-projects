// ==========================================================
// models/milkSummary.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Stores one complete daily milk summary.
//
// A summary contains:
//
// • Total milk produced
// • Total milk consumed/sold
// • Available milk
// • Total cash collected
// • Milk price for the day
// • Individual cow production
// • Individual farm production
// • Daily sales
// • Daily lock/finalization state
//
// IMPORTANT
// ----------------------------------------------------------
// `day` is always:
//
//     YYYY-MM-DD
//
// and `month` is always:
//
//     YYYY-MM
//
// `month` is derived from `day`.
//
// ==========================================================


const mongoose =
    require("mongoose");


// ==========================================================
// CONSTANTS
// ==========================================================

const DAY_PATTERN =
    /^\d{4}-\d{2}-\d{2}$/;

const MONTH_PATTERN =
    /^\d{4}-\d{2}$/;


// ==========================================================
// DATE KEY HELPERS
// ==========================================================
//
// Summary documents work with calendar keys rather than
// JavaScript timestamps.
//
// This is intentional because milk reporting uses the
// Africa/Nairobi calendar day.
//
// ==========================================================

function getMonthFromDay(day) {

    if (
        typeof day !== "string" ||
        !DAY_PATTERN.test(day)
    ) {

        throw new Error(
            "Invalid summary day. Expected YYYY-MM-DD."
        );

    }


    // --------------------------------------------------------
    // Validate the actual calendar date.
    // --------------------------------------------------------

    const [
        year,
        month,
        date
    ] =
        day
            .split("-")
            .map(Number);


    const testDate =
        new Date(
            Date.UTC(
                year,
                month - 1,
                date
            )
        );


    if (
        testDate.getUTCFullYear() !== year ||
        testDate.getUTCMonth() !== month - 1 ||
        testDate.getUTCDate() !== date
    ) {

        throw new Error(
            "Invalid calendar date."
        );

    }


    return day.slice(
        0,
        7
    );

}


// ==========================================================
// FINITE NUMBER VALIDATOR
// ==========================================================
//
// Mongoose's `min` validator does not by itself communicate
// the intention that a value must be a real finite number.
//
// This helper is used throughout the schemas.
//
// ==========================================================

function isFiniteNumber(value) {

    return Number.isFinite(
        value
    );

}


// ==========================================================
// COW DAILY PRODUCTION
// ==========================================================
//
// One entry represents the total milk produced by one cow
// during the summary day.
//
// Example:
//
// {
//     dairy: ObjectId("..."),
//     cowCode: 24,
//     farmCode: -101,
//     liters: 18
// }
//
// ==========================================================

const cowProductionSchema =
    new mongoose.Schema(

        {

            // ==================================================
            // COW / ANIMAL
            // ==================================================

            dairy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Dairy",

                required:
                    true

            },


            // ==================================================
            // COW CODE
            // ==================================================

            cowCode: {

                type:
                    Number,

                default:
                    null,

                validate: {

                    validator:
                        function(value) {

                            return (
                                value === null ||
                                isFiniteNumber(value)
                            );

                        },

                    message:
                        "Cow code must be a valid number."

                }

            },


            // ==================================================
            // FARM CODE
            // ==================================================

            farmCode: {

                type:
                    Number,

                required:
                    true,

                validate: {

                    validator:
                        isFiniteNumber,

                    message:
                        "Farm code must be a valid number."

                }

            },


            // ==================================================
            // MILK PRODUCED
            // ==================================================

            liters: {

                type:
                    Number,

                required:
                    true,

                default:
                    0,

                min:
                    0,

                validate: {

                    validator:
                        isFiniteNumber,

                    message:
                        "Cow milk production must be a valid number."

                }

            }

        },

        {

            // These are embedded summary entries, not
            // independent MongoDB documents.

            _id:
                false

        }

    );


// ==========================================================
// FARM DAILY PRODUCTION
// ==========================================================
//
// One entry represents the total milk produced by a farm
// during the summary day.
//
// Example:
//
// {
//     farm: ObjectId("..."),
//     farmCode: -101,
//     liters: 145
// }
//
// ==========================================================

const farmProductionSchema =
    new mongoose.Schema(

        {

            // ==================================================
            // FARM
            // ==================================================

            farm: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Dairy",

                required:
                    true

            },


            // ==================================================
            // FARM CODE
            // ==================================================

            farmCode: {

                type:
                    Number,

                required:
                    true,

                validate: {

                    validator:
                        isFiniteNumber,

                    message:
                        "Farm code must be a valid number."

                }

            },


            // ==================================================
            // FARM MILK PRODUCTION
            // ==================================================

            liters: {

                type:
                    Number,

                required:
                    true,

                default:
                    0,

                min:
                    0,

                validate: {

                    validator:
                        isFiniteNumber,

                    message:
                        "Farm milk production must be a valid number."

                }

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
//
// Represents one sale recorded against the daily summary.
//
// ==========================================================

const saleSchema =
    new mongoose.Schema(

        {

            // ==================================================
            // CUSTOMER
            // ==================================================

            customerName: {

                type:
                    String,

                required:
                    true,

                trim:
                    true,

                minlength:
                    1

            },


            // ==================================================
            // LITERS SOLD
            // ==================================================

            liters: {

                type:
                    Number,

                required:
                    true,

                min:
                    0,

                validate: {

                    validator:
                        isFiniteNumber,

                    message:
                        "Sale quantity must be a valid number."

                }

            },


            // ==================================================
            // PRICE PER LITER
            // ==================================================

            price: {

                type:
                    Number,

                required:
                    true,

                default:
                    50,

                min:
                    0,

                validate: {

                    validator:
                        isFiniteNumber,

                    message:
                        "Sale price must be a valid number."

                }

            },


            // ==================================================
            // CASH RECEIVED
            // ==================================================

            cash: {

                type:
                    Number,

                required:
                    true,

                default:
                    0,

                min:
                    0,

                validate: {

                    validator:
                        isFiniteNumber,

                    message:
                        "Sale cash must be a valid number."

                }

            },


            // ==================================================
            // STANDING ORDER
            // ==================================================

            standingOrderId: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "StandingOrder",

                default:
                    null

            },


            // ==================================================
            // SALE CREATION DATE
            // ==================================================

            createdAt: {

                type:
                    Date,

                default:
                    Date.now

            }

        },

        {

            // Sales are embedded inside the daily summary and
            // therefore do not need their own MongoDB _id.

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
            //
            // Format:
            //
            // YYYY-MM-DD
            //
            // Exactly one summary is allowed per day.
            //
            // ==================================================

            day: {

                type:
                    String,

                required:
                    true,

                unique:
                    true,

                index:
                    true,

                validate: {

                    validator:
                        function(value) {

                            if (
                                typeof value !==
                                "string" ||
                                !DAY_PATTERN.test(value)
                            ) {

                                return false;

                            }


                            try {

                                getMonthFromDay(
                                    value
                                );

                                return true;

                            }

                            catch {

                                return false;

                            }

                        },

                    message:
                        "Day must be a valid date in YYYY-MM-DD format."

                }

            },


            // ==================================================
            // MONTH
            // ==================================================
            //
            // Derived automatically from `day`.
            //
            // ==================================================

            month: {

                type:
                    String,

                index:
                    true,

                validate: {

                    validator:
                        function(value) {

                            return (
                                value === undefined ||
                                value === null ||
                                MONTH_PATTERN.test(value)
                            );

                        },

                    message:
                        "Month must use YYYY-MM format."

                }

            },


            // ==================================================
            // MILK PRICE
            // ==================================================
            //
            // Default farm/customer milk price for this day.
            //
            // Individual sales may override this through their
            // own `price` field.
            //
            // ==================================================

            price: {

                type:
                    Number,

                default:
                    50,

                min:
                    0,

                validate: {

                    validator:
                        isFiniteNumber,

                    message:
                        "Milk price must be a valid number."

                }

            },


            // ==================================================
            // TOTAL PRODUCED
            // ==================================================
            //
            // Total milk produced by all cows across all farms
            // during this day.
            //
            // ==================================================

            produced: {

                type:
                    Number,

                default:
                    0,

                min:
                    0,

                validate: {

                    validator:
                        isFiniteNumber,

                    message:
                        "Produced milk must be a valid number."

                }

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
                    0,

                validate: {

                    validator:
                        isFiniteNumber,

                    message:
                        "Consumed milk must be a valid number."

                }

            },


            // ==================================================
            // AVAILABLE MILK
            // ==================================================
            //
            // Normally:
            //
            // available = produced - consumed
            //
            // The service layer should calculate this value.
            //
            // It remains stored because summaries should be
            // fast to read without recalculating all sales and
            // production records.
            //
            // ==================================================

            available: {

                type:
                    Number,

                default:
                    0,

                min:
                    0,

                validate: {

                    validator:
                        isFiniteNumber,

                    message:
                        "Available milk must be a valid number."

                }

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
                    0,

                validate: {

                    validator:
                        isFiniteNumber,

                    message:
                        "Cash total must be a valid number."

                }

            },


            // ==================================================
            // LOCK / FINALIZATION
            // ==================================================
            //
            // false:
            //     summary may still be modified.
            //
            // true:
            //     summary has been finalized/locked.
            //
            // ==================================================

            locked: {

                type:
                    Boolean,

                default:
                    false,

                index:
                    true

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

            // ==================================================
            // CREATED / UPDATED TIMESTAMPS
            // ==================================================

            timestamps:
                true,


            // ==================================================
            // KEEP EMPTY OBJECTS
            // ==================================================

            minimize:
                false

        }

    );


// ==========================================================
// NORMALIZE MONTH
// ==========================================================
//
// The month must always correspond to the summary day.
//
// This prevents:
//
//     day   = 2026-08-12
//     month = 2026-07
//
// from accidentally being stored.
//
// ==========================================================

milkSummarySchema.pre(
    "validate",
    function(next) {

        try {

            if (
                this.day
            ) {

                this.month =
                    getMonthFromDay(
                        this.day
                    );

            }


            next();

        }

        catch (error) {

            next(error);

        }

    }
);


// ==========================================================
// UPDATE MONTH WHEN DAY CHANGES
// ==========================================================
//
// Handles:
//
//     updateOne()
//     updateMany()
//     findOneAndUpdate()
//     findByIdAndUpdate()
//
// ==========================================================

function normalizeSummaryUpdate(
    update
) {

    if (
        !update ||
        typeof update !== "object"
    ) {

        return;

    }


    let dayValue =
        null;


    // --------------------------------------------------------
    // Direct update:
    //
    // { day: "2026-08-12" }
    // --------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            update,
            "day"
        )
    ) {

        dayValue =
            update.day;

    }


    // --------------------------------------------------------
    // $set update:
    //
    // { $set: { day: "2026-08-12" } }
    // --------------------------------------------------------

    else if (
        update.$set &&
        Object.prototype.hasOwnProperty.call(
            update.$set,
            "day"
        )
    ) {

        dayValue =
            update.$set.day;

    }


    // --------------------------------------------------------
    // No day change.
    // --------------------------------------------------------

    if (
        dayValue === null ||
        dayValue === undefined
    ) {

        return;

    }


    const month =
        getMonthFromDay(
            dayValue
        );


    // --------------------------------------------------------
    // Ensure $set exists.
    // --------------------------------------------------------

    if (
        !update.$set
    ) {

        update.$set =
            {};

    }


    update.$set.month =
        month;

}


// ==========================================================
// FIND ONE AND UPDATE
// ==========================================================

milkSummarySchema.pre(
    "findOneAndUpdate",
    function(next) {

        try {

            const update =
                this.getUpdate();


            normalizeSummaryUpdate(
                update
            );


            next();

        }

        catch (error) {

            next(error);

        }

    }
);


// ==========================================================
// UPDATE ONE
// ==========================================================

milkSummarySchema.pre(
    "updateOne",
    function(next) {

        try {

            const update =
                this.getUpdate();


            normalizeSummaryUpdate(
                update
            );


            next();

        }

        catch (error) {

            next(error);

        }

    }
);


// ==========================================================
// UPDATE MANY
// ==========================================================

milkSummarySchema.pre(
    "updateMany",
    function(next) {

        try {

            const update =
                this.getUpdate();


            normalizeSummaryUpdate(
                update
            );


            next();

        }

        catch (error) {

            next(error);

        }

    }
);


// ==========================================================
// DAILY TOTAL HELPER
// ==========================================================
//
// Calculates the total liters represented by the embedded
// sales array.
//
// This is useful when the service needs to rebuild the
// consumed/cash figures from the stored sales.
//
// ==========================================================

milkSummarySchema.methods.calculateSalesTotals =
function() {

    const sales =
        Array.isArray(
            this.sales
        )
            ? this.sales
            : [];


    let liters =
        0;

    let cash =
        0;


    for (
        const sale of sales
    ) {

        const saleLiters =
            Number(
                sale.liters
            );


        const saleCash =
            Number(
                sale.cash
            );


        if (
            Number.isFinite(
                saleLiters
            )
        ) {

            liters +=
                saleLiters;

        }


        if (
            Number.isFinite(
                saleCash
            )
        ) {

            cash +=
                saleCash;

        }

    }


    return {

        liters,

        cash

    };

};


// ==========================================================
// PRODUCTION TOTAL HELPER
// ==========================================================
//
// Calculates total production from cowProduction.
//
// This provides a way for the service layer to verify that
// the summary's `produced` field agrees with its embedded
// production records.
//
// ==========================================================

milkSummarySchema.methods.calculateProductionTotal =
function() {

    const production =
        Array.isArray(
            this.cowProduction
        )
            ? this.cowProduction
            : [];


    return production.reduce(

        (
            total,
            entry
        ) => {

            const liters =
                Number(
                    entry.liters
                );


            if (
                !Number.isFinite(
                    liters
                )
            ) {

                return total;

            }


            return (
                total +
                liters
            );

        },

        0

    );

};


// ==========================================================
// AVAILABLE MILK HELPER
// ==========================================================
//
// Calculates:
//
//     produced - consumed
//
// Never returns a negative value.
//
// ==========================================================

milkSummarySchema.methods.calculateAvailable =
function() {

    const produced =
        Number(
            this.produced || 0
        );


    const consumed =
        Number(
            this.consumed || 0
        );


    if (
        !Number.isFinite(produced) ||
        !Number.isFinite(consumed)
    ) {

        return 0;

    }


    return Math.max(
        0,
        produced - consumed
    );

};


// ==========================================================
// MONTHLY INDEX
// ==========================================================
//
// Useful for monthly milk reports.
//
// ==========================================================

milkSummarySchema.index(

    {

        month:
            1,

        day:
            1

    },

    {

        name:
            "month_day_lookup"

    }

);


// ==========================================================
// LOCKED SUMMARY INDEX
// ==========================================================
//
// Useful when looking for finalized/unfinalized summaries.
//
// ==========================================================

milkSummarySchema.index(

    {

        locked:
            1,

        day:
            -1

    },

    {

        name:
            "locked_day_lookup"

    }

);


// ==========================================================
// MODEL
// ==========================================================
//
// Prevents OverwriteModelError during development/hot reload.
//
// ==========================================================

const MilkSummary =
    mongoose.models.MilkSummary ||
    mongoose.model(
        "MilkSummary",
        milkSummarySchema
    );


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    MilkSummary;