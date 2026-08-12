// ==========================================================
// services/milkService.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Central business-logic layer for:
//
// • Milk collection
// • Morning / evening sessions
// • Milk record creation
// • Milk record editing
// • Automatic session finalization
// • Milking status
// • Milk statistics
// • Milk sales
// • Milk pricing
// • Standing orders
// • Milking history
// • Daily summary locking
// • Cow-level milk summaries
// • Farm-level milk summaries
//
// IMPORTANT DATA RELATIONSHIP
// ----------------------------------------------------------
//
// Milk records belong to individual animals:
//
//     Milk.dairy
//          ↓
//     Dairy animal._id
//
// The animal belongs to a farm through:
//
//     animal.assetCode
//
// The farm itself is represented by a Dairy document:
//
//     farm.code < 0
//
// Therefore:
//
//     animal.assetCode === farm.code
//
// MilkSummary stores:
//
//     cowProduction
//     farmProduction
//
// ==========================================================


const mongoose = require("mongoose");

const Milk = require("../models/milk");
const Dairy = require("../models/dairy");
const MilkSummary = require("../models/milkSummary");
const StandingOrder = require("../models/standingOrder");


// ==========================================================
// CONSTANTS
// ==========================================================

const TIME_ZONE = "Africa/Nairobi";

const DEFAULT_MILK_PRICE = 50;

// Morning:
// 00:00 - 09:59
//
// Closed:
// 10:00 - 15:59
//
// Evening:
// 16:00 - 23:59

const MORNING_END = 10 * 60;
const EVENING_START = 16 * 60;


// ==========================================================
// BUSINESS ERROR
// ==========================================================

function milkError(code, message) {

    const error = new Error(message);

    error.code = code;

    return error;
}


// ==========================================================
// GET CURRENT KENYA DATE / TIME
// ==========================================================

function getKenyaDateParts() {

    const parts = new Intl.DateTimeFormat(
        "en-GB",
        {
            timeZone: TIME_ZONE,

            year: "numeric",
            month: "2-digit",
            day: "2-digit",

            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",

            hourCycle: "h23"
        }
    ).formatToParts(new Date());


    const get = (type) => {

        const part = parts.find(
            item => item.type === type
        );

        return Number(part?.value || 0);
    };


    const year = get("year");
    const month = get("month");
    const day = get("day");

    const hour = get("hour");
    const minute = get("minute");
    const second = get("second");


    const paddedMonth =
        String(month).padStart(2, "0");

    const paddedDay =
        String(day).padStart(2, "0");


    const date =
        `${year}-${paddedMonth}-${paddedDay}`;


    const monthKey =
        `${year}-${paddedMonth}`;


    const timeMinutes =
        hour * 60 + minute;


    return {

        year,
        month,
        day,

        hour,
        minute,
        second,

        date,
        monthKey,

        timeMinutes
    };
}


// ==========================================================
// VALIDATE DATE
// ==========================================================

function isValidDay(day) {

    if (
        typeof day !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(day)
    ) {

        return false;
    }


    const [
        year,
        month,
        date
    ] =
        day.split("-").map(Number);


    const test =
        new Date(
            Date.UTC(
                year,
                month - 1,
                date
            )
        );


    return (
        test.getUTCFullYear() === year &&
        test.getUTCMonth() === month - 1 &&
        test.getUTCDate() === date
    );
}


// ==========================================================
// VALIDATE MONTH
// ==========================================================

function isValidMonth(month) {

    return (
        typeof month === "string" &&
        /^\d{4}-\d{2}$/.test(month) &&
        Number(month.slice(5)) >= 1 &&
        Number(month.slice(5)) <= 12
    );
}


// ==========================================================
// GET PREVIOUS KENYA DATE
// ==========================================================

function getPreviousKenyaDate(dateString) {

    if (!isValidDay(dateString)) {

        throw new Error("Invalid day.");
    }


    const [
        year,
        month,
        day
    ] =
        dateString.split("-").map(Number);


    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );


    date.setUTCDate(
        date.getUTCDate() - 1
    );


    const previousYear =
        date.getUTCFullYear();


    const previousMonth =
        String(
            date.getUTCMonth() + 1
        ).padStart(2, "0");


    const previousDay =
        String(
            date.getUTCDate()
        ).padStart(2, "0");


    return (
        `${previousYear}-${previousMonth}-${previousDay}`
    );
}


// ==========================================================
// GET MILK SESSION
// ==========================================================

function getMilkSession() {

    const now =
        getKenyaDateParts();


    // ------------------------------------------------------
    // MORNING
    // ------------------------------------------------------

    if (
        now.timeMinutes <
        MORNING_END
    ) {

        return {

            name: "morning",

            label: "Morning",

            day: now.date,

            month: now.monthKey,

            open: true,

            canSubmit: true
        };
    }


    // ------------------------------------------------------
    // EVENING
    // ------------------------------------------------------

    if (
        now.timeMinutes >=
        EVENING_START
    ) {

        return {

            name: "evening",

            label: "Evening",

            day: now.date,

            month: now.monthKey,

            open: true,

            canSubmit: true
        };
    }


    // ------------------------------------------------------
    // CLOSED
    // ------------------------------------------------------

    return {

        name: "closed",

        label: "Closed",

        day: now.date,

        month: now.monthKey,

        open: false,

        canSubmit: false
    };
}


// ==========================================================
// GET SESSION DEADLINE
// ==========================================================

function getSessionDeadline(sessionName) {

    const now =
        getKenyaDateParts();


    if (
        sessionName === "morning"
    ) {

        return {

            year: now.year,

            month: now.month,

            day: now.day,

            hour: 10,

            minute: 0
        };
    }


    if (
        sessionName === "evening"
    ) {

        return {

            year: now.year,

            month: now.month,

            day: now.day,

            hour: 24,

            minute: 0
        };
    }


    return null;
}


// ==========================================================
// CHECK NORMAL SUBMISSION
// ==========================================================

function canSubmitSession(sessionName) {

    const now =
        getKenyaDateParts();


    if (
        sessionName === "morning"
    ) {

        return (
            now.timeMinutes <
            MORNING_END
        );
    }


    if (
        sessionName === "evening"
    ) {

        return (
            now.timeMinutes >=
            EVENING_START
        );
    }


    return false;
}


