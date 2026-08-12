// ==========================================================
// services/milkService.js
// ==========================================================

const mongoose = require("mongoose");

const Dairy =
    require("../models/dairy");

const Milk =
    require("../models/milk");


// ==========================================================
// TIMEZONE
// ==========================================================

const TIME_ZONE =
    "Africa/Nairobi";


// ==========================================================
// DATE HELPERS
// ==========================================================

function getNairobiDateParts(date = new Date()) {

    const formatter =
        new Intl.DateTimeFormat(
            "en-KE",
            {
                timeZone: TIME_ZONE,

                year: "numeric",
                month: "2-digit",
                day: "2-digit",

                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",

                hour12: false
            }
        );


    const parts =
        formatter.formatToParts(date);


    const result = {};


    parts.forEach(part => {

        if (part.type !== "literal") {

            result[part.type] =
                part.value;

        }

    });


    return result;

}


// ==========================================================
// CURRENT COLLECTION SESSION
//
// 00:00 - 09:59  = MORNING
// 10:00 - 15:59  = CLOSED
// 16:00 - 23:59  = EVENING
// ==========================================================

function getCollectionSession(
    date = new Date()
) {

    const parts =
        getNairobiDateParts(date);


    const hour =
        Number(parts.hour);


    if (hour < 10) {

        return "morning";

    }


    if (hour < 16) {

        return "closed";

    }


    return "evening";

}


// ==========================================================
// GET DAY KEY
// ==========================================================

function getDayKey(
    date = new Date()
) {

    const parts =
        getNairobiDateParts(date);


    return (
        parts.year +
        "-" +
        parts.month +
        "-" +
        parts.day
    );

}


// ==========================================================
// GET MONTH KEY
// ==========================================================

function getMonthKey(
    date = new Date()
) {

    const parts =
        getNairobiDateParts(date);


    return (
        parts.year +
        "-" +
        parts.month
    );

}


// ==========================================================
// VALIDATE OBJECT ID
// ==========================================================

function isValidObjectId(id) {

    return mongoose.Types.ObjectId
        .isValid(id);

}


// ==========================================================
// NORMALIZE ID
// ==========================================================

function normalizeId(value) {

    if (!value) {
        return "";
    }


    if (
        typeof value === "object" &&
        value._id
    ) {

        return String(value._id);

    }


    return String(value);

}


// ==========================================================
// GET FARM FROM ANIMAL
//
// The EJS supports:
// - animal.farm
// - animal.dairyFarm
// - animal.farmInfo
//
// This helper keeps that compatibility.
// ==========================================================

function getAnimalFarm(animal) {

    if (!animal) {
        return null;
    }


    if (animal.farm) {

        return animal.farm;

    }


    if (animal.dairyFarm) {

        return animal.dairyFarm;

    }


    if (animal.farmInfo) {

        return animal.farmInfo;

    }


    return null;

}


// ==========================================================
// GET FARM ID
// ==========================================================

function getAnimalFarmId(animal) {

    const farm =
        getAnimalFarm(animal);


    if (!farm) {
        return "";
    }


    if (
        typeof farm === "object" &&
        farm._id
    ) {

        return String(farm._id);

    }


    return String(farm);

}


// ==========================================================
// GET FARM NAME
// ==========================================================

function getFarmName(farm) {

    if (
        farm &&
        typeof farm === "object" &&
        farm.name
    ) {

        return farm.name;

    }


    return "Dairy Farm";

}


// ==========================================================
// GET FARM CODE
// ==========================================================

function getFarmCode(farm) {

    if (
        farm &&
        typeof farm === "object" &&
        farm.code !== undefined &&
        farm.code !== null
    ) {

        return farm.code;

    }


    return null;

}


// ==========================================================
// POPULATE FARM IF THE DAIRY SCHEMA HAS A FARM REF
//
// This makes the service work whether the farm is:
// - embedded
// - a normal mongoose ref
// - a virtual
// ==========================================================

