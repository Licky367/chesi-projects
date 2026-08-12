// ==========================================================
// services/milkService.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Central business/service layer for:
//
// • Milk recording
// • Animal validation
// • Dairy farm resolution
// • Daily milk summaries
// • Monthly milk reports
// • Animal milk history
// • Standing orders
// • Daily sales
// • Milk price handling
//
// IMPORTANT
// ----------------------------------------------------------
// The service does NOT duplicate schema logic.
//
// The models remain responsible for:
// • Mongoose validation
// • Nairobi day/month normalization
// • Database indexes
// • Unique morning/evening constraints
//
// The service is responsible for:
// • Business rules
// • Finding animals/farms
// • Building records
// • Rebuilding summaries
// • Transactional operations
//
// ==========================================================

const mongoose = require("mongoose");

const Dairy = require("../models/dairy");
const Milk = require("../models/milk");
const MilkSummary = require("../models/milkSummary");
const StandingOrder = require("../models/standingOrder");


// ==========================================================
// CONSTANTS
// ==========================================================

const DEFAULT_MILK_PRICE = 50;

const SESSION_VALUES = [
    "morning",
    "evening"
];


// ==========================================================
// BASIC HELPERS
// ==========================================================

function toNumber(value, defaultValue = 0) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : defaultValue;

}


function isValidObjectId(id) {

    return mongoose.isValidObjectId(id);

}


function normalizeSession(session) {

    const value =
        String(session || "")
            .trim()
            .toLowerCase();

    if (!SESSION_VALUES.includes(value)) {

        throw new Error(
            "Milk session must be either morning or evening."
        );

    }

    return value;

}


function normalizeLiters(value) {

    const liters = Number(value);

    if (
        !Number.isFinite(liters) ||
        liters < 0
    ) {

        throw new Error(
            "Milk quantity must be a valid number greater than or equal to zero."
        );

    }

    return liters;

}


// ==========================================================
// GET MILKING ANIMALS
// ==========================================================
//
// Only female animals that are currently marked as milking
// should normally appear on the milk recording page.
//
// The animal must also belong to a Dairy Farm.
//
// ==========================================================

exports.getMilkingAnimals = async function() {

    return Dairy.find({

        code: {
            $gt: 0
        },

        isMilking: true,

        assetCode: {
            $lt: 0
        },

        status: "active"

    })

    .sort({

        code: 1

    })

    .lean();

};


// ==========================================================
// GET ANIMAL
// ==========================================================

async function getAnimal(animalId) {

    if (
        !isValidObjectId(animalId)
    ) {

        throw new Error(
            "Invalid animal ID."
        );

    }


    const animal =
        await Dairy.findOne({

            _id:
                animalId,

            code: {
                $gt: 0
            }

        });


    if (!animal) {

        throw new Error(
            "Animal was not found."
        );

    }


    if (
        animal.status !== "active"
    ) {

        throw new Error(
            "Milk cannot be recorded for an inactive animal."
        );

    }


    if (
        !animal.assetCode
    ) {

        throw new Error(
            "This animal is not assigned to a Dairy Farm."
        );

    }


    return animal;

}


// ==========================================================
// GET FARM FOR ANIMAL
// ==========================================================
//
// The Dairy model deliberately stores the parent farm as:
//
//     animal.assetCode = negative farm code
//
// Therefore we resolve the actual farm document here.
//
// ==========================================================

async function getFarmForAnimal(animal) {

    const farmCode =
        Number(
            animal.assetCode
        );


    if (
        !Number.isFinite(farmCode) ||
        farmCode >= 0
    ) {

        throw new Error(
            "Animal has an invalid Dairy Farm assignment."
        );

    }


    const farm =
        await Dairy.findOne({

            code:
                farmCode,

            status:
                "active"

        });


    if (!farm) {

        throw new Error(
            "The Dairy Farm assigned to this animal could not be found."
        );

    }


    if (
        farm.code >= 0
    ) {

        throw new Error(
            "Invalid Dairy Farm code."
        );

    }


    return farm;

}


// ==========================================================
// GET CURRENT MILK PRICE
// ==========================================================
//
// The price belongs to the daily summary.
//
// If a summary already exists, its price is returned.
//
// Otherwise the default price is returned.
//
// ==========================================================

