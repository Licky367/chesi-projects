// ==========================================================
// services/milkCollectService.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Service layer for:
//
//     /milk
//
// RESPONSIBILITIES
// ----------------------------------------------------------
//
// • Determine Nairobi milk session
// • Determine farms visible to the user
// • Find animals where isMilking === true
// • Group animals by assetCode
// • Load today's milk records
// • Build farm/animal data for milk.ejs
// • Save milk records
// • Automatically create zero records when sessions close
// • Rebuild Daily MilkSummary
//
// IMPORTANT
// ----------------------------------------------------------
//
// FARM IDENTIFICATION:
//     Farm code is stored in Dairy.code.
//
// ANIMAL IDENTIFICATION:
//     Animal has its own Dairy.code.
//
// FARM OWNERSHIP:
//     Animal.assetCode === Farm.code
//
// ELIGIBLE MILKING ANIMAL:
//     animal.isMilking === true
//
// THERE IS NO EVEN/ODD CODE RULE.
//
// The milk page must NOT assume that animal codes are even,
// odd, sequential, or any particular numeric pattern.
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


const MORNING_END_HOUR =
    10;


const EVENING_START_HOUR =
    16;


const AUTO_ZERO_REMARK =
    "Not Milked/recorded";


// ==========================================================
// GET NAIROBI DATE PARTS
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
            Number(
                result.year
            ),

        month:
            Number(
                result.month
            ),

        day:
            Number(
                result.day
            ),

        hour:
            Number(
                result.hour
            ),

        minute:
            Number(
                result.minute
            ),

        second:
            Number(
                result.second
            )

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
// GET CURRENT SESSION
// ==========================================================
//
// 00:00 - 09:59
//     Morning open
//
// 10:00 - 15:59
//     Morning recording remains active for the page.
//     Workers may still edit morning records.
//
// 16:00 - 23:59
//     Evening open
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


    if (
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
                hour < MORNING_END_HOUR,

            eveningOpen:
                false,

            morningClosed:
                hour >= MORNING_END_HOUR,

            eveningClosed:
                true,

            hour,

            minute:
                parts.minute

        };

    }


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

function getSessionStatus(
    date = new Date()
) {

    const parts =
        getNairobiDateParts(
            date
        );


    const hour =
        parts.hour;


    // ======================================================
    // MORNING OPEN
    // ======================================================

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
                false,

            betweenSessions:
                false,

            sessionClosed:
                false

        };

    }


    // ======================================================
    // MORNING CLOSED / EVENING NOT STARTED
    // ======================================================

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
                true,

            sessionClosed:
                true

        };

    }


    // ======================================================
    // EVENING
    // ======================================================

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
            true,

        betweenSessions:
            false,

        sessionClosed:
            false

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
        Number(
            value
        );


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

        user.role ===
            "admin"

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

        user.role ===
            "dairyWorker"

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
// GET USER FARMS
// ==========================================================
//
// ADMIN
// ----------------------------------------------------------
// Gets every farm.
//
// DAIRY WORKER
// ----------------------------------------------------------
// Gets only assigned farms.
//
// IMPORTANT
// ----------------------------------------------------------
// We identify farms using:
//
//     code < 0
//
// We do NOT require an arbitrary animal code pattern.
//
// ==========================================================

async function getUserFarms(
    user
) {

    let query = {

        code: {
            $lt: 0
        }

    };


    // ======================================================
    // ADMIN
    // ======================================================

    if (
        isAdmin(user)
    ) {

        return Dairy.find(
            query
        )

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


        query._id = {

            $in:
                assignedFarmIds

        };


        return Dairy.find(
            query
        )

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
        code === null
    ) {

        return null;

    }


    return Dairy.findOne({

        code

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
        farm._id
            ? farm._id.toString()
            : null;


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
//
// THIS IS IMPORTANT.
//
// The only eligibility condition for the animal is:
//
//     isMilking: true
//
// Plus:
//
//     assetCode must identify a farm.
//
// We do NOT require:
//
//     code to be even
//
// We do NOT require:
//
//     code % 2 === 0
//
// We do NOT invent any animal-numbering rule.
//
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

        isMilking:
            true

    })

    .lean();

}


// ==========================================================
// GET MILKING ANIMALS
// ==========================================================
//
// Finds ALL animals:
//
//     isMilking === true
//
// and whose assetCode belongs to one of the supplied farms.
//
// ==========================================================

async function getMilkingAnimals(
    farms
) {

    if (
        !Array.isArray(farms) ||
        farms.length === 0
    ) {

        return [];

    }


    const farmCodes =
        farms

        .map(
            farm =>
                toNumber(
                    farm.code
                )
        )

        .filter(
            code =>
                code !== null
        );


    if (
        farmCodes.length === 0
    ) {

        return [];

    }


    /*
     * IMPORTANT:
     *
     * No $mod.
     *
     * No code > 0.
     *
     * No animal status requirement.
     *
     * isMilking is the eligibility flag.
     *
     * assetCode links the animal to its farm.
     */

    return Dairy.find({

        isMilking:
            true,

        assetCode: {
            $in:
                farmCodes
        }

    })

    .sort({

        assetCode: 1,

        code: 1

    })

    .lean();

}


// ==========================================================
// GET EXISTING RECORD
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
// GET DAY MILK RECORDS
// ==========================================================