// ==========================================================
// CHECK ADMIN EDIT PERMISSION
// ==========================================================
//
// Morning:
//     editable until 4:00 PM.
//
// Evening:
//     editable from 4:00 PM until midnight.
//
// Previous days:
//     never editable.
// ==========================================================

function canAdminEditRecord(record) {

    if (
        !record ||
        !record.session ||
        !record.day
    ) {

        return false;
    }


    const now =
        getKenyaDateParts();


    if (
        record.day !== now.date
    ) {

        return false;
    }


    if (
        record.session === "morning"
    ) {

        return (
            now.timeMinutes <
            EVENING_START
        );
    }


    if (
        record.session === "evening"
    ) {

        return (
            now.timeMinutes >=
            EVENING_START
        );
    }


    return false;
}


// ==========================================================
// CREATE EMPTY DAILY SUMMARY
// ==========================================================

function createEmptySummaryData(
    day,
    price = DEFAULT_MILK_PRICE
) {

    return {

        day,

        month:
            day.slice(0, 7),

        price,

        produced: 0,

        consumed: 0,

        available: 0,

        cash: 0,

        locked: false,

        cowProduction: [],

        farmProduction: [],

        sales: []
    };
}


// ==========================================================
// GET OR CREATE DAILY SUMMARY
// ==========================================================

async function getOrCreateDailySummary(day) {

    let summary =
        await MilkSummary.findOne({
            day
        });


    if (!summary) {

        summary =
            await MilkSummary.create(
                createEmptySummaryData(day)
            );
    }


    return summary;
}


// ==========================================================
// CALCULATE SALES TOTALS
// ==========================================================

function calculateSalesTotals(sales) {

    const safeSales =
        Array.isArray(sales)
            ? sales
            : [];


    let consumed = 0;
    let cash = 0;


    for (
        const sale of safeSales
    ) {

        consumed +=
            Number(
                sale?.liters || 0
            );


        cash +=
            Number(
                sale?.cash || 0
            );
    }


    return {

        consumed,

        cash
    };
}


// ==========================================================
// SYNCHRONIZE DAILY MILK SUMMARY
// ==========================================================
//
// Milk is the source of truth for production.
//
// MilkSummary is rebuilt from Milk records.
//
// Sales are preserved.
// ==========================================================

async function synchronizeDailyMilkSummary(day) {

    if (!isValidDay(day)) {

        throw new Error(
            "A valid day is required."
        );
    }


    const milkRecords =
        await Milk
            .find({ day })
            .lean();


    let summary =
        await MilkSummary.findOne({
            day
        });


    const sales =
        Array.isArray(summary?.sales)
            ? summary.sales
            : [];


    const {
        consumed,
        cash
    } =
        calculateSalesTotals(
            sales
        );


    // ------------------------------------------------------
    // NO MILK RECORDS
    // ------------------------------------------------------

    if (
        milkRecords.length === 0
    ) {

        if (!summary) {

            summary =
                await MilkSummary.create({

                    ...createEmptySummaryData(day),

                    consumed,

                    cash
                });

        }

        else {

            summary.month =
                day.slice(0, 7);

            summary.produced = 0;

            summary.cowProduction = [];

            summary.farmProduction = [];

            summary.consumed =
                consumed;

            summary.cash =
                cash;

            summary.available = 0;

            await summary.save();
        }


        return summary;
    }


    // ------------------------------------------------------
    // GET COW IDS
    // ------------------------------------------------------

    const cowIds =
        milkRecords
            .map(
                record =>
                    record.dairy
            )
            .filter(Boolean);


    // ------------------------------------------------------
    // GET COWS
    // ------------------------------------------------------

    const cows =
        await Dairy
            .find({
                _id: {
                    $in: cowIds
                }
            })
            .select(
                "_id code assetCode name"
            )
            .lean();


    const cowMap =
        new Map();


    for (
        const cow of cows
    ) {

        cowMap.set(
            cow._id.toString(),
            cow
        );
    }


    // ------------------------------------------------------
    // COW PRODUCTION
    // ------------------------------------------------------

    const cowTotals =
        new Map();


    for (
        const record of milkRecords
    ) {

        if (!record.dairy) {
            continue;
        }


        const cowId =
            record.dairy.toString();


        const cow =
            cowMap.get(cowId);


        if (!cow) {
            continue;
        }


        const liters =
            Number(
                record.liters || 0
            );


        if (
            !Number.isFinite(liters)
        ) {

            continue;
        }


        if (
            !cowTotals.has(cowId)
        ) {

            cowTotals.set(
                cowId,
                {

                    dairy:
                        cow._id,

                    cowCode:
                        Number(cow.code),

                    farmCode:
                        Number(cow.assetCode),

                    liters: 0
                }
            );
        }


        cowTotals.get(cowId).liters +=
            liters;
    }


    // ------------------------------------------------------
    // GET FARM CODES
    // ------------------------------------------------------
    //
    // Animal:
    //
    //     assetCode = farm.code
    //
    // Farm:
    //
    //     code < 0
    // ------------------------------------------------------

    const farmCodes =
        [
            ...new Set(

                cows
                    .map(
                        cow =>
                            cow.assetCode
                    )

                    .filter(
                        code =>
                            code !== null &&
                            code !== undefined
                    )

                    .map(Number)

                    .filter(
                        code =>
                            Number.isFinite(code) &&
                            code < 0
                    )
            )
        ];


    // ------------------------------------------------------
    // GET FARMS
    // ------------------------------------------------------

    const farms =
        farmCodes.length > 0

            ? await Dairy
                .find({
                    code: {
                        $in: farmCodes
                    }
                })
                .select(
                    "_id code name"
                )
                .lean()

            : [];


    const farmMap =
        new Map();


    for (
        const farm of farms
    ) {

        farmMap.set(
            Number(farm.code),
            farm
        );
    }


    // ------------------------------------------------------
    // FARM PRODUCTION
    // ------------------------------------------------------

    const farmTotals =
        new Map();


    for (
        const cowProduction
        of cowTotals.values()
    ) {

        const farmCode =
            Number(
                cowProduction.farmCode
            );


        if (
            !Number.isFinite(farmCode) ||
            farmCode >= 0
        ) {

            continue;
        }


        const farm =
            farmMap.get(farmCode);


        if (!farm) {
            continue;
        }


        if (
            !farmTotals.has(farmCode)
        ) {

            farmTotals.set(
                farmCode,
                {

                    farm:
                        farm._id,

                    farmCode,

                    liters: 0
                }
            );
        }


        farmTotals.get(farmCode).liters +=
            Number(
                cowProduction.liters || 0
            );
    }


    // ------------------------------------------------------
    // TOTAL PRODUCTION
    // ------------------------------------------------------

    const produced =
        [
            ...cowTotals.values()
        ].reduce(
            (
                total,
                cow
            ) =>
                total +
                Number(
                    cow.liters || 0
                ),
            0
        );


    const cowProduction =
        [
            ...cowTotals.values()
        ];


    const farmProduction =
        [
            ...farmTotals.values()
        ];


    // ------------------------------------------------------
    // CREATE SUMMARY
    // ------------------------------------------------------

    if (!summary) {

        summary =
            await MilkSummary.create({

                day,

                month:
                    day.slice(0, 7),

                price:
                    DEFAULT_MILK_PRICE,

                produced,

                consumed,

                available:
                    Math.max(
                        0,
                        produced - consumed
                    ),

                cash,

                locked: false,

                cowProduction,

                farmProduction,

                sales
            });


        return summary;
    }


    // ------------------------------------------------------
    // UPDATE SUMMARY
    // ------------------------------------------------------

    summary.month =
        day.slice(0, 7);


    summary.produced =
        produced;


    summary.cowProduction =
        cowProduction;


    summary.farmProduction =
        farmProduction;


    summary.consumed =
        consumed;


    summary.cash =
        cash;


    summary.available =
        Math.max(
            0,
            produced - consumed
        );


    await summary.save();


    return summary;
}