exports.getCurrentPrice = async function(day = null) {

    if (day) {

        const summary =
            await MilkSummary.findOne({

                day

            })

            .select(
                "price"
            )

            .lean();


        if (summary) {

            return toNumber(
                summary.price,
                DEFAULT_MILK_PRICE
            );

        }

    }


    return DEFAULT_MILK_PRICE;

};


// ==========================================================
// CHECK DAILY SUMMARY LOCK
// ==========================================================

async function ensureDayIsNotLocked(
    day,
    session = null
) {

    const summary =
        await MilkSummary.findOne({

            day

        })

        .select(
            "locked"
        )

        .lean();


    if (
        summary &&
        summary.locked
    ) {

        throw new Error(
            "This day's milk records have already been locked."
        );

    }


    return summary;

}


// ==========================================================
// SAVE ONE MILK RECORD
// ==========================================================
//
// This is the primary recording operation.
//
// Input:
//
// {
//     animalId,
//     liters,
//     session,
//     date,
//     remarks,
//     recordedBy
// }
//
// The service obtains:
//
// • animal
// • animal code
// • farm
// • farm code
//
// from the database.
//
// The user therefore does NOT need to submit farm information
// manually.
//
// ==========================================================

exports.saveMilkRecord = async function(data) {

    if (
        !data ||
        typeof data !== "object"
    ) {

        throw new Error(
            "Milk record data is required."
        );

    }


    const animalId =
        data.animalId ||
        data.dairy ||
        data.dairyId;


    const liters =
        normalizeLiters(
            data.liters
        );


    const session =
        normalizeSession(
            data.session
        );


    const remarks =
        String(
            data.remarks || ""
        ).trim();


    const recordedBy =
        data.recordedBy ||
        null;


    // --------------------------------------------------------
    // Validate recorder
    // --------------------------------------------------------

    if (
        recordedBy &&
        !isValidObjectId(recordedBy)
    ) {

        throw new Error(
            "Invalid recording user ID."
        );

    }


    // --------------------------------------------------------
    // Find animal
    // --------------------------------------------------------

    const animal =
        await getAnimal(
            animalId
        );


    // --------------------------------------------------------
    // Resolve parent farm
    // --------------------------------------------------------

    const farm =
        await getFarmForAnimal(
            animal
        );


    // --------------------------------------------------------
    // Determine actual record date
    //
    // The Milk model will derive day/month from this date.
    // --------------------------------------------------------

    const date =
        data.date
            ? new Date(data.date)
            : new Date();


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        throw new Error(
            "Invalid milk record date."
        );

    }


    // --------------------------------------------------------
    // Check whether a daily summary is locked.
    //
    // We need the Nairobi day key, but we deliberately do not
    // duplicate the model's date calculation logic.
    //
    // Instead, create the Milk document first and let its
    // validation middleware normalize day/month.
    // --------------------------------------------------------

    const milk =
        new Milk({

            dairy:
                animal._id,

            recordedBy:
                recordedBy || null,

            recordedByType:
                recordedBy
                    ? "user"
                    : "system",

            recordedBySystem:
                !recordedBy,

            liters,

            remarks,

            date,

            session

        });


    // --------------------------------------------------------
    // Run validation.
    //
    // This causes Milk's own middleware to generate:
    //
    //     day
    //     month
    //
    // --------------------------------------------------------

    await milk.validate();


    // --------------------------------------------------------
    // Check summary lock using the model-generated day.
    // --------------------------------------------------------

    await ensureDayIsNotLocked(
        milk.day
    );


    // --------------------------------------------------------
    // Save milk record.
    //
    // The unique index on:
    //
    // dairy + day + session
    //
    // prevents duplicate morning/evening records.
    // --------------------------------------------------------

    try {

        await milk.save();

    }

    catch (error) {

        if (
            error &&
            error.code === 11000
        ) {

            throw new Error(
                `A ${session} milk record already exists for this animal on ${milk.day}.`
            );

        }

        throw error;

    }


    // --------------------------------------------------------
    // Rebuild daily summary.
    // --------------------------------------------------------

    const summary =
        await exports.rebuildDailySummary(
            milk.day
        );


    return {

        milk,

        animal,

        farm,

        summary

    };

};


