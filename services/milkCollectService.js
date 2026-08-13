// ==========================================================
// services/milkCollectService.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Service layer for the "Record Today's Milk" module.
//
// MILK RECORDING RULES
// ----------------------------------------------------------
//
// MORNING SESSION
// ----------------------------------------------------------
// 00:00 - 10:00
//
// EVENING SESSION
// ----------------------------------------------------------
// 16:00 - 00:00
//
// CLOSED MORNING WINDOW
// ----------------------------------------------------------
// 10:00 - 16:00
//
// During the closed morning window:
//
// • Morning records remain available.
// • Dairy workers may still create/edit morning records.
// • The evening session has not started.
// • The active recording column remains morning.
//
// At exactly 16:00:
//
// • Morning recording input disappears.
// • Evening recording input becomes active.
// • Morning data is NOT deleted.
// • Morning data is simply no longer the active input value.
//
// At exactly 00:00:
//
// • Evening session closes.
// • The previous day's records become historical.
// • Missing evening records are automatically recorded as:
//
//       liters: 0
//       remarks: "Not Milked/recorded"
//       recordedBySystem: true
//
// AUTOMATIC ZERO RECORDS
// ----------------------------------------------------------
//
// When a session closes and a cow has no record for that
// session, the service automatically creates:
//
//     0 L
//     Not Milked/recorded
//
// This guarantees that every eligible milking cow has a
// complete morning + evening record for every completed day.
//
// PERMISSIONS
// ----------------------------------------------------------
//
// ADMIN
// ----------------------------------------------------------
// • Can create records.
// • Can edit records.
// • Can edit morning records during evening.
// • Can edit historical records.
// • Can correct automatic zero records.
//
// DAIRY WORKER
// ----------------------------------------------------------
//
// MORNING:
// • Can create/edit from 00:00 through 15:59.
// • Cannot edit morning during evening.
//
// EVENING:
// • Can create/edit from 16:00 through 23:59.
//
// HISTORICAL:
// • Previous days are read-only.
//
// SUMMARY
// ----------------------------------------------------------
// Daily MilkSummary is rebuilt from Milk records.
//
// DOES NOT HANDLE:
//
// • Milk sales
// • Standing orders
// • Milk pricing
// • General milk statistics
// • Milking history
// • Milking status
//
// ==========================================================


const mongoose =
    require("mongoose");

const Dairy =
    require("../models/dairy");

const Milk =
    require("../models/milk");

const MilkSummary =
    require("../models/milkSummary");


// ==========================================================
// CONSTANTS
// ==========================================================

const NAIROBI_TIMEZONE =
    "Africa/Nairobi";

const MORNING =
    "morning";

const EVENING =
    "evening";

const VALID_SESSIONS = [
    MORNING,
    EVENING
];

const MORNING_START_HOUR =
    0;

const MORNING_END_HOUR =
    10;

const EVENING_START_HOUR =
    16;

const MIDNIGHT_HOUR =
    24;

const AUTO_ZERO_REMARK =
    "Not Milked/recorded";


// ==========================================================
// GET NAIROBI DATE PARTS
// ==========================================================
//
// Returns:
//
// {
//     year,
//     month,
//     day,
//     hour,
//     minute,
//     second
// }
//
// ==========================================================

function getNairobiDateParts(
    date = new Date()
) {

    const formatter =
        new Intl.DateTimeFormat(
            "en-GB",
            {
                timeZone:
                    NAIROBI_TIMEZONE,

                year:
                    "numeric",

                month:
                    "2-digit",

                day:
                    "2-digit",

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                second:
                    "2-digit",

                hourCycle:
                    "h23"
            }
        );


    const parts =
        formatter.formatToParts(
            date
        );


    const result = {};


    parts.forEach(
        part => {

            if (
                part.type !== "literal"
            ) {

                result[
                    part.type
                ] =
                    part.value;

            }

        }
    );


    return {

        year:
            Number(result.year),

        month:
            Number(result.month),

        day:
            Number(result.day),

        hour:
            Number(result.hour),

        minute:
            Number(result.minute),

        second:
            Number(result.second)

    };

}


// ==========================================================
// GET NAIROBI DAY
// ==========================================================

function getNairobiDay(
    date = new Date()
) {

    const parts =
        getNairobiDateParts(
            date
        );


    return [

        String(parts.year)
            .padStart(4, "0"),

        String(parts.month)
            .padStart(2, "0"),

        String(parts.day)
            .padStart(2, "0")

    ].join("-");

}