// ==========================================================
// GET MILKING ANIMALS
// ==========================================================
//
// Eligible animals:
//
// • isMilking === true
// • code >= 0
// • code is even
// ==========================================================

async function getMilkingAnimals() {

    return Dairy
        .find({

            isMilking: true,

            code: {

                $gte: 0,

                $mod: [
                    2,
                    0
                ]
            }
        })

        .sort({
            code: 1
        })

        .lean();
}


// ==========================================================
// GET FARMS
// ==========================================================
//
// Farms are Dairy documents whose code is negative.
//
// This is intentionally separate from farmProduction.
//
// farmProduction = production statistics.
//
// farms = actual farm records available to the application.
// ==========================================================

async function getFarms() {

    return Dairy
        .find({

            code: {
                $lt: 0
            }
        })

        .select(
            "_id code name"
        )

        .sort({
            code: 1
        })

        .lean();
}


// ==========================================================
// FINALIZE ONE EXPIRED SESSION
// ==========================================================

async function finalizeExpiredMilkSession(
    sessionName,
    day
) {

    if (
        !sessionName ||
        !isValidDay(day)
    ) {

        return [];
    }


    const dairies =
        await getMilkingAnimals();


    if (
        dairies.length === 0
    ) {

        return [];
    }


    const existing =
        await Milk
            .find({
                day,
                session: sessionName
            })
            .select("dairy")
            .lean();


    const recorded =
        new Set(

            existing
                .filter(
                    record =>
                        record.dairy
                )
                .map(
                    record =>
                        record.dairy.toString()
                )
        );


    const documents = [];


    for (
        const dairy of dairies
    ) {

        const dairyId =
            dairy._id.toString();


        if (
            recorded.has(dairyId)
        ) {

            continue;
        }


        documents.push({

            dairy:
                dairy._id,

            liters: 0,

            remarks:
                "Not Milked",

            recordedBy: null,

            recordedBySystem:
                true,

            recordedByType:
                "system",

            session:
                sessionName,

            date:
                new Date(),

            day,

            month:
                day.slice(0, 7)
        });
    }


    if (
        documents.length === 0
    ) {

        await synchronizeDailyMilkSummary(
            day
        );

        return [];
    }


    try {

        const saved =
            await Milk.insertMany(
                documents,
                {
                    ordered: false
                }
            );


        await synchronizeDailyMilkSummary(
            day
        );


        return saved;

    }

    catch (error) {

        if (
            error?.code === 11000
        ) {

            await synchronizeDailyMilkSummary(
                day
            );

            return [];
        }


        throw error;
    }
}


// ==========================================================
// FINALIZE ALL EXPIRED SESSIONS
// ==========================================================

async function finalizeExpiredMilkSessions() {

    const now =
        getKenyaDateParts();


    const results = [];


    // ------------------------------------------------------
    // MORNING SESSION
    // ------------------------------------------------------

    if (
        now.timeMinutes >=
        MORNING_END
    ) {

        const morning =
            await finalizeExpiredMilkSession(
                "morning",
                now.date
            );


        results.push(
            ...morning
        );
    }


    // ------------------------------------------------------
    // PREVIOUS EVENING SESSION
    // ------------------------------------------------------

    if (
        now.timeMinutes <
        MORNING_END
    ) {

        const previousDay =
            getPreviousKenyaDate(
                now.date
            );


        const evening =
            await finalizeExpiredMilkSession(
                "evening",
                previousDay
            );


        results.push(
            ...evening
        );
    }


    return results;
}


// ==========================================================
// GET MILK PAGE DATA
// ==========================================================