// ==========================================================
// SAVE MULTIPLE MILK RECORDS
// ==========================================================
//
// Useful when the milk page submits all cows at once.
//
// Expected:
//
// records: [
//     {
//         animalId,
//         liters,
//         session,
//         remarks
//     }
// ]
//
// Every individual record still passes through the same
// saveMilkRecord() logic.
//
// ==========================================================

exports.saveMilkRecords = async function(
    records,
    recordedBy = null
) {

    if (
        !Array.isArray(records)
    ) {

        throw new Error(
            "Milk records must be provided as an array."
        );

    }


    if (
        !records.length
    ) {

        return {

            records: [],

            summaries: []

        };

    }


    const savedRecords = [];


    for (
        const record of records
    ) {

        const saved =
            await exports.saveMilkRecord({

                ...record,

                recordedBy

            });


        savedRecords.push(
            saved.milk
        );

    }


    // --------------------------------------------------------
    // Rebuild only the affected days.
    // --------------------------------------------------------

    const days = [
        ...new Set(
            savedRecords.map(
                record => record.day
            )
        )
    ];


    const summaries = [];


    for (
        const day of days
    ) {

        const summary =
            await exports.rebuildDailySummary(
                day
            );


        summaries.push(
            summary
        );

    }


    return {

        records:
            savedRecords,

        summaries

    };

};


// ==========================================================
// REBUILD DAILY SUMMARY
// ==========================================================
//
// This is intentionally the central summary calculation.
//
// We do NOT calculate:
//
// • farm totals
// • cow totals
// • produced milk
//
// separately in multiple service functions.
//
// Everything is rebuilt from Milk records here.
//
// ==========================================================

exports.rebuildDailySummary = async function(day) {

    if (
        typeof day !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(day)
    ) {

        throw new Error(
            "Invalid milk summary day."
        );

    }


    // --------------------------------------------------------
    // Existing summary
    // --------------------------------------------------------

    const existing =
        await MilkSummary.findOne({

            day

        });


    if (
        existing &&
        existing.locked
    ) {

        throw new Error(
            "This day's milk summary is locked."
        );

    }


    // --------------------------------------------------------
    // Get all milk records for the day.
    //
    // Populate the animal so the service can obtain:
    //
    // • animal code
    // • farm code
    //
    // --------------------------------------------------------

    const records =
        await Milk.find({

            day

        })

        .populate({

            path:
                "dairy",

            select:
                "name code assetCode status"

        })

        .lean();


    // --------------------------------------------------------
    // Prepare aggregation maps.
    // --------------------------------------------------------

    const cowMap =
        new Map();

    const farmMap =
        new Map();


    let produced =
        0;


    // --------------------------------------------------------
    // Process milk records.
    // --------------------------------------------------------

    for (
        const record of records
    ) {

        const liters =
            toNumber(
                record.liters
            );


        const animal =
            record.dairy;


        if (!animal) {

            continue;

        }


        produced +=
            liters;


        // ----------------------------------------------------
        // Cow production
        // ----------------------------------------------------

        const cowId =
            String(
                animal._id
            );


        if (
            !cowMap.has(
                cowId
            )
        ) {

            cowMap.set(

                cowId,

                {

                    dairy:
                        animal._id,

                    cowCode:
                        Number(
                            animal.code
                        ),

                    farmCode:
                        Number(
                            animal.assetCode
                        ),

                    liters:
                        0

                }

            );

        }


        cowMap.get(
            cowId
        ).liters +=
            liters;


        // ----------------------------------------------------
        // Farm production
        // ----------------------------------------------------

        const farmCode =
            Number(
                animal.assetCode
            );


        if (
            Number.isFinite(
                farmCode
            )
        ) {

            const farmKey =
                String(
                    farmCode
                );


            if (
                !farmMap.has(
                    farmKey
                )
            ) {

                // --------------------------------------------
                // The farm document is obtained once.
                // --------------------------------------------

                const farm =
                    await Dairy.findOne({

                        code:
                            farmCode

                    })

                    .select(
                        "_id code name"
                    )

                    .lean();


                if (farm) {

                    farmMap.set(

                        farmKey,

                        {

                            farm:
                                farm._id,

                            farmCode:
                                Number(
                                    farm.code
                                ),

                            liters:
                                0

                        }

                    );

                }

            }


            if (
                farmMap.has(
                    farmKey
                )
            ) {

                farmMap.get(
                    farmKey
                ).liters +=
                    liters;

            }

        }

    }


    // --------------------------------------------------------
    // Existing sales remain part of the summary.
    // --------------------------------------------------------

    const sales =
        existing &&
        Array.isArray(
            existing.sales
        )

            ? existing.sales

            : [];


    const consumed =
        sales.reduce(

            (
                total,
                sale
            ) => {

                return (
                    total +
                    toNumber(
                        sale.liters
                    )
                );

            },

            0

        );


    const cash =
        sales.reduce(

            (
                total,
                sale
            ) => {

                return (
                    total +
                    toNumber(
                        sale.cash
                    )
                );

            },

            0

        );


    const available =
        Math.max(
            0,
            produced - consumed
        );


    // --------------------------------------------------------
    // Preserve existing price.
    // --------------------------------------------------------

    const price =
        existing
            ? toNumber(
                existing.price,
                DEFAULT_MILK_PRICE
            )
            : DEFAULT_MILK_PRICE;


    // --------------------------------------------------------
    // Build summary.
    // --------------------------------------------------------

    const summaryData = {

        day,

        // MilkSummary's pre-validation middleware will derive
        // the month from day.

        month:
            day.slice(
                0,
                7
            ),

        price,

        produced,

        consumed,

        available,

        cash,

        cowProduction:
            Array.from(
                cowMap.values()
            ),

        farmProduction:
            Array.from(
                farmMap.values()
            ),

        sales,

        locked:
            existing
                ? existing.locked
                : false

    };


    // --------------------------------------------------------
    // Upsert summary.
    // --------------------------------------------------------

    const summary =
        await MilkSummary.findOneAndUpdate(

            {

                day

            },

            {

                $set:
                    summaryData

            },

            {

                new:
                    true,

                upsert:
                    true,

                runValidators:
                    true,

                setDefaultsOnInsert:
                    true

            }

        );


    return summary;

};


