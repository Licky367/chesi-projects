// ==========================================================
// services/milkService.js
// ==========================================================
//
// CENTRAL MILK BUSINESS-LOGIC SERVICE
//
// ARCHITECTURE
// ----------------------------------------------------------
//
// Milk
//     └── Individual animal/session production record
//
// MilkSummary
//     └── One complete daily milk summary
//
// Daily summary contains:
//
// • Total milk produced
// • Total milk consumed/sold
// • Available milk
// • Total cash collected
// • Milk price
// • Individual farm production
// • Individual farm sold
// • Individual farm available
// • Individual farm revenue
// • Daily sales
// • Daily lock
//
// FARM RULE
// ----------------------------------------------------------
//
// Milk belongs to the farm that owns the animal.
//
// Animal:
//
//     assetCode = parent farm code
//
// Farm:
//
//     code < 0
//
// Therefore:
//
//     Farm A production
//         can only be consumed by
//     Farm A sales.
//
// No global milk pool is used when validating a sale.
//
// ==========================================================


const mongoose =
    require("mongoose");


const Milk =
    require("../models/milk");


const Dairy =
    require("../models/dairy");


const MilkSummary =
    require("../models/milkSummary");


const StandingOrder =
    require("../models/standingOrder");


// ==========================================================
// CONSTANTS
// ==========================================================

const TIME_ZONE =
    "Africa/Nairobi";


const DEFAULT_MILK_PRICE =
    50;


const MORNING_END =
    10 * 60;


const EVENING_START =
    16 * 60;


// ==========================================================
// BUSINESS ERROR
// ==========================================================

function milkError(
    code,
    message
) {

    const error =
        new Error(message);

    error.code =
        code;

    return error;

}


// ==========================================================
// USER / ADMIN
// ==========================================================

function requireUser(
    user
) {

    if (
        !user ||
        !user._id
    ) {

        throw milkError(
            "MILK_USER_REQUIRED",
            "A logged-in user is required."
        );

    }

}


function requireAdmin(
    user
) {

    requireUser(user);

    if (
        user.role !==
        "admin"
    ) {

        throw milkError(
            "MILK_ADMIN_REQUIRED",
            "Only an administrator can perform this action."
        );

    }

}


// ==========================================================
// KENYA DATE
// ==========================================================