// ==========================================================
// GET NAIROBI MONTH
// ==========================================================

function getNairobiMonth(
    date = new Date()
) {

    return getNairobiDay(
        date
    ).slice(
        0,
        7
    );

}


// ==========================================================
// GET CURRENT RECORDING SESSION
// ==========================================================
//
// IMPORTANT
// ----------------------------------------------------------
//
// 00:00 - 09:59  -> morning
//
// 10:00 - 15:59  -> morning
//                    but morning session is closed.
//
// 16:00 - 23:59  -> evening
//
// The service therefore distinguishes:
//
//     activeSession
//     recordingAllowed
//     sessionClosed
//
// ==========================================================

function getCurrentSession(
    date = new Date()
) {

    const parts =
        getNairobiDateParts(
            date
        );


    const hour =
        parts.hour;


    // ======================================================
    // MORNING
    // ======================================================

    if (
        hour >= MORNING_START_HOUR &&
        hour < EVENING_START_HOUR
    ) {

        return {

            session:
                MORNING,

            activeSession:
                MORNING,

            recordingAllowed:
                true,

            morningOpen:
                true,

            eveningOpen:
                false,

            morningClosed:
                false,

            eveningClosed:
                true,

            hour,

            minute:
                parts.minute

        };

    }


    // ======================================================
    // EVENING
    // ======================================================

    return {

        session:
            EVENING,

        activeSession:
            EVENING,

        recordingAllowed:
            true,

        morningOpen:
            false,

        eveningOpen:
            true,

        morningClosed:
            true,

        eveningClosed:
            false,

        hour,

        minute:
            parts.minute

    };

}


// ==========================================================
// GET SESSION STATUS
// ==========================================================
//
// This is intentionally separate from getCurrentSession()
// because the page needs to know exactly what the UI should
// display.
//
// ==========================================================

function getSessionStatus(
    date = new Date()
) {

    const parts =
        getNairobiDateParts(
            date
        );


    const hour =
        parts.hour;


    if (
        hour < MORNING_END_HOUR
    ) {

        return {

            session:
                MORNING,

            label:
                "Morning Recording",

            inputEnabled:
                true,

            morningVisible:
                true,

            eveningVisible:
                false,

            morningEditable:
                true,

            eveningEditable:
                false

        };

    }


    if (
        hour < EVENING_START_HOUR
    ) {

        return {

            session:
                MORNING,

            label:
                "Morning Recording",

            inputEnabled:
                true,

            morningVisible:
                true,

            eveningVisible:
                false,

            morningEditable:
                true,

            eveningEditable:
                false,

            betweenSessions:
                true

        };

    }


    return {

        session:
            EVENING,

        label:
            "Evening Recording",

        inputEnabled:
            true,

        morningVisible:
            false,

        eveningVisible:
            true,

        morningEditable:
            false,

        eveningEditable:
            true

    };

}


// ==========================================================
// NUMBER HELPER
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
        Number(value);


    if (
        !Number.isFinite(
            number
        )
    ) {

        return null;

    }


    return number;

}


// ==========================================================
// ROUND NUMBER
// ==========================================================

function round(
    value
) {

    const number =
        Number(value);


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
// GET USER ID
// ==========================================================

function getUserId(
    user
) {

    if (!user) {

        return null;

    }


    return (
        user._id ||
        user.id ||
        null
    );

}


// ==========================================================
// IS ADMIN
// ==========================================================

function isAdmin(
    user
) {

    return (
        !!user &&
        user.role === "admin"
    );

}


// ==========================================================
// IS DAIRY WORKER
// ==========================================================

function isDairyWorker(
    user
) {

    return (
        !!user &&
        user.role === "dairyWorker"
    );

}


// ==========================================================
// GET ASSIGNED FARM IDS
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
            farmId =>
                mongoose.isValidObjectId(
                    farmId
                )
        )

        .map(
            farmId =>
                new mongoose.Types.ObjectId(
                    farmId
                )
        );

}


// ==========================================================
// GET ACTIVE FARMS FOR USER
// ==========================================================

async function getUserFarms(
    user
) {

    if (
        isAdmin(user)
    ) {

        return Dairy.find({

            code: {
                $lt: 0
            },

            status:
                "active"

        })

        .sort({
            code: 1
        })

        .lean();

    }


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
            },

            status:
                "active"

        })

        .sort({
            code: 1
        })

        .lean();

    }


    return [];

}