// ==========================================================
// GET DAILY STATS
// ==========================================================

exports.getDailyStats = async function(day) {

    if (
        !day
    ) {

        throw new Error(
            "Day is required."
        );

    }


    let summary =
        await MilkSummary.findOne({

            day

        })

        .populate(
            "cowProduction.dairy",
            "name code assetCode profileImage"
        )

        .populate(
            "farmProduction.farm",
            "name code"
        )

        .populate(
            "sales.standingOrderId"
        )

        .lean();


    // --------------------------------------------------------
    // If there is no summary, create/rebuild it from Milk.
    // --------------------------------------------------------

    if (!summary) {

        summary =
            await exports.rebuildDailySummary(
                day
            );

    }


    return summary;

};


// ==========================================================
// SAVE DAILY STATS
// ==========================================================
//
// This function is retained for compatibility with controllers
// that explicitly save/update daily summary information.
//
// It does not duplicate production calculations.
//
// Production is always rebuilt from Milk records.
//
// ==========================================================

exports.saveDailyStats = async function(
    data
) {

    if (
        !data ||
        !data.day
    ) {

        throw new Error(
            "Daily summary day is required."
        );

    }


    const day =
        String(
            data.day
        );


    await ensureDayIsNotLocked(
        day
    );


    let summary =
        await MilkSummary.findOne({

            day

        });


    if (!summary) {

        summary =
            await exports.rebuildDailySummary(
                day
            );

    }


    // --------------------------------------------------------
    // Only fields that actually belong to a manually editable
    // daily summary are updated here.
    //
    // Production totals are NOT accepted from the client.
    // --------------------------------------------------------

    if (
        data.price !== undefined
    ) {

        const price =
            Number(
                data.price
            );


        if (
            !Number.isFinite(price) ||
            price < 0
        ) {

            throw new Error(
                "Milk price must be a valid number."
            );

        }


        summary.price =
            price;

    }


    await summary.save();


    return exports.rebuildDailySummary(
        day
    );

};


