// ==========================================================
// services/milkSalesService.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Handles milk sales business logic.
//
// IMPORTANT AVAILABILITY RULE
// ----------------------------------------------------------
//
// Overall:
//     available = total production - total sold
//
// Farm:
//     available = farm production - farm sold
//
// Farm sold is NOT stored as farmProduction[].sold in MongoDB.
//
// It is calculated from:
//
//     summary.sales[].farmAllocations[]
//
// The service enriches farmProduction for the sales page with:
//
//     sold
//     available
//
// so the view does not need to reconstruct farm availability.
//
// ==========================================================


const mongoose =
    require("mongoose");


const Dairy =
    require("../models/dairy");


const MilkSummary =
    require("../models/milkSummary");


const NAIROBI_TIMEZONE =
    "Africa/Nairobi";


// ==========================================================
// GET NAIROBI DAY
// ==========================================================

function getNairobiDay(
    date = new Date()
) {

    const formatter =
        new Intl.DateTimeFormat(
            "en-CA",
            {

                timeZone:
                    NAIROBI_TIMEZONE,

                year:
                    "numeric",

                month:
                    "2-digit",

                day:
                    "2-digit"

            }
        );


    const parts =
        formatter.formatToParts(
            date
        );


    const result =
        {};


    parts.forEach(
        part => {

            if (
                part.type !==
                "literal"
            ) {

                result[
                    part.type
                ] =
                    part.value;

            }

        }
    );


    return [

        result.year,

        result.month,

        result.day

    ].join(
        "-"
    );

}


// ==========================================================
// NUMBER
// ==========================================================

function toNumber(
    value
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return null;

    }


    const number =
        Number(
            value
        );


    return Number.isFinite(
        number
    )

        ? number

        : null;

}


// ==========================================================
// ROUND
// ==========================================================

function round(
    value
) {

    const number =
        Number(
            value
        );


    if (
        !Number.isFinite(
            number
        )
    ) {

        return 0;

    }


    return Math.round(
        number * 100
    ) / 100;

}


// ==========================================================
// USER ROLE
// ==========================================================

function isAdmin(
    user
) {

    return (
        user &&
        user.role ===
            "admin"
    );

}


function isDairyWorker(
    user
) {

    return (
        user &&
        user.role ===
            "dairyWorker"
    );

}


// ==========================================================
// ASSIGNED FARM IDS
// ==========================================================

function getAssignedFarmIds(
    user
) {

    if (
        !user ||
        !Array.isArray(
            user.assignedFarm
        )
    ) {

        return [];

    }


    return user.assignedFarm

        .filter(
            id =>
                mongoose.isValidObjectId(
                    id
                )
        )

        .map(
            id =>
                id.toString()
        );

}


// ==========================================================
// GET VISIBLE FARMS
//
// ADMIN:
//     All farms
//
// DAIRY WORKER:
//     Assigned farms only
//
// ==========================================================

async function getVisibleFarms(
    user
) {

    // ======================================================
    // ADMIN
    // ======================================================

    if (
        isAdmin(user)
    ) {

        return Dairy.find({

            code: {
                $lt: 0
            }

        })

        .sort({

            code: 1

        })

        .lean();

    }


    // ======================================================
    // DAIRY WORKER
    // ======================================================

    if (
        isDairyWorker(user)
    ) {

        const assignedFarmIds =
            getAssignedFarmIds(
                user
            );


        if (
            assignedFarmIds.length === 0
        ) {

            return [];

        }


        return Dairy.find({

            _id: {

                $in:
                    assignedFarmIds

            },

            code: {
                $lt: 0
            }

        })

        .sort({

            code: 1

        })

        .lean();

    }


    return [];

}


// ==========================================================
// GET SUMMARY
// ==========================================================

async function getSummary(
    day
) {

    let summary =
        await MilkSummary.findOne({

            day

        })

        .lean();


    if (!summary) {

        summary =
            {

                day,

                month:
                    day.slice(
                        0,
                        7
                    ),

                price:
                    50,

                produced:
                    0,

                farmTotal:
                    0,

                consumed:
                    0,

                available:
                    0,

                cash:
                    0,

                farmProduction:
                    [],

                sales:
                    []

            };

    }


    return summary;

}