// ==========================================================
// GET FARM BY CODE
// ==========================================================

async function getFarmByCode(
    farmCode
) {

    const code =
        toNumber(
            farmCode
        );


    if (
        code === null ||
        code >= 0
    ) {

        return null;

    }


    return Dairy.findOne({

        code,

        status:
            "active"

    })

    .lean();

}


// ==========================================================
// VERIFY FARM ACCESS
// ==========================================================

function verifyFarmAccess(
    user,
    farm
) {

    if (
        !user ||
        !farm
    ) {

        return false;

    }


    // ======================================================
    // ADMIN
    // ======================================================

    if (
        isAdmin(user)
    ) {

        return true;

    }


    // ======================================================
    // WORKER
    // ======================================================

    if (
        !isDairyWorker(user)
    ) {

        return false;

    }


    const assignedFarmIds =
        getAssignedFarmIds(
            user
        );


    const farmId =
        farm._id?.toString();


    if (!farmId) {

        return false;

    }


    return assignedFarmIds.some(
        assignedId =>
            assignedId.toString() ===
            farmId
    );

}


// ==========================================================
// GET VALID MILKING ANIMAL
// ==========================================================

async function getValidAnimal(
    animalId
) {

    if (
        !mongoose.isValidObjectId(
            animalId
        )
    ) {

        return null;

    }


    return Dairy.findOne({

        _id:
            animalId,

        code: {
            $gt: 0,

            $mod: [
                2,
                0
            ]
        },

        isMilking:
            true,

        status:
            "active"

    })

    .lean();

}


// ==========================================================
// GET TODAY'S MILKING ANIMALS
// ==========================================================

async function getMilkingAnimals(
    farms
) {

    if (
        farms.length === 0
    ) {

        return [];

    }


    const farmCodes =
        farms

        .map(
            farm =>
                Number(
                    farm.code
                )
        )

        .filter(
            code =>
                Number.isFinite(
                    code
                )
        );


    if (
        farmCodes.length === 0
    ) {

        return [];

    }


    return Dairy.find({

        code: {
            $gt: 0,

            $mod: [
                2,
                0
            ]
        },

        isMilking:
            true,

        assetCode: {
            $in:
                farmCodes
        },

        status:
            "active"

    })

    .sort({
        code: 1
    })

    .lean();

}


// ==========================================================
// GET MILK RECORD
// ==========================================================

async function getExistingRecord(
    animalId,
    day,
    session
) {

    return Milk.findOne({

        dairy:
            animalId,

        day,

        session

    });

}


// ==========================================================
// GET TODAY'S MILK RECORDS
// ==========================================================

async function getDayMilkRecords(
    animalIds,
    day
) {

    if (
        animalIds.length === 0
    ) {

        return [];

    }


    return Milk.find({

        dairy: {
            $in:
                animalIds
        },

        day

    })

    .sort({
        date: 1
    })

    .lean();

}


// ==========================================================
// INDEX MILK RECORDS
// ==========================================================

function indexMilkRecords(
    records
) {

    const map =
        new Map();


    records.forEach(
        record => {

            if (
                !record.dairy ||
                !record.session
            ) {

                return;

            }


            const key =
                `${record.dairy.toString()}:${record.session}`;


            map.set(
                key,
                record
            );

        }
    );


    return map;

}


// ==========================================================
// GET DISPLAY RECORD
// ==========================================================
//
// The page only needs ONE active recording value.
//
// Morning:
//
//     currentRecord = morning
//
// Evening:
//
//     currentRecord = evening
//
// The other session remains available as historical data
// for cumulative calculations.
//
// ==========================================================

function buildAnimalRecord(
    animal,
    milkMap,
    session
) {

    const morning =
        milkMap.get(
            `${animal._id.toString()}:${MORNING}`
        ) || null;


    const evening =
        milkMap.get(
            `${animal._id.toString()}:${EVENING}`
        ) || null;


    const currentRecord =
        session === MORNING
            ? morning
            : evening;


    const cumulative =
        round(
            (
                Number(
                    morning?.liters
                ) || 0
            ) +
            (
                Number(
                    evening?.liters
                ) || 0
            )
        );


    return {

        ...animal,

        // --------------------------------------------------
        // Active recording value.
        // --------------------------------------------------

        currentRecord,

        // --------------------------------------------------
        // Historical/session data.
        // Used internally and for cumulative display.
        // --------------------------------------------------

        morning,

        evening,

        cumulative,

        // --------------------------------------------------
        // Convenience fields for the EJS page.
        // --------------------------------------------------

        currentLiters:
            currentRecord
                ? Number(
                    currentRecord.liters
                ) || 0
                : null,

        currentRemarks:
            currentRecord?.remarks ||
            "",

        currentRecorded:
            !!currentRecord

    };

}


