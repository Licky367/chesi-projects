// ==========================================================
// services/milkService.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Central service for milk collection.
//
// Handles:
//
// • Getting eligible milking animals
// • Farm authorization
// • Saving milk records
// • Updating milk records
// • Duplicate morning/evening protection
// • Nairobi date handling
// • User attribution
// • Milk reporting
//
// ==========================================================

const mongoose = require("mongoose");

const Milk = require("../models/milk");
const Dairy = require("../models/dairy");
const User = require("../models/projectUser");


// ==========================================================
// CONSTANTS
// ==========================================================

const NAIROBI_TIMEZONE = "Africa/Nairobi";

const SESSION_VALUES = [
    "morning",
    "evening"
];


// ==========================================================
// ERROR HELPER
// ==========================================================

function createError(message, statusCode = 400) {

    const error = new Error(message);

    error.statusCode = statusCode;

    return error;

}


// ==========================================================
// OBJECT ID VALIDATION
// ==========================================================

function isValidObjectId(value) {

    return mongoose.isValidObjectId(value);

}


// ==========================================================
// NUMBER PARSER
// ==========================================================

function parseLiters(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        throw createError(
            "Milk quantity is required."
        );

    }

    const liters = Number(value);

    if (
        !Number.isFinite(liters)
    ) {

        throw createError(
            "Milk quantity must be a valid number."
        );

    }

    if (liters < 0) {

        throw createError(
            "Milk quantity cannot be negative."
        );

    }

    return liters;

}


// ==========================================================
// TEXT PARSER
// ==========================================================

function parseRemarks(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }

    return String(value).trim();

}


// ==========================================================
// SESSION VALIDATION
// ==========================================================

function parseSession(value) {

    const session =
        String(value || "")
            .trim()
            .toLowerCase();

    if (
        !SESSION_VALUES.includes(session)
    ) {

        throw createError(
            "Milk session must be either morning or evening."
        );

    }

    return session;

}


// ==========================================================
// GET NAIROBI DATE
// ==========================================================

