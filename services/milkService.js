// ==========================================================
// services/milkService.js
// ==========================================================
//
// CENTRAL MILK BUSINESS-LOGIC SERVICE
//
// FARM-SCOPED MILK PRODUCTION + SALES
//
// Used by:
//
//     controllers/milkController.js
//     controllers/milkCollectController.js
//
// Responsibilities:
//
// • Milk collection
// • Morning / evening sessions
// • Dairy animals
// • Milk record creation
// • FARM milk production totals
// • FARM milk availability
// • FARM milk sales
// • FARM revenue
// • Automatic session finalization
// • Administrator editing
// • Milking status
// • Daily statistics
// • Monthly statistics
// • Milk pricing
// • Standing orders
// • Milking history
// • Daily summary locking
//
// ==========================================================
//
// IMPORTANT FARM RULE
// ----------------------------------------------------------
//
// Milk production belongs to the farm that owns the animal.
//
// Every sale MUST belong to a farm.
//
// Therefore:
//
//     farmProduction
//     farmSold
//     farmAvailable
//     farmRevenue
//
// are calculated independently.
//
// A sale from Farm A can NEVER consume milk produced by Farm B.
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


// ==========================================================
// SESSION TIMES
// ==========================================================
//
// 00:00 - 09:59  = MORNING
// 10:00 - 15:59  = CLOSED
// 16:00 - 23:59  = EVENING
//
// ==========================================================

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
        new Error(
            message
        );


    error.code =
        code;


    return error;

}


// ==========================================================
// REQUIRE USER
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


// ==========================================================
// REQUIRE ADMIN
// ==========================================================