// ==========================================================
// GET TODAY'S MILK PAGE DATA
// ==========================================================
//
// Returns everything required by the milk recording page.
//
// The EJS page should use:
//
//     currentSession
//     sessionLabel
//     sessionStatus
//
// and each animal:
//
//     currentLiters
//     currentRemarks
//     cumulative
//
// ==========================================================

exports.getMilkPageData =
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


    const month =
        getNairobiMonth();


    const sessionStatus =
        getSessionStatus();


    const farms =
        await getUserFarms(
            user
        );


    if (
        farms.length === 0
    ) {

        return {

            day,

            month,

            currentSession:
                sessionStatus.session,

            sessionLabel:
                sessionStatus.label,

            sessionStatus,

            farms: [],

            isAdmin:
                isAdmin(user),

            isDairyWorker:
                isDairyWorker(user)

        };

    }


    const animals =
        await getMilkingAnimals(
            farms
        );


    const animalIds =
        animals.map(
            animal =>
                animal._id
        );


    const milkRecords =
        await getDayMilkRecords(
            animalIds,
            day
        );


    const milkMap =
        indexMilkRecords(
            milkRecords
        );


    // ======================================================
    // BUILD FARM DATA
    // ======================================================

    const farmData =
        farms.map(
            farm => {

                const farmCode =
                    Number(
                        farm.code
                    );


                const farmAnimals =
                    animals

                    .filter(
                        animal =>
                            Number(
                                animal.assetCode
                            ) ===
                            farmCode
                    )

                    .map(
                        animal =>
                            buildAnimalRecord(
                                animal,
                                milkMap,
                                sessionStatus.session
                            )
                    );


                // ==================================================
                // CUMULATIVE FARM TOTAL
                // ==================================================

                const total =
                    round(
                        farmAnimals.reduce(
                            (
                                sum,
                                animal
                            ) => {

                                return (
                                    sum +
                                    Number(
                                        animal.cumulative
                                    )
                                );

                            },
                            0
                        )
                    );


                return {

                    ...farm,

                    animals:
                        farmAnimals,

                    total

                };

            }
        );


    return {

        day,

        month,

        currentSession:
            sessionStatus.session,

        sessionLabel:
            sessionStatus.label,

        sessionStatus,

        farms:
            farmData,

        isAdmin:
            isAdmin(user),

        isDairyWorker:
            isDairyWorker(user)

    };

};


// ==========================================================
// CAN WORKER MODIFY SESSION?
// ==========================================================
//
// This is the central permission rule.
//
// ADMIN:
//     Always true.
//
// WORKER:
//     Morning -> allowed from 00:00 to 16:00.
//     Evening -> allowed from 16:00 to midnight.
//
// Historical days -> false.
//
// ==========================================================

function canWorkerModifySession(
    session,
    date = new Date()
) {

    if (
        !VALID_SESSIONS.includes(
            session
        )
    ) {

        return false;

    }


    const parts =
        getNairobiDateParts(
            date
        );


    const hour =
        parts.hour;


    // ======================================================
    // MORNING
    // ======================================================

    if (
        session === MORNING
    ) {

        return (
            hour >= 0 &&
            hour < EVENING_START_HOUR
        );

    }


    // ======================================================
    // EVENING
    // ======================================================

    return (
        hour >= EVENING_START_HOUR &&
        hour < MIDNIGHT_HOUR
    );

}


// ==========================================================
// CAN MODIFY RECORD
// ==========================================================

function canModifyRecord(
    user,
    day,
    session,
    now = new Date()
) {

    // ======================================================
    // ADMIN
    // ======================================================

    if (
        isAdmin(user)
    ) {

        return true;

    }


    // ======================================================
    // WORKER
    // ======================================================

    if (
        !isDairyWorker(user)
    ) {

        return false;

    }


    const today =
        getNairobiDay(
            now
        );


    // Workers cannot alter historical days.

    if (
        day !== today
    ) {

        return false;

    }


    return canWorkerModifySession(
        session,
        now
    );

}


// ==========================================================
// NORMALIZE REMARKS
// ==========================================================