// ==========================================================
// FARM SOLD MAP
// ==========================================================
//
// Builds:
//
//     farmId -> total liters sold
//
// from:
//
//     summary.sales[].farmAllocations[]
//
// This is the authoritative source for farm-level sold milk.
//
// ==========================================================

function getFarmSalesMap(
    summary
) {

    const map =
        new Map();


    const sales =
        Array.isArray(
            summary?.sales
        )

            ? summary.sales

            : [];


    for (
        const sale
        of sales
    ) {

        if (
            !sale ||
            !Array.isArray(
                sale.farmAllocations
            )
        ) {

            continue;

        }


        for (
            const allocation
            of sale.farmAllocations
        ) {

            if (
                !allocation ||
                !allocation.farm
            ) {

                continue;

            }


            const farmId =
                allocation.farm.toString();


            const liters =
                toNumber(
                    allocation.liters
                );


            if (
                liters === null ||
                liters < 0
            ) {

                continue;

            }


            map.set(

                farmId,

                round(

                    (
                        map.get(
                            farmId
                        ) ||
                        0
                    ) +

                    liters

                )

            );

        }

    }


    return map;

}


// ==========================================================
// GET FARM PRODUCED LITERS
// ==========================================================

function getFarmProducedLiters(
    summary,
    farmId
) {

    const production =
        Array.isArray(
            summary?.farmProduction
        )

            ? summary.farmProduction

            : [];


    const targetFarmId =
        farmId &&
        farmId.toString
            ? farmId.toString()
            : "";


    if (!targetFarmId) {

        return 0;

    }


    const entry =
        production.find(
            item => {

                if (
                    !item ||
                    !item.farm
                ) {

                    return false;

                }


                return (
                    item.farm.toString() ===
                    targetFarmId
                );

            }
        );


    if (!entry) {

        return 0;

    }


    const liters =
        toNumber(
            entry.liters
        );


    return liters === null
        ? 0
        : round(
            liters
        );

}


// ==========================================================
// GET FARM SOLD LITERS
// ==========================================================

function getFarmSoldLiters(
    summary,
    farmId
) {

    if (
        !farmId
    ) {

        return 0;

    }


    const salesMap =
        getFarmSalesMap(
            summary
        );


    const farmIdString =
        farmId.toString();


    const sold =
        salesMap.get(
            farmIdString
        );


    return sold === undefined
        ? 0
        : round(
            sold
        );

}


// ==========================================================
// GET FARM AVAILABLE
// ==========================================================
//
// RULE:
//
//     farm.available
//         = farm.production
//         - farm.sold
//
// Never return a negative value.
//
// ==========================================================

function getFarmAvailable(
    summary,
    farmId
) {

    const produced =
        getFarmProducedLiters(
            summary,
            farmId
        );


    const sold =
        getFarmSoldLiters(
            summary,
            farmId
        );


    return Math.max(

        0,

        round(
            produced -
            sold
        )

    );

}


// ==========================================================
// ENRICH FARM PRODUCTION
// ==========================================================
//
// Converts:
//
//     farmProduction[]
//
// from:
//
//     {
//         farm,
//         farmCode,
//         liters
//     }
//
// into:
//
//     {
//         farm,
//         farmCode,
//         liters,
//         sold,
//         available
//     }
//
// `sold` and `available` are derived values.
// They are NOT persisted into MongoDB.
//
// ==========================================================

function buildFarmProductionWithAvailability(
    summary
) {

    const production =
        Array.isArray(
            summary?.farmProduction
        )

            ? summary.farmProduction

            : [];


    const salesMap =
        getFarmSalesMap(
            summary
        );


    return production.map(
        entry => {

            if (
                !entry
            ) {

                return null;

            }


            const farmId =
                entry.farm &&
                entry.farm.toString
                    ? entry.farm.toString()
                    : "";


            const producedValue =
                toNumber(
                    entry.liters
                );


            const produced =
                producedValue === null
                    ? 0
                    : round(
                        producedValue
                    );


            const sold =
                farmId
                    ? round(
                        salesMap.get(
                            farmId
                        ) || 0
                    )
                    : 0;


            const available =
                Math.max(

                    0,

                    round(
                        produced -
                        sold
                    )

                );


            return {

                ...entry,

                liters:
                    produced,

                sold,

                available

            };

        }
    )

    .filter(
        Boolean
    );

}