async function getMilkPageData() {

    await finalizeExpiredMilkSessions();


    const dairies =
        await getMilkingAnimals();


    const current =
        getMilkSession();


    const today =
        current.day;


    // ------------------------------------------------------
    // MORNING RECORDS
    // ------------------------------------------------------

    const morningRecords =
        await Milk
            .find({
                day: today,
                session: "morning"
            })
            .populate(
                "recordedBy",
                "name"
            )
            .sort({
                date: 1
            })
            .lean();


    // ------------------------------------------------------
    // EVENING RECORDS
    // ------------------------------------------------------

    const eveningRecords =
        await Milk
            .find({
                day: today,
                session: "evening"
            })
            .populate(
                "recordedBy",
                "name"
            )
            .sort({
                date: 1
            })
            .lean();


    const morningMap =
        new Map();


    for (
        const record of morningRecords
    ) {

        if (!record.dairy) {
            continue;
        }


        morningMap.set(
            record.dairy.toString(),
            record
        );
    }


    const eveningMap =
        new Map();


    for (
        const record of eveningRecords
    ) {

        if (!record.dairy) {
            continue;
        }


        eveningMap.set(
            record.dairy.toString(),
            record
        );
    }


    // ------------------------------------------------------
    // ATTACH RECORDS
    // ------------------------------------------------------

    const dairiesWithRecords =
        dairies.map(
            dairy => {

                const dairyId =
                    dairy._id.toString();


                const morning =
                    morningMap.get(
                        dairyId
                    ) || null;


                const evening =
                    eveningMap.get(
                        dairyId
                    ) || null;


                return {

                    ...dairy,

                    morning,

                    evening,

                    morningRecorded:
                        !!morning,

                    eveningRecorded:
                        !!evening,

                    morningLiters:
                        morning
                            ? Number(
                                morning.liters || 0
                            )
                            : null,

                    eveningLiters:
                        evening
                            ? Number(
                                evening.liters || 0
                            )
                            : null
                };
            }
        );


    // ------------------------------------------------------
    // DISPLAY RECORDS
    // ------------------------------------------------------

    let displayRecords = [];


    if (
        current.name === "morning"
    ) {

        displayRecords =
            morningRecords;

    }

    else if (
        current.name === "closed"
    ) {

        displayRecords =
            morningRecords;

    }

    else if (
        current.name === "evening"
    ) {

        displayRecords =
            eveningRecords;
    }


    return {

        dairies:
            dairiesWithRecords,

        milkRecords:
            displayRecords,

        morningRecords,

        eveningRecords,

        session:
            current.name,

        sessionInfo:
            current,

        canSubmit:
            current.canSubmit,

        canEditMorning:
            current.name === "morning" ||
            current.name === "closed",

        canEditEvening:
            current.name === "evening"
    };
}


// ==========================================================
// SAVE MILK RECORDS
// ==========================================================

async function saveMilkRecords(
    records,
    user
) {

    if (
        !user ||
        !user._id
    ) {

        throw milkError(
            "MILK_USER_REQUIRED",
            "You must be logged in to record milk."
        );
    }


    if (!records) {

        throw milkError(
            "MILK_NO_RECORDS",
            "No milk records were submitted."
        );
    }


    let normalizedRecords = [];


    if (
        Array.isArray(records)
    ) {

        normalizedRecords =
            records;

    }

    else if (
        typeof records === "object"
    ) {

        normalizedRecords =
            Object.values(records);
    }


    if (
        normalizedRecords.length === 0
    ) {

        throw milkError(
            "MILK_NO_RECORDS",
            "No milk records were submitted."
        );
    }


    const current =
        getMilkSession();


    if (
        !current.canSubmit
    ) {

        throw milkError(
            "MILK_TIME_CLOSED",
            "Milk submission is currently closed. Morning collection is available from midnight to 10:00 AM, while evening collection is available from 4:00 PM until midnight."
        );
    }


    const session =
        current.name;


    const day =
        current.day;


    const cleanedRecords = [];


    for (
        const record of normalizedRecords
    ) {

        if (!record) {
            continue;
        }


        const dairyId =
            record.dairy ||
            record.dairyId;


        if (!dairyId) {
            continue;
        }


        if (
            !mongoose.Types.ObjectId.isValid(
                dairyId
            )
        ) {

            throw milkError(
                "MILK_INVALID_ANIMAL",
                "One of the submitted dairy animal IDs is invalid."
            );
        }


        if (
            record.liters === undefined ||
            record.liters === null ||
            record.liters === ""
        ) {

            throw milkError(
                "MILK_INVALID_QUANTITY",
                "Please enter a valid milk quantity for every animal being recorded."
            );
        }


        const liters =
            Number(record.liters);


        if (
            !Number.isFinite(liters) ||
            liters < 0
        ) {

            throw milkError(
                "MILK_INVALID_QUANTITY",
                "Milk quantity must be a valid number."
            );
        }


        cleanedRecords.push({

            dairy:
                dairyId,

            liters,

            remarks:
                typeof record.remarks === "string"
                    ? record.remarks.trim()
                    : ""
        });
    }


    if (
        cleanedRecords.length === 0
    ) {

        throw milkError(
            "MILK_NO_RECORDS",
            "No valid milk records were submitted. Please enter a milk quantity before saving."
        );
    }


    // ------------------------------------------------------
    // DUPLICATES
    // ------------------------------------------------------

    const submittedIds =
        new Set();


    for (
        const record of cleanedRecords
    ) {

        const dairyId =
            record.dairy.toString();


        if (
            submittedIds.has(dairyId)
        ) {

            throw milkError(
                "MILK_DUPLICATE_RECORD",
                "The same dairy animal was submitted more than once."
            );
        }


        submittedIds.add(dairyId);
    }


    // ------------------------------------------------------
    // VERIFY ANIMALS
    // ------------------------------------------------------

    const dairyIds =
        cleanedRecords.map(
            record =>
                record.dairy
        );


    const dairies =
        await Dairy
            .find({

                _id: {
                    $in: dairyIds
                },

                isMilking: true

            })
            .select(
                "_id code name isMilking assetCode"
            )
            .lean();


    const validDairyIds =
        new Set(

            dairies.map(
                dairy =>
                    dairy._id.toString()
            )
        );


    for (
        const record of cleanedRecords
    ) {

        if (
            !validDairyIds.has(
                record.dairy.toString()
            )
        ) {

            throw milkError(
                "MILK_INVALID_ANIMAL",
                "One or more selected animals are no longer marked as milking."
            );
        }
    }


    // ------------------------------------------------------
    // CHECK EXISTING RECORDS
    // ------------------------------------------------------

    const existing =
        await Milk
            .find({

                dairy: {
                    $in: dairyIds
                },

                day,

                session

            })
            .select(
                "dairy liters remarks session day"
            )
            .lean();


    if (
        existing.length > 0
    ) {

        throw milkError(
            "MILK_ALREADY_RECORDED",
            "A milk record has already been submitted for one or more animals in this session. Only an administrator can edit an existing record."
        );
    }


    // ------------------------------------------------------
    // BUILD DOCUMENTS
    // ------------------------------------------------------

    const documents =
        cleanedRecords.map(
            record => ({

                dairy:
                    record.dairy,

                liters:
                    record.liters,

                remarks:
                    record.remarks,

                recordedBy:
                    user._id,

                recordedBySystem:
                    false,

                recordedByType:
                    "user",

                session,

                date:
                    new Date(),

                day,

                month:
                    current.month
            })
        );


    // ------------------------------------------------------
    // INSERT
    // ------------------------------------------------------

    let saved;


    try {

        saved =
            await Milk.insertMany(
                documents,
                {
                    ordered: true
                }
            );

    }

    catch (error) {

        console.error(
            "Milk insert error:",
            error
        );


        if (
            error?.code === 11000
        ) {

            throw milkError(
                "MILK_ALREADY_RECORDED",
                "A milk record has already been submitted for one or more animals in this session. Only an administrator can edit an existing record."
            );
        }


        throw error;
    }


    if (
        !Array.isArray(saved) ||
        saved.length !== documents.length
    ) {

        throw milkError(
            "MILK_SAVE_FAILED",
            "The milk records could not be saved. Please try again."
        );
    }


    await synchronizeDailyMilkSummary(
        day
    );


    return saved;
}