function normalizeRemarks(
    remarks
) {

    if (
        typeof remarks !== "string"
    ) {

        return "";

    }


    return remarks.trim();

}


// ==========================================================
// SAVE ONE MILK RECORD
// ==========================================================

async function saveMilkRecord({
    user,
    animal,
    day,
    session,
    liters,
    remarks,
    now
}) {

    const existing =
        await getExistingRecord(
            animal._id,
            day,
            session
        );


    // ======================================================
    // PERMISSION
    // ======================================================

    if (
        !canModifyRecord(
            user,
            day,
            session,
            now
        )
    ) {

        return {

            record:
                existing,

            created:
                false,

            updated:
                false,

            skipped:
                true,

            reason:
                "Session is not editable."

        };

    }


    // ======================================================
    // EXISTING RECORD
    // ======================================================

    if (
        existing
    ) {

        existing.liters =
            round(
                liters
            );


        existing.remarks =
            normalizeRemarks(
                remarks
            );


        const userId =
            getUserId(
                user
            );


        if (
            userId
        ) {

            existing.recordedBy =
                userId;

        }


        // --------------------------------------------------
        // A human editing an automatic zero converts the
        // record from system-generated to human-recorded.
        // --------------------------------------------------

        existing.recordedBySystem =
            false;


        existing.recordedByType =
            "user";


        await existing.save();


        return {

            record:
                existing,

            created:
                false,

            updated:
                true,

            skipped:
                false

        };

    }


    // ======================================================
    // CREATE
    // ======================================================

    const userId =
        getUserId(
            user
        );


    if (!userId) {

        throw new Error(
            "Unable to determine the user recording the milk."
        );

    }


    const record =
        new Milk({

            dairy:
                animal._id,

            recordedBy:
                userId,

            liters:
                round(
                    liters
                ),

            remarks:
                normalizeRemarks(
                    remarks
                ),

            date:
                now || new Date(),

            day,

            month:
                day.slice(
                    0,
                    7
                ),

            session,

            recordedByType:
                "user",

            recordedBySystem:
                false

        });


    await record.save();


    return {

        record,

        created:
            true,

        updated:
            false,

        skipped:
            false

    };

}


// ==========================================================
// AUTO-RECORD ZERO FOR ONE COW
// ==========================================================
//
// Used when a session closes.
//
// The record is deliberately created as a system record.
//
// ==========================================================

async function autoRecordZero({
    animal,
    day,
    session,
    now
}) {

    const existing =
        await getExistingRecord(
            animal._id,
            day,
            session
        );


    // ------------------------------------------------------
    // Already recorded.
    // ------------------------------------------------------

    if (
        existing
    ) {

        return {

            record:
                existing,

            created:
                false

        };

    }


    const record =
        new Milk({

            dairy:
                animal._id,

            // ------------------------------------------------
            // No human recorded this record.
            // ------------------------------------------------

            recordedBy:
                null,

            liters:
                0,

            remarks:
                AUTO_ZERO_REMARK,

            date:
                now || new Date(),

            day,

            month:
                day.slice(
                    0,
                    7
                ),

            session,

            recordedByType:
                "system",

            recordedBySystem:
                true

        });


    await record.save();


    return {

        record,

        created:
            true

    };

}


// ==========================================================
// FINALIZE CLOSED SESSION
// ==========================================================
//
// This function ensures every eligible milking cow has a
// record when a session closes.
//
// IMPORTANT
// ----------------------------------------------------------
// The frontend does NOT need to call this for every row.
//
// The controller can call:
//
//     finalizeClosedSessions()
//
// when loading the page or saving records.
//
// ==========================================================

async function finalizeSession(
    day,
    session
) {

    if (
        !VALID_SESSIONS.includes(
            session
        )
    ) {

        throw new Error(
            "Invalid milk session."
        );

    }


    const farms =
        await Dairy.find({

            code: {
                $lt: 0
            },

            status:
                "active"

        })

        .lean();


    if (
        farms.length === 0
    ) {

        return {

            day,

            session,

            created:
                0

        };

    }


    const farmCodes =
        farms

        .map(
            farm =>
                Number(
                    farm.code
                )
        )

        .filter(
            code =>
                Number.isFinite(
                    code
                )
        );


    const animals =
        await Dairy.find({

            code: {
                $gt: 0,

                $mod: [
                    2,
                    0
                ]
            },

            isMilking:
                true,

            assetCode: {
                $in:
                    farmCodes
            },

            status:
                "active"

        })

        .lean();


    let created =
        0;


    const now =
        new Date();


    for (
        const animal
        of animals
    ) {

        const result =
            await autoRecordZero({

                animal,

                day,

                session,

                now

            });


        if (
            result.created
        ) {

            created++;

        }

    }


    return {

        day,

        session,

        created

    };

}