function getNairobiDay(dateValue = new Date()) {

    const date =
        new Date(dateValue);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        throw createError(
            "Invalid date."
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

    return formatter.format(date);

}


// ==========================================================
// GET NAIROBI MONTH
// ==========================================================

function getNairobiMonth(dateValue = new Date()) {

    return getNairobiDay(
        dateValue
    ).slice(
        0,
        7
    );

}


// ==========================================================
// GET USER ID
// ==========================================================
//
// The session may store either:
//
// req.session.user = {
//     _id,
//     name,
//     role
// }
//
// or a Mongoose/ObjectId-like value.
//
// ==========================================================

function getUserId(user) {

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
// GET USER ROLE
// ==========================================================

function getUserRole(user) {

    return String(
        user?.role || ""
    ).trim();

}


// ==========================================================
// GET ASSIGNED FARM IDS
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
        .map(farm => {

            if (
                farm &&
                typeof farm === "object" &&
                farm._id
            ) {

                return String(
                    farm._id
                );

            }

            return String(
                farm
            );

        })
        .filter(Boolean);

}


// ==========================================================
// CHECK WHETHER USER CAN ACCESS FARM
// ==========================================================
//
// Admin:
//     Can access every farm.
//
// dairyWorker:
//     Can access only assigned farms.
//
// Other roles:
//     No dairy access.
//
// ==========================================================

function canAccessFarm(
    user,
    farmId
) {

    if (
        !user ||
        !farmId
    ) {

        return false;

    }

    const role =
        getUserRole(user);

    if (
        role === "admin"
    ) {

        return true;

    }

    if (
        role !== "dairyWorker"
    ) {

        return false;

    }

    const assignedFarmIds =
        getAssignedFarmIds(
            user
        );

    return assignedFarmIds.includes(
        String(farmId)
    );

}


// ==========================================================
// GET FARM
// ==========================================================

async function getFarmById(farmId) {

    if (
        !isValidObjectId(
            farmId
        )
    ) {

        throw createError(
            "Invalid dairy farm.",
            400
        );

    }

    const farm =
        await Dairy.findById(
            farmId
        ).lean();

    if (!farm) {

        throw createError(
            "Dairy farm not found.",
            404
        );

    }

    // A Dairy Farm has a negative code.

    if (
        farm.code === null ||
        Number(farm.code) >= 0
    ) {

        throw createError(
            "Selected record is not a dairy farm.",
            400
        );

    }

    return farm;

}


// ==========================================================
// ENSURE FARM ACCESS
// ==========================================================

async function ensureFarmAccess(
    user,
    farmId
) {

    const farm =
        await getFarmById(
            farmId
        );

    if (
        !canAccessFarm(
            user,
            farm._id
        )
    ) {

        throw createError(
            "You are not authorized to access this dairy farm.",
            403
        );

    }

    return farm;

}


// ==========================================================
// GET ELIGIBLE MILKING ANIMALS
// ==========================================================
//
// Eligible animal:
//
// • positive Dairy.code
// • active
// • isMilking === true
// • belongs to a farm
//
// If user is dairyWorker:
//     only animals whose assetCode belongs to one
//     of their assigned farms.
//
// Admin:
//     all eligible animals.
//
// ==========================================================

async function getMilkingAnimals(user) {

    if (!user) {

        throw createError(
            "Authentication required.",
            401
        );

    }

    const role =
        getUserRole(user);

    const match = {

        status: "active",

        isMilking: true,

        code: {
            $gt: 0
        },

        assetCode: {
            $lt: 0
        }

    };


    // ------------------------------------------------------
    // DAIRY WORKER RESTRICTION
    // ------------------------------------------------------

    if (
        role === "dairyWorker"
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

        const assignedFarms =
            await Dairy.find({
                _id: {
                    $in:
                        assignedFarmIds
                },

                code: {
                    $lt: 0
                }
            })
            .select("code name")
            .lean();

        const farmCodes =
            assignedFarms
                .map(farm =>
                    Number(farm.code)
                );

        if (
            farmCodes.length === 0
        ) {

            return [];

        }

        match.assetCode = {
            $in: farmCodes
        };

    }


    // ------------------------------------------------------
    // OTHER ROLES
    // ------------------------------------------------------

    else if (
        role !== "admin"
    ) {

        throw createError(
            "You are not authorized to access milk collection.",
            403
        );

    }


    // ------------------------------------------------------
    // GET ANIMALS
    // ------------------------------------------------------

    const animals =
        await Dairy.find(
            match
        )
        .select(
            [
                "_id",
                "code",
                "name",
                "type",
                "assetCode",
                "profileImage",
                "dateOfBirth",
                "mass",
                "isMilking",
                "status"
            ].join(" ")
        )
        .sort({
            name: 1
        })
        .lean({
            virtuals: true
        });


    // ------------------------------------------------------
    // GET FARM INFORMATION
    // ------------------------------------------------------

    const farmCodes = [
        ...new Set(
            animals
                .map(
                    animal =>
                        animal.assetCode
                )
                .filter(
                    code =>
                        code !== null &&
                        code !== undefined
                )
                .map(
                    Number
                )
        )
    ];


    let farms = [];

    if (
        farmCodes.length
    ) {

        farms =
            await Dairy.find({
                code: {
                    $in:
                        farmCodes
                },

                code: {
                    $lt: 0
                }
            })
            .select(
                "_id code name"
            )
            .lean();

    }


    const farmMap =
        new Map(
            farms.map(
                farm => [
                    Number(farm.code),
                    farm
                ]
            )
        );


    // ------------------------------------------------------
    // ATTACH FARM
    // ------------------------------------------------------

    return animals.map(
        animal => {

            const farm =
                farmMap.get(
                    Number(
                        animal.assetCode
                    )
                );

            return {

                ...animal,

                farm: farm || null

            };

        }
    );

}


// ==========================================================
// GET MILK PAGE DATA
// ==========================================================
//
// Returns:
//
// {
//     animals,
//     today,
//     records,
//     totals
// }
//
// ==========================================================

async function getMilkPageData(user) {

    const animals =
        await getMilkingAnimals(
            user
        );

    const today =
        getNairobiDay();

    const animalIds =
        animals.map(
            animal =>
                animal._id
        );


    let records = [];

    if (
        animalIds.length
    ) {

        records =
            await Milk.find({
                dairy: {
                    $in:
                        animalIds
                },

                day: today
            })
            .populate(
                "dairy",
                "name code type profileImage assetCode"
            )
            .sort({
                session: 1,
                date: 1
            })
            .lean();

    }


    // ------------------------------------------------------
    // MAP RECORDS BY ANIMAL + SESSION
    // ------------------------------------------------------

    const recordMap =
        new Map();

    for (
        const record of records
    ) {

        const key =
            `${record.dairy._id}_${record.session}`;

        recordMap.set(
            key,
            record
        );

    }


    // ------------------------------------------------------
    // DECORATE ANIMALS
    // ------------------------------------------------------

    const decoratedAnimals =
        animals.map(
            animal => {

                const morning =
                    recordMap.get(
                        `${animal._id}_morning`
                    ) || null;

                const evening =
                    recordMap.get(
                        `${animal._id}_evening`
                    ) || null;

                return {

                    ...animal,

                    morningRecord:
                        morning,

                    eveningRecord:
                        evening,

                    morningLiters:
                        morning
                            ? Number(
                                morning.liters
                            )
                            : 0,

                    eveningLiters:
                        evening
                            ? Number(
                                evening.liters
                            )
                            : 0,

                    morningRecorded:
                        !!morning,

                    eveningRecorded:
                        !!evening

                };

            }
        );


    // ------------------------------------------------------
    // TOTALS
    // ------------------------------------------------------

    const total =
        records.reduce(
            (
                sum,
                record
            ) => {

                const liters =
                    Number(
                        record.liters
                    );

                return (
                    sum +
                    (
                        Number.isFinite(
                            liters
                        )
                            ? liters
                            : 0
                    )
                );

            },
            0
        );


    const morningTotal =
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


    const eveningTotal =
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

        animals:
            decoratedAnimals,

        records,

        today,

        totals: {

            total,

            morning:
                morningTotal,

            evening:
                eveningTotal,

            animals:
                animals.length

        }

    };

}