// ==========================================================
// EDIT MILK RECORD
// ==========================================================

async function editMilkRecord({
    recordId,
    liters,
    remarks,
    user
}) {

    if (
        !user ||
        user.role !== "admin"
    ) {

        throw milkError(
            "MILK_ADMIN_REQUIRED",
            "Only an administrator can edit an existing milk record."
        );
    }


    if (
        !mongoose.Types.ObjectId.isValid(
            recordId
        )
    ) {

        throw milkError(
            "MILK_NOT_FOUND",
            "Invalid milk record."
        );
    }


    const record =
        await Milk.findById(
            recordId
        );


    if (!record) {

        throw milkError(
            "MILK_NOT_FOUND",
            "Milk record not found."
        );
    }


    if (
        !canAdminEditRecord(record)
    ) {

        const today =
            getKenyaDateParts().date;


        if (
            record.day !== today
        ) {

            throw milkError(
                "MILK_TIME_CLOSED",
                "This milk record belongs to a previous day and can no longer be edited."
            );
        }


        if (
            record.session === "morning"
        ) {

            throw milkError(
                "MILK_TIME_CLOSED",
                "Morning milk records can only be edited before the evening collection window begins at 4:00 PM."
            );
        }


        if (
            record.session === "evening"
        ) {

            throw milkError(
                "MILK_TIME_CLOSED",
                "Evening milk records can only be edited from 4:00 PM until midnight."
            );
        }


        throw milkError(
            "MILK_TIME_CLOSED",
            "This milk record cannot be edited."
        );
    }


    if (
        liters === undefined ||
        liters === null ||
        liters === ""
    ) {

        throw milkError(
            "MILK_INVALID_QUANTITY",
            "Milk quantity is required."
        );
    }


    const quantity =
        Number(liters);


    if (
        !Number.isFinite(quantity) ||
        quantity < 0
    ) {

        throw milkError(
            "MILK_INVALID_QUANTITY",
            "Invalid milk quantity."
        );
    }


    record.liters =
        quantity;


    record.remarks =
        typeof remarks === "string"
            ? remarks.trim()
            : "";


    await record.save();


    await synchronizeDailyMilkSummary(
        record.day
    );


    return record;
}


// ==========================================================
// GET CURRENT MILK PRICE
// ==========================================================

async function getCurrentPrice() {

    const latest =
        await MilkSummary
            .findOne({
                price: {
                    $gt: 0
                }
            })
            .sort({
                day: -1
            })
            .lean();


    return (
        latest?.price ||
        DEFAULT_MILK_PRICE
    );
}


// ==========================================================
// TOGGLE MILKING STATUS
// ==========================================================

async function toggleMilkingStatus({
    dairyId,
    user
}) {

    if (
        !user ||
        user.role !== "admin"
    ) {

        throw milkError(
            "MILK_ADMIN_REQUIRED",
            "Unauthorized. Only administrators can change milking status."
        );
    }


    if (
        !mongoose.Types.ObjectId.isValid(
            dairyId
        )
    ) {

        throw milkError(
            "MILK_INVALID_ANIMAL",
            "Invalid dairy animal ID."
        );
    }


    const dairy =
        await Dairy.findById(
            dairyId
        );


    if (!dairy) {

        throw milkError(
            "MILK_INVALID_ANIMAL",
            "Dairy animal not found."
        );
    }


    const code =
        Number(dairy.code);


    if (
        !Number.isFinite(code) ||
        code < 0 ||
        code % 2 !== 0
    ) {

        throw milkError(
            "MILK_INVALID_ANIMAL",
            "Only eligible female animals can be marked as milking."
        );
    }


    dairy.isMilking =
        !dairy.isMilking;


    await dairy.save();


    return dairy;
}


// ==========================================================
// GET DAILY STATS
// ==========================================================

async function getDailyStats(day) {

    if (!isValidDay(day)) {

        throw new Error(
            "A valid day is required."
        );
    }


    await synchronizeDailyMilkSummary(
        day
    );


    const report =
        await Milk.getDailyReport(
            day
        );


    let summary =
        await MilkSummary.findOne({
            day
        });


    if (!summary) {

        summary =
            await MilkSummary.create(
                createEmptySummaryData(day)
            );
    }


    const sales =
        Array.isArray(summary.sales)
            ? summary.sales
            : [];


    const {
        consumed,
        cash
    } =
        calculateSalesTotals(
            sales
        );


    const total =
        Number(
            report?.stats?.total || 0
        );


    const available =
        Math.max(
            0,
            total - consumed
        );


    if (
        Number(summary.produced || 0) !== total ||
        Number(summary.consumed || 0) !== consumed ||
        Number(summary.available || 0) !== available ||
        Number(summary.cash || 0) !== cash
    ) {

        summary.produced =
            total;

        summary.consumed =
            consumed;

        summary.available =
            available;

        summary.cash =
            cash;

        await summary.save();
    }


    return {

        records:
            report?.records || [],

        sales,

        stats: {

            total,

            produced:
                total,

            consumed,

            available,

            price:
                summary.price ||
                DEFAULT_MILK_PRICE,

            cash,

            locked:
                !!summary.locked,

            cowProduction:
                summary.cowProduction || [],

            farmProduction:
                summary.farmProduction || []
        }
    };
}