// ==========================================================
// FINALIZE CLOSED SESSIONS
// ==========================================================
//
// For today's page:
//
// Morning is automatically finalized at 10:00.
//
// However, because workers may still edit morning records
// until 16:00, the automatic zero record is still editable
// during the closed-morning window.
//
// Evening is finalized at midnight.
//
// The function also allows explicit finalization for a
// supplied day.
//
// ==========================================================

exports.finalizeClosedSessions =
async function(
    date = new Date()
) {

    const day =
        getNairobiDay(
            date
        );


    const parts =
        getNairobiDateParts(
            date
        );


    let morningCreated =
        0;


    let eveningCreated =
        0;


    // ======================================================
    // MORNING CLOSED FROM 10:00
    // ======================================================

    if (
        parts.hour >= MORNING_END_HOUR
    ) {

        const result =
            await finalizeSession(
                day,
                MORNING
            );


        morningCreated =
            result.created;

    }


    // ======================================================
    // EVENING
    // ======================================================
    //
    // At 00:00 the date changes, so yesterday's evening
    // session must be finalized separately.
    //
    // This function normally gets called before the page
    // starts working on the new day.
    //
    // ======================================================

    return {

        day,

        morningCreated,

        eveningCreated

    };

};


// ==========================================================
// FINALIZE A SPECIFIC DAY
// ==========================================================
//
// Useful for scheduled jobs.
//
// Example:
//
//     finalizeDaySessions("2026-08-13")
//
// ==========================================================

exports.finalizeDaySessions =
async function(
    day
) {

    if (
        typeof day !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(
            day
        )
    ) {

        throw new Error(
            "Invalid date. Expected YYYY-MM-DD."
        );

    }


    const morning =
        await finalizeSession(
            day,
            MORNING
        );


    const evening =
        await finalizeSession(
            day,
            EVENING
        );


    const summary =
        await rebuildDailySummary(
            day
        );


    return {

        day,

        morning,

        evening,

        summary

    };

};


// ==========================================================
// SAVE TODAY'S MILK
// ==========================================================
//
// Input:
//
// records = {
//
//     animalId: {
//
//         liters,
//         remarks
//
//     }
//
// }
//
// IMPORTANT
// ----------------------------------------------------------
//
// There is intentionally NO morning/evening property in
// the request anymore.
//
// The server determines the session.
//
// During:
//
//     00:00 - 15:59
//
// the record belongs to:
//
//     morning
//
// During:
//
//     16:00 - 23:59
//
// the record belongs to:
//
//     evening
//
// This prevents the browser from deciding which session is
// being modified.
//
// ==========================================================

