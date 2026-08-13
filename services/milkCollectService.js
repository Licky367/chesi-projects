// ==========================================================
// services/milkCollectService.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Service layer for the "Record Today's Milk" page.
//
// Handles:
//
// • Nairobi current day
// • Dairy farm discovery
// • Worker assigned-farm filtering
// • Milking-animal filtering
// • Existing morning/evening records
// • Saving milk records
// • Worker read-only enforcement
// • Admin editing
// • MilkSummary updates
// • farmProduction
// • farmTotal
// • cowProduction
// • produced
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


    return formatter.format(
        date
    );

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
// NUMBER HELPER
// ==========================================================

function toNumber(
    value
) {

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
// ROUND
// ==========================================================

function round(
    value
) {

    return Math.round(
        Number(value) * 100
    ) / 100;

}


// ==========================================================
// IS ADMIN
// ==========================================================

function isAdmin(
    user
) {

    return (
        user &&
        user.role === "admin"
    );

}


// ==========================================================
// GET WORKER FARM IDS
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
                new mongoose.Types.ObjectId(
                    id
                )
        );

}


// ==========================================================
// GET TODAY'S MILK PAGE DATA
// ==========================================================
//
// Admin:
//     Gets every Dairy Farm.
//
// Dairy Worker:
//     Gets only farms in assignedFarm.
//
// Animals:
//     code > 0
//     code even
//     isMilking === true
//     assetCode === farm.code
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


    let farms;


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

                status: "active"

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
        user.role === "dairyWorker"
    ) {

        const assignedFarmIds =
            getAssignedFarmIds(
                user
            );


        if (
            assignedFarmIds.length === 0
        ) {

            farms = [];

        }

        else {

            farms =
                await Dairy.find({

                    _id: {
                        $in:
                            assignedFarmIds
                    },

                    code: {
                        $lt: 0
                    },

                    status: "active"

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
                    Number(farm.code)
            )
            .filter(
                code =>
                    Number.isFinite(code)
            );


    // ======================================================
    // GET MILKING FEMALE ANIMALS
    // ======================================================
    //
    // The assetCode of an animal is the negative code of
    // its parent Dairy Farm.
    //
    // Therefore:
    //
    // animal.assetCode === farm.code
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

            isMilking: true,

            assetCode: {
                $in:
                    farmCodes
            },

            status: "active"

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
        animalIds.length

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
    // INDEX MILK RECORDS
    // ======================================================

    const milkMap =
        new Map();


    milkRecords.forEach(
        record => {

            const key =
                `${record.dairy.toString()}:${record.session}`;


            milkMap.set(
                key,
                record
            );

        }
    );


    // ======================================================
    // FARM DATA
    // ======================================================

    const farmData =
        farms.map(
            farm => {

                const farmAnimals =
                    animals

                        .filter(
                            animal =>
                                Number(
                                    animal.assetCode
                                ) ===
                                Number(
                                    farm.code
                                )
                        )

                        .map(
                            animal => {

                                const morning =
                                    milkMap.get(
                                        `${animal._id.toString()}:morning`
                                    ) || null;


                                const evening =
                                    milkMap.get(
                                        `${animal._id.toString()}:evening`
                                    ) || null;


                                return {

                                    ...animal,

                                    morning,

                                    evening

                                };

                            }
                        );


                // ------------------------------------------
                // Calculate today's current farm total.
                // ------------------------------------------

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
// VALIDATE FARM ACCESS
// ==========================================================

async function verifyFarmAccess(
    user,
    farm
) {

    if (
        isAdmin(user)
    ) {

        return true;

    }


    if (
        user.role !== "dairyWorker"
    ) {

        return false;

    }


    const assignedFarmIds =
        getAssignedFarmIds(
            user
        );


    return assignedFarmIds.some(
        id =>
            id.toString() ===
            farm._id.toString()
    );

}


// ==========================================================
// GET VALID MILKING ANIMAL
// ==========================================================
//
// This is intentionally checked again during saving.
// Never trust the browser's list of animals.
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

        isMilking: true,

        status: "active"

    })

    .lean();

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

        status: "active"

    })

    .lean();

}


// ==========================================================
// CHECK EXISTING RECORD
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
        // Dairy workers cannot edit submitted records.
        // --------------------------------------------------

        if (
            !isAdmin(user)
        ) {

            return {

                record:
                    existing,

                changed:
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


        existing.recordedBy =
            user._id || user.id;


        existing.recordedByType =
            "user";

        existing.recordedBySystem =
            false;


        await existing.save();


        return {

            record:
                existing,

            changed:
                true,

            skipped:
                false

        };

    }


    // ======================================================
    // NO EXISTING RECORD
    // ======================================================

    const record =
        new Milk({

            dairy:
                animal._id,

            recordedBy:
                user._id || user.id,

            recordedByType:
                "user",

            recordedBySystem:
                false,

            liters,

            remarks,

            date:
                new Date(),

            session

        });


    await record.save();


    return {

        record,

        changed:
            true,

        skipped:
            false

    };

}