function requireAdmin(
    user
) {

    requireUser(
        user
    );


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
// GET KENYA DATE PARTS
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
                    (part) =>
                        part.type ===
                        name
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


    return {

        year,

        month,

        day,

        hour,

        minute,

        second,

        date:
            `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,

        monthKey:
            `${year}-${String(month).padStart(2, "0")}`,

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


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        `${year}-${month}-${day}`
    );

}


// ==========================================================
// GET CURRENT MILK SESSION
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
// GET ANIMAL FARM
// ==========================================================
//
// Your Dairy structure identifies an animal's parent farm
// through:
//
//     assetCode = negative farm code
//
// Example:
//
//     Farm code:       -1
//     Animal assetCode: -1
//
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
// GET FARM IDENTIFIER
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
// GET USER'S DAIRY FARMS
// ==========================================================
//
// FARM OWNERSHIP
// ----------------------------------------------------------
//
// A farm is represented by a Dairy document whose:
//
//     code < 0
//
// The user's farms are resolved from the authenticated user.
//
// The service accepts the farm IDs/codes exposed on the user
// object so the controller does not have to manufacture a
// second ownership system.
//
// ==========================================================

async function getUserFarms(
    user
) {

    requireUser(
        user
    );


    let farmIds = [];


    if (
        Array.isArray(
            user.farms
        )
    ) {

        farmIds =
            user.farms
                .filter(
                    Boolean
                )
                .map(
                    (farm) =>
                        getFarmIdentifier(
                            farm
                        )
                )
                .filter(
                    Boolean
                );

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

            farmIds.push(
                id
            );

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
                .filter(
                    Boolean
                )
                .map(
                    (id) =>
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
            (id) =>
                mongoose.Types.ObjectId.isValid(
                    id
                )
        );


    const codes =
        farmIds.filter(
            (id) =>
                /^-?\d+$/.test(
                    id
                )
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
                    codes.map(
                        Number
                    )
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

    requireUser(
        user
    );


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
        await getUserFarms(
            user
        );


    const requested =
        String(
            farmId
        );


    const farm =
        farms.find(
            (item) => {

                const id =
                    item._id?.toString();


                const code =
                    item.code !==
                        undefined &&
                    item.code !==
                        null
                        ? String(
                            item.code
                        )
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
// GET USER FARM ANIMALS
// ==========================================================

async function getUserFarmAnimals(
    farm,
    user
) {

    const verifiedFarm =
        await verifyUserFarm(
            getFarmIdentifier(
                farm
            ) ||
            farm?.code,
            user
        );


    const farmCode =
        String(
            verifiedFarm.code
        );


    return Dairy.find({

        code: {
            $gte: 0,

            $mod: [
                2,
                0
            ]
        },

        assetCode:
            Number(
                farmCode
            )

    })
        .sort({
            code: 1
        })
        .lean();

}


// ==========================================================
// GET ALL DAIRY ANIMALS
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
// VERIFY ANIMAL ACCESS
// ==========================================================

async function verifyAnimalAccess(
    dairyId,
    user
) {

    requireUser(
        user
    );


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
// CALCULATE FARM PRODUCTION
// ==========================================================
//
// Returns production for ONE farm.
//
// ==========================================================

async function calculateFarmProduction(
    day,
    farm
) {

    const farmCode =
        String(
            farm.code
        );


    const animals =
        await Dairy.find({

            code: {
                $gte: 0,

                $mod: [
                    2,
                    0
                ]
            },

            assetCode:
                Number(
                    farmCode
                )

        })
            .select(
                "_id"
            )
            .lean();


    if (
        !animals.length
    ) {

        return 0;

    }


    const animalIds =
        animals.map(
            (animal) =>
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
        result[0]?.total ||
        0
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

            production

        });

    }


    return result;

}


// ==========================================================
// CALCULATE FARM SOLD
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
        String(
            farmId
        );


    return (
        summary.sales ||
        []
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
                String(
                    sale.farm
                ) !==
                requestedFarm
            ) {

                return total;

            }


            return (
                total +
                Number(
                    sale.liters ||
                    0
                )
            );

        },
        0
    );

}


// ==========================================================
// CALCULATE FARM REVENUE
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
        String(
            farmId
        );


    return (
        summary.sales ||
        []
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
                String(
                    sale.farm
                ) !==
                requestedFarm
            ) {

                return total;

            }


            return (
                total +
                Number(
                    sale.cash ||
                    0
                )
            );

        },
        0
    );

}


// ==========================================================
// GET FARM TOTALS
// ==========================================================
//
// This is the main farm-production report.
//
// ==========================================================

async function getFarmTotalsForDay(
    day,
    user,
    summary = null
) {

    requireUser(
        user
    );


    const farms =
        await getUserFarms(
            user
        );


    if (
        !farms.length
    ) {

        return [];

    }


    if (
        !summary
    ) {

        summary =
            await MilkSummary.findOne({
                day
            }).lean();

    }


    const productions =
        await calculateFarmProductions(
            day,
            farms
        );


    return productions.map(
        (item) => {

            const farmId =
                item.farmId.toString();


            const sold =
                calculateFarmSold(
                    summary,
                    farmId
                );


            const available =
                Math.max(
                    0,
                    Number(
                        item.production ||
                        0
                    ) -
                    sold
                );


            const revenue =
                calculateFarmRevenue(
                    summary,
                    farmId
                );


            return {

                farm:
                    item.farm,

                farmId,

                farmCode:
                    item.farmCode,

                farmName:
                    item.farmName,

                production:
                    Number(
                        item.production ||
                        0
                    ),

                sold,

                available,

                revenue

            };

        }
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


    const requested =
        String(
            farm._id
        );


    const result =
        totals.find(
            (item) =>
                String(
                    item.farmId
                ) ===
                requested
        );


    if (
        !result
    ) {

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


    return result;

}


// ==========================================================
// UPDATE FARM TOTALS
// ==========================================================
//
// MilkSummary.farmTotal is retained as a daily snapshot.
//
// ==========================================================

async function updateFarmTotals(
    day,
    session
) {

    if (
        !day ||
        !session
    ) {

        return null;

    }


    let summary =
        await MilkSummary.findOne({
            day
        });


    if (
        !summary
    ) {

        summary =
            await MilkSummary.create({

                day,

                month:
                    day.slice(
                        0,
                        7
                    ),

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

    }


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


    const totals = [];


    for (
        const farm of farms
    ) {

        const production =
            await calculateFarmProduction(
                day,
                farm
            );


        const farmId =
            farm._id.toString();


        const sold =
            calculateFarmSold(
                summary,
                farmId
            );


        const available =
            Math.max(
                0,
                production -
                sold
            );


        const revenue =
            calculateFarmRevenue(
                summary,
                farmId
            );


        totals.push({

            farm:
                farm._id,

            farmCode:
                farm.code,

            production,

            sold,

            available,

            revenue

        });

    }


    summary.farmTotal =
        totals;


    await summary.save();


    return totals;

}


// ==========================================================
// FINALIZE EXPIRED MILK SESSION
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
                        (record) =>
                            record.dairy
                    )
                    .map(
                        (record) =>
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
                    day.slice(
                        0,
                        7
                    )

            });

        }


        if (
            !docs.length
        ) {

            await updateFarmTotals(
                day,
                sessionName
            );


            return [];

        }


        let saved;


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


            saved = [];

        }


        await updateFarmTotals(
            day,
            sessionName
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

            const previousDay =
                getPreviousKenyaDate();


            results.push(

                await exports.finalizeExpiredMilkSession(

                    "evening",

                    previousDay

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

        requireUser(
            user
        );


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
            Array.isArray(
                records
            )
        ) {

            normalizedRecords =
                records;

        }
        else if (
            typeof records ===
            "object"
        ) {

            normalizedRecords =
                Object.values(
                    records
                );

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
                "Milk submission is currently closed. Morning collection is available from midnight to 10:00 AM, while evening collection is available from 4:00 PM until midnight."
            );

        }


        const session =
            current.name;


        const day =
            current.day;


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
                !Number.isFinite(
                    liters
                ) ||
                liters < 0
            ) {

                throw milkError(
                    "MILK_INVALID_QUANTITY",
                    "Please enter a valid milk quantity for every animal being recorded."
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
                "No valid milk records were submitted. Please enter a milk quantity before saving."
            );

        }


        const submittedIds =
            new Set();


        for (
            const record of cleanedRecords
        ) {

            const dairyId =
                record.dairy.toString();


            if (
                submittedIds.has(
                    dairyId
                )
            ) {

                throw milkError(
                    "MILK_DUPLICATE_RECORD",
                    "The same dairy animal was submitted more than once."
                );

            }


            submittedIds.add(
                dairyId
            );

        }


        for (
            const record of cleanedRecords
        ) {

            await verifyAnimalAccess(

                record.dairy,

                user

            );

        }


        const dairyIds =
            cleanedRecords.map(
                (record) =>
                    record.dairy
            );


        const existing =
            await Milk.find({

                dairy: {
                    $in:
                        dairyIds
                },

                day,

                session

            })
                .select(
                    "dairy liters remarks session day"
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
                (record) => ({

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

                    session,

                    date:
                        new Date(),

                    day,

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
                    "A milk record has already been submitted for one or more animals in this session. Only an administrator can edit an existing record."
                );

            }


            throw error;

        }


        if (
            !saved ||
            !Array.isArray(saved) ||
            saved.length !==
                docs.length
        ) {

            throw milkError(
                "MILK_SAVE_FAILED",
                "The milk records could not be saved. Please try again."
            );

        }


        await updateFarmTotals(
            day,
            session
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

        requireAdmin(
            user
        );


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


        if (
            liters === undefined ||
            liters === null ||
            liters === ""
        ) {

            throw milkError(
                "MILK_INVALID_QUANTITY",
                "Milk quantity is required."
            );

        }


        const quantity =
            Number(
                liters
            );


        if (
            !Number.isFinite(
                quantity
            ) ||
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
            record.day,
            record.session
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
// GET CURRENT MILK PRICE
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

        requireAdmin(
            user
        );


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
// GET DAILY STATISTICS
// ==========================================================

exports.getDailyStats =
    async function (
        day,
        user
    ) {

        requireUser(
            user
        );


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


        let summary =
            await MilkSummary.findOne({
                day
            });


        if (
            !summary
        ) {

            summary =
                await MilkSummary.create({

                    day,

                    month:
                        day.slice(
                            0,
                            7
                        ),

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

        }


        const farms =
            await getFarmTotalsForDay(
                day,
                user,
                summary
            );


        const sales =
            summary.sales || [];


        const consumed =
            sales.reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    Number(
                        sale.liters ||
                        0
                    ),
                0
            );


        const total =
            farms.reduce(
                (
                    sum,
                    farm
                ) =>
                    sum +
                    Number(
                        farm.production ||
                        0
                    ),
                0
            );


        const available =
            farms.reduce(
                (
                    sum,
                    farm
                ) =>
                    sum +
                    Number(
                        farm.available ||
                        0
                    ),
                0
            );


        const cash =
            sales.reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    Number(
                        sale.cash ||
                        0
                    ),
                0
            );


        summary.consumed =
            consumed;


        summary.available =
            available;


        summary.cash =
            cash;


        summary.farmTotal =
            farms.map(
                (farm) => ({

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

            records:
                report?.records ||
                [],

            sales,

            farmTotals:
                farms,

            stats: {

                total,

                consumed,

                available,

                price:
                    summary.price ||
                    DEFAULT_MILK_PRICE,

                cash,

                locked:
                    summary.locked ||
                    false

            }

        };

    };


// ==========================================================
// GET MONTHLY STATISTICS
// ==========================================================

exports.getMonthlyStats =
    async function (
        month,
        user
    ) {

        requireUser(
            user
        );


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
                .lean();


        const summaryMap =
            new Map();


        summaries.forEach(
            (summary) => {

                summaryMap.set(
                    summary.day,
                    summary
                );

            }
        );


        const farmMap =
            new Map();


        farms.forEach(
            (farm) => {

                farmMap.set(
                    farm._id.toString(),
                    {

                        farm:
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


        const records =
            await Milk.find({

                month

            })
                .select(
                    "dairy liters day session"
                )
                .lean();


        const dairyIds =
            records.map(
                (record) =>
                    record.dairy
            );


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
            (dairy) => {

                dairyMap.set(

                    dairy._id.toString(),

                    dairy

                );

            }
        );


        records.forEach(
            (record) => {

                const dairy =
                    dairyMap.get(
                        record.dairy?.toString()
                    );


                if (
                    !dairy
                ) {

                    return;

                }


                const farmCode =
                    getAnimalFarmCode(
                        dairy
                    );


                if (
                    farmCode ===
                    null
                ) {

                    return;

                }


                const farm =
                    farms.find(
                        (item) =>
                            String(
                                item.code
                            ) ===
                            String(
                                farmCode
                            )
                    );


                if (
                    !farm
                ) {

                    return;

                }


                const farmTotal =
                    farmMap.get(
                        farm._id.toString()
                    );


                if (
                    !farmTotal
                ) {

                    return;

                }


                farmTotal.production +=
                    Number(
                        record.liters ||
                        0
                    );

            });


        summaries.forEach(
            (summary) => {

                (
                    summary.sales ||
                    []
                ).forEach(
                    (sale) => {

                        if (
                            !sale.farm
                        ) {

                            return;

                        }


                        const farmTotal =
                            farmMap.get(
                                sale.farm.toString()
                            );


                        if (
                            !farmTotal
                        ) {

                            return;

                        }


                        farmTotal.sold +=
                            Number(
                                sale.liters ||
                                0
                            );


                        farmTotal.revenue +=
                            Number(
                                sale.cash ||
                                0
                            );

                    }
                );

            }
        );


        const farmTotals =
            Array.from(
                farmMap.values()
            );


        farmTotals.forEach(
            (farm) => {

                farm.available =
                    Math.max(
                        0,
                        farm.production -
                        farm.sold
                    );

            }
        );


        const totalProduced =
            farmTotals.reduce(
                (
                    sum,
                    farm
                ) =>
                    sum +
                    farm.production,
                0
            );


        const totalConsumed =
            farmTotals.reduce(
                (
                    sum,
                    farm
                ) =>
                    sum +
                    farm.sold,
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


        const sales =
            summaries.flatMap(
                (summary) =>
                    summary.sales ||
                    []
            ).filter(
                (sale) =>
                    sale.farm &&
                    farms.some(
                        (farm) =>
                            farm._id.toString() ===
                            sale.farm.toString()
                    )
            );


        return {

            records,

            sales,

            farmTotals,

            stats: {

                total:
                    totalProduced,

                consumed:
                    totalConsumed,

                available:
                    totalAvailable,

                price:
                    summaries.length
                        ? summaries.reduce(
                            (
                                sum,
                                summary
                            ) =>
                                sum +
                                Number(
                                    summary.price ||
                                    0
                                ),
                            0
                        ) /
                        summaries.length
                        : DEFAULT_MILK_PRICE,

                cash:
                    totalRevenue,

                locked:
                    false,

                avg:
                    farmTotals.length
                        ? totalProduced /
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

        requireUser(
            user
        );


        if (
            !day
        ) {

            throw milkError(
                "MILK_INVALID_DAY",
                "Day is required."
            );

        }


        const numericPrice =
            Number(
                price
            );


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


        let summary =
            await MilkSummary.findOne({
                day
            });


        if (
            !summary
        ) {

            summary =
                await MilkSummary.create({

                    day,

                    month:
                        day.slice(
                            0,
                            7
                        ),

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

        }


        const farms =
            await getFarmTotalsForDay(
                day,
                user,
                summary
            );


        summary.price =
            numericPrice;


        summary.consumed =
            farms.reduce(
                (
                    sum,
                    farm
                ) =>
                    sum +
                    Number(
                        farm.sold ||
                        0
                    ),
                0
            );


        summary.available =
            farms.reduce(
                (
                    sum,
                    farm
                ) =>
                    sum +
                    Number(
                        farm.available ||
                        0
                    ),
                0
            );


        summary.cash =
            farms.reduce(
                (
                    sum,
                    farm
                ) =>
                    sum +
                    Number(
                        farm.revenue ||
                        0
                    ),
                0
            );


        summary.farmTotal =
            farms.map(
                (farm) => ({

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
// GET SALES PAGE DATA
// ==========================================================
//
// IMPORTANT
// ----------------------------------------------------------
//
// The page receives FARM TOTALS instead of one global
// availableMilk value.
//
// ==========================================================

exports.getSalesPageData =
    async function (
        user
    ) {

        requireUser(
            user
        );


        const today =
            getKenyaDateParts()
                .date;


        let summary =
            await MilkSummary.findOne({
                day: today
            });


        if (
            !summary
        ) {

            summary =
                await MilkSummary.create({

                    day:
                        today,

                    month:
                        today.slice(
                            0,
                            7
                        ),

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

        }


        const farmTotals =
            await getFarmTotalsForDay(
                today,
                user,
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
            (order) => {

                order.saleRecordedToday =
                    (
                        summary.sales ||
                        []
                    ).some(
                        (sale) =>
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
                summary.sales ||
                []
            ).filter(
                (sale) =>
                    !sale.standingOrderId
            );


        const totalSales =
            farmTotals.reduce(
                (
                    sum,
                    farm
                ) =>
                    sum +
                    Number(
                        farm.sold ||
                        0
                    ),
                0
            );


        const totalProduction =
            farmTotals.reduce(
                (
                    sum,
                    farm
                ) =>
                    sum +
                    Number(
                        farm.production ||
                        0
                    ),
                0
            );


        const totalAvailable =
            farmTotals.reduce(
                (
                    sum,
                    farm
                ) =>
                    sum +
                    Number(
                        farm.available ||
                        0
                    ),
                0
            );


        const totalRevenue =
            farmTotals.reduce(
                (
                    sum,
                    farm
                ) =>
                    sum +
                    Number(
                        farm.revenue ||
                        0
                    ),
                0
            );


        return {

            standingOrders,

            manualSales,

            farmTotals,

            currentPrice:
                summary.price ||
                DEFAULT_MILK_PRICE,

            totalSales,

            totalProduction,

            totalRevenue,

            availableMilk:
                totalAvailable

        };

    };


// ==========================================================
// GET FARM SALE AVAILABILITY
// ==========================================================

exports.getFarmAvailability =
    async function ({
        farmId,
        user,
        day
    }) {

        requireUser(
            user
        );


        const requestedDay =
            day ||
            getKenyaDateParts()
                .date;


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

        requireUser(
            user
        );


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
            Number(
                liters
            );


        if (
            !Number.isFinite(
                quantity
            ) ||
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


        let summary =
            await MilkSummary.findOne({
                day: today
            });


        if (
            !summary
        ) {

            summary =
                await MilkSummary.create({

                    day:
                        today,

                    month:
                        today.slice(
                            0,
                            7
                        ),

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

        }


        if (
            summary.locked
        ) {

            throw milkError(
                "MILK_DAY_LOCKED",
                "Today's milk summary is locked."
            );

        }


        const farmTotals =
            await getFarmTotalForDay(
                today,
                farm._id,
                user,
                summary
            );


        const available =
            Number(
                farmTotals.available ||
                0
            );


        if (
            quantity >
            available
        ) {

            throw milkError(
                "MILK_INSUFFICIENT",
                `Insufficient milk available for this farm. Only ${available.toFixed(2)} L remains.`
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
                quantity *
                price

        });


        summary.consumed =
            summary.sales.reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    Number(
                        sale.liters ||
                        0
                    ),
                0
            );


        summary.cash =
            summary.sales.reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    Number(
                        sale.cash ||
                        0
                    ),
                0
            );


        await summary.save();


        await updateFarmTotals(
            today,
            "sale"
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

        requireUser(
            user
        );


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
            order.isActive ===
                false
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


        let summary =
            await MilkSummary.findOne({
                day: today
            });


        if (
            !summary
        ) {

            summary =
                await MilkSummary.create({

                    day:
                        today,

                    month:
                        today.slice(
                            0,
                            7
                        ),

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

        }


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
                summary.sales ||
                []
            ).some(
                (sale) =>
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


        const farmTotals =
            await getFarmTotalForDay(
                today,
                farm._id,
                user,
                summary
            );


        const available =
            Number(
                farmTotals.available ||
                0
            );


        const orderLiters =
            Number(
                order.liters
            );


        if (
            !Number.isFinite(
                orderLiters
            ) ||
            orderLiters <= 0
        ) {

            throw milkError(
                "MILK_INVALID_QUANTITY",
                "Invalid standing order quantity."
            );

        }


        if (
            orderLiters >
            available
        ) {

            throw milkError(
                "MILK_INSUFFICIENT",
                `Insufficient milk available for this farm. Only ${available.toFixed(2)} L remains.`
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
                orderLiters,

            price,

            cash:
                orderLiters *
                price,

            standingOrderId:
                order._id

        });


        summary.consumed =
            summary.sales.reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    Number(
                        sale.liters ||
                        0
                    ),
                0
            );


        summary.cash =
            summary.sales.reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    Number(
                        sale.cash ||
                        0
                    ),
                0
            );


        await summary.save();


        await updateFarmTotals(
            today,
            "sale"
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
            Number(
                price
            );


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


        let summary =
            await MilkSummary.findOne({
                day: today
            });


        if (
            !summary
        ) {

            summary =
                await MilkSummary.create({

                    day:
                        today,

                    month:
                        today.slice(
                            0,
                            7
                        ),

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

        }


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
            Number(
                liters
            );


        if (
            !Number.isFinite(
                quantity
            ) ||
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

        requireAdmin(
            user
        );


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

        requireUser(
            user
        );


        await verifyAnimalAccess(

            dairyId,

            user

        );


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

            const day =
                record.day;


            if (
                !grouped[day]
            ) {

                grouped[day] = {

                    entries:
                        [],

                    total:
                        0

                };

            }


            grouped[
                day
            ].entries.push(
                record
            );


            grouped[
                day
            ].total +=
                Number(
                    record.liters ||
                    0
                );

        }


        const monthlyTotal =
            records.reduce(
                (
                    sum,
                    record
                ) =>
                    sum +
                    Number(
                        record.liters ||
                        0
                    ),
                0
            );


        return {

            dairy,

            records,

            grouped,

            monthlyTotal,

            hasData:
                records.length >
                0

        };

    };


// ==========================================================
// LOCK DAILY SUMMARY
// ==========================================================

exports.lockDay =
    async function (
        day,
        user
    ) {

        requireAdmin(
            user
        );


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
// UNLOCK DAILY SUMMARY
// ==========================================================

exports.unlockDay =
    async function (
        day,
        user
    ) {

        requireAdmin(
            user
        );


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