exports.saveMilk =
async function(
    user,
    records
) {

    // ======================================================
    // AUTHENTICATION
    // ======================================================

    if (!user) {

        throw new Error(
            "Authenticated user is required."
        );

    }


    // ======================================================
    // ROLE
    // ======================================================

    if (
        !isAdmin(user) &&
        !isDairyWorker(user)
    ) {

        throw new Error(
            "You are not authorized to record milk."
        );

    }


    // ======================================================
    // VALIDATE INPUT
    // ======================================================

    if (
        !records ||
        typeof records !== "object" ||
        Array.isArray(records)
    ) {

        return {

            day:
                getNairobiDay(),

            session:
                getSessionStatus().session,

            created:
                0,

            updated:
                0,

            skipped:
                0,

            summary:
                null

        };

    }


    const now =
        new Date();


    const day =
        getNairobiDay(
            now
        );


    // ======================================================
    // DETERMINE SESSION SERVER-SIDE
    // ======================================================

    const session =
        getSessionStatus(
            now
        ).session;


    let created =
        0;


    let updated =
        0;


    let skipped =
        0;


    // ======================================================
    // PROCESS ANIMALS
    // ======================================================

    for (
        const [
            animalId,
            data
        ]
        of Object.entries(records)
    ) {

        if (
            !data ||
            typeof data !== "object" ||
            Array.isArray(data)
        ) {

            continue;

        }


        // ==================================================
        // VALIDATE ANIMAL
        // ==================================================

        const animal =
            await getValidAnimal(
                animalId
            );


        if (!animal) {

            skipped++;

            continue;

        }


        // ==================================================
        // FIND FARM
        // ==================================================

        const farm =
            await getFarmByCode(
                animal.assetCode
            );


        if (!farm) {

            skipped++;

            continue;

        }


        // ==================================================
        // VERIFY ACCESS
        // ==================================================

        if (
            !verifyFarmAccess(
                user,
                farm
            )
        ) {

            skipped++;

            continue;

        }


        // ==================================================
        // VERIFY ANIMAL BELONGS TO FARM
        // ==================================================

        if (
            Number(
                animal.assetCode
            ) !==
            Number(
                farm.code
            )
        ) {

            skipped++;

            continue;

        }


        // ==================================================
        // GET LITERS
        // ==================================================

        const rawLiters =
            data.liters;


        // --------------------------------------------------
        // Empty input means:
        //
        // "The user has not entered anything."
        //
        // Do not create a zero record here.
        //
        // Zero records are created automatically when the
        // session closes.
        // --------------------------------------------------

        if (
            rawLiters === undefined ||
            rawLiters === null ||
            rawLiters === ""
        ) {

            continue;

        }


        const liters =
            toNumber(
                rawLiters
            );


        if (
            liters === null ||
            liters < 0
        ) {

            throw new Error(
                `Invalid milk quantity for ${animal.name || "animal"}.`
            );

        }


        // ==================================================
        // REMARKS
        // ==================================================

        const remarks =
            normalizeRemarks(
                data.remarks
            );


        // ==================================================
        // SAVE
        // ==================================================

        const result =
            await saveMilkRecord({

                user,

                animal,

                day,

                session,

                liters:
                    round(
                        liters
                    ),

                remarks,

                now

            });


        if (
            result.skipped
        ) {

            skipped++;

        }

        else if (
            result.created
        ) {

            created++;

        }

        else if (
            result.updated
        ) {

            updated++;

        }

    }


    // ======================================================
    // FINALIZE MORNING IF NECESSARY
    // ======================================================
    //
    // This is safe to call after every save.
    //
    // Before 10:00 it does nothing.
    //
    // From 10:00 onward it ensures missing morning records
    // are represented by zero/system records.
    //
    // ======================================================

    if (
        getNairobiDateParts(
            now
        ).hour >= MORNING_END_HOUR
    ) {

        await finalizeSession(
            day,
            MORNING
        );

    }


    // ======================================================
    // REBUILD SUMMARY
    // ======================================================

    const summary =
        await rebuildDailySummary(
            day
        );


    return {

        day,

        session,

        created,

        updated,

        skipped,

        summary

    };

};


// ==========================================================
// REBUILD DAILY MILK SUMMARY
// ==========================================================
//
// Summary is always calculated from Milk records.
//
// Browser totals are never trusted.
//
// ==========================================================