// ==========================================================
// LOCK DAILY SUMMARY
// ==========================================================

exports.lockDailySummary = async function(day) {

    const summary =
        await MilkSummary.findOne({

            day

        });


    if (!summary) {

        throw new Error(
            "Daily milk summary was not found."
        );

    }


    summary.locked =
        true;


    await summary.save();


    return summary;

};


// ==========================================================
// UNLOCK DAILY SUMMARY
// ==========================================================

exports.unlockDailySummary = async function(day) {

    const summary =
        await MilkSummary.findOne({

            day

        });


    if (!summary) {

        throw new Error(
            "Daily milk summary was not found."
        );

    }


    summary.locked =
        false;


    await summary.save();


    return summary;

};


// ==========================================================
// MONTHLY STATS
// ==========================================================
//
// Uses Milk's existing monthly reporting logic.
//
// The service does not recreate that aggregation.
//
// ==========================================================

exports.getMonthlyStats = async function(month) {

    return Milk.getMonthlyReport(
        month
    );

};


// ==========================================================
// ANIMAL MONTHLY HISTORY
// ==========================================================

exports.getAnimalMonthlyHistory =
async function(
    dairyId,
    month
) {

    return Milk.getAnimalMonthlyHistory(

        dairyId,

        month

    );

};


// ==========================================================
// GET RECENT MILK RECORDS
// ==========================================================

exports.getRecentMilkRecords =
async function(limit = 50) {

    const safeLimit =
        Math.min(

            Math.max(
                Number(limit) || 50,
                1
            ),

            500

        );


    return Milk.find()

        .populate(
            "dairy",
            "name code assetCode profileImage"
        )

        .populate(
            "recordedBy",
            "name"
        )

        .sort({

            date:
                -1

        })

        .limit(
            safeLimit
        )

        .lean();

};


// ==========================================================
// DELETE MILK RECORD
// ==========================================================
//
// After deletion, the daily summary is rebuilt from the
// remaining Milk records.
//
// ==========================================================

exports.deleteMilkRecord =
async function(
    milkId
) {

    if (
        !isValidObjectId(
            milkId
        )
    ) {

        throw new Error(
            "Invalid milk record ID."
        );

    }


    const milk =
        await Milk.findById(
            milkId
        );


    if (!milk) {

        throw new Error(
            "Milk record was not found."
        );

    }


    await ensureDayIsNotLocked(
        milk.day
    );


    const day =
        milk.day;


    await milk.deleteOne();


    const summary =
        await exports.rebuildDailySummary(
            day
        );


    return {

        deleted:
            true,

        day,

        summary

    };

};


// ==========================================================
// GET SALES PAGE DATA
// ==========================================================

exports.getSalesPageData =
async function(day) {

    if (!day) {

        throw new Error(
            "Sales page requires a day."
        );

    }


    const summary =
        await MilkSummary.findOne({

            day

        })

        .populate(
            "sales.standingOrderId"
        )

        .lean();


    const standingOrders =
        await StandingOrder.find({

            isActive:
                true,

            omitted:
                false,

            effectiveDate: {
                $lte:
                    new Date()
            }

        })

        .sort({

            customerName:
                1

        })

        .lean();


    return {

        day,

        summary,

        standingOrders

    };

};


// ==========================================================
// PROCESS DAILY SALE
// ==========================================================
//
// Adds a sale to MilkSummary.
//
// `consumed`, `cash`, and `available` are NOT manually
// calculated here because rebuildDailySummary() is the single
// source of truth for those totals.
//
// ==========================================================

