// ==========================================================
// services/milkService.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Business logic for:
//
// • Recording milk
// • Updating milk
// • Deleting milk
// • Daily milk reports
// • Monthly milk reports
// • Animal milk history
// • Milking animal lookup
// • Assigned-farm access control
// • Morning / evening session validation
//
// MODELS
// ----------------------------------------------------------
// Dairy
// Milk
// User
//
// ==========================================================

const mongoose = require("mongoose");

const Dairy = require("../../models/dairy");
const Milk = require("../../models/milk");
const User = require("../../models/projectUser");


// ==========================================================
// CONSTANTS
// ==========================================================

const SESSION_VALUES = [
    "morning",
    "evening"
];

const NAIROBI_TIMEZONE =
    "Africa/Nairobi";


// ==========================================================
// ERROR HELPER
// ==========================================================

function createError(
    message,
    statusCode = 400
) {

    const error =
        new Error(message);

    error.statusCode =
        statusCode;

    return error;

}


// ==========================================================
// OBJECT ID VALIDATION
// ==========================================================

function isValidObjectId(value) {

    return mongoose.isValidObjectId(
        value
    );

}


// ==========================================================
// NUMBER PARSER
// ==========================================================

function parseNumber(
    value,
    fieldName
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        throw createError(
            `${fieldName} is required.`
        );

    }


    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        throw createError(
            `${fieldName} must be a valid number.`
        );

    }


    return number;

}


// ==========================================================
// DATE PARSER
// ==========================================================

function parseDate(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return new Date();

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        throw createError(
            "Invalid milk record date."
        );

    }


    return date;

}


// ==========================================================
// NAIROBI DATE PARTS
// ==========================================================

function getNairobiDateParts(
    dateValue
) {

    const date =
        new Date(dateValue);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        throw createError(
            "Invalid milk record date."
        );

    }


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


    const day =
        formatter.format(date);


    return {

        day,

        month:
            day.slice(
                0,
                7
            )

    };

}


// ==========================================================
// SESSION VALIDATION
// ==========================================================

function validateSession(
    session
) {

    if (
        !SESSION_VALUES.includes(
            session
        )
    ) {

        throw createError(
            "Session must be either morning or evening."
        );

    }


    return session;

}


// ==========================================================
// TEXT
// ==========================================================

function parseText(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }


    return String(value).trim();

}


// ==========================================================
// USER LOOKUP
// ==========================================================

async function getUser(
    userId
) {

    if (
        !isValidObjectId(
            userId
        )
    ) {

        throw createError(
            "Invalid user ID.",
            400
        );

    }


    const user =
        await User.findById(
            userId
        );


    if (!user) {

        throw createError(
            "User not found.",
            404
        );

    }


    return user;

}


// ==========================================================
// FARM ACCESS
// ==========================================================
//
// Admin:
//
//     Can access every farm.
//
// Dairy worker:
//
//     Can only access farms contained in assignedFarm.
//
// ==========================================================

function hasFarmAccess(
    user,
    farmId
) {

    if (!user) {

        return false;

    }


    if (
        user.role === "admin"
    ) {

        return true;

    }


    if (
        user.role !== "dairyWorker"
    ) {

        return false;

    }


    if (
        !Array.isArray(
            user.assignedFarm
        )
    ) {

        return false;

    }


    return user.assignedFarm.some(
        assignedId =>
            String(assignedId) ===
            String(farmId)
    );

}


// ==========================================================
// GET FARM
// ==========================================================

async function getFarm(
    farmId,
    user
) {

    if (
        !isValidObjectId(
            farmId
        )
    ) {

        throw createError(
            "Invalid Dairy Farm ID."
        );

    }


    const farm =
        await Dairy.findById(
            farmId
        );


    if (!farm) {

        throw createError(
            "Dairy Farm not found.",
            404
        );

    }


    if (
        !farm.isDairyFarm
    ) {

        throw createError(
            "Selected Dairy record is not a Dairy Farm."
        );

    }


    if (
        !hasFarmAccess(
            user,
            farm._id
        )
    ) {

        throw createError(
            "You do not have access to this Dairy Farm.",
            403
        );

    }


    return farm;

}