// ==========================================================
// GET TOTAL PRODUCTION
// ==========================================================
//
// Uses farm production when available.
//
// This is especially useful for the sales page because
// farm-level production is exactly what is being allocated.
//
// ==========================================================

function getTotalFarmProduction(
    summary
) {

    const production =
        Array.isArray(
            summary?.farmProduction
        )

            ? summary.farmProduction

            : [];


    return round(

        production.reduce(

            (
                total,
                entry
            ) => {

                const liters =
                    toNumber(
                        entry?.liters
                    );


                if (
                    liters === null
                ) {

                    return total;

                }


                return (
                    total +
                    liters
                );

            },

            0

        )

    );

}


// ==========================================================
// GET TOTAL SOLD
// ==========================================================
//
// Uses the actual sales records.
//
// ==========================================================

function getTotalSold(
    summary
) {

    const sales =
        Array.isArray(
            summary?.sales
        )

            ? summary.sales

            : [];


    return round(

        sales.reduce(

            (
                total,
                sale
            ) => {

                const liters =
                    toNumber(
                        sale?.liters
                    );


                if (
                    liters === null ||
                    liters < 0
                ) {

                    return total;

                }


                return (
                    total +
                    liters
                );

            },

            0

        )

    );

}


// ==========================================================
// GET TOTAL CASH
// ==========================================================

function getTotalCash(
    summary
) {

    const sales =
        Array.isArray(
            summary?.sales
        )

            ? summary.sales

            : [];


    return round(

        sales.reduce(

            (
                total,
                sale
            ) => {

                const cash =
                    toNumber(
                        sale?.cash
                    );


                if (
                    cash === null ||
                    cash < 0
                ) {

                    return total;

                }


                return (
                    total +
                    cash
                );

            },

            0

        )

    );

}


// ==========================================================
// RECALCULATE SUMMARY AVAILABILITY
// ==========================================================
//
// Overall rule:
//
//     available
//         = production
//         - sold
//
// Production source:
//
//     farmProduction
//
// Sold source:
//
//     sales
//
// ==========================================================

function calculateSummaryAvailability(
    summary
) {

    const farmProduction =
        getTotalFarmProduction(
            summary
        );


    const totalSold =
        getTotalSold(
            summary
        );


    const available =
        Math.max(

            0,

            round(

                farmProduction -
                totalSold

            )

        );


    return {

        produced:
            farmProduction,

        consumed:
            totalSold,

        available

    };

}


// ==========================================================
// PREPARE SALES SUMMARY
// ==========================================================
//
// This creates the complete summary object used by the
// milk sales page.
//
// It does NOT save the calculated values.
//
// ==========================================================

function prepareSalesSummary(
    summary
) {

    const farmProduction =
        buildFarmProductionWithAvailability(
            summary
        );


    const totals =
        calculateSummaryAvailability(
            summary
        );


    const totalCash =
        getTotalCash(
            summary
        );


    return {

        ...summary,

        // --------------------------------------------------
        // AUTHORITATIVE TOTALS
        // --------------------------------------------------

        produced:
            totals.produced,

        consumed:
            totals.consumed,

        available:
            totals.available,

        cash:
            totalCash,

        // --------------------------------------------------
        // FARM PRODUCTION WITH DERIVED VALUES
        // --------------------------------------------------

        farmProduction

    };

}


// ==========================================================
// PAGE DATA
// ==========================================================

exports.getMilkSalesPageData =
async function(
    user
) {

    if (!user) {

        throw new Error(
            "Authenticated user is required."
        );

    }


    const day =
        getNairobiDay();


    const farms =
        await getVisibleFarms(
            user
        );


    const rawSummary =
        await getSummary(
            day
        );


    // ======================================================
    // PREPARE AUTHORITATIVE SALES SUMMARY
    // ======================================================

    const summary =
        prepareSalesSummary(
            rawSummary
        );


    // ======================================================
    // RETURN PAGE DATA
    // ======================================================

    return {

        summary,

        farms,

        price:
            summary.price

    };

};


// ==========================================================
// UPDATE MILK PRICE
//
// ADMIN ONLY
// ==========================================================

