// ==========================================================
// services/milkService.js
// ==========================================================
//
// CENTRAL MILK BUSINESS-LOGIC SERVICE
//
// Used by:
//
//     controllers/milkController.js
//     controllers/milkCollectController.js
//
// Responsibilities:
//
// • Milk collection
// • Morning / evening sessions
// • Milking animals
// • Assigned-farm access
// • Milk record creation
// • Farm milk totals
// • Automatic session finalization
// • Administrator editing
// • Milking status
// • Daily statistics
// • Monthly statistics
// • Milk pricing
// • Milk sales
// • Standing orders
// • Milking history
// • Daily summary locking
//
// Page rendering belongs to controllers.
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

// ==========================================================
// SESSION TIMES
// ==========================================================
//
// 00:00 - 09:59  = MORNING
// 10:00 - 15:59  = CLOSED
// 16:00 - 23:59  = EVENING
//
// ==========================================================

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
// GET KENYA DATE PARTS
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

    const get = (name) =>
        Number(
            parts.find(
                (part) =>
                    part.type === name
            )?.value || 0
        );

    const year = get("year");
    const month = get("month");
    const day = get("day");
    const hour = get("hour");
    const minute = get("minute");
    const second = get("second");

    return {
        year,
        month,
        day,
        hour,
        minute,
        second,

        date:
            `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,

        monthKey:
            `${year}-${String(month).padStart(2, "0")}`,

        timeMinutes:
            hour * 60 + minute
    };
}

// ==========================================================
// PREVIOUS KENYA DATE
// ==========================================================

function getPreviousKenyaDate() {
    const now = getKenyaDateParts();

    const date = new Date(
        `${now.date}T12:00:00+03:00`
    );

    date.setDate(
        date.getDate() - 1
    );

    const year = date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// ==========================================================
// GET CURRENT MILK SESSION
// ==========================================================

function getMilkSession() {
    const now = getKenyaDateParts();

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
    // CLOSED PERIOD
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
// SESSION DEADLINE
// ==========================================================

function getSessionDeadline(sessionName) {
    const now = getKenyaDateParts();

    if (
        sessionName ===
        "morning"
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
        sessionName ===
        "evening"
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
// CAN SUBMIT SESSION
// ==========================================================

function canSubmitSession(sessionName) {
    const now = getKenyaDateParts();

    if (
        sessionName ===
        "morning"
    ) {
        return (
            now.timeMinutes <
            MORNING_END
        );
    }

    if (
        sessionName ===
        "evening"
    ) {
        return (
            now.timeMinutes >=
            EVENING_START
        );
    }

    return false;
}

// ==========================================================
// REQUIRE USER
// ==========================================================

function requireUser(user) {
    if (
        !user ||
        !user._id
    ) {
        throw milkError(
            "MILK_USER_REQUIRED",
            "A logged-in user is required."
        );
    }
}

// ==========================================================
// REQUIRE ADMIN
// ==========================================================

function requireAdmin(user) {
    requireUser(user);

    if (
        user.role !==
        "admin"
    ) {
        throw milkError(
            "MILK_ADMIN_REQUIRED",
            "Only an administrator can perform this action."
        );
    }
}

// ==========================================================
// NORMALIZE ASSIGNED FARM IDS
// ==========================================================

function getAssignedFarmIds(user) {
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
            (id) =>
                mongoose.Types.ObjectId.isValid(
                    id
                )
        )
        .map(
            (id) =>
                id.toString()
        );
}

// ==========================================================
// GET ALL MILKING ANIMALS
// ==========================================================

exports.getMilkingAnimals =
    async function () {
        return Dairy.find({
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
    };

// ==========================================================
// VERIFY ANIMAL ACCESS
// ==========================================================

async function verifyAnimalAccess(
    dairyId,
    user
) {
    requireUser(user);

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
        ).lean();

    if (!dairy) {
        throw milkError(
            "MILK_INVALID_ANIMAL",
            "Dairy animal not found."
        );
    }

    if (
        dairy.isMilking !==
        true
    ) {
        throw milkError(
            "MILK_INVALID_ANIMAL",
            "This animal is not currently marked as milking."
        );
    }

    if (
        dairy.code < 0 ||
        dairy.code % 2 !== 0
    ) {
        throw milkError(
            "MILK_INVALID_ANIMAL",
            "Only eligible female dairy animals can have milk records."
        );
    }

    // ------------------------------------------------------
    // ADMIN HAS FULL ACCESS
    // ------------------------------------------------------

    if (
        user.role ===
        "admin"
    ) {
        return dairy;
    }

    // ------------------------------------------------------
    // ONLY DAIRY WORKERS CAN ACCESS ASSIGNED FARMS
    // ------------------------------------------------------

    if (
        user.role !==
        "dairyWorker"
    ) {
        throw milkError(
            "MILK_ACCESS_DENIED",
            "You are not authorized to access this dairy animal."
        );
    }

    const assignedFarmIds =
        getAssignedFarmIds(user);

    if (
        !assignedFarmIds.length
    ) {
        throw milkError(
            "MILK_ACCESS_DENIED",
            "No dairy farm is assigned to your account."
        );
    }

    if (
        !dairy.farm
    ) {
        throw milkError(
            "MILK_ACCESS_DENIED",
            "This dairy animal is not assigned to a dairy farm."
        );
    }

    const farmId =
        dairy.farm._id
            ? dairy.farm._id.toString()
            : dairy.farm.toString();

    if (
        !assignedFarmIds.includes(
            farmId
        )
    ) {
        throw milkError(
            "MILK_ACCESS_DENIED",
            "This dairy animal is not assigned to your dairy farm."
        );
    }

    return dairy;
}

// ==========================================================
// CALCULATE FARM TOTALS
// ==========================================================

async function calculateFarmTotals(
    day,
    session
) {
    const records =
        await Milk.find({
            day,
            session
        })
            .select(
                "dairy liters"
            )
            .lean();

    if (
        !records.length
    ) {
        return [];
    }

    const dairyIds =
        records
            .filter(
                (record) =>
                    record.dairy
            )
            .map(
                (record) =>
                    record.dairy
            );

    const dairies =
        await Dairy.find({
            _id: {
                $in: dairyIds
            }
        })
            .select(
                "_id farm"
            )
            .lean();

    const dairyMap =
        new Map();

    dairies.forEach(
        (dairy) => {
            if (
                dairy.farm
            ) {
                dairyMap.set(
                    dairy._id.toString(),

                    dairy.farm._id
                        ? dairy.farm._id.toString()
                        : dairy.farm.toString()
                );
            }
        }
    );

    const totals =
        new Map();

    records.forEach(
        (record) => {
            if (
                !record.dairy
            ) {
                return;
            }

            const farmId =
                dairyMap.get(
                    record.dairy.toString()
                );

            if (
                !farmId
            ) {
                return;
            }

            const current =
                totals.get(
                    farmId
                ) || 0;

            totals.set(
                farmId,
                current +
                    Number(
                        record.liters || 0
                    )
            );
        }
    );

    return Array.from(
        totals.entries()
    ).map(
        ([farm, total]) => ({
            farm,
            total
        })
    );
}

// ==========================================================
// UPDATE FARM TOTALS
// ==========================================================

async function updateFarmTotals(
    day,
    session
) {
    if (
        !day ||
        !session
    ) {
        return null;
    }

    let summary =
        await MilkSummary.findOne({
            day
        });

    if (!summary) {
        summary =
            await MilkSummary.create({
                day,
                month:
                    day.slice(0, 7),
                price:
                    DEFAULT_MILK_PRICE,
                consumed: 0,
                available: 0,
                cash: 0,
                locked: false,
                sales: [],
                farmTotal: []
            });
    }

    const morningTotals =
        await calculateFarmTotals(
            day,
            "morning"
        );

    const eveningTotals =
        await calculateFarmTotals(
            day,
            "evening"
        );

    const farmMap =
        new Map();

    morningTotals.forEach(
        (item) => {
            farmMap.set(
                item.farm,
                Number(
                    item.total || 0
                )
            );
        }
    );

    eveningTotals.forEach(
        (item) => {
            farmMap.set(
                item.farm,

                (
                    farmMap.get(
                        item.farm
                    ) || 0
                ) +
                    Number(
                        item.total || 0
                    )
            );
        }
    );

    summary.farmTotal =
        Array.from(
            farmMap.entries()
        ).map(
            ([farm, total]) => ({
                farm,
                total
            })
        );

    await summary.save();

    return summary.farmTotal;
}

// ==========================================================
// FINALIZE EXPIRED MILK SESSION
// ==========================================================

exports.finalizeExpiredMilkSession =
    async function (
        sessionName,
        day
    ) {
        if (
            !sessionName ||
            !day
        ) {
            return [];
        }

        const dairies =
            await exports.getMilkingAnimals();

        if (
            !dairies.length
        ) {
            return [];
        }

        const existing =
            await Milk.find({
                day,
                session:
                    sessionName
            })
                .select(
                    "dairy"
                )
                .lean();

        const recorded =
            new Set(
                existing
                    .filter(
                        (record) =>
                            record.dairy
                    )
                    .map(
                        (record) =>
                            record.dairy.toString()
                    )
            );

        const docs = [];

        for (
            const dairy of dairies
        ) {
            const dairyId =
                dairy._id.toString();

            if (
                recorded.has(
                    dairyId
                )
            ) {
                continue;
            }

            docs.push({
                dairy:
                    dairy._id,

                liters: 0,

                remarks:
                    "Not Milked",

                recordedBy:
                    null,

                recordedByType:
                    "system",

                recordedBySystem:
                    true,

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
            !docs.length
        ) {
            await updateFarmTotals(
                day,
                sessionName
            );

            return [];
        }

        let saved;

        try {
            saved =
                await Milk.insertMany(
                    docs,
                    {
                        ordered:
                            false
                    }
                );
        }
        catch (error) {
            if (
                error?.code !==
                11000
            ) {
                throw error;
            }

            saved = [];
        }

        await updateFarmTotals(
            day,
            sessionName
        );

        return saved;
    };

// ==========================================================
// FINALIZE EXPIRED SESSIONS
// ==========================================================

exports.finalizeExpiredMilkSessions =
    async function () {
        const now =
            getKenyaDateParts();

        const results = [];

        // ----------------------------------------------------
        // MORNING HAS EXPIRED
        // ----------------------------------------------------

        if (
            now.timeMinutes >=
            MORNING_END
        ) {
            results.push(
                await exports.finalizeExpiredMilkSession(
                    "morning",
                    now.date
                )
            );
        }

        // ----------------------------------------------------
        // BEFORE 10:00 AM, FINALIZE PREVIOUS EVENING
        // ----------------------------------------------------

        if (
            now.timeMinutes <
            MORNING_END
        ) {
            const previousDay =
                getPreviousKenyaDate();

            results.push(
                await exports.finalizeExpiredMilkSession(
                    "evening",
                    previousDay
                )
            );
        }

        return results.flat();
    };

// ==========================================================
// SAVE MILK RECORDS
// ==========================================================
//
// Used by milkCollectController.js
//
// ==========================================================

exports.saveMilkRecords =
    async function (
        records,
        user
    ) {
        requireUser(user);

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
            typeof records ===
            "object"
        ) {
            normalizedRecords =
                Object.values(
                    records
                );
        }

        if (
            !normalizedRecords.length
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

        // ----------------------------------------------------
        // CLEAN SUBMITTED RECORDS
        // ----------------------------------------------------

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

            const liters =
                Number(
                    record.liters
                );

            if (
                record.liters ===
                    undefined ||
                record.liters ===
                    null ||
                record.liters ===
                    "" ||
                !Number.isFinite(
                    liters
                ) ||
                liters < 0
            ) {
                throw milkError(
                    "MILK_INVALID_QUANTITY",
                    "Please enter a valid milk quantity for every animal being recorded."
                );
            }

            cleanedRecords.push({
                dairy:
                    dairyId,

                liters,

                remarks:
                    typeof record.remarks ===
                    "string"
                        ? record.remarks.trim()
                        : ""
            });
        }

        if (
            !cleanedRecords.length
        ) {
            throw milkError(
                "MILK_NO_RECORDS",
                "No valid milk records were submitted. Please enter a milk quantity before saving."
            );
        }

        // ----------------------------------------------------
        // PREVENT DUPLICATE ANIMALS IN ONE SUBMISSION
        // ----------------------------------------------------

        const submittedIds =
            new Set();

        for (
            const record of cleanedRecords
        ) {
            const dairyId =
                record.dairy.toString();

            if (
                submittedIds.has(
                    dairyId
                )
            ) {
                throw milkError(
                    "MILK_DUPLICATE_RECORD",
                    "The same dairy animal was submitted more than once."
                );
            }

            submittedIds.add(
                dairyId
            );
        }

        // ----------------------------------------------------
        // VERIFY ACCESS
        // ----------------------------------------------------

        for (
            const record of cleanedRecords
        ) {
            await verifyAnimalAccess(
                record.dairy,
                user
            );
        }

        const dairyIds =
            cleanedRecords.map(
                (record) =>
                    record.dairy
            );

        // ----------------------------------------------------
        // CHECK EXISTING RECORDS
        // ----------------------------------------------------

        const existing =
            await Milk.find({
                dairy: {
                    $in:
                        dairyIds
                },

                day,

                session
            })
                .select(
                    "dairy liters remarks session day"
                )
                .lean();

        if (
            existing.length
        ) {
            throw milkError(
                "MILK_ALREADY_RECORDED",
                "A milk record has already been submitted for one or more animals in this session. Only an administrator can edit an existing record."
            );
        }

        // ----------------------------------------------------
        // CREATE RECORDS
        // ----------------------------------------------------

        const docs =
            cleanedRecords.map(
                (record) => ({
                    dairy:
                        record.dairy,

                    liters:
                        record.liters,

                    remarks:
                        record.remarks,

                    recordedBy:
                        user._id,

                    recordedByType:
                        "user",

                    recordedBySystem:
                        false,

                    session,

                    date:
                        new Date(),

                    day,

                    month:
                        current.month
                })
            );

        let saved;

        try {
            saved =
                await Milk.insertMany(
                    docs,
                    {
                        ordered:
                            true
                    }
                );
        }
        catch (error) {
            if (
                error?.code ===
                11000
            ) {
                throw milkError(
                    "MILK_ALREADY_RECORDED",
                    "A milk record has already been submitted for one or more animals in this session. Only an administrator can edit an existing record."
                );
            }

            throw error;
        }

        if (
            !saved ||
            !Array.isArray(saved) ||
            saved.length !==
                docs.length
        ) {
            throw milkError(
                "MILK_SAVE_FAILED",
                "The milk records could not be saved. Please try again."
            );
        }

        await updateFarmTotals(
            day,
            session
        );

        return saved;
    };

// ==========================================================
// EDIT MILK RECORD
// ==========================================================

exports.editMilkRecord =
    async function ({
        recordId,
        liters,
        remarks,
        user
    }) {
        requireAdmin(user);

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
            !canAdminEditRecord(
                record
            )
        ) {
            throw milkError(
                "MILK_TIME_CLOSED",
                "This milk record can no longer be edited."
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
            !Number.isFinite(
                quantity
            ) ||
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
            typeof remarks ===
            "string"
                ? remarks.trim()
                : "";

        await record.save();

        await updateFarmTotals(
            record.day,
            record.session
        );

        return record;
    };

// ==========================================================
// ADMIN EDIT PERMISSION
// ==========================================================

function canAdminEditRecord(
    record
) {
    const now =
        getKenyaDateParts();

    if (
        !record ||
        !record.session
    ) {
        return false;
    }

    // ------------------------------------------------------
    // ONLY SAME DAY
    // ------------------------------------------------------

    if (
        record.day !==
        now.date
    ) {
        return false;
    }

    // ------------------------------------------------------
    // MORNING CAN BE EDITED UNTIL 4:00 PM
    // ------------------------------------------------------

    if (
        record.session ===
        "morning"
    ) {
        return (
            now.timeMinutes <
            EVENING_START
        );
    }

    // ------------------------------------------------------
    // EVENING CAN BE EDITED UNTIL MIDNIGHT
    // ------------------------------------------------------

    if (
        record.session ===
        "evening"
    ) {
        return (
            now.timeMinutes >=
            EVENING_START
        );
    }

    return false;
}

// ==========================================================
// GET CURRENT MILK PRICE
// ==========================================================

exports.getCurrentPrice =
    async function () {
        const latest =
            await MilkSummary.findOne({
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
    };

// ==========================================================
// TOGGLE MILKING STATUS
// ==========================================================

exports.toggleMilkingStatus =
    async function ({
        dairyId,
        user
    }) {
        requireAdmin(user);

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

        if (
            dairy.code < 0 ||
            dairy.code % 2 !== 0
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
    };

// ==========================================================
// GET DAILY STATISTICS
// ==========================================================
//
// Called by:
//
//     milkController.getMilkStats()
//
// With:
//
//     getDailyStats(day)
//
// ==========================================================

exports.getDailyStats =
    async function (day) {
        if (!day) {
            throw milkError(
                "MILK_INVALID_DAY",
                "A valid day is required."
            );
        }

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
                await MilkSummary.create({
                    day,

                    month:
                        day.slice(0, 7),

                    price:
                        DEFAULT_MILK_PRICE,

                    consumed: 0,

                    available:
                        Number(
                            report?.stats?.total ||
                            0
                        ),

                    cash: 0,

                    locked: false,

                    sales: []
                });
        }

        const sales =
            summary.sales || [];

        const consumed =
            sales.reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    Number(
                        sale.liters ||
                        0
                    ),
                0
            );

        const total =
            Number(
                report?.stats?.total ||
                0
            );

        const available =
            Math.max(
                0,
                total -
                    consumed
            );

        const cash =
            sales.reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    Number(
                        sale.cash ||
                        0
                    ),
                0
            );

        if (
            Number(
                summary.consumed ||
                0
            ) !== consumed ||
            Number(
                summary.available ||
                0
            ) !== available ||
            Number(
                summary.cash ||
                0
            ) !== cash
        ) {
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
                report?.records ||
                [],

            sales,

            stats: {
                total,

                consumed,

                available,

                price:
                    summary.price ||
                    DEFAULT_MILK_PRICE,

                cash,

                locked:
                    summary.locked ||
                    false
            }
        };
    };

// ==========================================================
// GET MONTHLY STATISTICS
// ==========================================================
//
// Called by:
//
//     milkController.getMilkStats()
//
// With:
//
//     getMonthlyStats(month)
//
// ==========================================================

exports.getMonthlyStats =
    async function (month) {
        if (!month) {
            throw milkError(
                "MILK_INVALID_MONTH",
                "A valid month is required."
            );
        }

        const report =
            await Milk.getMonthlyReport(
                month
            );

        const dairies =
            await Dairy.find()
                .lean();

        const dairyMap = {};

        dairies.forEach(
            (dairy) => {
                dairyMap[
                    dairy._id.toString()
                ] = dairy;
            }
        );

        const records =
            (
                report?.records ||
                []
            ).map(
                (record) => ({
                    dairy:
                        dairyMap[
                            record.dairy?.toString()
                        ] || null,

                    total:
                        record.total,

                    avg:
                        record.avg
                })
            );

        const summaries =
            await MilkSummary.find({
                month
            })
                .lean();

        let totalConsumed = 0;
        let totalCash = 0;
        let totalPrice = 0;

        const sales = [];

        summaries.forEach(
            (summary) => {
                totalPrice +=
                    Number(
                        summary.price ||
                        0
                    );

                (
                    summary.sales ||
                    []
                ).forEach(
                    (sale) => {
                        totalConsumed +=
                            Number(
                                sale.liters ||
                                0
                            );

                        totalCash +=
                            Number(
                                sale.cash ||
                                0
                            );

                        sales.push(
                            sale
                        );
                    }
                );
            }
        );

        const totalProduced =
            records.reduce(
                (
                    sum,
                    record
                ) =>
                    sum +
                    Number(
                        record.total ||
                        0
                    ),
                0
            );

        return {
            records,

            sales,

            stats: {
                total:
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
                    summaries.length
                        ? totalPrice /
                          summaries.length
                        : DEFAULT_MILK_PRICE,

                cash:
                    totalCash,

                locked:
                    false,

                avg:
                    records.length
                        ? totalProduced /
                          records.length
                        : 0
            }
        };
    };

// ==========================================================
// SAVE DAILY STATISTICS
// ==========================================================
//
// Called by:
//
//     milkController.saveDailyStats()
//
// With:
//
//     saveDailyStats({ day, price })
//
// ==========================================================

exports.saveDailyStats =
    async function ({
        day,
        price
    }) {
        if (!day) {
            throw milkError(
                "MILK_INVALID_DAY",
                "Day is required."
            );
        }

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
                await MilkSummary.create({
                    day,

                    month:
                        day.slice(0, 7),

                    price:
                        DEFAULT_MILK_PRICE,

                    consumed: 0,

                    available: 0,

                    cash: 0,

                    locked: false,

                    sales: []
                });
        }

        const numericPrice =
            Number(price);

        if (
            !Number.isFinite(
                numericPrice
            ) ||
            numericPrice < 0
        ) {
            throw milkError(
                "MILK_INVALID_PRICE",
                "Invalid milk price."
            );
        }

        const sales =
            summary.sales || [];

        const consumed =
            sales.reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    Number(
                        sale.liters ||
                        0
                    ),
                0
            );

        const total =
            Number(
                report?.stats?.total ||
                0
            );

        const cash =
            sales.reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    Number(
                        sale.cash ||
                        0
                    ),
                0
            );

        summary.price =
            numericPrice;

        summary.consumed =
            consumed;

        summary.available =
            Math.max(
                0,
                total -
                    consumed
            );

        summary.cash =
            cash;

        await summary.save();

        return summary;
    };

// ==========================================================
// GET SALES PAGE DATA
// ==========================================================
//
// Called by:
//
//     milkController.getSalesPage()
//
// With:
//
//     getSalesPageData()
//
// ==========================================================

exports.getSalesPageData =
    async function () {
        const today =
            getKenyaDateParts()
                .date;

        let summary =
            await MilkSummary.findOne({
                day: today
            });

        if (!summary) {
            summary =
                await MilkSummary.create({
                    day: today,

                    month:
                        today.slice(0, 7),

                    price:
                        DEFAULT_MILK_PRICE,

                    consumed: 0,

                    available: 0,

                    cash: 0,

                    locked: false,

                    sales: []
                });
        }

        const standingOrders =
            await StandingOrder.find({
                omitted: false,

                isActive: true
            })
                .sort({
                    customerName: 1
                })
                .lean();

        standingOrders.forEach(
            (order) => {
                order.saleRecordedToday =
                    (
                        summary.sales ||
                        []
                    ).some(
                        (sale) =>
                            sale.standingOrderId &&
                            sale.standingOrderId.toString() ===
                                order._id.toString()
                    );

                order.isFuture =
                    Boolean(
                        order.effectiveDate &&
                        new Date(
                            order.effectiveDate
                        ) >
                            new Date()
                    );
            }
        );

        const manualSales =
            (
                summary.sales ||
                []
            ).filter(
                (sale) =>
                    !sale.standingOrderId
            );

        const report =
            await Milk.getDailyReport(
                today
            );

        const totalProduced =
            Number(
                report?.stats?.total ||
                0
            );

        const totalSales =
            (
                summary.sales ||
                []
            ).reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    Number(
                        sale.liters ||
                        0
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
            standingOrders,

            manualSales,

            currentPrice:
                summary.price ||
                DEFAULT_MILK_PRICE,

            totalSales,

            availableMilk
        };
    };

// ==========================================================
// SUBMIT MANUAL SALE
// ==========================================================
//
// Called by:
//
//     milkController.submitManualSale()
//
// With:
//
//     submitManualSale({
//         customerName,
//         liters
//     })
//
// ==========================================================

exports.submitManualSale =
    async function ({
        customerName,
        liters
    }) {
        if (
            !customerName ||
            !customerName.trim()
        ) {
            throw milkError(
                "MILK_INVALID_CUSTOMER",
                "Customer name is required."
            );
        }

        const quantity =
            Number(liters);

        if (
            !Number.isFinite(
                quantity
            ) ||
            quantity <= 0
        ) {
            throw milkError(
                "MILK_INVALID_QUANTITY",
                "Invalid milk quantity."
            );
        }

        const today =
            getKenyaDateParts()
                .date;

        let summary =
            await MilkSummary.findOne({
                day: today
            });

        if (!summary) {
            summary =
                await MilkSummary.create({
                    day: today,

                    month:
                        today.slice(0, 7),

                    price:
                        DEFAULT_MILK_PRICE,

                    consumed: 0,

                    available: 0,

                    cash: 0,

                    locked: false,

                    sales: []
                });
        }

        if (
            summary.locked
        ) {
            throw milkError(
                "MILK_DAY_LOCKED",
                "Today's milk summary is locked."
            );
        }

        const price =
            summary.price ||
            DEFAULT_MILK_PRICE;

        const report =
            await Milk.getDailyReport(
                today
            );

        const produced =
            Number(
                report?.stats?.total ||
                0
            );

        const sold =
            (
                summary.sales ||
                []
            ).reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    Number(
                        sale.liters ||
                        0
                    ),
                0
            );

        const available =
            produced -
            sold;

        if (
            quantity >
            available
        ) {
            throw milkError(
                "MILK_INSUFFICIENT",
                `Insufficient milk available. Only ${available.toFixed(2)} L remaining.`
            );
        }

        summary.sales.push({
            customerName:
                customerName.trim(),

            liters:
                quantity,

            price,

            cash:
                quantity *
                price
        });

        summary.consumed =
            summary.sales.reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    Number(
                        sale.liters ||
                        0
                    ),
                0
            );

        summary.cash =
            summary.sales.reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    Number(
                        sale.cash ||
                        0
                    ),
                0
            );

        summary.available =
            Math.max(
                0,
                produced -
                    summary.consumed
            );

        await summary.save();

        return summary;
    };

// ==========================================================
// SUBMIT STANDING ORDER SALE
// ==========================================================
//
// Called by:
//
//     milkController.submitStandingOrderSale()
//
// With:
//
//     submitStandingOrderSale({
//         standingOrderId
//     })
//
// ==========================================================

exports.submitStandingOrderSale =
    async function ({
        standingOrderId
    }) {
        if (
            !mongoose.Types.ObjectId.isValid(
                standingOrderId
            )
        ) {
            throw milkError(
                "MILK_INVALID_ORDER",
                "Invalid standing order."
            );
        }

        const order =
            await StandingOrder.findById(
                standingOrderId
            );

        if (!order) {
            throw milkError(
                "MILK_ORDER_NOT_FOUND",
                "Standing order not found."
            );
        }

        if (
            order.omitted ||
            order.isActive ===
                false
        ) {
            throw milkError(
                "MILK_ORDER_INACTIVE",
                "This standing order is no longer active."
            );
        }

        if (
            order.effectiveDate &&
            new Date(
                order.effectiveDate
            ) >
                new Date()
        ) {
            throw milkError(
                "MILK_ORDER_NOT_ACTIVE",
                "This standing order has not become active yet."
            );
        }

        const today =
            getKenyaDateParts()
                .date;

        let summary =
            await MilkSummary.findOne({
                day: today
            });

        if (!summary) {
            summary =
                await MilkSummary.create({
                    day: today,

                    month:
                        today.slice(0, 7),

                    price:
                        DEFAULT_MILK_PRICE,

                    consumed: 0,

                    available: 0,

                    cash: 0,

                    locked: false,

                    sales: []
                });
        }

        if (
            summary.locked
        ) {
            throw milkError(
                "MILK_DAY_LOCKED",
                "Today's milk summary is locked."
            );
        }

        const alreadyProcessed =
            (
                summary.sales ||
                []
            ).some(
                (sale) =>
                    sale.standingOrderId &&
                    sale.standingOrderId.toString() ===
                        standingOrderId.toString()
            );

        if (
            alreadyProcessed
        ) {
            throw milkError(
                "MILK_ORDER_ALREADY_PROCESSED",
                "Standing order has already been processed today."
            );
        }

        const price =
            summary.price ||
            DEFAULT_MILK_PRICE;

        const report =
            await Milk.getDailyReport(
                today
            );

        const produced =
            Number(
                report?.stats?.total ||
                0
            );

        const sold =
            (
                summary.sales ||
                []
            ).reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    Number(
                        sale.liters ||
                        0
                    ),
                0
            );

        const available =
            produced -
            sold;

        const orderLiters =
            Number(
                order.liters
            );

        if (
            !Number.isFinite(
                orderLiters
            ) ||
            orderLiters <= 0
        ) {
            throw milkError(
                "MILK_INVALID_QUANTITY",
                "Invalid standing order quantity."
            );
        }

        if (
            orderLiters >
            available
        ) {
            throw milkError(
                "MILK_INSUFFICIENT",
                `Insufficient milk available. Only ${available.toFixed(2)} L remaining.`
            );
        }

        summary.sales.push({
            customerName:
                order.customerName,

            liters:
                orderLiters,

            price,

            cash:
                orderLiters *
                price,

            standingOrderId:
                order._id
        });

        summary.consumed =
            summary.sales.reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    Number(
                        sale.liters ||
                        0
                    ),
                0
            );

        summary.cash =
            summary.sales.reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    Number(
                        sale.cash ||
                        0
                    ),
                0
            );

        summary.available =
            Math.max(
                0,
                produced -
                    summary.consumed
            );

        await summary.save();

        return summary;
    };

// ==========================================================
// UPDATE MILK PRICE
// ==========================================================
//
// Called by:
//
//     milkController.updateMilkPrice()
//
// With:
//
//     updateMilkPrice(price)
//
// ==========================================================

exports.updateMilkPrice =
    async function (price) {
        const numericPrice =
            Number(price);

        if (
            !Number.isFinite(
                numericPrice
            ) ||
            numericPrice < 0
        ) {
            throw milkError(
                "MILK_INVALID_PRICE",
                "Invalid milk price."
            );
        }

        const today =
            getKenyaDateParts()
                .date;

        let summary =
            await MilkSummary.findOne({
                day: today
            });

        if (!summary) {
            summary =
                await MilkSummary.create({
                    day: today,

                    month:
                        today.slice(0, 7),

                    price:
                        DEFAULT_MILK_PRICE,

                    consumed: 0,

                    available: 0,

                    cash: 0,

                    locked: false,

                    sales: []
                });
        }

        if (
            summary.locked
        ) {
            throw milkError(
                "MILK_DAY_LOCKED",
                "Today's milk summary is locked."
            );
        }

        summary.price =
            numericPrice;

        await summary.save();

        return summary;
    };

// ==========================================================
// ADD STANDING ORDER
// ==========================================================
//
// Called by:
//
//     milkController.addStandingOrder()
//
// With:
//
//     addStandingOrder({
//         customerName,
//         liters
//     })
//
// ==========================================================

exports.addStandingOrder =
    async function ({
        customerName,
        liters
    }) {
        if (
            !customerName ||
            !customerName.trim()
        ) {
            throw milkError(
                "MILK_INVALID_CUSTOMER",
                "Customer name is required."
            );
        }

        const quantity =
            Number(liters);

        if (
            !Number.isFinite(
                quantity
            ) ||
            quantity <= 0
        ) {
            throw milkError(
                "MILK_INVALID_QUANTITY",
                "Invalid standing order quantity."
            );
        }

        return StandingOrder.create({
            customerName:
                customerName.trim(),

            liters:
                quantity
        });
    };

// ==========================================================
// OMIT STANDING ORDER
// ==========================================================
//
// Called by:
//
//     milkController.omitStandingOrder()
//
// With:
//
//     omitStandingOrder({
//         orderId,
//         user
//     })
//
// ==========================================================

exports.omitStandingOrder =
    async function ({
        orderId,
        user
    }) {
        requireAdmin(user);

        if (
            !mongoose.Types.ObjectId.isValid(
                orderId
            )
        ) {
            throw milkError(
                "MILK_ORDER_NOT_FOUND",
                "Invalid standing order."
            );
        }

        const order =
            await StandingOrder.findById(
                orderId
            );

        if (!order) {
            throw milkError(
                "MILK_ORDER_NOT_FOUND",
                "Standing order not found."
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
// MILKING HISTORY
// ==========================================================
//
// Called by:
//
//     milkController.getMilkingHistory()
//
// With:
//
//     getMilkingHistory({
//         dairyId,
//         month,
//         user
//     })
//
// ==========================================================

exports.getMilkingHistory =
    async function ({
        dairyId,
        month,
        user
    }) {
        requireUser(user);

        await verifyAnimalAccess(
            dairyId,
            user
        );

        const dairy =
            await Dairy.findById(
                dairyId
            ).lean();

        if (!dairy) {
            throw milkError(
                "MILK_INVALID_ANIMAL",
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
            await Milk.find(
                filter
            )
                .populate(
                    "recordedBy",
                    "name"
                )
                .sort({
                    date: -1
                })
                .lean();

        const grouped = {};

        for (
            const record of records
        ) {
            const day =
                record.day;

            if (
                !grouped[day]
            ) {
                grouped[day] = {
                    entries: [],
                    total: 0
                };
            }

            grouped[
                day
            ].entries.push(
                record
            );

            grouped[
                day
            ].total +=
                Number(
                    record.liters ||
                    0
                );
        }

        const monthlyTotal =
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
            dairy,

            records,

            grouped,

            monthlyTotal,

            hasData:
                records.length >
                0
        };
    };

// ==========================================================
// LOCK DAILY SUMMARY
// ==========================================================

exports.lockDay =
    async function (
        day,
        user
    ) {
        requireAdmin(user);

        const summary =
            await MilkSummary.findOne({
                day
            });

        if (!summary) {
            throw milkError(
                "MILK_SUMMARY_NOT_FOUND",
                "Daily summary not found."
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

exports.unlockDay =
    async function (
        day,
        user
    ) {
        requireAdmin(user);

        const summary =
            await MilkSummary.findOne({
                day
            });

        if (!summary) {
            throw milkError(
                "MILK_SUMMARY_NOT_FOUND",
                "Daily summary not found."
            );
        }

        summary.locked =
            false;

        await summary.save();

        return summary;
    };

// ==========================================================
// PUBLIC HELPERS
// ==========================================================

exports.getMilkSession =
    getMilkSession;

exports.getKenyaDateParts =
    getKenyaDateParts;

exports.getSessionDeadline =
    getSessionDeadline;

exports.canSubmitSession =
    canSubmitSession;

exports.canAdminEditRecord =
    canAdminEditRecord;