// ==========================================================
// GET MONTHLY STATS
// ==========================================================

async function getMonthlyStats(month) {

    if (
        !isValidMonth(month)
    ) {

        throw new Error(
            "A valid month is required."
        );
    }


    const report =
        await Milk.getMonthlyReport(
            month
        );


    // ------------------------------------------------------
    // ALL DAIRY DOCUMENTS
    // ------------------------------------------------------

    const dairies =
        await Dairy
            .find()
            .lean();


    const dairyMap =
        new Map();


    for (
        const dairy of dairies
    ) {

        dairyMap.set(
            dairy._id.toString(),
            dairy
        );
    }


    // ------------------------------------------------------
    // MONTHLY ANIMAL REPORT
    // ------------------------------------------------------

    const records =
        (
            report?.records || []
        ).map(
            record => {

                const dairyId =
                    record.dairy?.toString();


                return {

                    dairy:
                        dairyId
                            ? dairyMap.get(
                                dairyId
                            ) || null
                            : null,

                    total:
                        Number(
                            record.total || 0
                        ),

                    avg:
                        Number(
                            record.avg || 0
                        )
                };
            }
        );


    // ------------------------------------------------------
    // DAILY SUMMARIES
    // ------------------------------------------------------

    const summaries =
        await MilkSummary
            .find({
                month
            })
            .lean();


    let totalConsumed = 0;
    let totalCash = 0;
    let totalPrice = 0;
    let totalProduced = 0;


    const sales = [];


    const farmProductionMap =
        new Map();


    const cowProductionMap =
        new Map();


    // ------------------------------------------------------
    // COMBINE DAILY SUMMARIES
    // ------------------------------------------------------

    for (
        const summary of summaries
    ) {

        totalPrice +=
            Number(
                summary.price || 0
            );


        totalProduced +=
            Number(
                summary.produced || 0
            );


        // --------------------------------------------------
        // SALES
        // --------------------------------------------------

        for (
            const sale of
            summary.sales || []
        ) {

            totalConsumed +=
                Number(
                    sale.liters || 0
                );


            totalCash +=
                Number(
                    sale.cash || 0
                );


            sales.push(sale);
        }


        // --------------------------------------------------
        // FARM PRODUCTION
        // --------------------------------------------------

        for (
            const farm of
            summary.farmProduction || []
        ) {

            const farmCode =
                Number(
                    farm.farmCode
                );


            if (
                !Number.isFinite(farmCode)
            ) {

                continue;
            }


            if (
                !farmProductionMap.has(
                    farmCode
                )
            ) {

                farmProductionMap.set(
                    farmCode,
                    {

                        farm:
                            farm.farm,

                        farmCode,

                        liters: 0
                    }
                );
            }


            farmProductionMap
                .get(farmCode)
                .liters +=
                Number(
                    farm.liters || 0
                );
        }


        // --------------------------------------------------
        // COW PRODUCTION
        // --------------------------------------------------

        for (
            const cow of
            summary.cowProduction || []
        ) {

            const cowId =
                cow.dairy?.toString();


            if (!cowId) {
                continue;
            }


            if (
                !cowProductionMap.has(
                    cowId
                )
            ) {

                cowProductionMap.set(
                    cowId,
                    {

                        dairy:
                            cow.dairy,

                        cowCode:
                            Number(
                                cow.cowCode
                            ),

                        farmCode:
                            Number(
                                cow.farmCode
                            ),

                        liters: 0
                    }
                );
            }


            cowProductionMap
                .get(cowId)
                .liters +=
                Number(
                    cow.liters || 0
                );
        }
    }


    // ------------------------------------------------------
    // FALLBACK PRODUCTION
    // ------------------------------------------------------

    if (
        totalProduced === 0
    ) {

        totalProduced =
            records.reduce(
                (
                    total,
                    record
                ) =>
                    total +
                    Number(
                        record.total || 0
                    ),
                0
            );
    }


    return {

        records,

        sales,

        farmProduction:
            [
                ...farmProductionMap.values()
            ],

        cowProduction:
            [
                ...cowProductionMap.values()
            ],

        stats: {

            total:
                totalProduced,

            produced:
                totalProduced,

            consumed:
                totalConsumed,

            available:
                Math.max(
                    0,
                    totalProduced -
                    totalConsumed
                ),

            price:
                summaries.length > 0
                    ? totalPrice /
                      summaries.length
                    : DEFAULT_MILK_PRICE,

            cash:
                totalCash,

            locked:
                false,

            avg:
                records.length > 0
                    ? totalProduced /
                      records.length
                    : 0
        }
    };
}


// ==========================================================
// SAVE DAILY STATS
// ==========================================================

async function saveDailyStats({
    day,
    price
}) {

    if (
        !isValidDay(day)
    ) {

        throw new Error(
            "A valid day is required."
        );
    }


    const numericPrice =
        Number(price);


    if (
        !Number.isFinite(numericPrice) ||
        numericPrice < 0
    ) {

        throw new Error(
            "Invalid milk price."
        );
    }


    await synchronizeDailyMilkSummary(
        day
    );


    let summary =
        await MilkSummary.findOne({
            day
        });


    if (!summary) {

        summary =
            await MilkSummary.create(
                createEmptySummaryData(
                    day,
                    numericPrice
                )
            );
    }


    const sales =
        Array.isArray(summary.sales)
            ? summary.sales
            : [];


    const {
        consumed,
        cash
    } =
        calculateSalesTotals(
            sales
        );


    summary.price =
        numericPrice;


    summary.consumed =
        consumed;


    summary.available =
        Math.max(
            0,
            Number(summary.produced || 0) -
            consumed
        );


    summary.cash =
        cash;


    await summary.save();


    return summary;
}


// ==========================================================
// GET SALES PAGE DATA
// ==========================================================