function prepareFarmPopulation(query) {

    const candidates = [

        "farm",
        "dairyFarm",
        "farmInfo"

    ];


    for (const path of candidates) {

        const schemaPath =
            Dairy.schema.path(path);


        const virtualPath =
            Dairy.schema.virtualpath(path);


        if (schemaPath) {

            const ref =
                schemaPath.options &&
                schemaPath.options.ref;


            if (ref) {

                query.populate(path);

                return query;

            }

        }


        if (virtualPath) {

            query.populate(path);

            return query;

        }

    }


    return query;

}


// ==========================================================
// FIND MILKING ANIMALS
// ==========================================================

async function getMilkingAnimals() {

    let query =
        Dairy.find({
            isMilking: true
        });


    query =
        prepareFarmPopulation(query);


    const animals =
        await query
            .sort({
                name: 1,
                code: 1
            })
            .lean();


    return animals || [];

}


// ==========================================================
// GET TODAY'S MILK RECORDS
// ==========================================================

async function getTodayMilkRecords() {

    const now =
        new Date();


    const day =
        getDayKey(now);


    const records =
        await Milk.find({
            day
        })
        .sort({
            date: 1,
            createdAt: 1
        })
        .lean();


    return records || [];

}


// ==========================================================
// BUILD FARM TABLES
// ==========================================================

function buildMilkDairyTables(
    animals,
    records,
    options = {}
) {

    const {

        admin = false,

        activeFarmId = "",

        currentFarm = null

    } = options;


    // ------------------------------------------------------
    // RECORD LOOKUP
    // ------------------------------------------------------

    const recordMap =
        new Map();


    records.forEach(record => {

        if (!record || !record.dairy) {
            return;
        }


        const dairyId =
            normalizeId(record.dairy);


        const recordSession =
            record.session ||
            record.collectionSession ||
            "";


        if (!recordSession) {
            return;
        }


        recordMap.set(
            dairyId +
            ":" +
            recordSession,
            record
        );

    });


    // ------------------------------------------------------
    // GROUP BY FARM
    // ------------------------------------------------------

    const groups =
        new Map();


    animals.forEach(animal => {

        if (!animal) {
            return;
        }


        const farm =
            getAnimalFarm(animal);


        const farmId =
            getAnimalFarmId(animal);


        // --------------------------------------------------
        // FARM FILTER FOR DAIRY WORKER
        // --------------------------------------------------

        if (
            !admin &&
            activeFarmId
        ) {

            if (
                farmId !== activeFarmId
            ) {

                return;

            }

        }


        // --------------------------------------------------
        // GROUP KEY
        // --------------------------------------------------

        const groupKey =
            farmId ||
            "unassigned";


        if (!groups.has(groupKey)) {

            groups.set(
                groupKey,
                {

                    farm:
                        farm || currentFarm || null,

                    animals: []

                }
            );

        }


        // --------------------------------------------------
        // MORNING RECORD
        // --------------------------------------------------

        const animalId =
            normalizeId(
                animal._id
            );


        const morning =
            recordMap.get(
                animalId +
                ":morning"
            ) || null;


        // --------------------------------------------------
        // EVENING RECORD
        // --------------------------------------------------

        const evening =
            recordMap.get(
                animalId +
                ":evening"
            ) || null;


        // --------------------------------------------------
        // ADD RECORDS TO ANIMAL
        // --------------------------------------------------

        groups
            .get(groupKey)
            .animals
            .push({

                ...animal,

                morning,

                evening

            });

    });


    // ------------------------------------------------------
    // FINAL ARRAY
    // ------------------------------------------------------

    return Array
        .from(groups.values())
        .filter(table => {

            return (
                table &&
                Array.isArray(table.animals) &&
                table.animals.length > 0
            );

        })
        .map(table => {

            const farm =
                table.farm || null;


            return {

                farm,

                farmName:
                    getFarmName(farm),

                farmCode:
                    getFarmCode(farm),

                animals:
                    table.animals

            };

        });

}


// ==========================================================
// GET MILK PAGE DATA
// ==========================================================

