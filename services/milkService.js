// ==========================================================
// services/milkService.js
// ==========================================================

const Dairy = require("../models/dairy");
const Milk = require("../models/milk");


// ==========================================================
// DATE HELPERS
// ==========================================================

function getDate(date = new Date()) {
    return new Date(date);
}


function getDayKey(date = new Date()) {

    const d = getDate(date);

    const year =
        d.getFullYear();

    const month =
        String(d.getMonth() + 1).padStart(2, "0");

    const day =
        String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function getMonthKey(date = new Date()) {

    const d = getDate(date);

    const year =
        d.getFullYear();

    const month =
        String(d.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
}


function getSessionKey(session) {

    return session === "evening"
        ? "evening"
        : "morning";
}


// ==========================================================
// GET MILKING ANIMALS
// ==========================================================

exports.getMilkingAnimals = async () => {

    return await Dairy.find({
        isMilking: true
    })
        .sort({
            name: 1
        })
        .lean();

};


// ==========================================================
// GET MILK COLLECTION TABLES
// ==========================================================
//
// Returns:
//
// [
//   {
//      farm: {...},
//      animals: [...]
//   }
// ]
//
// Each animal receives:
//
// morning: latest/current morning record
// evening: latest/current evening record
//
// ==========================================================

exports.getMilkDairyTables = async () => {

    const animals =
        await Dairy.find({
            isMilking: true
        })
        .sort({
            name: 1
        })
        .lean();


    if (!animals.length) {
        return [];
    }


    const today =
        getDayKey();


    const records =
        await Milk.find({
            day: today
        })
        .sort({
            date: -1
        })
        .lean();


    const recordsByAnimal =
        new Map();


    records.forEach(function (record) {

        if (!record || !record.dairy) {
            return;
        }


        const animalId =
            String(record.dairy);


        if (!recordsByAnimal.has(animalId)) {

            recordsByAnimal.set(
                animalId,
                {
                    morning: null,
                    evening: null
                }
            );

        }


        const session =
            getSessionKey(
                record.session
            );


        /*
         * Keep the newest record for
         * each animal/session.
         */

        if (
            !recordsByAnimal
                .get(animalId)[session]
        ) {

            recordsByAnimal
                .get(animalId)[session] =
                    record;

        }

    });


    /*
     * Group animals by farm.
     */

    const farms =
        new Map();


    animals.forEach(function (animal) {

        if (!animal) {
            return;
        }


        const farm =
            animal.farm ||
            animal.dairyFarm ||
            animal.farmInfo ||
            null;


        const farmId =
            farm && farm._id
                ? String(farm._id)
                : "unassigned";


        if (!farms.has(farmId)) {

            farms.set(
                farmId,
                {
                    farm: farm,
                    animals: []
                }
            );

        }


        const animalRecords =
            recordsByAnimal.get(
                String(animal._id)
            );


        animal.morning =
            animalRecords
                ? animalRecords.morning
                : null;


        animal.evening =
            animalRecords
                ? animalRecords.evening
                : null;


        farms
            .get(farmId)
            .animals
            .push(animal);

    });


    return Array.from(
        farms.values()
    );

};


// ==========================================================
// GET CURRENT MILK RECORD
// ==========================================================

exports.getMilkRecord = async (
    dairyId,
    session,
    date = new Date()
) => {

    const day =
        getDayKey(date);


    return await Milk.findOne({
        dairy: dairyId,
        day: day,
        session: getSessionKey(session)
    })
        .sort({
            date: -1
        });

};


// ==========================================================
// SAVE MILK RECORD
// ==========================================================
//
// Used by normal collection entry.
//
// Expected record:
//
// {
//   dairy,
//   farm,
//   session,
//   liters,
//   remarks,
//   recordedBy
// }
//
// ==========================================================

exports.saveMilkRecord = async ({
    dairy,
    farm,
    session,
    liters,
    remarks,
    recordedBy,
    recordedByType = "user",
    recordedBySystem = false,
    date = new Date()
}) => {

    if (!dairy) {
        throw new Error(
            "Dairy animal is required."
        );
    }


    const collectionSession =
        getSessionKey(session);


    const milkLitres =
        Number(liters);


    if (
        !Number.isFinite(milkLitres) ||
        milkLitres < 0
    ) {

        throw new Error(
            "Milk quantity must be a valid number."
        );

    }


    const recordDate =
        getDate(date);


    const day =
        getDayKey(recordDate);


    const month =
        getMonthKey(recordDate);


    /*
     * Prevent duplicate collection
     * records for the same animal,
     * day and session.
     */

    const existing =
        await Milk.findOne({
            dairy: dairy,
            day: day,
            session: collectionSession
        });


    if (existing) {

        throw new Error(
            "A milk record already exists for this animal for this collection session."
        );

    }


    const milk =
        new Milk({

            dairy: dairy,

            farm:
                farm || undefined,

            liters:
                milkLitres,

            remarks:
                remarks
                    ? String(remarks).trim()
                    : "",

            recordedBy:
                recordedBy || undefined,

            recordedByType:
                recordedByType,

            recordedBySystem:
                Boolean(recordedBySystem),

            session:
                collectionSession,

            date:
                recordDate,

            day:
                day,

            month:
                month

        });


    return await milk.save();

};


// ==========================================================
// SAVE MULTIPLE MILK RECORDS
// ==========================================================
//
// Kept for compatibility with older controller logic.
//
// ==========================================================

exports.saveMilkRecords = async (
    records,
    recordedBy
) => {

    if (!Array.isArray(records)) {
        throw new Error(
            "Milk records must be an array."
        );
    }


    const savedRecords = [];


    for (
        const record of records
    ) {

        if (!record) {
            continue;
        }


        const saved =
            await exports.saveMilkRecord({

                dairy:
                    record.dairy,

                farm:
                    record.farm,

                session:
                    record.session,

                liters:
                    record.liters,

                remarks:
                    record.remarks,

                recordedBy:
                    recordedBy,

                recordedByType:
                    "user",

                recordedBySystem:
                    false

            });


        savedRecords.push(
            saved
        );

    }


    return savedRecords;

};


// ==========================================================
// UPDATE MILK RECORD
// ==========================================================
//
// ADMIN ONLY.
//
// Updates:
//
// - liters
// - remarks
//
// Does NOT change:
//
// - dairy
// - farm
// - session
// - original collection date
//
// ==========================================================

exports.updateMilkRecord = async (
    recordId,
    {
        liters,
        remarks
    }
) => {

    if (!recordId) {

        throw new Error(
            "Milk record ID is required."
        );

    }


    const milkLitres =
        Number(liters);


    if (
        !Number.isFinite(milkLitres) ||
        milkLitres < 0
    ) {

        throw new Error(
            "Milk quantity must be a valid number."
        );

    }


    const cleanedRemarks =
        remarks
            ? String(remarks).trim()
            : "";


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
        milkLitres;


    record.remarks =
        cleanedRemarks;


    /*
     * If an administrator edits an
     * automatically-generated
     * "Not Milked" record, it becomes
     * a normal user/admin record.
     */

    if (
        record.recordedByType === "system" ||
        record.recordedBySystem
    ) {

        record.recordedByType =
            "admin";

        record.recordedBySystem =
            false;

    }


    return await record.save();

};


// ==========================================================
// DELETE MILK RECORD
// ==========================================================
//
// ADMIN ONLY.
//
// ==========================================================

exports.deleteMilkRecord = async (
    recordId
) => {

    if (!recordId) {

        throw new Error(
            "Milk record ID is required."
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


    await Milk.deleteOne({
        _id: recordId
    });


    return record;

};


// ==========================================================
// CREATE AUTOMATIC "NOT MILKED" RECORD
// ==========================================================
//
// Used when an animal remains marked
// as milking but no milk was entered
// before the collection window closes.
//
// ==========================================================

exports.createNotMilkedRecord = async ({
    dairy,
    farm,
    session,
    recordedBy = null,
    date = new Date()
}) => {

    if (!dairy) {

        throw new Error(
            "Dairy animal is required."
        );

    }


    const collectionSession =
        getSessionKey(session);


    const recordDate =
        getDate(date);


    const day =
        getDayKey(recordDate);


    const month =
        getMonthKey(recordDate);


    const existing =
        await Milk.findOne({
            dairy: dairy,
            day: day,
            session: collectionSession
        });


    if (existing) {

        return existing;

    }


    const record =
        new Milk({

            dairy:
                dairy,

            farm:
                farm || undefined,

            liters:
                0,

            remarks:
                "Not Milked",

            recordedBy:
                recordedBy || undefined,

            recordedByType:
                "system",

            recordedBySystem:
                true,

            session:
                collectionSession,

            date:
                recordDate,

            day:
                day,

            month:
                month

        });


    return await record.save();

};


// ==========================================================
// CREATE AUTOMATIC RECORDS FOR MISSING ANIMALS
// ==========================================================

exports.createMissingNotMilkedRecords = async (
    session,
    recordedBy = null
) => {

    const animals =
        await Dairy.find({
            isMilking: true
        })
        .lean();


    const created = [];


    for (
        const animal of animals
    ) {

        try {

            const record =
                await exports.createNotMilkedRecord({

                    dairy:
                        animal._id,

                    farm:
                        animal.farm ||
                        animal.dairyFarm ||
                        undefined,

                    session:
                        session,

                    recordedBy:
                        recordedBy

                });


            if (record) {
                created.push(record);
            }

        } catch (error) {

            console.error(
                "Unable to create Not Milked record:",
                error
            );

        }

    }


    return created;

};


// ==========================================================
// DAILY STATS
// ==========================================================

exports.getDailyStats = async (
    date = new Date()
) => {

    const day =
        getDayKey(date);


    const records =
        await Milk.find({
            day: day
        })
        .populate(
            "dairy"
        )
        .sort({
            date: 1
        })
        .lean();


    let morningTotal = 0;
    let eveningTotal = 0;
    let total = 0;


    records.forEach(function (record) {

        const litres =
            Number(
                record.liters || 0
            );


        total += litres;


        if (
            record.session === "evening"
        ) {

            eveningTotal += litres;

        } else {

            morningTotal += litres;

        }

    });


    return {

        day,

        records,

        morningTotal,

        eveningTotal,

        total

    };

};


// ==========================================================
// MONTHLY STATS
// ==========================================================

exports.getMonthlyStats = async (
    year,
    month
) => {

    let monthKey;


    if (
        year !== undefined &&
        month !== undefined
    ) {

        monthKey =
            `${year}-${String(month).padStart(2, "0")}`;

    } else {

        monthKey =
            getMonthKey();

    }


    const records =
        await Milk.find({
            month: monthKey
        })
        .populate(
            "dairy"
        )
        .sort({
            date: 1
        })
        .lean();


    let total = 0;


    records.forEach(function (record) {

        total +=
            Number(
                record.liters || 0
            );

    });


    return {

        month:
            monthKey,

        records,

        total

    };

};


// ==========================================================
// GET CURRENT MILK PRICE
// ==========================================================
//
// Kept flexible because the price source
// can vary depending on the application's
// current Milk model.
//
// ==========================================================

exports.getCurrentPrice = async () => {

    try {

        /*
         * If your Milk model stores price
         * information, retrieve the latest
         * available record.
         */

        const latest =
            await Milk.findOne({
                price: {
                    $exists: true
                }
            })
            .sort({
                date: -1
            })
            .lean();


        if (
            latest &&
            latest.price !== undefined
        ) {

            return Number(
                latest.price
            );

        }

    } catch (error) {

        console.error(
            "Unable to retrieve milk price:",
            error
        );

    }


    return 0;

};


// ==========================================================
// GET MILK HISTORY FOR AN ANIMAL
// ==========================================================

exports.getMilkHistory = async (
    dairyId
) => {

    if (!dairyId) {
        return [];
    }


    return await Milk.find({
        dairy: dairyId
    })
        .sort({
            date: -1
        })
        .populate(
            "dairy"
        )
        .lean();

};


// ==========================================================
// GET MILK HISTORY BY DATE RANGE
// ==========================================================

exports.getMilkHistoryByDateRange = async (
    startDate,
    endDate
) => {

    const start =
        getDate(startDate);


    const end =
        getDate(endDate);


    return await Milk.find({

        date: {
            $gte: start,
            $lte: end
        }

    })
        .populate(
            "dairy"
        )
        .sort({
            date: -1
        })
        .lean();

};


// ==========================================================
// GET SALES PAGE DATA
// ==========================================================
//
// Compatibility helper for the existing
// sales module.
//
// ==========================================================

exports.getSalesPageData = async () => {

    const today =
        getDayKey();


    const records =
        await Milk.find({
            day: today
        })
        .populate(
            "dairy"
        )
        .sort({
            date: -1
        })
        .lean();


    const totalMilk =
        records.reduce(
            function (sum, record) {

                return sum +
                    Number(
                        record.liters || 0
                    );

            },
            0
        );


    const price =
        await exports.getCurrentPrice();


    return {

        records,

        totalMilk,

        price,

        totalValue:
            totalMilk * price

    };

};


// ==========================================================
// PROCESS DAILY SALES
// ==========================================================

exports.processDailySales = async ({
    liters,
    price,
    date = new Date()
}) => {

    const milkLitres =
        Number(liters);


    const milkPrice =
        Number(price);


    if (
        !Number.isFinite(milkLitres) ||
        milkLitres < 0
    ) {

        throw new Error(
            "Invalid milk quantity."
        );

    }


    if (
        !Number.isFinite(milkPrice) ||
        milkPrice < 0
    ) {

        throw new Error(
            "Invalid milk price."
        );

    }


    return {

        date:
            getDate(date),

        liters:
            milkLitres,

        price:
            milkPrice,

        total:
            milkLitres * milkPrice

    };

};


// ==========================================================
// STANDING ORDER
// ==========================================================
//
// These functions are retained for the
// existing sales functionality.
//
// The exact standing-order fields depend
// on the Milk model schema.
// ==========================================================

exports.addStandingOrder = async (
    data
) => {

    if (!data) {

        throw new Error(
            "Standing order data is required."
        );

    }


    /*
     * If the current Milk model contains
     * standing-order fields, create the
     * record using those fields.
     *
     * Otherwise return the supplied data
     * so the controller can handle the
     * actual sales model.
     */

    if (
        Milk.schema &&
        Milk.schema.path("standingOrder")
    ) {

        const order =
            new Milk({
                standingOrder:
                    data
            });


        return await order.save();

    }


    return data;

};


// ==========================================================
// OMIT STANDING ORDER
// ==========================================================

exports.omitStandingOrder = async (
    orderId
) => {

    if (!orderId) {

        throw new Error(
            "Standing order ID is required."
        );

    }


    if (
        Milk.schema &&
        Milk.schema.path("standingOrder")
    ) {

        return await Milk.findByIdAndUpdate(
            orderId,
            {
                $set: {
                    standingOrder: false
                }
            },
            {
                new: true
            }
        );

    }


    return null;

};


// ==========================================================
// EXPORT DATE HELPERS
// ==========================================================

exports.getDayKey =
    getDayKey;


exports.getMonthKey =
    getMonthKey;