exports.updateMilkPrice =
async function(
    user,
    {
        day,
        price
    }
) {

    if (
        !isAdmin(user)
    ) {

        throw new Error(
            "Only an administrator can change the milk price."
        );

    }


    const targetDay =
        typeof day === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(
            day
        )

            ? day

            : getNairobiDay();


    const priceValue =
        toNumber(
            price
        );


    if (
        priceValue === null ||
        priceValue < 0
    ) {

        throw new Error(
            "Invalid milk price."
        );

    }


    let summary =
        await MilkSummary.findOne({

            day:
                targetDay

        });


    if (!summary) {

        summary =
            new MilkSummary({

                day:
                    targetDay,

                month:
                    targetDay.slice(
                        0,
                        7
                    )

            });

    }


    summary.price =
        round(
            priceValue
        );


    await summary.save();


    return summary;

};


// ==========================================================
// NORMALIZE ALLOCATIONS
// ==========================================================

function normalizeAllocations(
    allocations
) {

    if (
        !allocations ||
        typeof allocations !==
            "object"
    ) {

        return [];

    }


    const entries =
        Array.isArray(
            allocations
        )

            ? allocations

            : Object.values(
                allocations
            );


    return entries

        .map(
            allocation => {

                if (
                    !allocation
                ) {

                    return null;

                }


                const farm =
                    allocation.farm;


                const liters =
                    toNumber(
                        allocation.liters
                    );


                if (
                    !farm ||
                    !mongoose.isValidObjectId(
                        farm
                    ) ||
                    liters === null ||
                    liters <= 0
                ) {

                    return null;

                }


                return {

                    farm:
                        farm.toString(),

                    liters:
                        round(
                            liters
                        )

                };

            }
        )

        .filter(
            Boolean
        );

}


// ==========================================================
// VERIFY FARM ACCESS
// ==========================================================

async function getAccessibleFarm(
    user,
    farmId
) {

    if (
        !mongoose.isValidObjectId(
            farmId
        )
    ) {

        return null;

    }


    const query = {

        _id:
            farmId,

        code: {
            $lt: 0
        }

    };


    // ======================================================
    // DAIRY WORKER
    // ======================================================

    if (
        isDairyWorker(user)
    ) {

        const assignedFarmIds =
            getAssignedFarmIds(
                user
            );


        if (
            !assignedFarmIds.includes(
                farmId.toString()
            )
        ) {

            return null;

        }

    }


    // ======================================================
    // INVALID ROLE
    // ======================================================

    else if (
        !isAdmin(user)
    ) {

        return null;

    }


    return Dairy.findOne(
        query
    );

}


// ==========================================================
// SELL MILK
// ==========================================================