// ==========================================================
// GET ANIMAL
// ==========================================================

async function getAnimal(
    dairyId,
    user
) {

    if (
        !isValidObjectId(
            dairyId
        )
    ) {

        throw createError(
            "Invalid animal ID."
        );

    }


    const animal =
        await Dairy.findById(
            dairyId
        );


    if (!animal) {

        throw createError(
            "Dairy animal not found.",
            404
        );

    }


    if (
        !animal.isAnimal
    ) {

        throw createError(
            "Selected Dairy record is not an animal."
        );

    }


    if (
        !animal.assetCode
    ) {

        throw createError(
            "This animal does not have a parent Dairy Farm.",
            400
        );

    }


    const farm =
        await Dairy.findOne({

            code:
                animal.assetCode

        });


    if (!farm) {

        throw createError(
            "Parent Dairy Farm could not be found.",
            404
        );

    }


    if (
        !farm.isDairyFarm
    ) {

        throw createError(
            "Animal parent is not a valid Dairy Farm.",
            400
        );

    }


    if (
        !hasFarmAccess(
            user,
            farm._id
        )
    ) {

        throw createError(
            "You do not have access to this animal.",
            403
        );

    }


    return {

        animal,

        farm

    };

}


// ==========================================================
// GET MILKING ANIMALS
// ==========================================================
//
// Returns animals belonging to a farm.
//
// If farmId is supplied:
//
//     only that farm.
//
// If farmId is omitted:
//
//     all farms accessible to the user.
//
// ==========================================================

exports.getMilkingAnimals =
async function({

    userId,

    farmId

} = {}) {

    const user =
        await getUser(
            userId
        );


    let farmIds = [];


    // ======================================================
    // ADMIN
    // ======================================================

    if (
        user.role === "admin"
    ) {

        if (farmId) {

            const farm =
                await getFarm(
                    farmId,
                    user
                );


            farmIds = [
                farm._id
            ];

        }

        else {

            const farms =
                await Dairy.find({

                    code: {
                        $lt: 0
                    }

                })

                .sort({
                    code: 1
                })

                .lean();


            farmIds =
                farms.map(
                    farm =>
                        farm._id
                );

        }

    }


    // ======================================================
    // DAIRY WORKER
    // ======================================================

    else if (
        user.role === "dairyWorker"
    ) {

        const assigned =
            Array.isArray(
                user.assignedFarm
            )
                ? user.assignedFarm
                : [];


        if (farmId) {

            const farm =
                await getFarm(
                    farmId,
                    user
                );


            farmIds = [
                farm._id
            ];

        }

        else {

            farmIds =
                assigned;

        }

    }


    else {

        throw createError(
            "You are not authorized to access Dairy milk records.",
            403
        );

    }


    if (
        farmIds.length === 0
    ) {

        return [];

    }


    // ======================================================
    // FIND ANIMALS
    // ======================================================

    const farms =
        await Dairy.find({

            _id: {
                $in:
                    farmIds
            },

            code: {
                $lt: 0
            }

        })

        .lean();


    const farmCodeMap =
        new Map(
            farms.map(
                farm => [
                    String(
                        farm._id
                    ),
                    farm.code
                ]
            )
        );


    const animals =
        await Dairy.find({

            code: {
                $gt: 0
            },

            assetCode: {
                $in:
                    farms.map(
                        farm =>
                            farm.code
                    )
            },

            status: "active"

        })

        .sort({

            code:
                1

        })

        .lean();


    return animals.map(
        animal => {

            const farmCode =
                animal.assetCode;


            const farm =
                farms.find(
                    farm =>
                        farm.code ===
                        farmCode
                );


            return {

                ...animal,

                farmCode,

                farmName:
                    farm
                        ? farm.name
                        : "",

                isFemale:
                    Number(
                        animal.code
                    ) % 2 === 0,

                gender:
                    Number(
                        animal.code
                    ) % 2 === 0
                        ? "Female"
                        : "Male"

            };

        }
    );

};


// ==========================================================
// GET FARMS
// ==========================================================