exports.processDailySales =
async function(
    data
) {

    if (
        !data ||
        !data.day
    ) {

        throw new Error(
            "Sale day is required."
        );

    }


    const day =
        String(
            data.day
        );


    await ensureDayIsNotLocked(
        day
    );


    const customerName =
        String(
            data.customerName || ""
        ).trim();


    if (!customerName) {

        throw new Error(
            "Customer name is required."
        );

    }


    const liters =
        normalizeLiters(
            data.liters
        );


    const price =
        data.price !== undefined

            ? toNumber(
                data.price
            )

            : await exports.getCurrentPrice(
                day
            );


    if (
        price < 0
    ) {

        throw new Error(
            "Sale price cannot be negative."
        );

    }


    const cash =
        data.cash !== undefined

            ? toNumber(
                data.cash
            )

            : liters * price;


    if (
        cash < 0
    ) {

        throw new Error(
            "Cash received cannot be negative."
        );

    }


    // --------------------------------------------------------
    // Ensure summary exists.
    // --------------------------------------------------------

    let summary =
        await MilkSummary.findOne({

            day

        });


    if (!summary) {

        summary =
            await exports.rebuildDailySummary(
                day
            );

    }


    if (
        summary.locked
    ) {

        throw new Error(
            "This day's milk summary is locked."
        );

    }


    // --------------------------------------------------------
    // Check available milk before adding the sale.
    // --------------------------------------------------------

    const currentSalesLiters =
        summary.sales.reduce(

            (
                total,
                sale
            ) => {

                return (
                    total +
                    toNumber(
                        sale.liters
                    )
                );

            },

            0

        );


    const availableBeforeSale =
        Math.max(

            0,

            toNumber(
                summary.produced
            ) -
            currentSalesLiters

        );


    if (
        liters >
        availableBeforeSale
    ) {

        throw new Error(
            `Only ${availableBeforeSale} litres of milk are available for sale.`
        );

    }


    // --------------------------------------------------------
    // Add sale.
    // --------------------------------------------------------

    summary.sales.push({

        customerName,

        liters,

        price,

        cash,

        standingOrderId:
            data.standingOrderId || null

    });


    await summary.save();


    // --------------------------------------------------------
    // Rebuild all derived totals.
    // --------------------------------------------------------

    summary =
        await exports.rebuildDailySummary(
            day
        );


    return summary;

};


// ==========================================================
// REMOVE DAILY SALE
// ==========================================================

exports.removeDailySale =
async function(
    day,
    saleIndex
) {

    await ensureDayIsNotLocked(
        day
    );


    const summary =
        await MilkSummary.findOne({

            day

        });


    if (!summary) {

        throw new Error(
            "Daily milk summary was not found."
        );

    }


    const index =
        Number(
            saleIndex
        );


    if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= summary.sales.length
    ) {

        throw new Error(
            "Invalid sale."
        );

    }


    summary.sales.splice(
        index,
        1
    );


    await summary.save();


    return exports.rebuildDailySummary(
        day
    );

};


// ==========================================================
// ADD STANDING ORDER
// ==========================================================

exports.addStandingOrder =
async function(data) {

    if (
        !data ||
        typeof data !== "object"
    ) {

        throw new Error(
            "Standing order data is required."
        );

    }


    const customerName =
        String(
            data.customerName || ""
        ).trim();


    if (!customerName) {

        throw new Error(
            "Customer name is required."
        );

    }


    const liters =
        normalizeLiters(
            data.liters
        );


    const effectiveDate =
        data.effectiveDate
            ? new Date(
                data.effectiveDate
            )
            : new Date();


    if (
        Number.isNaN(
            effectiveDate.getTime()
        )
    ) {

        throw new Error(
            "Invalid standing order effective date."
        );

    }


    return StandingOrder.create({

        customerName,

        liters,

        effectiveDate,

        isActive:
            true,

        omitted:
            false

    });

};


// ==========================================================
// OMIT STANDING ORDER
// ==========================================================

exports.omitStandingOrder =
async function(
    standingOrderId
) {

    if (
        !isValidObjectId(
            standingOrderId
        )
    ) {

        throw new Error(
            "Invalid standing order ID."
        );

    }


    const order =
        await StandingOrder.findById(
            standingOrderId
        );


    if (!order) {

        throw new Error(
            "Standing order was not found."
        );

    }


    order.omitted =
        true;


    order.isActive =
        false;


    await order.save();


    return order;

};


// ==========================================================
// RESTORE STANDING ORDER
// ==========================================================

exports.restoreStandingOrder =
async function(
    standingOrderId
) {

    if (
        !isValidObjectId(
            standingOrderId
        )
    ) {

        throw new Error(
            "Invalid standing order ID."
        );

    }


    const order =
        await StandingOrder.findById(
            standingOrderId
        );


    if (!order) {

        throw new Error(
            "Standing order was not found."
        );

    }


    order.omitted =
        false;


    order.isActive =
        true;


    await order.save();


    return order;

};