async function getSalesPageData() {

    const today =
        getKenyaDateParts().date;


    await synchronizeDailyMilkSummary(
        today
    );


    const summary =
        await getOrCreateDailySummary(
            today
        );


    // ------------------------------------------------------
    // GET ACTUAL FARM RECORDS
    // ------------------------------------------------------
    //
    // IMPORTANT:
    //
    // These are NOT taken from farmProduction.
    //
    // farmProduction contains statistical production data.
    //
    // farms contains the actual Dairy documents representing
    // farms.
    //
    // Farms are identified by negative code.
    // ------------------------------------------------------

    const farms =
        await getFarms();


    // ------------------------------------------------------
    // STANDING ORDERS
    // ------------------------------------------------------

    const standingOrders =
        await StandingOrder
            .find({

                omitted: false,

                isActive: true,

                effectiveDate: {
                    $lte: new Date()
                }
            })
            .sort({
                customerName: 1
            })
            .lean();


    const sales =
        Array.isArray(summary.sales)
            ? summary.sales
            : [];


    for (
        const order of standingOrders
    ) {

        order.saleRecordedToday =
            sales.some(
                sale =>

                    sale.standingOrderId &&

                    sale.standingOrderId
                        .toString() ===
                    order._id.toString()
            );


        order.isFuture =
            order.effectiveDate &&
            new Date(order.effectiveDate) >
            new Date();
    }


    // ------------------------------------------------------
    // MANUAL SALES
    // ------------------------------------------------------

    const manualSales =
        sales.filter(
            sale =>
                !sale.standingOrderId
        );


    // ------------------------------------------------------
    // PRODUCTION
    // ------------------------------------------------------

    const report =
        await Milk.getDailyReport(
            today
        );


    const totalProduced =
        Number(
            report?.stats?.total || 0
        );


    // ------------------------------------------------------
    // SALES TOTAL
    // ------------------------------------------------------

    const totalSales =
        sales.reduce(
            (
                total,
                sale
            ) =>
                total +
                Number(
                    sale.liters || 0
                ),
            0
        );


    const availableMilk =
        Math.max(
            0,
            totalProduced -
            totalSales
        );


    return {

        // --------------------------------------------------
        // ACTUAL FARMS
        // --------------------------------------------------

        farms,

        // --------------------------------------------------
        // STANDING ORDERS
        // --------------------------------------------------

        standingOrders,

        // --------------------------------------------------
        // MANUAL SALES
        // --------------------------------------------------

        manualSales,

        // --------------------------------------------------
        // PRICE
        // --------------------------------------------------

        currentPrice:
            summary.price ||
            DEFAULT_MILK_PRICE,

        // --------------------------------------------------
        // SALES / MILK
        // --------------------------------------------------

        totalSales,

        availableMilk,

        totalProduced,

        // --------------------------------------------------
        // PRODUCTION BREAKDOWN
        // --------------------------------------------------

        cowProduction:
            summary.cowProduction || [],

        farmProduction:
            summary.farmProduction || []
    };
}


// ==========================================================
// SUBMIT MANUAL SALE
// ==========================================================

async function submitManualSale({
    customerName,
    liters
}) {

    if (
        typeof customerName !== "string" ||
        !customerName.trim()
    ) {

        throw new Error(
            "Customer name is required."
        );
    }


    const quantity =
        Number(liters);


    if (
        !Number.isFinite(quantity) ||
        quantity <= 0
    ) {

        throw new Error(
            "Invalid milk quantity."
        );
    }


    const today =
        getKenyaDateParts().date;


    await synchronizeDailyMilkSummary(
        today
    );


    const summary =
        await getOrCreateDailySummary(
            today
        );


    const price =
        summary.price ||
        DEFAULT_MILK_PRICE;


    const produced =
        Number(
            summary.produced || 0
        );


    const {
        consumed
    } =
        calculateSalesTotals(
            summary.sales
        );


    const available =
        Math.max(
            0,
            produced - consumed
        );


    if (
        quantity > available
    ) {

        throw new Error(
            `Insufficient milk available. Only ${available.toFixed(2)} L remaining.`
        );
    }


    if (
        !Array.isArray(summary.sales)
    ) {

        summary.sales = [];
    }


    summary.sales.push({

        customerName:
            customerName.trim(),

        liters:
            quantity,

        price,

        cash:
            quantity * price
    });


    const totals =
        calculateSalesTotals(
            summary.sales
        );


    summary.consumed =
        totals.consumed;


    summary.cash =
        totals.cash;


    summary.available =
        Math.max(
            0,
            produced -
            summary.consumed
        );


    await summary.save();


    return summary;
}


// ==========================================================
// SUBMIT STANDING ORDER SALE
// ==========================================================

async function submitStandingOrderSale({
    standingOrderId
}) {

    if (
        !mongoose.Types.ObjectId.isValid(
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
            "Standing order not found."
        );
    }


    if (
        order.omitted === true ||
        order.isActive === false
    ) {

        throw new Error(
            "This standing order is no longer active."
        );
    }


    const today =
        getKenyaDateParts().date;


    await synchronizeDailyMilkSummary(
        today
    );


    const summary =
        await getOrCreateDailySummary(
            today
        );


    const sales =
        Array.isArray(summary.sales)
            ? summary.sales
            : [];


    // ------------------------------------------------------
    // PREVENT DUPLICATE DAILY SALE
    // ------------------------------------------------------

    const alreadyProcessed =
        sales.some(
            sale =>

                sale.standingOrderId &&

                sale.standingOrderId
                    .toString() ===
                standingOrderId.toString()
        );


    if (
        alreadyProcessed
    ) {

        throw new Error(
            "Standing order has already been processed today."
        );
    }


    // ------------------------------------------------------
    // VALIDATE QUANTITY
    // ------------------------------------------------------

    const orderLiters =
        Number(order.liters);


    if (
        !Number.isFinite(orderLiters) ||
        orderLiters <= 0
    ) {

        throw new Error(
            "Invalid standing order quantity."
        );
    }


    const price =
        summary.price ||
        DEFAULT_MILK_PRICE;


    const produced =
        Number(
            summary.produced || 0
        );


    const {
        consumed
    } =
        calculateSalesTotals(
            sales
        );


    const available =
        Math.max(
            0,
            produced - consumed
        );


    if (
        orderLiters > available
    ) {

        throw new Error(
            `Insufficient milk available. Only ${available.toFixed(2)} L remaining.`
        );
    }


    // ------------------------------------------------------
    // ADD SALE
    // ------------------------------------------------------

    sales.push({

        customerName:
            order.customerName,

        liters:
            orderLiters,

        price,

        cash:
            orderLiters * price,

        standingOrderId:
            order._id
    });


    summary.sales =
        sales;


    const totals =
        calculateSalesTotals(
            summary.sales
        );


    summary.consumed =
        totals.consumed;


    summary.cash =
        totals.cash;


    summary.available =
        Math.max(
            0,
            produced -
            summary.consumed
        );


    await summary.save();


    return summary;
}