exports.getAccessibleFarms =
async function(
    userId
) {

    const user =
        await getUser(
            userId
        );


    let farms;


    if (
        user.role === "admin"
    ) {

        farms =
            await Dairy.find({

                code: {
                    $lt: 0
                }

            })

            .sort({
                code: 1
            })

            .lean();

    }

    else if (
        user.role === "dairyWorker"
    ) {

        farms =
            await Dairy.find({

                _id: {
                    $in:
                        Array.isArray(
                            user.assignedFarm
                        )
                            ? user.assignedFarm
                            : []
                },

                code: {
                    $lt: 0
                }

            })

            .sort({
                code: 1
            })

            .lean();

    }

    else {

        throw createError(
            "You are not authorized to access Dairy Farms.",
            403
        );

    }


    return farms;

};


// ==========================================================
// RECORD MILK
// ==========================================================

exports.recordMilk =
async function({

    userId,

    dairyId,

    liters,

    session,

    date,

    remarks

} = {}) {

    const user =
        await getUser(
            userId
        );


    const {
        animal,
        farm
    } =
        await getAnimal(
            dairyId,
            user
        );


    // ======================================================
    // VALIDATE SESSION
    // ======================================================

    session =
        validateSession(
            parseText(
                session
            )
        );


    // ======================================================
    // VALIDATE LITERS
    // ======================================================

    liters =
        parseNumber(
            liters,
            "Milk quantity"
        );


    if (
        liters < 0
    ) {

        throw createError(
            "Milk quantity cannot be negative."
        );

    }


    // ======================================================
    // DATE
    // ======================================================

    date =
        parseDate(
            date
        );


    // ======================================================
    // NAIROBI DAY
    // ======================================================

    const {
        day,
        month
    } =
        getNairobiDateParts(
            date
        );


    // ======================================================
    // DUPLICATE CHECK
    // ======================================================

    const existing =
        await Milk.findOne({

            dairy:
                animal._id,

            day,

            session

        });


    if (existing) {

        throw createError(

            `A ${session} milk record already exists for ${animal.name} on ${day}.`,

            409

        );

    }


    // ======================================================
    // CREATE
    // ======================================================

    const milk =
        await Milk.create({

            dairy:
                animal._id,

            recordedBy:
                user._id,

            recordedByType:
                "user",

            recordedBySystem:
                false,

            liters,

            remarks:
                parseText(
                    remarks
                ),

            date,

            day,

            month,

            session

        });


    return milk;

};


// ==========================================================
// GET MILK RECORD
// ==========================================================

exports.getMilkRecord =
async function({

    userId,

    milkId

} = {}) {

    const user =
        await getUser(
            userId
        );


    if (
        !isValidObjectId(
            milkId
        )
    ) {

        throw createError(
            "Invalid milk record ID."
        );

    }


    const milk =
        await Milk.findById(
            milkId
        )

        .populate(
            "dairy"
        )

        .populate(
            "recordedBy",
            "name email role"
        );


    if (!milk) {

        throw createError(
            "Milk record not found.",
            404
        );

    }


    await getAnimal(
        milk.dairy._id,
        user
    );


    return milk;

};


// ==========================================================
// UPDATE MILK
// ==========================================================

exports.updateMilk =
async function({

    userId,

    milkId,

    liters,

    session,

    date,

    remarks

} = {}) {

    const user =
        await getUser(
            userId
        );


    if (
        !isValidObjectId(
            milkId
        )
    ) {

        throw createError(
            "Invalid milk record ID."
        );

    }


    const milk =
        await Milk.findById(
            milkId
        );


    if (!milk) {

        throw createError(
            "Milk record not found.",
            404
        );

    }


    const {
        animal
    } =
        await getAnimal(
            milk.dairy,
            user
        );


    // ======================================================
    // LITERS
    // ======================================================

    if (
        liters !== undefined
    ) {

        liters =
            parseNumber(
                liters,
                "Milk quantity"
            );


        if (
            liters < 0
        ) {

            throw createError(
                "Milk quantity cannot be negative."
            );

        }


        milk.liters =
            liters;

    }


    // ======================================================
    // SESSION
    // ======================================================

    if (
        session !== undefined
    ) {

        session =
            validateSession(
                parseText(
                    session
                )
            );


        milk.session =
            session;

    }


    // ======================================================
    // DATE
    // ======================================================

    if (
        date !== undefined
    ) {

        milk.date =
            parseDate(
                date
            );

    }


    // ======================================================
    // REMARKS
    // ======================================================

    if (
        remarks !== undefined
    ) {

        milk.remarks =
            parseText(
                remarks
            );

    }


    // ======================================================
    // REBUILD DAY / MONTH
    // ======================================================

    const {
        day,
        month
    } =
        getNairobiDateParts(
            milk.date
        );


    milk.day =
        day;


    milk.month =
        month;


    // ======================================================
    // CHECK DUPLICATE
    //
    // If session/date changed, make sure another record
    // does not already occupy the same animal/day/session.
    // ======================================================

    const duplicate =
        await Milk.findOne({

            dairy:
                animal._id,

            day,

            session,

            _id: {
                $ne:
                    milk._id
            }

        });


    if (duplicate) {

        throw createError(

            `A ${session} milk record already exists for ${animal.name} on ${day}.`,

            409

        );

    }


    await milk.save();


    return milk;

};