async function getDayMilkRecords(
    animalIds,
    day
) {

    if (
        !animalIds ||
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


    if (
        !Array.isArray(
            records
        )
    ) {

        return map;

    }


    records.forEach(
        record => {

            if (
                !record ||
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
// BUILD ANIMAL RECORD
// ==========================================================

function buildAnimalRecord(
    animal,
    milkMap,
    session
) {

    const animalId =
        animal._id.toString();


    const morning =
        milkMap.get(
            `${animalId}:${MORNING}`
        ) ||
        null;


    const evening =
        milkMap.get(
            `${animalId}:${EVENING}`
        ) ||
        null;


    const currentRecord =
        session === MORNING
            ? morning
            : evening;


    const morningLiters =
        Number(
            morning?.liters
        );


    const eveningLiters =
        Number(
            evening?.liters
        );


    const cumulative =
        round(

            (
                Number.isFinite(
                    morningLiters
                )
                    ? morningLiters
                    : 0
            )

            +

            (
                Number.isFinite(
                    eveningLiters
                )
                    ? eveningLiters
                    : 0
            )

        );


    return {

        ...animal,


        currentRecord,


        morning,


        evening,


        cumulative,


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

            Boolean(
                currentRecord
            )

    };

}


// ==========================================================
// GET MILK PAGE DATA
// ==========================================================
//
// THIS IS THE MAIN FUNCTION USED BY THE CONTROLLER.
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


    const now =
        new Date();


    const day =
        getNairobiDay(
            now
        );


    const month =
        getNairobiMonth(
            now
        );


    const sessionStatus =
        getSessionStatus(
            now
        );


    // ======================================================
    // GET FARMS USER CAN SEE
    // ======================================================

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


    // ======================================================
    // GET ALL MILKING ANIMALS
    // ======================================================

    const animals =
        await getMilkingAnimals(
            farms
        );


    // ======================================================
    // GET ANIMAL IDS
    // ======================================================

    const animalIds =
        animals.map(
            animal =>
                animal._id
        );


    // ======================================================
    // GET TODAY'S RECORDS
    // ======================================================

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
        farms

        .map(
            farm => {

                const farmCode =
                    Number(
                        farm.code
                    );


                /*
                 * Every animal whose assetCode matches
                 * this farm belongs in this table.
                 */

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
                // FARM TOTAL
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
                                    ) || 0

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


    // ======================================================
    // IMPORTANT
    // ======================================================
    //
    // Only farms containing at least one currently milking
    // animal should be displayed.
    //
    // This prevents empty farm tables.
    //
    // ======================================================

    const farmsWithMilkingAnimals =
        farmData.filter(
            farm =>
                Array.isArray(
                    farm.animals
                ) &&
                farm.animals.length > 0
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
            farmsWithMilkingAnimals,

        isAdmin:
            isAdmin(user),

        isDairyWorker:
            isDairyWorker(user)

    };

};


// ==========================================================
// CAN WORKER MODIFY SESSION
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


    if (
        session === MORNING
    ) {

        return (
            hour >= 0 &&
            hour < EVENING_START_HOUR
        );

    }


    return (
        hour >= EVENING_START_HOUR &&
        hour < 24
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
    // UPDATE
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
// AUTO RECORD ZERO
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
// FINALIZE SESSION
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
            }

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


    if (
        farmCodes.length === 0
    ) {

        return {

            day,

            session,

            created:
                0

        };

    }


    const animals =
        await Dairy.find({

            isMilking:
                true,

            assetCode: {
                $in:
                    farmCodes
            }

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
    // MORNING
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
    // Evening belongs to the previous day once midnight
    // has been crossed.
    //
    // A scheduled job should call finalizeDaySessions()
    // for the previous day.
    //
    // ======================================================

    return {

        day,

        morningCreated,

        eveningCreated

    };

};


// ==========================================================
// FINALIZE SPECIFIC DAY
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
// IMPORTANT
// ----------------------------------------------------------
// The server determines the session.
//
// The current EJS may submit:
//
// records[id][morning][liters]
// records[id][morning][remarks]
//
// or:
//
// records[id][evening][liters]
// records[id][evening][remarks]
//
// The service accepts both that structure and a flat:
//
// records[id][liters]
// records[id][remarks]
//
// BUT the server's current session always wins.
//
// ==========================================================

exports.saveMilk =
async function(
    user,
    records
) {

    if (!user) {

        throw new Error(
            "Authenticated user is required."
        );

    }


    if (
        !isAdmin(user) &&
        !isDairyWorker(user)
    ) {

        throw new Error(
            "You are not authorized to record milk."
        );

    }


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
    // PROCESS RECORDS
    // ======================================================

    for (
        const [
            animalId,
            submittedData
        ]
        of Object.entries(
            records
        )
    ) {

        if (
            !submittedData ||
            typeof submittedData !== "object" ||
            Array.isArray(
                submittedData
            )
        ) {

            continue;

        }


        const animal =
            await getValidAnimal(
                animalId
            );


        if (!animal) {

            skipped++;

            continue;

        }


        // ==================================================
        // FARM
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
        // FARM ACCESS
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
        // VERIFY ASSET CODE
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
        // SUPPORT CURRENT EJS STRUCTURE
        // ==================================================
        //
        // Current view:
        //
        // records[id][morning][liters]
        //
        // OR:
        //
        // records[id][evening][liters]
        //
        // ==================================================

        let data =
            submittedData;


        if (
            submittedData[session] &&
            typeof submittedData[session] ===
                "object"
        ) {

            data =
                submittedData[session];

        }


        const rawLiters =
            data.liters;


        // ==================================================
        // EMPTY INPUT
        // ==================================================

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


        const remarks =
            normalizeRemarks(
                data.remarks
            );


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
    // FINALIZE MORNING
    // ======================================================

    const parts =
        getNairobiDateParts(
            now
        );


    if (
        parts.hour >=
        MORNING_END_HOUR
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
// REBUILD DAILY SUMMARY
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


    const cowMap =
        new Map();


    const farmMap =
        new Map();


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
        // ANIMAL
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
                }

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
    // GET / CREATE SUMMARY
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
// PUBLIC PERMISSION
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
// PUBLIC AUTO ZERO
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