// ==========================================================
// SAVE MILK RECORD
// ==========================================================
//
// Expected:
//
// {
//     dairy,
//     session,
//     liters,
//     remarks,
//     user
// }
//
// ==========================================================

async function createMilkRecord({

    dairy,
    session,
    liters,
    remarks,
    user

}) {

    if (!user) {

        throw createError(
            "Authentication required.",
            401
        );

    }


    // ------------------------------------------------------
    // VALIDATE ANIMAL ID
    // ------------------------------------------------------

    if (
        !isValidObjectId(
            dairy
        )
    ) {

        throw createError(
            "Invalid animal.",
            400
        );

    }


    // ------------------------------------------------------
    // VALIDATE SESSION
    // ------------------------------------------------------

    const normalizedSession =
        parseSession(
            session
        );


    // ------------------------------------------------------
    // VALIDATE LITERS
    // ------------------------------------------------------

    const normalizedLiters =
        parseLiters(
            liters
        );


    // ------------------------------------------------------
    // VALIDATE FARM / ANIMAL
    // ------------------------------------------------------

    const animal =
        await Dairy.findById(
            dairy
        ).lean();


    if (!animal) {

        throw createError(
            "Dairy animal not found.",
            404
        );

    }


    // Must be an identified animal.

    if (
        animal.code === null ||
        Number(animal.code) <= 0
    ) {

        throw createError(
            "Milk can only be recorded for an animal.",
            400
        );

    }


    // Animal must currently be milking.

    if (
        animal.isMilking !== true
    ) {

        throw createError(
            "This animal is not currently marked as milking.",
            400
        );

    }


    // Animal must be active.

    if (
        animal.status !== "active"
    ) {

        throw createError(
            "Milk cannot be recorded for an inactive animal.",
            400
        );

    }


    // Animal must have a parent farm.

    if (
        animal.assetCode === null ||
        animal.assetCode === undefined
    ) {

        throw createError(
            "This animal is not assigned to a dairy farm.",
            400
        );

    }


    // ------------------------------------------------------
    // FIND PARENT FARM
    // ------------------------------------------------------

    const farm =
        await Dairy.findOne({
            code:
                Number(
                    animal.assetCode
                ),

            code: {
                $lt: 0
            }
        }).lean();


    if (!farm) {

        throw createError(
            "The animal's dairy farm could not be found.",
            404
        );

    }


    // ------------------------------------------------------
    // CHECK USER ACCESS
    // ------------------------------------------------------

    if (
        !canAccessFarm(
            user,
            farm._id
        )
    ) {

        throw createError(
            "You are not authorized to record milk for this animal.",
            403
        );

    }


    // ------------------------------------------------------
    // CURRENT NAIROBI DAY
    // ------------------------------------------------------

    const now =
        new Date();

    const day =
        getNairobiDay(
            now
        );

    const month =
        day.slice(
            0,
            7
        );


    // ------------------------------------------------------
    // PREVENT DUPLICATE
    // ------------------------------------------------------

    const existing =
        await Milk.findOne({

            dairy:
                animal._id,

            day,

            session:
                normalizedSession

        });


    if (existing) {

        throw createError(
            `A ${normalizedSession} milk record already exists for ${animal.name} today.`,
            409
        );

    }


    // ------------------------------------------------------
    // USER ID
    // ------------------------------------------------------

    const userId =
        getUserId(
            user
        );


    // ------------------------------------------------------
    // CREATE
    // ------------------------------------------------------

    try {

        const record =
            await Milk.create({

                dairy:
                    animal._id,

                recordedBy:
                    isValidObjectId(
                        userId
                    )
                        ? userId
                        : null,

                recordedByType:
                    "user",

                recordedBySystem:
                    false,

                liters:
                    normalizedLiters,

                remarks:
                    parseRemarks(
                        remarks
                    ),

                date:
                    now,

                day,

                month,

                session:
                    normalizedSession

            });


        return await Milk.findById(
            record._id
        )
        .populate(
            "dairy",
            "name code type profileImage assetCode"
        )
        .populate(
            "recordedBy",
            "name"
        )
        .lean();

    }
    catch (error) {

        // MongoDB duplicate-key error.

        if (
            error &&
            error.code === 11000
        ) {

            throw createError(
                `A ${normalizedSession} milk record already exists for ${animal.name} today.`,
                409
            );

        }

        throw error;

    }

}


