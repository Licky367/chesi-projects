// ==========================================================
// services/milkCollectService.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Service layer for the "Record Today's Milk" module.
//
// Handles:
//
// • Nairobi current day/month
// • Dairy farm discovery
// • Worker assigned-farm filtering
// • Milking-animal filtering
// • Existing morning/evening records
// • Saving milk records
// • Worker read-only enforcement
// • Admin editing of existing records
// • Daily MilkSummary rebuilding
// • cowProduction
// • farmProduction
// • farmTotal
// • produced
// • available
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
// Those belong in milkController / milkService later.
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


// ==========================================================
// GET NAIROBI DAY
// ==========================================================
//
// Returns:
//
//     YYYY-MM-DD
//
// Example:
//
//     2026-08-13
//
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


    return formatter.format(
        date
    );

}


// ==========================================================
// GET NAIROBI MONTH
// ==========================================================
//
// Returns:
//
//     YYYY-MM
//
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
        !Number.isFinite(number)
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
        !Number.isFinite(number)
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
//
// Supports:
//
//     user._id
//
// or:
//
//     user.id
//
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
//
// Worker field:
//
//     assignedFarm
//
// Expected to be an array of MongoDB ObjectIds.
//
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
// GET TODAY'S MILK PAGE DATA
// ==========================================================
//
// ADMIN
// ----------------------------------------------------------
// Gets all active farm records.
//
// WORKER
// ----------------------------------------------------------
// Gets only farms assigned to the worker.
//
// ANIMALS
// ----------------------------------------------------------
// Uses the application's existing animal convention:
//
//     code > 0
//     code is even
//     isMilking === true
//     status === active
//     assetCode === parent farm code
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


    let farms = [];


    // ======================================================
    // ADMIN
    // ======================================================

    if (
        isAdmin(user)
    ) {

        farms =
            await Dairy.find({

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


    // ======================================================
    // DAIRY WORKER
    // ======================================================

    else if (
        isDairyWorker(user)
    ) {

        const assignedFarmIds =
            getAssignedFarmIds(
                user
            );


        if (
            assignedFarmIds.length > 0
        ) {

            farms =
                await Dairy.find({

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

    }


    // ======================================================
    // OTHER ROLES
    // ======================================================

    else {

        farms = [];

    }


    // ======================================================
    // NO FARMS
    // ======================================================

    if (
        farms.length === 0
    ) {

        return {

            day,

            month,

            farms: []

        };

    }


    // ======================================================
    // FARM CODES
    // ======================================================

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


    // ======================================================
    // GET ELIGIBLE MILKING ANIMALS
    // ======================================================
    //
    // Existing application convention:
    //
    //     Positive code = animal
    //     Even code     = female
    //
    // The animal must also currently be milking.
    //
    // ======================================================

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

        .sort({
            code: 1
        })

        .lean();


    // ======================================================
    // GET TODAY'S MILK RECORDS
    // ======================================================

    const animalIds =
        animals.map(
            animal =>
                animal._id
        );


    const milkRecords =
        animalIds.length > 0

            ? await Milk.find({

                dairy: {
                    $in:
                        animalIds
                },

                day

            })

            .sort({
                date: 1
            })

            .lean()

            : [];


    // ======================================================
    // INDEX RECORDS
    // ======================================================

    const milkMap =
        new Map();


    milkRecords.forEach(
        record => {

            if (
                !record.dairy ||
                !record.session
            ) {

                return;

            }


            const key =
                `${record.dairy.toString()}:${record.session}`;


            milkMap.set(
                key,
                record
            );

        }
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
                            animal => {

                                const morning =
                                    milkMap.get(
                                        `${animal._id.toString()}:${MORNING}`
                                    ) || null;


                                const evening =
                                    milkMap.get(
                                        `${animal._id.toString()}:${EVENING}`
                                    ) || null;


                                return {

                                    ...animal,

                                    morning,

                                    evening

                                };

                            }
                        );


                // ==================================================
                // CURRENT FARM TOTAL
                // ==================================================

                let total =
                    0;


                farmAnimals.forEach(
                    animal => {

                        if (
                            animal.morning
                        ) {

                            total +=
                                Number(
                                    animal.morning.liters
                                ) || 0;

                        }


                        if (
                            animal.evening
                        ) {

                            total +=
                                Number(
                                    animal.evening.liters
                                ) || 0;

                        }

                    }
                );


                return {

                    ...farm,

                    animals:
                        farmAnimals,

                    total:
                        round(total)

                };

            }
        );


    // ======================================================
    // RETURN
    // ======================================================

    return {

        day,

        month,

        farms:
            farmData

    };

};


// ==========================================================
// GET FARM BY CODE
// ==========================================================
//
// Farm codes are negative.
//
// Example:
//
//     -1
//     -2
//     -3
//
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
//
// ADMIN
// ----------------------------------------------------------
// Can access every farm.
//
// DAIRY WORKER
// ----------------------------------------------------------
// Can access only assigned farms.
//
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
//
// Never trust the animal supplied by the browser.
//
// The animal is revalidated against MongoDB.
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
// GET EXISTING MILK RECORD
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
// SAVE ONE MILK RECORD
// ==========================================================
//
// Returns:
//
//     created
//     updated
//     skipped
//
// This makes the parent saveMilk() function able to count
// records reliably without guessing from timestamps.
//
// ==========================================================

async function saveMilkRecord({
    user,
    animal,
    day,
    session,
    liters,
    remarks
}) {

    const existing =
        await getExistingRecord(
            animal._id,
            day,
            session
        );


    // ======================================================
    // EXISTING RECORD
    // ======================================================

    if (
        existing
    ) {

        // --------------------------------------------------
        // Worker cannot edit an already submitted record.
        // --------------------------------------------------

        if (
            !isAdmin(user)
        ) {

            return {

                record:
                    existing,

                created:
                    false,

                updated:
                    false,

                skipped:
                    true

            };

        }


        // --------------------------------------------------
        // Admin may edit.
        // --------------------------------------------------

        existing.liters =
            liters;


        existing.remarks =
            remarks;


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


        if (
            "recordedByType"
            in existing
        ) {

            existing.recordedByType =
                "user";

        }


        if (
            "recordedBySystem"
            in existing
        ) {

            existing.recordedBySystem =
                false;

        }


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
    // CREATE NEW RECORD
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


    const recordData = {

        dairy:
            animal._id,

        recordedBy:
            userId,

        liters:
            round(liters),

        remarks,

        date:
            new Date(),

        day,

        month:
            day.slice(
                0,
                7
            ),

        session

    };


    // ------------------------------------------------------
    // These fields are used by the current milk system if
    // they exist in the schema.
    // ------------------------------------------------------

    recordData.recordedByType =
        "user";

    recordData.recordedBySystem =
        false;


    const record =
        new Milk(
            recordData
        );


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
// REBUILD DAILY MILK SUMMARY
// ==========================================================
//
// IMPORTANT:
//
// The summary is rebuilt from Milk records.
//
// We do NOT trust totals sent by the browser.
//
// Produces:
//
//     cowProduction
//     farmProduction
//     farmTotal
//     produced
//     available
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
    // COW PRODUCTION MAP
    // ======================================================

    const cowMap =
        new Map();


    // ======================================================
    // FARM PRODUCTION MAP
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
        // COW PRODUCTION
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
        // FARM PRODUCTION
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
    // FIND PARENT FARMS
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
    // FARM PRODUCTION ARRAY
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
    // COW PRODUCTION ARRAY
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
    // FIND OR CREATE SUMMARY
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


    // ======================================================
    // UPDATE PRODUCTION FIELDS
    // ======================================================

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
    // PRESERVE CONSUMED / SALES DATA
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
// SAVE TODAY'S MILK
// ==========================================================
//
// Input:
//
// records = {
//
//     animalId: {
//
//         morning: {
//             liters,
//             remarks
//         },
//
//         evening: {
//             liters,
//             remarks
//         }
//
//     }
//
// }
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
    // RECORD VALIDATION
    // ======================================================

    if (
        !records ||
        typeof records !== "object" ||
        Array.isArray(records)
    ) {

        return {

            day:
                getNairobiDay(),

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


    const day =
        getNairobiDay();


    let created =
        0;


    let updated =
        0;


    let skipped =
        0;


    // ======================================================
    // PROCESS EACH ANIMAL
    // ======================================================

    for (
        const [
            animalId,
            animalSessions
        ]
        of Object.entries(records)
    ) {

        // --------------------------------------------------
        // Invalid session object.
        // --------------------------------------------------

        if (
            !animalSessions ||
            typeof animalSessions !== "object" ||
            Array.isArray(animalSessions)
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
        // FIND PARENT FARM
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
        // VERIFY FARM ACCESS
        // ==================================================

        const allowed =
            verifyFarmAccess(
                user,
                farm
            );


        if (!allowed) {

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
        // MORNING + EVENING
        // ==================================================

        for (
            const session
            of VALID_SESSIONS
        ) {

            const sessionData =
                animalSessions[
                    session
                ];


            if (
                !sessionData ||
                typeof sessionData !== "object" ||
                Array.isArray(sessionData)
            ) {

                continue;

            }


            const rawLiters =
                sessionData.liters;


            const rawRemarks =
                sessionData.remarks;


            // ==================================================
            // BLANK LITERS
            // ==================================================
            //
            // Blank means:
            //
            //     Do not create a new record.
            //
            // For workers, an existing record also remains
            // untouched.
            //
            // ==================================================

            if (
                rawLiters === undefined ||
                rawLiters === null ||
                rawLiters === ""
            ) {

                continue;

            }


            // ==================================================
            // CONVERT LITERS
            // ==================================================

            const liters =
                toNumber(
                    rawLiters
                );


            if (
                liters === null ||
                liters < 0
            ) {

                throw new Error(
                    `Invalid ${session} milk quantity for ${animal.name || "animal"}.`
                );

            }


            // ==================================================
            // REMARKS
            // ==================================================

            const remarks =
                typeof rawRemarks === "string"

                    ? rawRemarks.trim()

                    : "";


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

                    remarks

                });


            // ==================================================
            // COUNT RESULT
            // ==================================================

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

    }


    // ======================================================
    // REBUILD DAILY SUMMARY
    // ======================================================

    const summary =
        await rebuildDailySummary(
            day
        );


    // ======================================================
    // RETURN
    // ======================================================

    return {

        day,

        created,

        updated,

        skipped,

        summary

    };

};


// ==========================================================
// PUBLIC SUMMARY REBUILD
// ==========================================================
//
// Exposed so another milk controller/service can explicitly
// rebuild a day's production summary if necessary.
//
// ==========================================================

exports.rebuildDailySummary =
async function(
    day
) {

    const targetDay =
        day || getNairobiDay();


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
// PUBLIC FARM ACCESS HELPER
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
// MODULE COMPLETE
// ==========================================================