// ==========================================================
// DELETE MILK
// ==========================================================

exports.deleteMilk =
async function({

    userId,

    milkId

} = {}) {

    const user =
        await getUser(
            userId
        );


    if (
        !isValidObjectId(
            milkId
        )
    ) {

        throw createError(
            "Invalid milk record ID."
        );

    }


    const milk =
        await Milk.findById(
            milkId
        );


    if (!milk) {

        throw createError(
            "Milk record not found.",
            404
        );

    }


    await getAnimal(
        milk.dairy,
        user
    );


    await Milk.deleteOne({

        _id:
            milk._id

    });


    return {

        success:
            true,

        message:
            "Milk record deleted successfully."

    };

};


// ==========================================================
// DAILY REPORT
// ==========================================================

exports.getDailyReport =
async function({

    userId,

    day,

    farmId

} = {}) {

    const user =
        await getUser(
            userId
        );


    if (
        typeof day !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(day)
    ) {

        throw createError(
            "Day must use YYYY-MM-DD format."
        );

    }


    if (farmId) {

        await getFarm(
            farmId,
            user
        );

    }


    const query = {

        day

    };


    // ======================================================
    // FARM FILTER
    // ======================================================

    if (farmId) {

        const animals =
            await Dairy.find({

                assetCode:
                    (
                        await Dairy.findById(
                            farmId
                        )
                    ).code,

                code: {
                    $gt: 0
                }

            })

            .select(
                "_id"
            )

            .lean();


        query.dairy = {

            $in:
                animals.map(
                    animal =>
                        animal._id
                )

        };

    }

    else if (
        user.role === "dairyWorker"
    ) {

        const animals =
            await this.getMilkingAnimals({

                userId

            });


        query.dairy = {

            $in:
                animals.map(
                    animal =>
                        animal._id
                )

        };

    }


    const records =
        await Milk.find(
            query
        )

        .populate(
            "dairy"
        )

        .populate(
            "recordedBy",
            "name"
        )

        .sort({

            date:
                1,

            session:
                1

        })

        .lean();


    const total =
        records.reduce(

            (
                sum,
                record
            ) =>
                sum +
                (
                    Number(
                        record.liters
                    ) || 0
                ),

            0

        );


    const morning =
        records

            .filter(
                record =>
                    record.session ===
                    "morning"
            )

            .reduce(

                (
                    sum,
                    record
                ) =>
                    sum +
                    (
                        Number(
                            record.liters
                        ) || 0
                    ),

                0

            );


    const evening =
        records

            .filter(
                record =>
                    record.session ===
                    "evening"
            )

            .reduce(

                (
                    sum,
                    record
                ) =>
                    sum +
                    (
                        Number(
                            record.liters
                        ) || 0
                    ),

                0

            );


    return {

        records,

        stats: {

            total,

            morning,

            evening,

            count:
                records.length

        }

    };

};


// ==========================================================
// MONTHLY REPORT
// ==========================================================