exports.sellMilk =
async function(
    user,
    {
        day,
        customerName,
        liters,
        allocations
    }
) {

    if (!user) {

        throw new Error(
            "Authentication is required."
        );

    }


    if (
        !isAdmin(user) &&
        !isDairyWorker(user)
    ) {

        throw new Error(
            "You are not authorized to sell milk."
        );

    }


    // ======================================================
    // DAY
    // ======================================================

    const targetDay =
        typeof day === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(
            day
        )

            ? day

            : getNairobiDay();


    // ======================================================
    // CUSTOMER
    // ======================================================

    const customer =
        typeof customerName === "string"
            ? customerName.trim()
            : "";


    if (!customer) {

        throw new Error(
            "Customer name is required."
        );

    }


    // ======================================================
    // SALE LITERS
    // ======================================================

    const requiredLiters =
        toNumber(
            liters
        );


    if (
        requiredLiters === null ||
        requiredLiters <= 0
    ) {

        throw new Error(
            "Sale liters must be greater than zero."
        );

    }


    // ======================================================
    // ALLOCATIONS
    // ======================================================

    const normalizedAllocations =
        normalizeAllocations(
            allocations
        );


    if (
        normalizedAllocations.length === 0
    ) {

        throw new Error(
            "At least one farm allocation is required."
        );

    }


    // ======================================================
    // PREVENT DUPLICATE FARMS
    // ======================================================

    const farmIds =
        new Set();


    for (
        const allocation
        of normalizedAllocations
    ) {

        if (
            farmIds.has(
                allocation.farm
            )
        ) {

            throw new Error(
                "The same farm cannot be allocated more than once."
            );

        }


        farmIds.add(
            allocation.farm
        );

    }


    // ======================================================
    // TOTAL ALLOCATED
    // ======================================================

    const allocatedTotal =
        round(

            normalizedAllocations.reduce(

                (
                    total,
                    allocation
                ) =>

                    total +
                    allocation.liters,

                0

            )

        );


    if (
        Math.abs(

            allocatedTotal -
            requiredLiters

        ) > 0.001
    ) {

        throw new Error(
            "Allocated milk must exactly equal the customer's required milk."
        );

    }


    // ======================================================
    // GET SUMMARY
    // ======================================================

    const summary =
        await MilkSummary.findOne({

            day:
                targetDay

        });


    if (!summary) {

        throw new Error(
            "No milk production summary exists for this day."
        );

    }


    // ======================================================
    // VERIFY EVERY FARM
    //
    // SECURITY:
    //
    // We do NOT trust farms submitted by browser.
    //
    // ======================================================

    const verifiedAllocations =
        [];


    for (
        const allocation
        of normalizedAllocations
    ) {

        const farm =
            await getAccessibleFarm(

                user,

                allocation.farm

            );


        if (!farm) {

            throw new Error(
                "You are not authorized to sell milk from one of the selected farms."
            );

        }


        // ==================================================
        // CURRENT FARM AVAILABILITY
        //
        // production - all previous allocations
        // ==================================================

        const available =
            getFarmAvailable(

                summary,

                farm._id

            );


        if (
            allocation.liters >
            available + 0.001
        ) {

            throw new Error(

                `Farm "${farm.name}" only has ${available.toFixed(2)} L available.`

            );

        }


        verifiedAllocations.push({

            farm:
                farm._id,

            farmCode:
                Number(
                    farm.code
                ),

            liters:
                allocation.liters

        });

    }


    // ======================================================
    // PRICE
    // ======================================================

    const price =
        Number(
            summary.price
        );


    const validPrice =
        Number.isFinite(
            price
        )

            ? price

            : 0;


    // ======================================================
    // CASH
    //
    // Never accept cash from the browser.
    //
    // Server calculates:
    //
    // liters × daily price
    //
    // ======================================================

    const cash =
        round(

            requiredLiters *
            validPrice

        );


    // ======================================================
    // CREATE SALE
    // ======================================================

    summary.sales.push({

        customerName:
            customer,

        liters:
            round(
                requiredLiters
            ),

        price:
            round(
                validPrice
            ),

        cash,

        farmAllocations:
            verifiedAllocations,

        createdAt:
            new Date()

    });


    // ======================================================
    // RECALCULATE TOTAL SALES
    // ======================================================

    let totalConsumed =
        0;


    let totalCash =
        0;


    for (
        const sale
        of summary.sales
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

            totalConsumed +=
                saleLiters;

        }


        if (
            Number.isFinite(
                saleCash
            )
        ) {

            totalCash +=
                saleCash;

        }

    }


    summary.consumed =
        round(
            totalConsumed
        );


    summary.cash =
        round(
            totalCash
        );


    // ======================================================
    // AVAILABLE
    //
    // Overall:
    //
    //     total production - total sold
    //
    // ======================================================

    const totalProduction =
        getTotalFarmProduction(
            summary
        );


    summary.produced =
        round(
            totalProduction
        );


    summary.available =
        Math.max(

            0,

            round(

                totalProduction -
                summary.consumed

            )

        );


    await summary.save();


    return {

        summary,

        sale: {

            customerName:
                customer,

            liters:
                requiredLiters,

            price:
                validPrice,

            cash,

            farmAllocations:
                verifiedAllocations

        }

    };

};


// ==========================================================
// EXPORT HELPERS
// ==========================================================

exports.getVisibleFarms =
    getVisibleFarms;


exports.getFarmAvailable =
    getFarmAvailable;


exports.getFarmSoldLiters =
    getFarmSoldLiters;


exports.getFarmProducedLiters =
    getFarmProducedLiters;


exports.getFarmSalesMap =
    getFarmSalesMap;


exports.getNairobiDay =
    getNairobiDay;