// ==========================================================
// services/milkService.js
// ==========================================================

const Dairy =
    require("../models/dairy");

const Milk =
    require("../models/milk");


// ==========================================================
// DATE HELPERS
// ==========================================================

function getToday() {

    return new Date();

}


function getDayKey(date = new Date()) {

    return date.toLocaleDateString(
        "en-CA",
        {
            timeZone: "Africa/Nairobi"
        }
    );

}


function getMonthKey(date = new Date()) {

    const parts =
        new Intl.DateTimeFormat(
            "en-KE",
            {
                timeZone: "Africa/Nairobi",
                year: "numeric",
                month: "2-digit"
            }
        ).formatToParts(date);


    const year =
        parts.find(
            part => part.type === "year"
        ).value;

    const month =
        parts.find(
            part => part.type === "month"
        ).value;


    return `${year}-${month}`;

}


// ==========================================================
// CURRENT COLLECTION SESSION
//
// Morning: 00:00 - 09:59
// Closed: 10:00 - 15:59
// Evening: 16:00 - 23:59
//
// Admin may still make morning entries during "closed".
// ==========================================================

function getCurrentSession() {

    const now =
        new Date();


    const hour =
        Number(
            new Intl.DateTimeFormat(
                "en-KE",
                {
                    timeZone: "Africa/Nairobi",
                    hour: "2-digit",
                    hourCycle: "h23"
                }
            ).format(now)
        );


    if (hour < 10) {

        return "morning";

    }


    if (hour < 16) {

        return "closed";

    }


    return "evening";

}


// ==========================================================
// GET ASSIGNED FARM DOCUMENTS
// ==========================================================

async function getAssignedFarms(user) {

    if (!user) {
        return [];
    }


    /* ======================================================
       ADMIN
       ====================================================== */

    if (user.role === "admin") {

        return Dairy.find({
            code: {
                $lt: 0
            }
        })
        .sort({
            name: 1
        })
        .lean();

    }


    /* ======================================================
       DAIRY WORKER
       ====================================================== */

    if (user.role !== "dairyWorker") {

        return [];

    }


    const assignedFarmIds =
        Array.isArray(user.assignedFarm)
            ? user.assignedFarm
            : [];


    if (assignedFarmIds.length === 0) {

        return [];

    }


    return Dairy.find({
        _id: {
            $in: assignedFarmIds
        },

        code: {
            $lt: 0
        }
    })
    .sort({
        name: 1
    })
    .lean();

}


// ==========================================================
// FIND MILKING ANIMALS FOR FARM
// ==========================================================
//
// Your user model tells us that assignedFarm points to
// the farm Dairy document.
//
// The animal therefore needs to be associated with that
// farm. The service supports the farm reference used by
// the existing milk view.
//
// ==========================================================

async function getFarmAnimals(farmId) {

    if (!farmId) {

        return [];

    }


    /*
     * The current Dairy model used by the milk page may expose
     * the farm relationship as "farm".
     *
     * We first use the schema to determine the actual path.
     */

    const schemaPaths =
        Dairy.schema.paths;


    let farmPath = null;


    if (schemaPaths.farm) {

        farmPath = "farm";

    }

    else if (schemaPaths.dairyFarm) {

        farmPath = "dairyFarm";

    }

    else if (schemaPaths.farmId) {

        farmPath = "farmId";

    }


    /*
     * A farm relationship is required in order to know
     * which animals belong to which farm.
     */

    if (!farmPath) {

        console.error(
            "Dairy model has no farm relationship field."
        );

        return [];

    }


    const query = {

        isMilking: true,

        code: {
            $gte: 0
        }

    };


    query[farmPath] =
        farmId;


    return Dairy.find(query)
        .sort({
            name: 1,
            code: 1
        })
        .lean();

}


// ==========================================================
// GET MILK RECORDS FOR ANIMAL
// ==========================================================

async function getAnimalRecords(
    animalId,
    dayKey
) {

    const records =
        await Milk.find({
            dairy: animalId,

            day: dayKey
        })
        .sort({
            date: -1
        })
        .lean();


    let morning = null;
    let evening = null;


    records.forEach(function(record) {

        const session =
            record.session;


        if (
            session === "morning" &&
            !morning
        ) {

            morning = record;

        }


        if (
            session === "evening" &&
            !evening
        ) {

            evening = record;

        }

    });


    /*
     * If old records don't have session stored,
     * don't incorrectly assign them to both sessions.
     */

    return {
        morning,
        evening
    };

}


// ==========================================================
// BUILD MILK COLLECTION PAGE
// ==========================================================

exports.getMilkCollectionPage =
async function(user) {

    const currentSession =
        getCurrentSession();


    const farms =
        await getAssignedFarms(
            user
        );


    const dayKey =
        getDayKey();


    const milkDairyTables = [];


    for (const farm of farms) {

        const animals =
            await getFarmAnimals(
                farm._id
            );


        const animalsWithRecords =
            [];


        for (const animal of animals) {

            const records =
                await getAnimalRecords(
                    animal._id,
                    dayKey
                );


            animalsWithRecords.push({

                ...animal,

                morning:
                    records.morning,

                evening:
                    records.evening

            });

        }


        /*
         * Only farms with actual milking animals appear.
         */

        if (
            animalsWithRecords.length === 0
        ) {

            continue;

        }


        milkDairyTables.push({

            farm,

            animals:
                animalsWithRecords

        });

    }


    return {

        milkDairyTables,

        session:
            currentSession,

        currentDairy:
            farms.length === 1
                ? farms[0]
                : null

    };

};