// ==========================================================
// UPDATE MILK RECORD
// ==========================================================
//
// Admin edit modal:
//
// POST /milk/:recordId
//
// Only liters and remarks are changed.
//
// The animal, day and session remain unchanged.
//
// ==========================================================

async function updateMilkRecord({

    recordId,
    liters,
    remarks,
    user

}) {

    if (!user) {

        throw createError(
            "Authentication required.",
            401
        );

    }


    // ------------------------------------------------------
    // VALIDATE RECORD ID
    // ------------------------------------------------------

    if (
        !isValidObjectId(
            recordId
        )
    ) {

        throw createError(
            "Invalid milk record.",
            400
        );

    }


    // ------------------------------------------------------
    // VALIDATE LITERS
    // ------------------------------------------------------

    const normalizedLiters =
        parseLiters(
            liters
        );


    const normalizedRemarks =
        parseRemarks(
            remarks
        );


    // ------------------------------------------------------
    // GET RECORD
    // ------------------------------------------------------

    const record =
        await Milk.findById(
            recordId
        )
        .populate(
            "dairy"
        );


    if (!record) {

        throw createError(
            "Milk record not found.",
            404
        );

    }


    const animal =
        record.dairy;


    if (!animal) {

        throw createError(
            "The animal associated with this milk record no longer exists.",
            404
        );

    }


    // ------------------------------------------------------
    // FIND FARM
    // ------------------------------------------------------

    const farm =
        await Dairy.findOne({
            code:
                Number(
                    animal.assetCode
                ),

            code: {
                $lt: 0
            }
        }).lean();


    if (!farm) {

        throw createError(
            "The animal's dairy farm could not be found.",
            404
        );

    }


    // ------------------------------------------------------
    // CHECK ACCESS
    // ------------------------------------------------------

    if (
        !canAccessFarm(
            user,
            farm._id
        )
    ) {

        throw createError(
            "You are not authorized to edit this milk record.",
            403
        );

    }


    // ------------------------------------------------------
    // UPDATE
    // ------------------------------------------------------

    record.liters =
        normalizedLiters;

    record.remarks =
        normalizedRemarks;


    await record.save();


    // ------------------------------------------------------
    // RETURN UPDATED RECORD
    // ------------------------------------------------------

    return await Milk.findById(
        record._id
    )
    .populate(
        "dairy",
        "name code type profileImage assetCode"
    )
    .populate(
        "recordedBy",
        "name"
    )
    .lean();

}


// ==========================================================
// GET DAILY REPORT
// ==========================================================

async function getDailyReport(
    user,
    day = getNairobiDay()
) {

    const animals =
        await getMilkingAnimals(
            user
        );

    const animalIds =
        animals.map(
            animal =>
                animal._id
        );


    if (
        !animalIds.length
    ) {

        return {

            records: [],

            stats: {

                total: 0,

                morning: 0,

                evening: 0,

                count: 0

            }

        };

    }


    const records =
        await Milk.find({

            dairy: {
                $in:
                    animalIds
            },

            day

        })
        .populate(
            "dairy",
            "name code type profileImage assetCode"
        )
        .populate(
            "recordedBy",
            "name"
        )
        .sort({
            date: 1
        })
        .lean();


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

            total:
                morning +
                evening,

            morning,

            evening,

            count:
                records.length

        }

    };

}


// ==========================================================
// GET ANIMAL HISTORY
// ==========================================================

async function getAnimalMonthlyHistory({

    dairyId,

    month,

    user

}) {

    if (
        !isValidObjectId(
            dairyId
        )
    ) {

        throw createError(
            "Invalid animal.",
            400
        );

    }


    const animal =
        await Dairy.findById(
            dairyId
        ).lean();


    if (!animal) {

        throw createError(
            "Animal not found.",
            404
        );

    }


    const farm =
        await Dairy.findOne({
            code:
                Number(
                    animal.assetCode
                ),

            code: {
                $lt: 0
            }
        }).lean();


    if (!farm) {

        throw createError(
            "Animal's farm not found.",
            404
        );

    }


    if (
        !canAccessFarm(
            user,
            farm._id
        )
    ) {

        throw createError(
            "You are not authorized to view this animal's milk history.",
            403
        );

    }


    return Milk.getAnimalMonthlyHistory(
        dairyId,
        month
    );

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getMilkingAnimals,

    getMilkPageData,

    createMilkRecord,

    updateMilkRecord,

    getDailyReport,

    getAnimalMonthlyHistory,

    getNairobiDay,

    getNairobiMonth,

    canAccessFarm

};