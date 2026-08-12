// ==========================================================
// services/milkService.js
// ==========================================================

const Dairy = require("../models/dairy");
const Milk = require("../models/milk");


// ==========================================================
// NAIROBI DATE/TIME HELPERS
// ==========================================================

function getNairobiParts(date = new Date()) {

    const formatter =
        new Intl.DateTimeFormat(
            "en-KE",
            {
                timeZone: "Africa/Nairobi",
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


    const values = {};


    parts.forEach(function (part) {

        if (part.type !== "literal") {

            values[part.type] =
                part.value;

        }

    });


    return {
        year: Number(values.year),
        month: Number(values.month),
        day: Number(values.day),
        hour: Number(values.hour),
        minute: Number(values.minute),
        second: Number(values.second)
    };

}


// ==========================================================
// CURRENT COLLECTION SESSION
// ==========================================================

function getCurrentSession(date = new Date()) {

    const {
        hour
    } = getNairobiParts(date);


    /*
     * 00:00 - 09:59
     * Morning
     *
     * 10:00 - 15:59
     * Closed
     *
     * 16:00 - 23:59
     * Evening
     */

    if (hour >= 0 && hour < 10) {

        return "morning";

    }


    if (hour >= 10 && hour < 16) {

        return "closed";

    }


    return "evening";

}


// ==========================================================
// DATE KEYS
// ==========================================================

function getDayKey(date = new Date()) {

    const {
        year,
        month,
        day
    } = getNairobiParts(date);


    return (
        String(year) +
        "-" +
        String(month).padStart(2, "0") +
        "-" +
        String(day).padStart(2, "0")
    );

}


function getMonthKey(date = new Date()) {

    const {
        year,
        month
    } = getNairobiParts(date);


    return (
        String(year) +
        "-" +
        String(month).padStart(2, "0")
    );

}


// ==========================================================
// FARM IDENTIFICATION
// ==========================================================

function getFarmIdFromAnimal(animal) {

    if (!animal) {
        return "";
    }


    if (animal.farm) {

        if (typeof animal.farm === "object") {

            if (animal.farm._id) {

                return String(
                    animal.farm._id
                );

            }

        }

        else {

            return String(
                animal.farm
            );

        }

    }


    if (animal.dairyFarm) {

        if (
            typeof animal.dairyFarm === "object" &&
            animal.dairyFarm._id
        ) {

            return String(
                animal.dairyFarm._id
            );

        }

        return String(
            animal.dairyFarm
        );

    }


    if (animal.farmId) {

        return String(
            animal.farmId
        );

    }


    return "";

}


// ==========================================================
// LOAD FARMS
//
// Farms are the non-animal Dairy records whose code is
// negative. Their positive counterpart identifies animals
// belonging to that farm.
// ==========================================================

async function getFarmRecords() {

    return Dairy
        .find({
            code: {
                $lt: 0
            }
        })
        .sort({
            code: 1
        })
        .lean();

}


// ==========================================================
// LOAD CURRENTLY MILKING ANIMALS
// ==========================================================

async function getMilkingAnimals() {

    return Dairy
        .find({
            isMilking: true,
            code: {
                $gte: 0
            }
        })
        .sort({
            code: 1
        })
        .lean();

}


// ==========================================================
// FIND FARM FOR ANIMAL
// ==========================================================

function resolveAnimalFarm(
    animal,
    farms
) {

    const directFarmId =
        getFarmIdFromAnimal(animal);


    if (directFarmId) {

        return farms.find(
            function (farm) {

                return (
                    farm &&
                    farm._id &&
                    String(farm._id) ===
                    directFarmId
                );

            }
        ) || null;

    }


    /*
     * Farm ownership is represented by
     * the negative farm code.
     *
     * Therefore an animal's positive code
     * is associated with the corresponding
     * farm code.
     *
     * Example:
     *
     * farm code: -12
     * animal code: 12
     */

    const animalCode =
        Number(animal.code);


    if (
        Number.isFinite(animalCode)
    ) {

        return farms.find(
            function (farm) {

                return (
                    Math.abs(
                        Number(farm.code)
                    ) === animalCode
                );

            }
        ) || null;

    }


    return null;

}


// ==========================================================
// LOAD EXISTING RECORDS FOR TODAY
// ==========================================================

async function getTodayMilkRecords() {

    const day =
        getDayKey();


    const records =
        await Milk
            .find({
                day
            })
            .lean();


    return records;

}


// ==========================================================
// BUILD FARM TABLES
// ==========================================================

async function buildMilkDairyTables() {

    const [
        farms,
        animals,
        records
    ] = await Promise.all([
        getFarmRecords(),
        getMilkingAnimals(),
        getTodayMilkRecords()
    ]);


    const session =
        getCurrentSession();


    const tables =
        new Map();


    /*
     * Create farm sections first.
     */

    farms.forEach(function (farm) {

        const id =
            farm && farm._id
                ? String(farm._id)
                : "";


        if (!id) {
            return;
        }


        tables.set(
            id,
            {
                farm,
                animals: []
            }
        );

    });


    /*
     * Add currently milking animals
     * to their actual farms.
     */

    animals.forEach(function (animal) {

        const farm =
            resolveAnimalFarm(
                animal,
                farms
            );


        if (!farm) {
            return;
        }


        const farmId =
            String(farm._id);


        if (!tables.has(farmId)) {

            tables.set(
                farmId,
                {
                    farm,
                    animals: []
                }
            );

        }


        /*
         * Find today's record for the
         * current collection session.
         */

        const matchingRecord =
            records.find(
                function (record) {

                    if (
                        !record ||
                        !record.dairy
                    ) {
                        return false;
                    }


                    return (
                        String(record.dairy) ===
                        String(animal._id) &&
                        record.session ===
                        session
                    );

                }
            ) || null;


        /*
         * Attach records directly to
         * the animal object.
         */

        animal.morning = null;
        animal.evening = null;


        records.forEach(
            function (record) {

                if (
                    !record ||
                    !record.dairy
                ) {
                    return;
                }


                if (
                    String(record.dairy) !==
                    String(animal._id)
                ) {
                    return;
                }


                if (
                    record.session ===
                    "morning"
                ) {

                    animal.morning =
                        record;

                }


                if (
                    record.session ===
                    "evening"
                ) {

                    animal.evening =
                        record;

                }

            }
        );


        /*
         * matchingRecord is intentionally
         * resolved above so the animal is
         * prepared for the current session.
         */

        void matchingRecord;


        tables
            .get(farmId)
            .animals
            .push(animal);

    });


    return Array
        .from(
            tables.values()
        )
        .filter(
            function (table) {

                return (
                    table.animals &&
                    table.animals.length > 0
                );

            }
        );

}


// ==========================================================
// GET ACTIVE FARM
//
// The application stores the worker's active farm in the
// session. Several names are supported so this service does
// not break an existing session implementation.
// ==========================================================

async function getActiveWorkerFarm(user) {

    if (!user) {
        return null;
    }


    const farmId =
        user.currentFarm ||
        user.currentDairy ||
        user.farm ||
        user.farmId ||
        user.dairyFarm ||
        null;


    if (!farmId) {
        return null;
    }


    if (
        typeof farmId === "object" &&
        farmId._id
    ) {

        return Dairy.findById(
            farmId._id
        ).lean();

    }


    return Dairy
        .findById(farmId)
        .lean();

}


// ==========================================================
// FILTER TABLES FOR WORKER
// ==========================================================

function filterTablesForWorker(
    tables,
    activeFarm
) {

    if (!activeFarm) {
        return [];
    }


    const activeFarmId =
        String(activeFarm._id);


    return tables.filter(
        function (table) {

            if (
                !table ||
                !table.farm ||
                !table.farm._id
            ) {
                return false;
            }


            return (
                String(
                    table.farm._id
                ) === activeFarmId
            );

        }
    );

}


// ==========================================================
// PAGE DATA
// ==========================================================

exports.getMilkCollectionPageData =
    async function (user) {

        const session =
            getCurrentSession();


        const activeFarm =
            user.role === "dairyWorker"
                ? await getActiveWorkerFarm(user)
                : null;


        let milkDairyTables =
            await buildMilkDairyTables();


        if (
            user.role ===
            "dairyWorker"
        ) {

            milkDairyTables =
                filterTablesForWorker(
                    milkDairyTables,
                    activeFarm
                );

        }


        /*
         * Admin sees every farm.
         *
         * Dairy worker sees only the
         * active farm.
         */


        const dairies =
            milkDairyTables
                .flatMap(
                    function (table) {

                        return table.animals;

                    }
                );


        return {

            session,

            currentFarm:
                activeFarm,

            milkDairyTables,

            dairies

        };

    };


// ==========================================================
// SAVE MILK RECORD
// ==========================================================

exports.saveMilkRecord =
    async function ({
        dairyId,
        farmId,
        session,
        liters,
        remarks,
        user
    }) {

        if (!user) {

            throw new Error(
                "You must be logged in."
            );

        }


        if (!dairyId) {

            throw new Error(
                "Animal is required."
            );

        }


        /*
         * Never trust the session supplied
         * by the browser.
         */

        const actualSession =
            getCurrentSession();


        /*
         * Worker can only enter during
         * the correct open window.
         */

        if (
            user.role ===
            "dairyWorker"
        ) {

            if (
                actualSession !==
                session
            ) {

                throw new Error(
                    "This collection window is no longer open."
                );

            }

        }


        /*
         * Admin can enter morning during
         * morning AND the closed period.
         *
         * During evening, admin enters
         * evening records.
         */

        if (
            user.role ===
            "admin"
        ) {

            const allowedAdminSession =
                actualSession === "evening"
                    ? "evening"
                    : "morning";


            if (
                session !==
                allowedAdminSession
            ) {

                throw new Error(
                    "This collection session is not available."
                );

            }

        }


        const dairy =
            await Dairy.findById(
                dairyId
            ).lean();


        if (!dairy) {

            throw new Error(
                "Animal not found."
            );

        }


        if (
            dairy.isMilking !== true
        ) {

            throw new Error(
                "This animal is not currently marked as being milked."
            );

        }


        const day =
            getDayKey();


        const month =
            getMonthKey();


        /*
         * Prevent duplicate collection
         * records for the same animal,
         * day and session.
         */

        const existing =
            await Milk.findOne({
                dairy: dairy._id,
                day,
                session
            });


        if (existing) {

            throw new Error(
                "A milk record already exists for this animal for this collection session."
            );

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


        const cleanRemarks =
            remarks
                ? String(remarks).trim()
                : "";


        const record =
            new Milk({

                dairy:
                    dairy._id,

                liters:
                    numericLiters,

                remarks:
                    cleanRemarks,

                recordedBy:
                    user._id,

                recordedByType:
                    "user",

                session,

                day,

                month,

                date:
                    new Date()

            });


        await record.save();


        return record;

    };


// ==========================================================
// UPDATE MILK RECORD
// ADMIN ONLY
// ==========================================================

exports.updateMilkRecord =
    async function (
        recordId,
        data,
        user
    ) {

        if (!user) {

            throw new Error(
                "You must be logged in."
            );

        }


        if (
            user.role !==
            "admin"
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


        const record =
            await Milk.findById(
                recordId
            );


        if (!record) {

            throw new Error(
                "Milk record not found."
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


        record.liters =
            numericLiters;


        record.remarks =
            data.remarks
                ? String(
                    data.remarks
                ).trim()
                : "";


        /*
         * Keep the original collection
         * session/day intact.
         *
         * Editing a record must NOT move
         * it into another session.
         */


        await record.save();


        return record;

    };


// ==========================================================
// EXPORTED HELPERS
// ==========================================================

exports.getCurrentSession =
    getCurrentSession;

exports.getDayKey =
    getDayKey;

exports.getMonthKey =
    getMonthKey;

exports.getMilkingAnimals =
    getMilkingAnimals;