exports.getMilkPageData = async function ({
    user,
    activeFarmId = "",
    currentFarm = null
}) {

    // ------------------------------------------------------
    // CURRENT SESSION
    // ------------------------------------------------------

    const session =
        getCollectionSession();


    // ------------------------------------------------------
    // ADMIN
    // ------------------------------------------------------

    const admin =
        user &&
        user.role === "admin";


    // ------------------------------------------------------
    // DAIRY WORKER
    // ------------------------------------------------------

    const dairyWorker =
        user &&
        user.role === "dairyWorker";


    // ------------------------------------------------------
    // LOAD ANIMALS + RECORDS
    // ------------------------------------------------------

    const [
        animals,
        records
    ] =
        await Promise.all([

            getMilkingAnimals(),

            getTodayMilkRecords()

        ]);


    // ------------------------------------------------------
    // BUILD TABLES
    // ------------------------------------------------------

    const milkDairyTables =
        buildMilkDairyTables(

            animals,

            records,

            {

                admin,

                activeFarmId:
                    dairyWorker
                        ? activeFarmId
                        : "",

                currentFarm

            }

        );


    // ------------------------------------------------------
    // RETURN
    // ------------------------------------------------------

    return {

        session,

        currentFarm,

        milkDairyTables,

        // Useful fallback for the EJS
        dairies:
            animals

    };

};


// ==========================================================
// SAVE MILK RECORD
// ==========================================================

exports.saveMilkRecord = async function ({
    dairyId,
    farmId,
    liters,
    remarks,
    requestedSession,
    user,
    activeFarmId,
    currentFarm
}) {

    // ------------------------------------------------------
    // USER
    // ------------------------------------------------------

    if (!user) {

        throw new Error(
            "You must be logged in."
        );

    }


    // ------------------------------------------------------
    // ROLE
    // ------------------------------------------------------

    if (
        user.role !== "admin" &&
        user.role !== "dairyWorker"
    ) {

        throw new Error(
            "You are not authorized to record milk."
        );

    }


    // ------------------------------------------------------
    // DAIRY ID
    // ------------------------------------------------------

    if (
        !dairyId ||
        !isValidObjectId(dairyId)
    ) {

        throw new Error(
            "Invalid dairy animal."
        );

    }


    // ------------------------------------------------------
    // CURRENT SESSION
    // ------------------------------------------------------

    const currentSession =
        getCollectionSession();


    // ------------------------------------------------------
    // DETERMINE ACTUAL ENTRY SESSION
    //
    // Closed period:
    // admin -> morning
    // worker -> no entry
    // ------------------------------------------------------

    let entrySession =
        currentSession;


    if (
        currentSession === "closed"
    ) {

        if (
            user.role === "admin"
        ) {

            entrySession =
                "morning";

        } else {

            throw new Error(
                "Milk collection is closed from 10:00 AM to 4:00 PM."
            );

        }

    }


    // ------------------------------------------------------
    // VERIFY SESSION SENT BY FORM
    // ------------------------------------------------------

    if (
        requestedSession &&
        requestedSession !== entrySession
    ) {

        throw new Error(
            "The milk collection session has changed. Please refresh the page."
        );

    }


    // ------------------------------------------------------
    // LITRES
    // ------------------------------------------------------

    const amount =
        Number(liters);


    if (
        !Number.isFinite(amount) ||
        amount < 0
    ) {

        throw new Error(
            "Please enter a valid milk quantity."
        );

    }


    // ------------------------------------------------------
    // ANIMAL
    // ------------------------------------------------------

    const animal =
        await Dairy.findById(
            dairyId
        ).lean();


    if (!animal) {

        throw new Error(
            "The selected dairy animal could not be found."
        );

    }


    // ------------------------------------------------------
    // MUST STILL BE MILKING
    // ------------------------------------------------------

    if (
        animal.isMilking !== true
    ) {

        throw new Error(
            "This animal is not currently marked as being milked."
        );

    }


    // ------------------------------------------------------
    // FARM
    // ------------------------------------------------------

    const animalFarmId =
        getAnimalFarmId(animal);


    // ------------------------------------------------------
    // DAIRY WORKER FARM SECURITY
    // ------------------------------------------------------

    if (
        user.role === "dairyWorker" &&
        activeFarmId
    ) {

        if (
            animalFarmId &&
            animalFarmId !== String(activeFarmId)
        ) {

            throw new Error(
                "You can only record milk for your assigned dairy farm."
            );

        }

    }


    // ------------------------------------------------------
    // FORM FARM SECURITY
    // ------------------------------------------------------

    if (
        farmId &&
        animalFarmId &&
        String(farmId) !== String(animalFarmId)
    ) {

        throw new Error(
            "The selected animal does not belong to the selected farm."
        );

    }


    // ------------------------------------------------------
    // TODAY
    // ------------------------------------------------------

    const now =
        new Date();


    const day =
        getDayKey(now);


    const month =
        getMonthKey(now);


    // ------------------------------------------------------
    // PREVENT DUPLICATE RECORD
    //
    // One morning and one evening record per animal per day.
    // ------------------------------------------------------

    const existing =
        await Milk.findOne({

            dairy:
                dairyId,

            day,

            session:
                entrySession

        });


    if (existing) {

        throw new Error(
            `A ${entrySession} milk record has already been recorded for this animal.`
        );

    }


    // ------------------------------------------------------
    // RECORDED BY
    // ------------------------------------------------------

    const recordedBy =
        user._id ||
        user.id ||
        null;


    // ------------------------------------------------------
    // CREATE RECORD
    // ------------------------------------------------------

    const recordData = {

        dairy:
            dairyId,

        liters:
            amount,

        remarks:
            typeof remarks === "string"
                ? remarks.trim()
                : "",

        date:
            now,

        day,

        month,

        session:
            entrySession,

        recordedBy,

        recordedByType:
            "user",

        recordedBySystem:
            false

    };


    // ------------------------------------------------------
    // SAVE FARM ONLY IF THE MODEL SUPPORTS IT
    // ------------------------------------------------------

    const farmSchemaPath =
        Milk.schema.path("farm");


    if (
        farmSchemaPath &&
        farmId &&
        isValidObjectId(farmId)
    ) {

        recordData.farm =
            farmId;

    }


    // ------------------------------------------------------
    // CREATE
    // ------------------------------------------------------

    const record =
        await Milk.create(
            recordData
        );


    return record;

};