// ==========================================================
// VERIFY FARM ACCESS
// ==========================================================

async function verifyFarmAccess(
    user,
    farmId
) {

    if (!user) {

        throw new Error(
            "Authentication required."
        );

    }


    if (user.role === "admin") {

        const farm =
            await Dairy.findOne({
                _id: farmId,
                code: {
                    $lt: 0
                }
            })
            .lean();


        if (!farm) {

            throw new Error(
                "The selected dairy farm does not exist."
            );

        }


        return farm;

    }


    if (user.role !== "dairyWorker") {

        throw new Error(
            "You are not authorized to record milk."
        );

    }


    const assignedFarmIds =
        Array.isArray(user.assignedFarm)
            ? user.assignedFarm.map(
                id => String(id)
            )
            : [];


    if (
        !assignedFarmIds.includes(
            String(farmId)
        )
    ) {

        throw new Error(
            "This dairy farm is not assigned to you."
        );

    }


    const farm =
        await Dairy.findOne({
            _id: farmId,
            code: {
                $lt: 0
            }
        })
        .lean();


    if (!farm) {

        throw new Error(
            "The selected dairy farm does not exist."
        );

    }


    return farm;

}


// ==========================================================
// VERIFY ANIMAL
// ==========================================================

async function verifyAnimal(
    animalId,
    farmId
) {

    const schemaPaths =
        Dairy.schema.paths;


    let farmPath = null;


    if (schemaPaths.farm) {

        farmPath = "farm";

    }

    else if (schemaPaths.dairyFarm) {

        farmPath = "dairyFarm";

    }

    else if (schemaPaths.farmId) {

        farmPath = "farmId";

    }


    if (!farmPath) {

        throw new Error(
            "Dairy model has no farm relationship."
        );

    }


    const query = {

        _id: animalId,

        isMilking: true,

        code: {
            $gte: 0
        }

    };


    query[farmPath] =
        farmId;


    const animal =
        await Dairy.findOne(
            query
        )
        .lean();


    if (!animal) {

        throw new Error(
            "The selected animal is not a milking animal belonging to this farm."
        );

    }


    return animal;

}


// ==========================================================
// SAVE MILK RECORD
// ==========================================================

exports.saveMilkRecord =
async function(data, user) {

    const {
        dairy,
        farm,
        liters,
        remarks,
        session
    } = data;


    if (!dairy) {

        throw new Error(
            "Animal is required."
        );

    }


    if (!farm) {

        throw new Error(
            "Dairy farm is required."
        );

    }


    const selectedSession =
        session === "evening"
            ? "evening"
            : "morning";


    const currentSession =
        getCurrentSession();


    /*
     * Worker can only enter during the appropriate open window.
     *
     * Admin can enter morning during the morning window
     * and during the closed period.
     */

    if (user.role === "dairyWorker") {

        if (
            currentSession !== selectedSession
        ) {

            throw new Error(
                "Milk collection is currently closed for this session."
            );

        }

    }


    if (user.role === "admin") {

        if (
            selectedSession === "morning" &&
            currentSession !== "morning" &&
            currentSession !== "closed"
        ) {

            throw new Error(
                "Morning collection is no longer available."
            );

        }


        if (
            selectedSession === "evening" &&
            currentSession !== "evening"
        ) {

            throw new Error(
                "Evening collection is currently closed."
            );

        }

    }


    const numericLiters =
        Number(liters);


    if (
        !Number.isFinite(
            numericLiters
        ) ||
        numericLiters < 0
    ) {

        throw new Error(
            "Enter a valid milk quantity."
        );

    }


    await verifyFarmAccess(
        user,
        farm
    );


    await verifyAnimal(
        dairy,
        farm
    );


    const dayKey =
        getDayKey();


    const monthKey =
        getMonthKey();


    /*
     * Prevent duplicate records for the same
     * animal/session/day.
     */

    const existing =
        await Milk.findOne({

            dairy,

            day:
                dayKey,

            session:
                selectedSession

        });


    if (existing) {

        throw new Error(
            "Milk has already been recorded for this animal for this session."
        );

    }


    const record =
        new Milk({

            dairy,

            liters:
                numericLiters,

            remarks:
                typeof remarks === "string"
                    ? remarks.trim()
                    : "",

            recordedBy:
                user._id,

            date:
                getToday(),

            day:
                dayKey,

            month:
                monthKey,

            session:
                selectedSession

        });


    await record.save();


    return record;

};


// ==========================================================
// UPDATE MILK RECORD
// ADMIN ONLY
// ==========================================================

exports.updateMilkRecord =
async function(
    recordId,
    data,
    user
) {

    if (
        !user ||
        user.role !== "admin"
    ) {

        throw new Error(
            "Only administrators can edit milk records."
        );

    }


    if (!recordId) {

        throw new Error(
            "Milk record ID is required."
        );

    }


    const numericLiters =
        Number(data.liters);


    if (
        !Number.isFinite(
            numericLiters
        ) ||
        numericLiters < 0
    ) {

        throw new Error(
            "Enter a valid milk quantity."
        );

    }


    const record =
        await Milk.findById(
            recordId
        );


    if (!record) {

        throw new Error(
            "Milk record not found."
        );

    }


    record.liters =
        numericLiters;


    record.remarks =
        typeof data.remarks === "string"
            ? data.remarks.trim()
            : "";


    /*
     * Keep the original collection date/session.
     * Editing a record should not move it into another
     * collection period.
     */

    await record.save();


    return record;

};


// ==========================================================
// EXPORT SESSION HELPER
// ==========================================================

exports.getCurrentSession =
    getCurrentSession;