async function rebuildDailySummary(
    day
) {

    const milkRecords =
        await Milk.find({

            day

        })

        .populate(
            "dairy",
            "_id name code assetCode"
        )

        .lean();


    // ======================================================
    // COW PRODUCTION
    // ======================================================

    const cowMap =
        new Map();


    // ======================================================
    // FARM PRODUCTION
    // ======================================================

    const farmMap =
        new Map();


    // ======================================================
    // TOTAL PRODUCED
    // ======================================================

    let produced =
        0;


    // ======================================================
    // PROCESS RECORDS
    // ======================================================

    for (
        const record
        of milkRecords
    ) {

        const liters =
            toNumber(
                record.liters
            );


        if (
            liters === null ||
            liters < 0
        ) {

            continue;

        }


        produced +=
            liters;


        const animal =
            record.dairy;


        if (!animal) {

            continue;

        }


        // ==================================================
        // COW
        // ==================================================

        const animalKey =
            animal._id.toString();


        if (
            !cowMap.has(
                animalKey
            )
        ) {

            cowMap.set(
                animalKey,
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


        const cow =
            cowMap.get(
                animalKey
            );


        cow.liters +=
            liters;


        // ==================================================
        // FARM
        // ==================================================

        const farmCode =
            Number(
                animal.assetCode
            );


        if (
            !Number.isFinite(
                farmCode
            )
        ) {

            continue;

        }


        if (
            !farmMap.has(
                farmCode
            )
        ) {

            farmMap.set(
                farmCode,
                {

                    farmCode,

                    liters:
                        0,

                    farm:
                        null

                }
            );

        }


        const farm =
            farmMap.get(
                farmCode
            );


        farm.liters +=
            liters;

    }


    // ======================================================
    // FIND FARMS
    // ======================================================

    const farmCodes =
        Array.from(
            farmMap.keys()
        );


    if (
        farmCodes.length > 0
    ) {

        const farms =
            await Dairy.find({

                code: {
                    $in:
                        farmCodes
                },

                status:
                    "active"

            })

            .lean();


        farms.forEach(
            farm => {

                const farmCode =
                    Number(
                        farm.code
                    );


                const entry =
                    farmMap.get(
                        farmCode
                    );


                if (
                    entry
                ) {

                    entry.farm =
                        farm._id;

                }

            }
        );

    }


    // ======================================================
    // FARM PRODUCTION
    // ======================================================

    const farmProduction =
        Array.from(
            farmMap.values()
        )

        .filter(
            entry =>
                entry.farm
        )

        .map(
            entry => ({

                farm:
                    entry.farm,

                farmCode:
                    entry.farmCode,

                liters:
                    round(
                        entry.liters
                    )

            })
        );


    // ======================================================
    // FARM TOTAL
    // ======================================================

    const farmTotal =
        round(
            farmProduction.reduce(
                (
                    total,
                    entry
                ) => {

                    return (
                        total +
                        Number(
                            entry.liters
                        )
                    );

                },
                0
            )
        );


    // ======================================================
    // COW PRODUCTION
    // ======================================================

    const cowProduction =
        Array.from(
            cowMap.values()
        )

        .map(
            entry => ({

                dairy:
                    entry.dairy,

                cowCode:
                    entry.cowCode,

                farmCode:
                    entry.farmCode,

                liters:
                    round(
                        entry.liters
                    )

            })
        );


    // ======================================================
    // SUMMARY
    // ======================================================

    let summary =
        await MilkSummary.findOne({

            day

        });


    if (!summary) {

        summary =
            new MilkSummary({

                day,

                month:
                    day.slice(
                        0,
                        7
                    )

            });

    }


    summary.cowProduction =
        cowProduction;


    summary.farmProduction =
        farmProduction;


    summary.farmTotal =
        farmTotal;


    summary.produced =
        round(
            produced
        );


    // ======================================================
    // PRESERVE CONSUMED
    // ======================================================

    const consumedValue =
        Number(
            summary.consumed
        );


    const consumed =
        Number.isFinite(
            consumedValue
        )
            ? consumedValue
            : 0;


    summary.available =
        Math.max(
            0,
            round(
                produced -
                consumed
            )
        );


    summary.month =
        day.slice(
            0,
            7
        );


    await summary.save();


    return summary;

}


// ==========================================================
// PUBLIC SUMMARY REBUILD
// ==========================================================

exports.rebuildDailySummary =
async function(
    day
) {

    const targetDay =
        day ||
        getNairobiDay();


    if (
        typeof targetDay !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(
            targetDay
        )
    ) {

        throw new Error(
            "Invalid milk summary date. Expected YYYY-MM-DD."
        );

    }


    return rebuildDailySummary(
        targetDay
    );

};


// ==========================================================
// PUBLIC SESSION HELPERS
// ==========================================================

exports.getCurrentSession =
getCurrentSession;


exports.getSessionStatus =
getSessionStatus;


// ==========================================================
// PUBLIC PERMISSION HELPER
// ==========================================================

exports.canModifyRecord =
canModifyRecord;


// ==========================================================
// PUBLIC FARM ACCESS
// ==========================================================

exports.verifyFarmAccess =
verifyFarmAccess;


// ==========================================================
// PUBLIC NAIROBI DAY
// ==========================================================

exports.getNairobiDay =
getNairobiDay;


// ==========================================================
// PUBLIC NAIROBI MONTH
// ==========================================================

exports.getNairobiMonth =
getNairobiMonth;


// ==========================================================
// PUBLIC ASSIGNED FARM IDS
// ==========================================================

exports.getAssignedFarmIds =
getAssignedFarmIds;


// ==========================================================
// PUBLIC AUTO-ZERO CONSTANT
// ==========================================================

exports.AUTO_ZERO_REMARK =
AUTO_ZERO_REMARK;


// ==========================================================
// PUBLIC SESSION CONSTANTS
// ==========================================================

exports.MORNING =
MORNING;


exports.EVENING =
EVENING;


// ==========================================================
// MODULE COMPLETE
// ==========================================================