// ==========================================================
// ADMIN UPDATE MILK RECORD
// ==========================================================

exports.updateMilkRecord = async function ({
    recordId,
    liters,
    remarks,
    user
}) {

    // ------------------------------------------------------
    // ADMIN
    // ------------------------------------------------------

    if (
        !user ||
        user.role !== "admin"
    ) {

        throw new Error(
            "Only an administrator can edit milk records."
        );

    }


    // ------------------------------------------------------
    // RECORD ID
    // ------------------------------------------------------

    if (
        !recordId ||
        !isValidObjectId(recordId)
    ) {

        throw new Error(
            "Invalid milk record."
        );

    }


    // ------------------------------------------------------
    // LITRES
    // ------------------------------------------------------

    const amount =
        Number(liters);


    if (
        !Number.isFinite(amount) ||
        amount < 0
    ) {

        throw new Error(
            "Please enter a valid milk quantity."
        );

    }


    // ------------------------------------------------------
    // FIND RECORD
    // ------------------------------------------------------

    const record =
        await Milk.findById(
            recordId
        );


    if (!record) {

        throw new Error(
            "Milk record not found."
        );

    }


    // ------------------------------------------------------
    // UPDATE
    // ------------------------------------------------------

    record.liters =
        amount;


    record.remarks =
        typeof remarks === "string"
            ? remarks.trim()
            : "";


    // ------------------------------------------------------
    // KEEP AUDIT INFORMATION
    // ------------------------------------------------------

    if (
        Milk.schema.path("updatedBy")
    ) {

        record.updatedBy =
            user._id ||
            user.id ||
            null;

    }


    if (
        Milk.schema.path("updatedByType")
    ) {

        record.updatedByType =
            "user";

    }


    if (
        Milk.schema.path("updatedAt")
    ) {

        record.updatedAt =
            new Date();

    }


    // ------------------------------------------------------
    // SAVE
    // ------------------------------------------------------

    await record.save();


    return record;

};


// ==========================================================
// EXPORT TIME HELPERS
//
// Useful if another milk controller/service needs them.
// ==========================================================

exports.getCollectionSession =
    getCollectionSession;


exports.getDayKey =
    getDayKey;


exports.getMonthKey =
    getMonthKey;