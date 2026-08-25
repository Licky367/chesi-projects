// ==========================================================
// models/milkSummary.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Stores one complete daily milk summary.
//
// THE SUMMARY STORES:
//
// • Total milk produced
// • Total farm production
// • Total milk consumed / sold
// • Total milk available
// • Total cash collected
// • Daily milk price
// • Individual cow production
// • Individual farm production
// • Individual sales
// • Farm-level sale allocations
// • Daily lock/finalization state
//
// IMPORTANT
// ----------------------------------------------------------
// day   = YYYY-MM-DD
// month = YYYY-MM
//
// FARM AVAILABILITY
// ----------------------------------------------------------
// A farm's available milk is:
//
//     farm production
//     - milk allocated/sold from that farm
//
// Overall availability is:
//
//     produced
//     - consumed
//
// `farmAllocations` is therefore an essential part of every
// sale record.
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
// DATE HELPERS
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
// NUMBER VALIDATOR
// ==========================================================

function isFiniteNumber(
    value
) {

    return Number.isFinite(
        value
    );

}


// ==========================================================
// COW DAILY PRODUCTION
// ==========================================================

const cowProductionSchema =
    new mongoose.Schema(

        {

            // ==================================================
            // ANIMAL
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

            _id:
                false

        }

    );


// ==========================================================
// FARM DAILY PRODUCTION
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
            // MILK PRODUCED BY FARM
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
// SALE FARM ALLOCATION
// ==========================================================
//
// Every sale explicitly records which farm supplied the milk.
//
// Example:
//
//     Customer = 20L
//
//     Farm A = 12L
//     Farm B = 8L
//
// This is what allows the system to calculate:
//
//     Farm A available
//     Farm B available
//
// independently.
//
// ==========================================================

const farmAllocationSchema =
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
            // LITERS DEDUCTED FROM FARM
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
                        "Allocated milk must be a valid number."

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
// A sale contains:
//
// • Customer
// • Total liters sold
// • Price
// • Cash
// • Farm allocations
// • Optional standing order
// • Creation time
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
            // TOTAL LITERS SOLD
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
            // FARM ALLOCATIONS
            // ==========================================================
            //
            // THIS FIELD IS ESSENTIAL.
            //
            // It records exactly how many liters came from
            // each farm.
            //
            // The milk-sales service uses this information to
            // calculate farm-level availability.
            //
            // ==========================================================

            farmAllocations: {

                type:
                    [farmAllocationSchema],

                default:
                    []

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
            // TOTAL MILK PRODUCED
            // ==========================================================
            //
            // Total production from all cows.
            //
            // Normally equals:
            //
            // cowProduction.reduce(...)
            //
            // ==========================================================

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
            // TOTAL FARM PRODUCTION
            // ==========================================================
            //
            // Sum of farmProduction[].liters.
            //
            // ==========================================================

            farmTotal: {

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
                        "Farm total milk must be a valid number."

                }

            },


            // ==================================================
            // TOTAL MILK SOLD / CONSUMED
            // ==========================================================
            //
            // Sum of sales[].liters.
            //
            // ==========================================================

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
            // TOTAL MILK AVAILABLE
            // ==========================================================
            //
            // Overall available milk:
            //
            //     produced - consumed
            //
            // This is the value used by the sales page as the
            // overall available milk.
            //
            // ==========================================================

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
            // ==========================================================

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
            // DAILY LOCK
            // ==========================================================

            locked: {

                type:
                    Boolean,

                default:
                    false,

                index:
                    true

            },


            // ==================================================
            // INDIVIDUAL COW PRODUCTION
            // ==========================================================

            cowProduction: {

                type:
                    [cowProductionSchema],

                default:
                    []

            },


            // ==================================================
            // FARM PRODUCTION
            // ==========================================================

            farmProduction: {

                type:
                    [farmProductionSchema],

                default:
                    []

            },


            // ==================================================
            // DAILY SALES
            // ==========================================================

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
// NORMALIZE MONTH FROM DAY
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
// NORMALIZE MONTH ON UPDATE
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


    if (
        Object.prototype.hasOwnProperty.call(
            update,
            "day"
        )
    ) {

        dayValue =
            update.day;

    }


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

            normalizeSummaryUpdate(
                this.getUpdate()
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

            normalizeSummaryUpdate(
                this.getUpdate()
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

            normalizeSummaryUpdate(
                this.getUpdate()
            );

            next();

        }

        catch (error) {

            next(error);

        }

    }
);


// ==========================================================
// CALCULATE SALES TOTALS
// ==========================================================
//
// Returns:
//
//     {
//         liters,
//         cash
//     }
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
// CALCULATE COW PRODUCTION
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
                    entry?.liters
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
// CALCULATE FARM PRODUCTION
// ==========================================================