// ==========================================================
// GET STANDING ORDERS
// ==========================================================

exports.getStandingOrders =
async function(
    includeOmitted = false
) {

    const query = {

        isActive:
            true

    };


    if (!includeOmitted) {

        query.omitted =
            false;

    }


    return StandingOrder.find(
        query
    )

    .sort({

        customerName:
            1

    })

    .lean();

};


// ==========================================================
// GET MILK RECORD BY ID
// ==========================================================

exports.getMilkRecord =
async function(
    milkId
) {

    if (
        !isValidObjectId(
            milkId
        )
    ) {

        throw new Error(
            "Invalid milk record ID."
        );

    }


    return Milk.findById(
        milkId
    )

    .populate(
        "dairy",
        "name code assetCode profileImage"
    )

    .populate(
        "recordedBy",
        "name"
    );

};


// ==========================================================
// UPDATE MILK RECORD
// ==========================================================
//
// Updating a record can change:
//
// • liters
// • session
// • date
// • remarks
//
// The Milk model automatically recalculates day/month when
// date changes.
//
// Because changing date/session may move the record into a
// different uniqueness bucket, the service checks the
// destination day before saving.
//
// ==========================================================

exports.updateMilkRecord =
async function(
    milkId,
    data
) {

    if (
        !isValidObjectId(
            milkId
        )
    ) {

        throw new Error(
            "Invalid milk record ID."
        );

    }


    const milk =
        await Milk.findById(
            milkId
        );


    if (!milk) {

        throw new Error(
            "Milk record was not found."
        );

    }


    const oldDay =
        milk.day;


    await ensureDayIsNotLocked(
        oldDay
    );


    // --------------------------------------------------------
    // Update quantity
    // --------------------------------------------------------

    if (
        data.liters !== undefined
    ) {

        milk.liters =
            normalizeLiters(
                data.liters
            );

    }


    // --------------------------------------------------------
    // Update remarks
    // --------------------------------------------------------

    if (
        data.remarks !== undefined
    ) {

        milk.remarks =
            String(
                data.remarks || ""
            ).trim();

    }


    // --------------------------------------------------------
    // Update session
    // --------------------------------------------------------

    if (
        data.session !== undefined
    ) {

        milk.session =
            normalizeSession(
                data.session
            );

    }


    // --------------------------------------------------------
    // Update date
    // --------------------------------------------------------

    if (
        data.date !== undefined
    ) {

        const newDate =
            new Date(
                data.date
            );


        if (
            Number.isNaN(
                newDate.getTime()
            )
        ) {

            throw new Error(
                "Invalid milk record date."
            );

        }


        milk.date =
            newDate;

    }


    // --------------------------------------------------------
    // Validate.
    //
    // Milk middleware updates day/month.
    // --------------------------------------------------------

    await milk.validate();


    // --------------------------------------------------------
    // If record moved to another day, that day must also be
    // unlocked.
    // --------------------------------------------------------

    if (
        milk.day !== oldDay
    ) {

        await ensureDayIsNotLocked(
            milk.day
        );

    }


    try {

        await milk.save();

    }

    catch (error) {

        if (
            error &&
            error.code === 11000
        ) {

            throw new Error(
                `A ${milk.session} milk record already exists for this animal on ${milk.day}.`
            );

        }

        throw error;

    }


    // --------------------------------------------------------
    // Rebuild old day if the record moved.
    // --------------------------------------------------------

    if (
        milk.day !== oldDay
    ) {

        await exports.rebuildDailySummary(
            oldDay
        );

    }


    // --------------------------------------------------------
    // Rebuild destination day.
    // --------------------------------------------------------

    const summary =
        await exports.rebuildDailySummary(
            milk.day
        );


    return {

        milk,

        summary

    };

};


// ==========================================================
// GET MILK HISTORY
// ==========================================================