// ==========================================================
// REBUILD DAILY SUMMARY
// ==========================================================
//
// The summary is rebuilt from Milk records rather than
// trusting totals supplied by the browser.
//
// This keeps:
//
//     cowProduction
//     farmProduction
//     farmTotal
//     produced
//
// synchronized.
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
            "name code assetCode"
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


    let produced =
        0;


    for (
        const record of milkRecords
    ) {

        const liters =
            Number(
                record.liters
            );


        if (
            !Number.isFinite(
                liters
            )
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


        // --------------------------------------------------
        // Cow total
        // --------------------------------------------------

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


        // --------------------------------------------------
        // Farm total
        // --------------------------------------------------

        const farmCode =
            Number(
                animal.assetCode
            );


        if (
            Number.isFinite(
                farmCode
            )
        ) {

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

    }


    // ======================================================
    // ATTACH FARM DOCUMENTS
    // ======================================================

    const farmCodes =
        Array.from(
            farmMap.keys()
        );


    if (
        farmCodes.length
    ) {

        const farms =
            await Dairy.find({

                code: {
                    $in:
                        farmCodes
                },

                code: {
                    $lt: 0
                }

            })

            .lean();


        farms.forEach(
            farm => {

                const entry =
                    farmMap.get(
                        Number(
                            farm.code
                        )
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
                ) =>
                    total +
                    Number(
                        entry.liters
                    ),
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
    // FIND / CREATE SUMMARY
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
    // PRESERVE OTHER SUMMARY DATA
    // ======================================================
    //
    // This service only owns production-related fields.
    //
    // Sales, price, consumed and available are not blindly
    // overwritten here.
    //
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


    // ------------------------------------------------------
    // Available milk is recalculated from produced and
    // existing consumed value.
    // ------------------------------------------------------

    const consumed =
        Number(
            summary.consumed || 0
        );


    summary.available =
        Math.max(
            0,
            round(
                produced - (
                    Number.isFinite(
                        consumed
                    )
                        ? consumed
                        : 0
                )
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
        !records ||
        typeof records !== "object"
    ) {

        return {

            day:
                getNairobiDay(),

            created:
                0,

            updated:
                0,

            skipped:
                0

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
        const [animalId, animalSessions]
        of Object.entries(records)
    ) {

        if (
            !animalSessions ||
            typeof animalSessions !== "object"
        ) {

            continue;

        }


        // --------------------------------------------------
        // Never trust the submitted animal ID.
        // --------------------------------------------------

        const animal =
            await getValidAnimal(
                animalId
            );


        if (!animal) {

            continue;

        }


        // --------------------------------------------------
        // Verify that the animal's parent farm is accessible.
        // --------------------------------------------------

        const farm =
            await getFarmByCode(
                animal.assetCode
            );


        if (!farm) {

            continue;

        }


        const allowed =
            await verifyFarmAccess(
                user,
                farm
            );


        if (!allowed) {

            continue;

        }


        // ==================================================
        // MORNING + EVENING
        // ==================================================

        for (
            const session of [
                "morning",
                "evening"
            ]
        ) {

            const sessionData =
                animalSessions[
                    session
                ];


            if (
                !sessionData ||
                typeof sessionData !== "object"
            ) {

                continue;

            }


            const rawLiters =
                sessionData.liters;


            const rawRemarks =
                sessionData.remarks;


            // ------------------------------------------------
            // Blank quantity means "no new record".
            // ------------------------------------------------

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
                    `Invalid ${session} milk quantity for ${animal.name}.`
                );

            }


            const remarks =
                typeof rawRemarks === "string"

                    ? rawRemarks.trim()

                    : "";


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


            if (
                result.skipped
            ) {

                skipped++;

            }

            else if (
                result.changed
            ) {

                // Determine whether this was an update.
                if (
                    result.record.createdAt &&
                    result.record.updatedAt &&
                    result.record.createdAt.getTime() !==
                    result.record.updatedAt.getTime()
                ) {

                    updated++;

                }

                else {

                    created++;

                }

            }

        }

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

        created,

        updated,

        skipped,

        summary

    };

};


// ==========================================================
// EXPORT HELPERS FOR TESTING / OTHER SERVICES
// ==========================================================

exports.getNairobiDay =
    getNairobiDay;


exports.getNairobiMonth =
    getNairobiMonth;