// ==========================================================
// UPDATE MILK PRICE
// ==========================================================

async function updateMilkPrice(price) {

    const numericPrice =
        Number(price);


    if (
        !Number.isFinite(numericPrice) ||
        numericPrice < 0
    ) {

        throw new Error(
            "Invalid milk price."
        );
    }


    const today =
        getKenyaDateParts().date;


    await synchronizeDailyMilkSummary(
        today
    );


    const summary =
        await getOrCreateDailySummary(
            today
        );


    summary.price =
        numericPrice;


    await summary.save();


    return summary;
}


// ==========================================================
// ADD STANDING ORDER
// ==========================================================

async function addStandingOrder({
    customerName,
    liters
}) {

    if (
        typeof customerName !== "string" ||
        !customerName.trim()
    ) {

        throw new Error(
            "Customer name is required."
        );
    }


    const quantity =
        Number(liters);


    if (
        !Number.isFinite(quantity) ||
        quantity <= 0
    ) {

        throw new Error(
            "Invalid standing order quantity."
        );
    }


    return StandingOrder.create({

        customerName:
            customerName.trim(),

        liters:
            quantity
    });
}


// ==========================================================
// OMIT STANDING ORDER
// ==========================================================

async function omitStandingOrder({
    orderId,
    user
}) {

    if (
        !user ||
        user.role !== "admin"
    ) {

        throw milkError(
            "MILK_ADMIN_REQUIRED",
            "Only administrators can omit standing orders."
        );
    }


    if (
        !mongoose.Types.ObjectId.isValid(
            orderId
        )
    ) {

        throw new Error(
            "Invalid standing order ID."
        );
    }


    const order =
        await StandingOrder.findById(
            orderId
        );


    if (!order) {

        throw new Error(
            "Standing order not found."
        );
    }


    order.omitted = true;

    order.isActive = false;


    await order.save();


    return order;
}


// ==========================================================
// GET MILKING HISTORY
// ==========================================================

async function getMilkingHistory({
    dairyId,
    month
}) {

    if (
        !mongoose.Types.ObjectId.isValid(
            dairyId
        )
    ) {

        throw new Error(
            "Invalid dairy animal ID."
        );
    }


    if (
        month &&
        !isValidMonth(month)
    ) {

        throw new Error(
            "Invalid month."
        );
    }


    const dairy =
        await Dairy
            .findById(dairyId)
            .lean();


    if (!dairy) {

        throw new Error(
            "Dairy animal not found."
        );
    }


    const filter = {

        dairy:
            dairyId
    };


    if (month) {

        filter.month =
            month;
    }


    const records =
        await Milk
            .find(filter)
            .populate(
                "recordedBy",
                "name"
            )
            .sort({
                date: -1
            })
            .lean();


    // ------------------------------------------------------
    // GROUP BY DAY
    // ------------------------------------------------------

    const grouped = {};


    for (
        const record of records
    ) {

        const day =
            record.day;


        if (!grouped[day]) {

            grouped[day] = {

                entries: [],

                total: 0
            };
        }


        grouped[day]
            .entries
            .push(record);


        grouped[day]
            .total +=
            Number(
                record.liters || 0
            );
    }


    // ------------------------------------------------------
    // MONTHLY TOTAL
    // ------------------------------------------------------

    const monthlyTotal =
        records.reduce(
            (
                total,
                record
            ) =>
                total +
                Number(
                    record.liters || 0
                ),
            0
        );


    return {

        dairy,

        records,

        grouped,

        monthlyTotal,

        hasData:
            records.length > 0
    };
}


// ==========================================================
// LOCK DAILY SUMMARY
// ==========================================================

async function lockDay(day) {

    if (!isValidDay(day)) {

        throw new Error(
            "A valid day is required."
        );
    }


    const summary =
        await MilkSummary.findOne({
            day
        });


    if (!summary) {

        throw new Error(
            "Daily summary not found."
        );
    }


    summary.locked = true;


    await summary.save();


    return summary;
}


// ==========================================================
// UNLOCK DAILY SUMMARY
// ==========================================================

async function unlockDay(day) {

    if (!isValidDay(day)) {

        throw new Error(
            "A valid day is required."
        );
    }


    const summary =
        await MilkSummary.findOne({
            day
        });


    if (!summary) {

        throw new Error(
            "Daily summary not found."
        );
    }


    summary.locked = false;


    await summary.save();


    return summary;
}


// ==========================================================
// EXPORT SERVICE API
// ==========================================================

module.exports = {

    // ------------------------------------------------------
    // Milk collection
    // ------------------------------------------------------

    getMilkingAnimals,

    getMilkPageData,

    saveMilkRecords,

    editMilkRecord,


    // ------------------------------------------------------
    // Farms
    // ------------------------------------------------------

    getFarms,


    // ------------------------------------------------------
    // Sessions
    // ------------------------------------------------------

    getMilkSession,

    getKenyaDateParts,

    getSessionDeadline,

    canSubmitSession,

    canAdminEditRecord,

    finalizeExpiredMilkSession,

    finalizeExpiredMilkSessions,


    // ------------------------------------------------------
    // Summaries / statistics
    // ------------------------------------------------------

    synchronizeDailyMilkSummary,

    getDailyStats,

    getMonthlyStats,

    saveDailyStats,


    // ------------------------------------------------------
    // Milk price
    // ------------------------------------------------------

    getCurrentPrice,

    updateMilkPrice,


    // ------------------------------------------------------
    // Milking status
    // ------------------------------------------------------

    toggleMilkingStatus,


    // ------------------------------------------------------
    // Sales
    // ------------------------------------------------------

    getSalesPageData,

    submitManualSale,

    submitStandingOrderSale,


    // ------------------------------------------------------
    // Standing orders
    // ------------------------------------------------------

    addStandingOrder,

    omitStandingOrder,


    // ------------------------------------------------------
    // History
    // ------------------------------------------------------

    getMilkingHistory,


    // ------------------------------------------------------
    // Daily locking
    // ------------------------------------------------------

    lockDay,

    unlockDay
};