exports.getMilkHistory =
async function(
    dairyId,
    options = {}
) {

    if (
        !isValidObjectId(
            dairyId
        )
    ) {

        throw new Error(
            "Invalid animal ID."
        );

    }


    const query = {

        dairy:
            dairyId

    };


    if (
        options.month
    ) {

        query.month =
            String(
                options.month
            );

    }


    if (
        options.day
    ) {

        query.day =
            String(
                options.day
            );

    }


    const limit =
        Math.min(

            Math.max(
                Number(
                    options.limit
                ) || 100,

                1
            ),

            500

        );


    return Milk.find(
        query
    )

    .populate(
        "dairy",
        "name code assetCode"
    )

    .populate(
        "recordedBy",
        "name"
    )

    .sort({

        date:
            -1

    })

    .limit(
        limit
    )

    .lean();

};


// ==========================================================
// GET DAILY REPORT
// ==========================================================

exports.getDailyReport =
async function(day) {

    return Milk.getDailyReport(
        day
    );

};


// ==========================================================
// GET ALL ACTIVE FARMS
// ==========================================================

exports.getDairyFarms =
async function() {

    return Dairy.find({

        code: {
            $lt: 0
        },

        status:
            "active"

    })

    .sort({

        code:
            1

    })

    .lean();

};


// ==========================================================
// GET FARM ANIMALS
// ==========================================================
//
// Uses assetCode rather than creating another relationship
// field.
//
// ==========================================================

exports.getFarmAnimals =
async function(
    farmCode
) {

    const numericFarmCode =
        Number(
            farmCode
        );


    if (
        !Number.isFinite(
            numericFarmCode
        ) ||
        numericFarmCode >= 0
    ) {

        throw new Error(
            "Invalid Dairy Farm code."
        );

    }


    return Dairy.find({

        code: {
            $gt:
                0
        },

        assetCode:
            numericFarmCode,

        status:
            "active"

    })

    .sort({

        code:
            1

    })

    .lean();

};


// ==========================================================
// GET FARM DAILY MILK
// ==========================================================
//
// Returns milk records belonging to animals assigned to the
// selected farm.
//
// ==========================================================

exports.getFarmDailyMilk =
async function(
    farmCode,
    day
) {

    const numericFarmCode =
        Number(
            farmCode
        );


    if (
        !Number.isFinite(
            numericFarmCode
        ) ||
        numericFarmCode >= 0
    ) {

        throw new Error(
            "Invalid Dairy Farm code."
        );

    }


    const animals =
        await Dairy.find({

            code: {
                $gt:
                    0
            },

            assetCode:
                numericFarmCode

        })

        .select(
            "_id"
        )

        .lean();


    const animalIds =
        animals.map(
            animal =>
                animal._id
        );


    return Milk.find({

        dairy: {
            $in:
                animalIds
        },

        day

    })

    .populate(
        "dairy",
        "name code assetCode"
    )

    .populate(
        "recordedBy",
        "name"
    )

    .sort({

        date:
            1

    })

    .lean();

};


// ==========================================================
// GET FARM MONTHLY PRODUCTION
// ==========================================================

exports.getFarmMonthlyProduction =
async function(
    farmCode,
    month
) {

    const numericFarmCode =
        Number(
            farmCode
        );


    if (
        !Number.isFinite(
            numericFarmCode
        ) ||
        numericFarmCode >= 0
    ) {

        throw new Error(
            "Invalid Dairy Farm code."
        );

    }


    const animals =
        await Dairy.find({

            code: {
                $gt:
                    0
            },

            assetCode:
                numericFarmCode

        })

        .select(
            "_id"
        )

        .lean();


    const animalIds =
        animals.map(
            animal =>
                animal._id
        );


    const result =
        await Milk.aggregate([

            {

                $match: {

                    dairy: {
                        $in:
                            animalIds
                    },

                    month

                }

            },

            {

                $group: {

                    _id:
                        null,

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

                    total:
                        1,

                    days:
                        1,

                    average: {

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


    return result.length

        ? result[0]

        : {

            total:
                0,

            days:
                [],

            average:
                0

        };

};


// ==========================================================
// EXPORT INTERNAL HELPERS ONLY WHEN NECESSARY
// ==========================================================
//
// Normally these remain private.
//
// ==========================================================

module.exports = exports;