exports.getMonthlyReport =
async function({

    userId,

    month,

    farmId

} = {}) {

    const user =
        await getUser(
            userId
        );


    if (
        typeof month !== "string" ||
        !/^\d{4}-\d{2}$/.test(month)
    ) {

        throw createError(
            "Month must use YYYY-MM format."
        );

    }


    if (farmId) {

        await getFarm(
            farmId,
            user
        );

    }


    let records;


    // ======================================================
    // ACCESSIBLE ANIMALS
    // ======================================================

    const animals =
        await this.getMilkingAnimals({

            userId,

            farmId

        });


    const animalIds =
        animals.map(
            animal =>
                animal._id
        );


    if (
        animalIds.length === 0
    ) {

        return {

            records: [],

            stats: {

                total:
                    0,

                animals:
                    0

            }

        };

    }


    // ======================================================
    // MONTH RECORDS
    // ======================================================

    records =
        await Milk.find({

            month,

            dairy: {

                $in:
                    animalIds

            }

        })

        .populate(
            "dairy"
        )

        .populate(
            "recordedBy",
            "name"
        )

        .sort({

            day:
                1,

            session:
                1

        })

        .lean();


    // ======================================================
    // GROUP BY ANIMAL
    // ======================================================

    const grouped =
        new Map();


    for (
        const record
        of records
    ) {

        const id =
            String(
                record.dairy._id
            );


        if (
            !grouped.has(id)
        ) {

            grouped.set(
                id,
                {

                    dairy:
                        record.dairy,

                    total:
                        0,

                    days:
                        new Set(),

                    morning:
                        0,

                    evening:
                        0,

                    records:
                        []

                }
            );

        }


        const item =
            grouped.get(id);


        const liters =
            Number(
                record.liters
            ) || 0;


        item.total +=
            liters;


        item.days.add(
            record.day
        );


        if (
            record.session ===
            "morning"
        ) {

            item.morning +=
                liters;

        }


        if (
            record.session ===
            "evening"
        ) {

            item.evening +=
                liters;

        }


        item.records.push(
            record
        );

    }


    const report =
        Array.from(
            grouped.values()
        )

        .map(
            item => ({

                dairy:
                    item.dairy,

                total:
                    item.total,

                days:
                    item.days.size,

                avg:
                    item.days.size
                        ? item.total /
                          item.days.size
                        : 0,

                morning:
                    item.morning,

                evening:
                    item.evening,

                records:
                    item.records

            })
        )

        .sort(

            (
                a,
                b
            ) =>
                b.total -
                a.total

        );


    const total =
        records.reduce(

            (
                sum,
                record
            ) =>
                sum +
                (
                    Number(
                        record.liters
                    ) || 0
                ),

            0

        );


    return {

        records:
            report,

        rawRecords:
            records,

        stats: {

            total,

            animals:
                report.length,

            count:
                records.length

        }

    };

};


// ==========================================================
// ANIMAL MONTHLY HISTORY
// ==========================================================

exports.getAnimalMonthlyHistory =
async function({

    userId,

    dairyId,

    month

} = {}) {

    const user =
        await getUser(
            userId
        );


    await getAnimal(
        dairyId,
        user
    );


    if (
        typeof month !== "string" ||
        !/^\d{4}-\d{2}$/.test(month)
    ) {

        throw createError(
            "Month must use YYYY-MM format."
        );

    }


    const result =
        await Milk.getAnimalMonthlyHistory(

            dairyId,

            month

        );


    return result;

};


// ==========================================================
// GET TODAY'S REPORT
// ==========================================================

exports.getTodayReport =
async function({

    userId,

    farmId

} = {}) {

    const now =
        new Date();


    const {
        day
    } =
        getNairobiDateParts(
            now
        );


    return this.getDailyReport({

        userId,

        day,

        farmId

    });

};


// ==========================================================
// GET CURRENT MONTH
// ==========================================================

exports.getCurrentMonthReport =
async function({

    userId,

    farmId

} = {}) {

    const now =
        new Date();


    const {
        month
    } =
        getNairobiDateParts(
            now
        );


    return this.getMonthlyReport({

        userId,

        month,

        farmId

    });

};


// ==========================================================
// EXPORT HELPERS
// ==========================================================

exports.getNairobiDateParts =
    getNairobiDateParts;

exports.hasFarmAccess =
    hasFarmAccess;

exports.SESSION_VALUES =
    SESSION_VALUES;