function getKenyaDateParts() {

    const parts =
        new Intl.DateTimeFormat(
            "en-GB",
            {
                timeZone:
                    TIME_ZONE,

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
        ).formatToParts(
            new Date()
        );


    const get =
        (name) =>
            Number(
                parts.find(
                    part =>
                        part.type === name
                )?.value || 0
            );


    const year =
        get("year");

    const month =
        get("month");

    const day =
        get("day");

    const hour =
        get("hour");

    const minute =
        get("minute");

    const second =
        get("second");


    const date =
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;


    const monthKey =
        `${year}-${String(month).padStart(2, "0")}`;


    return {

        year,
        month,
        day,
        hour,
        minute,
        second,

        date,

        monthKey,

        timeMinutes:
            hour * 60 + minute

    };

}


// ==========================================================
// PREVIOUS KENYA DATE
// ==========================================================

function getPreviousKenyaDate() {

    const now =
        getKenyaDateParts();


    const date =
        new Date(
            `${now.date}T12:00:00+03:00`
        );


    date.setDate(
        date.getDate() - 1
    );


    return (
        `${date.getFullYear()}-` +
        `${String(date.getMonth() + 1).padStart(2, "0")}-` +
        `${String(date.getDate()).padStart(2, "0")}`
    );

}


// ==========================================================
// MILK SESSION
// ==========================================================

function getMilkSession() {

    const now =
        getKenyaDateParts();


    if (
        now.timeMinutes <
        MORNING_END
    ) {

        return {

            name:
                "morning",

            label:
                "Morning",

            day:
                now.date,

            month:
                now.monthKey,

            open:
                true,

            canSubmit:
                true

        };

    }


    if (
        now.timeMinutes >=
        EVENING_START
    ) {

        return {

            name:
                "evening",

            label:
                "Evening",

            day:
                now.date,

            month:
                now.monthKey,

            open:
                true,

            canSubmit:
                true

        };

    }


    return {

        name:
            "closed",

        label:
            "Closed",

        day:
            now.date,

        month:
            now.monthKey,

        open:
            false,

        canSubmit:
            false

    };

}


// ==========================================================
// SESSION DEADLINE
// ==========================================================

function getSessionDeadline(
    sessionName
) {

    const now =
        getKenyaDateParts();


    if (
        sessionName ===
        "morning"
    ) {

        return {

            year:
                now.year,

            month:
                now.month,

            day:
                now.day,

            hour:
                10,

            minute:
                0

        };

    }


    if (
        sessionName ===
        "evening"
    ) {

        return {

            year:
                now.year,

            month:
                now.month,

            day:
                now.day,

            hour:
                24,

            minute:
                0

        };

    }


    return null;

}


// ==========================================================
// CAN SUBMIT SESSION
// ==========================================================

function canSubmitSession(
    sessionName
) {

    const now =
        getKenyaDateParts();


    if (
        sessionName ===
        "morning"
    ) {

        return (
            now.timeMinutes <
            MORNING_END
        );

    }


    if (
        sessionName ===
        "evening"
    ) {

        return (
            now.timeMinutes >=
            EVENING_START
        );

    }


    return false;

}


// ==========================================================
// FARM IDENTIFIER
// ==========================================================

function getFarmIdentifier(
    farm
) {

    if (
        !farm
    ) {

        return null;

    }


    if (
        farm._id
    ) {

        return farm._id.toString();

    }


    if (
        farm.id
    ) {

        return farm.id.toString();

    }


    if (
        farm.code !==
        undefined &&
        farm.code !==
        null
    ) {

        return String(
            farm.code
        );

    }


    return null;

}


// ==========================================================
// GET USER FARMS
// ==========================================================

async function getUserFarms(
    user
) {

    requireUser(user);


    let farmIds = [];


    if (
        Array.isArray(
            user.farms
        )
    ) {

        farmIds =
            user.farms
                .filter(Boolean)
                .map(
                    getFarmIdentifier
                )
                .filter(Boolean);

    }


    if (
        !farmIds.length &&
        user.farm
    ) {

        const id =
            getFarmIdentifier(
                user.farm
            );


        if (
            id
        ) {

            farmIds.push(id);

        }

    }


    if (
        !farmIds.length &&
        Array.isArray(
            user.farmIds
        )
    ) {

        farmIds =
            user.farmIds
                .filter(Boolean)
                .map(
                    id =>
                        id.toString()
                );

    }


    if (
        !farmIds.length
    ) {

        return [];

    }


    const objectIds =
        farmIds.filter(
            id =>
                mongoose.Types.ObjectId.isValid(
                    id
                )
        );


    const codes =
        farmIds.filter(
            id =>
                /^-?\d+$/.test(id)
        );


    const conditions = [];


    if (
        objectIds.length
    ) {

        conditions.push({

            _id: {
                $in:
                    objectIds
            }

        });

    }


    if (
        codes.length
    ) {

        conditions.push({

            code: {
                $in:
                    codes.map(Number)
            }

        });

    }


    if (
        !conditions.length
    ) {

        return [];

    }


    return Dairy.find({

        code: {
            $lt: 0
        },

        $or:
            conditions

    })
        .sort({
            code: 1
        })
        .lean();

}


// ==========================================================
// VERIFY USER FARM
// ==========================================================

async function verifyUserFarm(
    farmId,
    user
) {

    requireUser(user);


    if (
        farmId ===
        undefined ||
        farmId ===
        null ||
        farmId ===
        ""
    ) {

        throw milkError(
            "MILK_FARM_REQUIRED",
            "A dairy farm must be selected."
        );

    }


    const farms =
        await getUserFarms(user);


    const requested =
        String(farmId);


    const farm =
        farms.find(
            item => {

                const id =
                    item._id?.toString();


                const code =
                    item.code !==
                    undefined &&
                    item.code !==
                    null
                        ? String(item.code)
                        : null;


                return (
                    requested === id ||
                    requested === code
                );

            }
        );


    if (
        !farm
    ) {

        throw milkError(
            "MILK_FARM_ACCESS_DENIED",
            "The selected dairy farm does not belong to the logged-in user."
        );

    }


    return farm;

}


// ==========================================================
// GET FARM ANIMALS
// ==========================================================
//
// Animal identity:
//
//     code >= 0
//     code is even
//
// Farm ownership:
//
//     animal.assetCode = farm.code
//
// ==========================================================

async function getFarmAnimals(
    farm
) {

    return Dairy.find({

        code: {
            $gte: 0,

            $mod: [
                2,
                0
            ]
        },

        assetCode:
            Number(farm.code)

    })
        .select(
            "_id code assetCode isMilking name"
        )
        .sort({
            code: 1
        })
        .lean();

}


// ==========================================================
// GET USER FARM ANIMALS
// ==========================================================

async function getUserFarmAnimals(
    farm,
    user
) {

    const verifiedFarm =
        await verifyUserFarm(
            getFarmIdentifier(farm) ||
            farm?.code,
            user
        );


    return getFarmAnimals(
        verifiedFarm
    );

}


// ==========================================================
// GET ALL ELIGIBLE MILKING ANIMALS
// ==========================================================

exports.getMilkingAnimals =
    async function () {

        return Dairy.find({

            code: {
                $gte: 0,

                $mod: [
                    2,
                    0
                ]
            }

        })
            .sort({
                code: 1
            })
            .lean();

    };


// ==========================================================
// VERIFY ANIMAL
// ==========================================================

async function verifyAnimalAccess(
    dairyId,
    user
) {

    requireUser(user);


    if (
        !mongoose.Types.ObjectId.isValid(
            dairyId
        )
    ) {

        throw milkError(
            "MILK_INVALID_ANIMAL",
            "Invalid dairy animal ID."
        );

    }


    const dairy =
        await Dairy.findById(
            dairyId
        ).lean();


    if (
        !dairy
    ) {

        throw milkError(
            "MILK_INVALID_ANIMAL",
            "Dairy animal not found."
        );

    }


    if (
        dairy.code < 0 ||
        dairy.code % 2 !== 0
    ) {

        throw milkError(
            "MILK_INVALID_ANIMAL",
            "Only eligible dairy animals can have milk records."
        );

    }


    return dairy;

}


// ==========================================================
// GET ANIMAL FARM
// ==========================================================

function getAnimalFarmCode(
    dairy
) {

    if (
        !dairy
    ) {

        return null;

    }


    if (
        dairy.assetCode ===
        null ||
        dairy.assetCode ===
        undefined
    ) {

        return null;

    }


    return String(
        dairy.assetCode
    );

}


// ==========================================================
// FIND FARM BY CODE
// ==========================================================

function findFarmByCode(
    farms,
    code
) {

    return farms.find(
        farm =>
            String(farm.code) ===
            String(code)
    );

}


// ==========================================================
// CREATE DAILY SUMMARY
// ==========================================================

async function getOrCreateSummary(
    day
) {

    let summary =
        await MilkSummary.findOne({
            day
        });


    if (
        summary
    ) {

        return summary;

    }


    summary =
        await MilkSummary.create({

            day,

            month:
                day.slice(0, 7),

            price:
                DEFAULT_MILK_PRICE,

            consumed:
                0,

            available:
                0,

            cash:
                0,

            locked:
                false,

            sales:
                [],

            farmTotal:
                []

        });


    return summary;

}


// ==========================================================
// CALCULATE PRODUCTION FOR FARM
// ==========================================================
//
// Production comes ONLY from Milk records belonging to
// animals owned by this farm.
//
// ==========================================================

async function calculateFarmProduction(
    day,
    farm
) {

    const animals =
        await getFarmAnimals(
            farm
        );


    if (
        !animals.length
    ) {

        return 0;

    }


    const animalIds =
        animals.map(
            animal =>
                animal._id
        );


    const result =
        await Milk.aggregate([

            {
                $match: {

                    day,

                    dairy: {
                        $in:
                            animalIds
                    }

                }

            },

            {
                $group: {

                    _id:
                        null,

                    total: {
                        $sum:
                            "$liters"
                    }

                }

            }

        ]);


    return Number(
        result[0]?.total || 0
    );

}


// ==========================================================
// CALCULATE ALL FARM PRODUCTION
// ==========================================================

async function calculateFarmProductions(
    day,
    farms
) {

    const result = [];


    for (
        const farm of farms
    ) {

        const production =
            await calculateFarmProduction(
                day,
                farm
            );


        result.push({

            farm:
                farm._id,

            farmId:
                farm._id,

            farmCode:
                farm.code,

            farmName:
                farm.name ||
                farm.farmName ||
                `Farm ${farm.code}`,

            production:
                Number(production || 0)

        });

    }


    return result;

}


// ==========================================================
// FARM SALE TOTAL
// ==========================================================
//
// Sales are farm-scoped.
//
// ==========================================================

function calculateFarmSold(
    summary,
    farmId
) {

    if (
        !summary
    ) {

        return 0;

    }


    const requestedFarm =
        String(farmId);


    return (
        summary.sales || []
    ).reduce(
        (
            total,
            sale
        ) => {

            if (
                !sale.farm
            ) {

                return total;

            }


            if (
                String(sale.farm) !==
                requestedFarm
            ) {

                return total;

            }


            return (
                total +
                Number(
                    sale.liters || 0
                )
            );

        },
        0
    );

}


// ==========================================================
// FARM REVENUE
// ==========================================================

function calculateFarmRevenue(
    summary,
    farmId
) {

    if (
        !summary
    ) {

        return 0;

    }


    const requestedFarm =
        String(farmId);


    return (
        summary.sales || []
    ).reduce(
        (
            total,
            sale
        ) => {

            if (
                !sale.farm
            ) {

                return total;

            }


            if (
                String(sale.farm) !==
                requestedFarm
            ) {

                return total;

            }


            return (
                total +
                Number(
                    sale.cash || 0
                )
            );

        },
        0
    );

}


// ==========================================================
// BUILD FARM TOTALS
// ==========================================================
//
// This is the authoritative farm-level calculation.
//
// production
// sold
// available
// revenue
//
// are always calculated together.
//
// ==========================================================

async function buildFarmTotals(
    day,
    farms,
    summary
) {

    const productions =
        await calculateFarmProductions(
            day,
            farms
        );


    return productions.map(
        item => {

            const farmId =
                item.farmId.toString();


            const sold =
                calculateFarmSold(
                    summary,
                    farmId
                );


            const production =
                Number(
                    item.production || 0
                );


            const available =
                Math.max(
                    0,
                    production - sold
                );


            const revenue =
                calculateFarmRevenue(
                    summary,
                    farmId
                );


            return {

                farm:
                    item.farmId,

                farmId,

                farmCode:
                    item.farmCode,

                farmName:
                    item.farmName,

                production,

                sold,

                available,

                revenue

            };

        }
    );

}


// ==========================================================
// CALCULATE DAILY TOTALS
// ==========================================================

function calculateDailyTotals(
    farmTotals
) {

    return {

        production:
            farmTotals.reduce(
                (
                    total,
                    farm
                ) =>
                    total +
                    Number(
                        farm.production || 0
                    ),
                0
            ),

        sold:
            farmTotals.reduce(
                (
                    total,
                    farm
                ) =>
                    total +
                    Number(
                        farm.sold || 0
                    ),
                0
            ),

        available:
            farmTotals.reduce(
                (
                    total,
                    farm
                ) =>
                    total +
                    Number(
                        farm.available || 0
                    ),
                0
            ),

        revenue:
            farmTotals.reduce(
                (
                    total,
                    farm
                ) =>
                    total +
                    Number(
                        farm.revenue || 0
                    ),
                0
            )

    };

}


// ==========================================================
// REFRESH DAILY SUMMARY
// ==========================================================
//
// MilkSummary is the daily aggregate.
//
// Every refresh recalculates:
//
//     production
//     consumed
//     available
//     cash
//     farmTotal
//
// from the underlying production and sales data.
//
// ==========================================================

async function refreshDailySummary(
    day,
    farms = null
) {

    const summary =
        await getOrCreateSummary(
            day
        );


    if (
        !farms
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


    const farmTotals =
        await buildFarmTotals(
            day,
            farms,
            summary
        );


    const totals =
        calculateDailyTotals(
            farmTotals
        );


    summary.consumed =
        totals.sold;


    summary.available =
        totals.available;


    summary.cash =
        totals.revenue;


    summary.farmTotal =
        farmTotals.map(
            farm => ({

                farm:
                    farm.farmId,

                farmCode:
                    farm.farmCode,

                production:
                    farm.production,

                sold:
                    farm.sold,

                available:
                    farm.available,

                revenue:
                    farm.revenue

            })
        );


    await summary.save();


    return {

        summary,

        farmTotals,

        totals

    };

}


// ==========================================================
// UPDATE FARM TOTALS
// ==========================================================
//
// Retained as a compatibility wrapper for existing callers.
//
// ==========================================================

async function updateFarmTotals(
    day
) {

    const result =
        await refreshDailySummary(
            day
        );


    return result.farmTotals;

}


// ==========================================================
// GET USER FARM TOTALS
// ==========================================================

async function getFarmTotalsForDay(
    day,
    user,
    summary = null
) {

    requireUser(user);


    const farms =
        await getUserFarms(user);


    if (
        !farms.length
    ) {

        return [];

    }


    if (
        !summary
    ) {

        summary =
            await getOrCreateSummary(
                day
            );

    }


    return buildFarmTotals(
        day,
        farms,
        summary
    );

}


// ==========================================================
// GET ONE FARM TOTAL
// ==========================================================

async function getFarmTotalForDay(
    day,
    farmId,
    user,
    summary = null
) {

    const farm =
        await verifyUserFarm(
            farmId,
            user
        );


    const totals =
        await getFarmTotalsForDay(
            day,
            user,
            summary
        );


    const result =
        totals.find(
            item =>
                String(item.farmId) ===
                String(farm._id)
        );


    if (
        result
    ) {

        return result;

    }


    return {

        farm:
            farm._id,

        farmId:
            farm._id,

        farmCode:
            farm.code,

        farmName:
            farm.name ||
            farm.farmName ||
            `Farm ${farm.code}`,

        production:
            0,

        sold:
            0,

        available:
            0,

        revenue:
            0

    };

}


// ==========================================================
// FINALIZE EXPIRED SESSION
// ==========================================================

exports.finalizeExpiredMilkSession =
    async function (
        sessionName,
        day
    ) {

        if (
            !sessionName ||
            !day
        ) {

            return [];

        }


        const dairies =
            await exports.getMilkingAnimals();


        if (
            !dairies.length
        ) {

            return [];

        }


        const existing =
            await Milk.find({

                day,

                session:
                    sessionName

            })
                .select(
                    "dairy"
                )
                .lean();


        const recorded =
            new Set(
                existing
                    .filter(
                        record =>
                            record.dairy
                    )
                    .map(
                        record =>
                            record.dairy.toString()
                    )
            );


        const docs = [];


        for (
            const dairy of dairies
        ) {

            const dairyId =
                dairy._id.toString();


            if (
                recorded.has(
                    dairyId
                )
            ) {

                continue;

            }


            docs.push({

                dairy:
                    dairy._id,

                liters:
                    0,

                remarks:
                    "Not Milked",

                recordedBy:
                    null,

                recordedByType:
                    "system",

                recordedBySystem:
                    true,

                session:
                    sessionName,

                date:
                    new Date(),

                day,

                month:
                    day.slice(0, 7)

            });

        }


        let saved = [];


        if (
            docs.length
        ) {

            try {

                saved =
                    await Milk.insertMany(
                        docs,
                        {
                            ordered:
                                false
                        }
                    );

            }
            catch (error) {

                if (
                    error?.code !==
                    11000
                ) {

                    throw error;

                }

            }

        }


        await updateFarmTotals(
            day
        );


        return saved;

    };


// ==========================================================
// FINALIZE EXPIRED SESSIONS
// ==========================================================

exports.finalizeExpiredMilkSessions =
    async function () {

        const now =
            getKenyaDateParts();


        const results = [];


        if (
            now.timeMinutes >=
            MORNING_END
        ) {

            results.push(
                await exports.finalizeExpiredMilkSession(
                    "morning",
                    now.date
                )
            );

        }


        if (
            now.timeMinutes <
            MORNING_END
        ) {

            results.push(
                await exports.finalizeExpiredMilkSession(
                    "evening",
                    getPreviousKenyaDate()
                )
            );

        }


        return results.flat();

    };


// ==========================================================
// SAVE MILK RECORDS
// ==========================================================

exports.saveMilkRecords =
    async function (
        records,
        user
    ) {

        requireUser(user);


        if (
            !records
        ) {

            throw milkError(
                "MILK_NO_RECORDS",
                "No milk records were submitted."
            );

        }


        let normalizedRecords = [];


        if (
            Array.isArray(records)
        ) {

            normalizedRecords =
                records;

        }
        else if (
            typeof records ===
            "object"
        ) {

            normalizedRecords =
                Object.values(records);

        }


        if (
            !normalizedRecords.length
        ) {

            throw milkError(
                "MILK_NO_RECORDS",
                "No milk records were submitted."
            );

        }


        const current =
            getMilkSession();


        if (
            !current.canSubmit
        ) {

            throw milkError(
                "MILK_TIME_CLOSED",
                "Milk submission is currently closed."
            );

        }


        const cleanedRecords = [];


        for (
            const record of normalizedRecords
        ) {

            if (
                !record
            ) {

                continue;

            }


            const dairyId =
                record.dairy ||
                record.dairyId;


            if (
                !dairyId
            ) {

                continue;

            }


            if (
                !mongoose.Types.ObjectId.isValid(
                    dairyId
                )
            ) {

                throw milkError(
                    "MILK_INVALID_ANIMAL",
                    "One of the submitted dairy animal IDs is invalid."
                );

            }


            const liters =
                Number(
                    record.liters
                );


            if (
                record.liters ===
                undefined ||
                record.liters ===
                null ||
                record.liters ===
                "" ||
                !Number.isFinite(liters) ||
                liters < 0
            ) {

                throw milkError(
                    "MILK_INVALID_QUANTITY",
                    "Please enter a valid milk quantity."
                );

            }


            cleanedRecords.push({

                dairy:
                    dairyId,

                liters,

                remarks:
                    typeof record.remarks ===
                    "string"
                        ? record.remarks.trim()
                        : ""

            });

        }


        if (
            !cleanedRecords.length
        ) {

            throw milkError(
                "MILK_NO_RECORDS",
                "No valid milk records were submitted."
            );

        }


        const submittedIds =
            new Set();


        for (
            const record of cleanedRecords
        ) {

            const id =
                record.dairy.toString();


            if (
                submittedIds.has(id)
            ) {

                throw milkError(
                    "MILK_DUPLICATE_RECORD",
                    "The same dairy animal was submitted more than once."
                );

            }


            submittedIds.add(id);

        }


        const animals = [];


        for (
            const record of cleanedRecords
        ) {

            animals.push(
                await verifyAnimalAccess(
                    record.dairy,
                    user
                )
            );

        }


        const animalFarmCodes =
            new Set(
                animals
                    .map(
                        getAnimalFarmCode
                    )
                    .filter(
                        code =>
                            code !== null
                    )
            );


        if (
            animalFarmCodes.size === 0
        ) {

            throw milkError(
                "MILK_FARM_REQUIRED",
                "The submitted animals are not assigned to a dairy farm."
            );

        }


        const existing =
            await Milk.find({

                dairy: {
                    $in:
                        cleanedRecords.map(
                            record =>
                                record.dairy
                        )
                },

                day:
                    current.day,

                session:
                    current.name

            })
                .select(
                    "dairy"
                )
                .lean();


        if (
            existing.length
        ) {

            throw milkError(
                "MILK_ALREADY_RECORDED",
                "A milk record has already been submitted for one or more animals in this session. Only an administrator can edit an existing record."
            );

        }


        const docs =
            cleanedRecords.map(
                record => ({

                    dairy:
                        record.dairy,

                    liters:
                        record.liters,

                    remarks:
                        record.remarks,

                    recordedBy:
                        user._id,

                    recordedByType:
                        "user",

                    recordedBySystem:
                        false,

                    session:
                        current.name,

                    date:
                        new Date(),

                    day:
                        current.day,

                    month:
                        current.month

                })
            );


        let saved;


        try {

            saved =
                await Milk.insertMany(
                    docs,
                    {
                        ordered:
                            true
                    }
                );

        }
        catch (error) {

            if (
                error?.code ===
                11000
            ) {

                throw milkError(
                    "MILK_ALREADY_RECORDED",
                    "A milk record already exists for one or more animals in this session."
                );

            }


            throw error;

        }


        await updateFarmTotals(
            current.day
        );


        return saved;

    };


// ==========================================================
// EDIT MILK RECORD
// ==========================================================

exports.editMilkRecord =
    async function ({
        recordId,
        liters,
        remarks,
        user
    }) {

        requireAdmin(user);


        if (
            !mongoose.Types.ObjectId.isValid(
                recordId
            )
        ) {

            throw milkError(
                "MILK_NOT_FOUND",
                "Invalid milk record."
            );

        }


        const record =
            await Milk.findById(
                recordId
            );


        if (
            !record
        ) {

            throw milkError(
                "MILK_NOT_FOUND",
                "Milk record not found."
            );

        }


        if (
            !canAdminEditRecord(
                record
            )
        ) {

            throw milkError(
                "MILK_TIME_CLOSED",
                "This milk record can no longer be edited."
            );

        }


        const quantity =
            Number(liters);


        if (
            !Number.isFinite(quantity) ||
            quantity < 0
        ) {

            throw milkError(
                "MILK_INVALID_QUANTITY",
                "Invalid milk quantity."
            );

        }


        record.liters =
            quantity;


        record.remarks =
            typeof remarks ===
            "string"
                ? remarks.trim()
                : "";


        await record.save();


        await updateFarmTotals(
            record.day
        );


        return record;

    };


// ==========================================================
// ADMIN EDIT PERMISSION
// ==========================================================

function canAdminEditRecord(
    record
) {

    const now =
        getKenyaDateParts();


    if (
        !record ||
        !record.session
    ) {

        return false;

    }


    if (
        record.day !==
        now.date
    ) {

        return false;

    }


    if (
        record.session ===
        "morning"
    ) {

        return (
            now.timeMinutes <
            EVENING_START
        );

    }


    if (
        record.session ===
        "evening"
    ) {

        return (
            now.timeMinutes >=
            EVENING_START
        );

    }


    return false;

}


// ==========================================================
// CURRENT PRICE
// ==========================================================

exports.getCurrentPrice =
    async function () {

        const latest =
            await MilkSummary.findOne({

                price: {
                    $gt: 0
                }

            })
                .sort({
                    day: -1
                })
                .lean();


        return (
            latest?.price ||
            DEFAULT_MILK_PRICE
        );

    };


// ==========================================================
// TOGGLE MILKING STATUS
// ==========================================================

exports.toggleMilkingStatus =
    async function ({
        dairyId,
        user
    }) {

        requireAdmin(user);


        if (
            !mongoose.Types.ObjectId.isValid(
                dairyId
            )
        ) {

            throw milkError(
                "MILK_INVALID_ANIMAL",
                "Invalid dairy animal ID."
            );

        }


        const dairy =
            await Dairy.findById(
                dairyId
            );


        if (
            !dairy
        ) {

            throw milkError(
                "MILK_INVALID_ANIMAL",
                "Dairy animal not found."
            );

        }


        dairy.isMilking =
            !dairy.isMilking;


        await dairy.save();


        return dairy;

    };


// ==========================================================
// DAILY STATISTICS
// ==========================================================

exports.getDailyStats =
    async function (
        day,
        user
    ) {

        requireUser(user);


        if (
            !day
        ) {

            throw milkError(
                "MILK_INVALID_DAY",
                "A valid day is required."
            );

        }


        const report =
            await Milk.getDailyReport(
                day
            );


        const farms =
            await getUserFarms(
                user
            );


        const summary =
            await getOrCreateSummary(
                day
            );


        const farmTotals =
            await buildFarmTotals(
                day,
                farms,
                summary
            );


        const totals =
            calculateDailyTotals(
                farmTotals
            );


        summary.consumed =
            totals.sold;


        summary.available =
            totals.available;


        summary.cash =
            totals.revenue;


        summary.farmTotal =
            farmTotals.map(
                farm => ({

                    farm:
                        farm.farmId,

                    farmCode:
                        farm.farmCode,

                    production:
                        farm.production,

                    sold:
                        farm.sold,

                    available:
                        farm.available,

                    revenue:
                        farm.revenue

                })
            );


        await summary.save();


        const sales =
            (
                summary.sales || []
            ).filter(
                sale =>
                    sale.farm &&
                    farms.some(
                        farm =>
                            String(
                                farm._id
                            ) ===
                            String(
                                sale.farm
                            )
                    )
            );


        return {

            records:
                report?.records || [],

            sales,

            farmTotals,

            stats: {

                total:
                    totals.production,

                production:
                    totals.production,

                consumed:
                    totals.sold,

                sold:
                    totals.sold,

                available:
                    totals.available,

                price:
                    summary.price ||
                    DEFAULT_MILK_PRICE,

                cash:
                    totals.revenue,

                revenue:
                    totals.revenue,

                locked:
                    Boolean(
                        summary.locked
                    )

            }

        };

    };


// ==========================================================
// MONTHLY STATISTICS
// ==========================================================

exports.getMonthlyStats =
    async function (
        month,
        user
    ) {

        requireUser(user);


        if (
            !month
        ) {

            throw milkError(
                "MILK_INVALID_MONTH",
                "A valid month is required."
            );

        }


        const farms =
            await getUserFarms(
                user
            );


        const summaries =
            await MilkSummary.find({

                month

            })
                .sort({
                    day: 1
                })
                .lean();


        const records =
            await Milk.find({

                month

            })
                .select(
                    "dairy liters day session"
                )
                .lean();


        const dairyIds =
            records
                .map(
                    record =>
                        record.dairy
                )
                .filter(Boolean);


        const dairies =
            await Dairy.find({

                _id: {
                    $in:
                        dairyIds
                }

            })
                .select(
                    "_id assetCode"
                )
                .lean();


        const dairyMap =
            new Map();


        dairies.forEach(
            dairy => {

                dairyMap.set(
                    dairy._id.toString(),
                    dairy
                );

            }
        );


        const farmMap =
            new Map();


        farms.forEach(
            farm => {

                farmMap.set(
                    farm._id.toString(),
                    {

                        farm:
                            farm._id,

                        farmId:
                            farm._id,

                        farmCode:
                            farm.code,

                        farmName:
                            farm.name ||
                            farm.farmName ||
                            `Farm ${farm.code}`,

                        production:
                            0,

                        sold:
                            0,

                        available:
                            0,

                        revenue:
                            0

                    }
                );

            }
        );


        records.forEach(
            record => {

                const dairy =
                    dairyMap.get(
                        record.dairy?.toString()
                    );


                if (
                    !dairy
                ) {

                    return;

                }


                const farm =
                    findFarmByCode(
                        farms,
                        getAnimalFarmCode(
                            dairy
                        )
                    );


                if (
                    !farm
                ) {

                    return;

                }


                const total =
                    farmMap.get(
                        farm._id.toString()
                    );


                if (
                    !total
                ) {

                    return;

                }


                total.production +=
                    Number(
                        record.liters || 0
                    );

            });


// ----------------------------------------------------------
// SALES
// ----------------------------------------------------------

        summaries.forEach(
            summary => {

                (
                    summary.sales || []
                ).forEach(
                    sale => {

                        if (
                            !sale.farm
                        ) {

                            return;

                        }


                        const farm =
                            farmMap.get(
                                sale.farm.toString()
                            );


                        if (
                            !farm
                        ) {

                            return;

                        }


                        farm.sold +=
                            Number(
                                sale.liters || 0
                            );


                        farm.revenue +=
                            Number(
                                sale.cash || 0
                            );

                    }
                );

            }
        );


// ----------------------------------------------------------
// AVAILABLE
// ----------------------------------------------------------

        farmMap.forEach(
            farm => {

                farm.available =
                    Math.max(
                        0,
                        farm.production -
                        farm.sold
                    );

            }
        );


        const farmTotals =
            Array.from(
                farmMap.values()
            );


        const totalProduction =
            farmTotals.reduce(
                (
                    sum,
                    farm
                ) =>
                    sum +
                    farm.production,
                0
            );


        const totalSold =
            farmTotals.reduce(
                (
                    sum,
                    farm
                ) =>
                    sum +
                    farm.sold,
                0
            );


        const totalAvailable =
            farmTotals.reduce(
                (
                    sum,
                    farm
                ) =>
                    sum +
                    farm.available,
                0
            );


        const totalRevenue =
            farmTotals.reduce(
                (
                    sum,
                    farm
                ) =>
                    sum +
                    farm.revenue,
                0
            );


        const prices =
            summaries
                .map(
                    summary =>
                        Number(
                            summary.price || 0
                        )
                )
                .filter(
                    price =>
                        price > 0
                );


        const averagePrice =
            prices.length
                ? prices.reduce(
                    (
                        sum,
                        price
                    ) =>
                        sum + price,
                    0
                ) /
                prices.length
                : DEFAULT_MILK_PRICE;


        const sales =
            summaries
                .flatMap(
                    summary =>
                        summary.sales || []
                )
                .filter(
                    sale =>
                        sale.farm &&
                        farms.some(
                            farm =>
                                String(
                                    farm._id
                                ) ===
                                String(
                                    sale.farm
                                )
                        )
                );


        return {

            records,

            sales,

            farmTotals,

            stats: {

                total:
                    totalProduction,

                production:
                    totalProduction,

                consumed:
                    totalSold,

                sold:
                    totalSold,

                available:
                    totalAvailable,

                price:
                    averagePrice,

                cash:
                    totalRevenue,

                revenue:
                    totalRevenue,

                locked:
                    false,

                avg:
                    farmTotals.length
                        ? totalProduction /
                          farmTotals.length
                        : 0

            }

        };

    };


// ==========================================================
// SAVE DAILY STATISTICS
// ==========================================================

exports.saveDailyStats =
    async function ({
        day,
        price,
        user
    }) {

        requireUser(user);


        const numericPrice =
            Number(price);


        if (
            !Number.isFinite(
                numericPrice
            ) ||
            numericPrice < 0
        ) {

            throw milkError(
                "MILK_INVALID_PRICE",
                "Invalid milk price."
            );

        }


        const summary =
            await getOrCreateSummary(
                day
            );


        const farms =
            await getUserFarms(
                user
            );


        const farmTotals =
            await buildFarmTotals(
                day,
                farms,
                summary
            );


        const totals =
            calculateDailyTotals(
                farmTotals
            );


        summary.price =
            numericPrice;


        summary.consumed =
            totals.sold;


        summary.available =
            totals.available;


        summary.cash =
            totals.revenue;


        summary.farmTotal =
            farmTotals.map(
                farm => ({

                    farm:
                        farm.farmId,

                    farmCode:
                        farm.farmCode,

                    production:
                        farm.production,

                    sold:
                        farm.sold,

                    available:
                        farm.available,

                    revenue:
                        farm.revenue

                })
            );


        await summary.save();


        return summary;

    };


// ==========================================================
// SALES PAGE DATA
// ==========================================================

exports.getSalesPageData =
    async function (
        user
    ) {

        requireUser(user);


        const today =
            getKenyaDateParts()
                .date;


        const summary =
            await getOrCreateSummary(
                today
            );


        const farms =
            await getUserFarms(
                user
            );


        const farmTotals =
            await buildFarmTotals(
                today,
                farms,
                summary
            );


        const standingOrders =
            await StandingOrder.find({

                omitted:
                    false,

                isActive:
                    true

            })
                .sort({
                    customerName: 1
                })
                .lean();


        standingOrders.forEach(
            order => {

                order.saleRecordedToday =
                    (
                        summary.sales || []
                    ).some(
                        sale =>
                            sale.standingOrderId &&
                            sale.standingOrderId.toString() ===
                            order._id.toString()
                    );


                order.isFuture =
                    Boolean(
                        order.effectiveDate &&
                        new Date(
                            order.effectiveDate
                        ) >
                        new Date()
                    );

            }
        );


        const manualSales =
            (
                summary.sales || []
            ).filter(
                sale =>
                    !sale.standingOrderId
            );


        const totals =
            calculateDailyTotals(
                farmTotals
            );


        return {

            standingOrders,

            manualSales,

            farmTotals,

            currentPrice:
                summary.price ||
                DEFAULT_MILK_PRICE,

            totalSales:
                totals.sold,

            totalProduction:
                totals.production,

            totalRevenue:
                totals.revenue,

            availableMilk:
                totals.available

        };

    };


// ==========================================================
// FARM AVAILABILITY
// ==========================================================

exports.getFarmAvailability =
    async function ({
        farmId,
        user,
        day
    }) {

        requireUser(user);


        const requestedDay =
            day ||
            getKenyaDateParts().date;


        return getFarmTotalForDay(
            requestedDay,
            farmId,
            user
        );

    };


// ==========================================================
// SUBMIT MANUAL SALE
// ==========================================================

exports.submitManualSale =
    async function ({
        farmId,
        customerName,
        liters,
        user
    }) {

        requireUser(user);


        if (
            !customerName ||
            !customerName.trim()
        ) {

            throw milkError(
                "MILK_INVALID_CUSTOMER",
                "Customer name is required."
            );

        }


        const quantity =
            Number(liters);


        if (
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {

            throw milkError(
                "MILK_INVALID_QUANTITY",
                "Invalid milk quantity."
            );

        }


        const farm =
            await verifyUserFarm(
                farmId,
                user
            );


        const today =
            getKenyaDateParts()
                .date;


        const summary =
            await getOrCreateSummary(
                today
            );


        if (
            summary.locked
        ) {

            throw milkError(
                "MILK_DAY_LOCKED",
                "Today's milk summary is locked."
            );

        }


        const farmTotal =
            await getFarmTotalForDay(
                today,
                farm._id,
                user,
                summary
            );


        if (
            quantity >
            Number(
                farmTotal.available || 0
            )
        ) {

            throw milkError(
                "MILK_INSUFFICIENT",
                `Insufficient milk available for this farm. Only ${Number(farmTotal.available || 0).toFixed(2)} L remains.`
            );

        }


        const price =
            summary.price ||
            DEFAULT_MILK_PRICE;


        summary.sales.push({

            farm:
                farm._id,

            customerName:
                customerName.trim(),

            liters:
                quantity,

            price,

            cash:
                quantity * price

        });


        await summary.save();


        await refreshDailySummary(
            today
        );


        return summary;

    };


// ==========================================================
// SUBMIT STANDING ORDER SALE
// ==========================================================

exports.submitStandingOrderSale =
    async function ({
        farmId,
        standingOrderId,
        user
    }) {

        requireUser(user);


        if (
            !mongoose.Types.ObjectId.isValid(
                standingOrderId
            )
        ) {

            throw milkError(
                "MILK_INVALID_ORDER",
                "Invalid standing order."
            );

        }


        const farm =
            await verifyUserFarm(
                farmId,
                user
            );


        const order =
            await StandingOrder.findById(
                standingOrderId
            );


        if (
            !order
        ) {

            throw milkError(
                "MILK_ORDER_NOT_FOUND",
                "Standing order not found."
            );

        }


        if (
            order.omitted ||
            order.isActive === false
        ) {

            throw milkError(
                "MILK_ORDER_INACTIVE",
                "This standing order is no longer active."
            );

        }


        if (
            order.effectiveDate &&
            new Date(
                order.effectiveDate
            ) >
            new Date()
        ) {

            throw milkError(
                "MILK_ORDER_NOT_ACTIVE",
                "This standing order has not become active yet."
            );

        }


        const today =
            getKenyaDateParts()
                .date;


        const summary =
            await getOrCreateSummary(
                today
            );


        if (
            summary.locked
        ) {

            throw milkError(
                "MILK_DAY_LOCKED",
                "Today's milk summary is locked."
            );

        }


        const alreadyProcessed =
            (
                summary.sales || []
            ).some(
                sale =>
                    sale.standingOrderId &&
                    sale.standingOrderId.toString() ===
                    standingOrderId.toString() &&
                    sale.farm &&
                    sale.farm.toString() ===
                    farm._id.toString()
            );


        if (
            alreadyProcessed
        ) {

            throw milkError(
                "MILK_ORDER_ALREADY_PROCESSED",
                "Standing order has already been processed for this farm today."
            );

        }


        const quantity =
            Number(order.liters);


        if (
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {

            throw milkError(
                "MILK_INVALID_QUANTITY",
                "Invalid standing order quantity."
            );

        }


        const farmTotal =
            await getFarmTotalForDay(
                today,
                farm._id,
                user,
                summary
            );


        if (
            quantity >
            Number(
                farmTotal.available || 0
            )
        ) {

            throw milkError(
                "MILK_INSUFFICIENT",
                `Insufficient milk available for this farm. Only ${Number(farmTotal.available || 0).toFixed(2)} L remains.`
            );

        }


        const price =
            summary.price ||
            DEFAULT_MILK_PRICE;


        summary.sales.push({

            farm:
                farm._id,

            customerName:
                order.customerName,

            liters:
                quantity,

            price,

            cash:
                quantity * price,

            standingOrderId:
                order._id

        });


        await summary.save();


        await refreshDailySummary(
            today
        );


        return summary;

    };


// ==========================================================
// UPDATE MILK PRICE
// ==========================================================

exports.updateMilkPrice =
    async function (
        price
    ) {

        const numericPrice =
            Number(price);


        if (
            !Number.isFinite(
                numericPrice
            ) ||
            numericPrice < 0
        ) {

            throw milkError(
                "MILK_INVALID_PRICE",
                "Invalid milk price."
            );

        }


        const today =
            getKenyaDateParts()
                .date;


        const summary =
            await getOrCreateSummary(
                today
            );


        if (
            summary.locked
        ) {

            throw milkError(
                "MILK_DAY_LOCKED",
                "Today's milk summary is locked."
            );

        }


        summary.price =
            numericPrice;


        await summary.save();


        return summary;

    };


// ==========================================================
// ADD STANDING ORDER
// ==========================================================

exports.addStandingOrder =
    async function ({
        customerName,
        liters
    }) {

        if (
            !customerName ||
            !customerName.trim()
        ) {

            throw milkError(
                "MILK_INVALID_CUSTOMER",
                "Customer name is required."
            );

        }


        const quantity =
            Number(liters);


        if (
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {

            throw milkError(
                "MILK_INVALID_QUANTITY",
                "Invalid standing order quantity."
            );

        }


        return StandingOrder.create({

            customerName:
                customerName.trim(),

            liters:
                quantity

        });

    };


// ==========================================================
// OMIT STANDING ORDER
// ==========================================================

exports.omitStandingOrder =
    async function ({
        orderId,
        user
    }) {

        requireAdmin(user);


        if (
            !mongoose.Types.ObjectId.isValid(
                orderId
            )
        ) {

            throw milkError(
                "MILK_ORDER_NOT_FOUND",
                "Invalid standing order."
            );

        }


        const order =
            await StandingOrder.findById(
                orderId
            );


        if (
            !order
        ) {

            throw milkError(
                "MILK_ORDER_NOT_FOUND",
                "Standing order not found."
            );

        }


        order.omitted =
            true;


        order.isActive =
            false;


        await order.save();


        return order;

    };


// ==========================================================
// MILKING HISTORY
// ==========================================================

exports.getMilkingHistory =
    async function ({
        dairyId,
        month,
        user
    }) {

        requireUser(user);


        const dairy =
            await verifyAnimalAccess(
                dairyId,
                user
            );


        const filter = {

            dairy:
                dairyId

        };


        if (
            month
        ) {

            filter.month =
                month;

        }


        const records =
            await Milk.find(
                filter
            )
                .populate(
                    "recordedBy",
                    "name"
                )
                .sort({
                    date: -1
                })
                .lean();


        const grouped = {};


        for (
            const record of records
        ) {

            if (
                !grouped[record.day]
            ) {

                grouped[record.day] = {

                    entries: [],

                    total: 0

                };

            }


            grouped[
                record.day
            ].entries.push(
                record
            );


            grouped[
                record.day
            ].total +=
                Number(
                    record.liters || 0
                );

        }


        const monthlyTotal =
            records.reduce(
                (
                    total,
                    record
                ) =>
                    total +
                    Number(
                        record.liters || 0
                    ),
                0
            );


        return {

            dairy,

            records,

            grouped,

            monthlyTotal,

            hasData:
                records.length > 0

        };

    };


// ==========================================================
// LOCK DAY
// ==========================================================

exports.lockDay =
    async function (
        day,
        user
    ) {

        requireAdmin(user);


        const summary =
            await MilkSummary.findOne({
                day
            });


        if (
            !summary
        ) {

            throw milkError(
                "MILK_SUMMARY_NOT_FOUND",
                "Daily summary not found."
            );

        }


        summary.locked =
            true;


        await summary.save();


        return summary;

    };


// ==========================================================
// UNLOCK DAY
// ==========================================================

exports.unlockDay =
    async function (
        day,
        user
    ) {

        requireAdmin(user);


        const summary =
            await MilkSummary.findOne({
                day
            });


        if (
            !summary
        ) {

            throw milkError(
                "MILK_SUMMARY_NOT_FOUND",
                "Daily summary not found."
            );

        }


        summary.locked =
            false;


        await summary.save();


        return summary;

    };


// ==========================================================
// PUBLIC HELPERS
// ==========================================================

exports.getMilkSession =
    getMilkSession;


exports.getKenyaDateParts =
    getKenyaDateParts;


exports.getSessionDeadline =
    getSessionDeadline;


exports.canSubmitSession =
    canSubmitSession;


exports.canAdminEditRecord =
    canAdminEditRecord;


// ==========================================================
// FARM HELPERS
// ==========================================================

exports.getUserFarms =
    getUserFarms;


exports.getFarmTotalsForDay =
    getFarmTotalsForDay;


exports.getFarmAvailability =
    exports.getFarmAvailability;


// ==========================================================
// INTERNAL COMPATIBILITY EXPORT
// ==========================================================

exports.updateFarmTotals =
    updateFarmTotals;