milkSummarySchema.methods.calculateFarmTotal =
function() {

    const production =
        Array.isArray(
            this.farmProduction
        )
            ? this.farmProduction
            : [];


    return production.reduce(

        (
            total,
            entry
        ) => {

            const liters =
                Number(
                    entry?.liters
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
// GET FARM PRODUCED LITERS
// ==========================================================
//
// Returns the production belonging to one farm.
//
// ==========================================================

milkSummarySchema.methods.getFarmProduced =
function(
    farmId
) {

    if (
        !farmId ||
        !Array.isArray(
            this.farmProduction
        )
    ) {

        return 0;

    }


    const targetId =
        farmId.toString();


    const entry =
        this.farmProduction.find(
            item =>
                item?.farm &&
                item.farm.toString() ===
                    targetId
        );


    if (!entry) {

        return 0;

    }


    const liters =
        Number(
            entry.liters
        );


    return Number.isFinite(
        liters
    )
        ? liters
        : 0;

};


// ==========================================================
// GET FARM SOLD LITERS
// ==========================================================
//
// Calculates how much milk has already been allocated from
// one farm across ALL sales.
//
// ==========================================================

milkSummarySchema.methods.getFarmSold =
function(
    farmId
) {

    if (
        !farmId ||
        !Array.isArray(
            this.sales
        )
    ) {

        return 0;

    }


    const targetId =
        farmId.toString();


    let total =
        0;


    for (
        const sale
        of this.sales
    ) {

        if (
            !Array.isArray(
                sale?.farmAllocations
            )
        ) {

            continue;

        }


        for (
            const allocation
            of sale.farmAllocations
        ) {

            if (
                !allocation?.farm
            ) {

                continue;

            }


            if (
                allocation.farm.toString() !==
                targetId
            ) {

                continue;

            }


            const liters =
                Number(
                    allocation.liters
                );


            if (
                Number.isFinite(
                    liters
                ) &&
                liters >= 0
            ) {

                total +=
                    liters;

            }

        }

    }


    return total;

};


// ==========================================================
// GET FARM AVAILABLE LITERS
// ==========================================================
//
// Farm available:
//
//     farmProduction - all farm allocations
//
// Never returns a negative number.
//
// ==========================================================

milkSummarySchema.methods.getFarmAvailable =
function(
    farmId
) {

    const produced =
        this.getFarmProduced(
            farmId
        );


    const sold =
        this.getFarmSold(
            farmId
        );


    return Math.max(

        0,

        produced -
        sold

    );

};


// ==========================================================
// GET ALL FARM AVAILABILITY
// ==========================================================
//
// Returns:
//
// [
//     {
//         farm,
//         farmCode,
//         produced,
//         sold,
//         available
//     }
// ]
//
// ==========================================================

milkSummarySchema.methods.getFarmAvailability =
function() {

    const production =
        Array.isArray(
            this.farmProduction
        )
            ? this.farmProduction
            : [];


    return production.map(
        entry => {

            const farmId =
                entry?.farm
                    ? entry.farm
                    : null;


            const produced =
                Number(
                    entry?.liters
                );


            const safeProduced =
                Number.isFinite(
                    produced
                )
                    ? produced
                    : 0;


            const sold =
                farmId
                    ? this.getFarmSold(
                        farmId
                    )
                    : 0;


            return {

                farm:
                    farmId,

                farmCode:
                    entry?.farmCode ?? null,

                produced:
                    safeProduced,

                sold,

                available:
                    Math.max(
                        0,
                        safeProduced - sold
                    )

            };

        }
    );

};


// ==========================================================
// CALCULATE OVERALL AVAILABLE
// ==========================================================
//
//     produced - consumed
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

        produced -
        consumed

    );

};


// ==========================================================
// RECALCULATE TOTALS
// ==========================================================
//
// Keeps:
//
//     produced
//     farmTotal
//     consumed
//     available
//     cash
//
// synchronized with the embedded records.
//
// ==========================================================

milkSummarySchema.methods.recalculateTotals =
function() {

    const productionTotal =
        this.calculateProductionTotal();


    const farmTotal =
        this.calculateFarmTotal();


    const salesTotals =
        this.calculateSalesTotals();


    this.produced =
        productionTotal;


    this.farmTotal =
        farmTotal;


    this.consumed =
        salesTotals.liters;


    this.cash =
        salesTotals.cash;


    this.available =
        this.calculateAvailable();


    return this;

};


// ==========================================================
// MONTHLY INDEX
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
// FARM PRODUCTION LOOKUP INDEX
// ==========================================================
//
// Helps MongoDB when querying embedded farm production
// references.
//
// ==========================================================

milkSummarySchema.index(

    {

        "farmProduction.farm":
            1,

        day:
            1

    },

    {

        name:
            "farm_production_day_lookup"

    }

);


// ==========================================================
// FARM ALLOCATION LOOKUP INDEX
// ==========================================================
//
// Useful when querying summaries containing allocations
// belonging to a particular farm.
//
// ==========================================================

milkSummarySchema.index(

    {

        "sales.farmAllocations.farm":
            1,

        day:
            1

    },

    {

        name:
            "farm_sales_allocation_day_lookup"

    }

);


// ==========================================================
// MODEL
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