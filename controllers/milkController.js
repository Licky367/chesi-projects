// ==========================================================
// controllers/milkController.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// General controller for the milk module.
//
// Handles:
//
// • Milk statistics
// • Daily statistics
// • Milk sales
// • Standing orders
// • Milk pricing
// • Milking history
// • Milking status
//
// DOES NOT HANDLE:
//
// • GET  /milk
// • POST /milk
// • GET  /milk/edit/:id
// • POST /milk/:id
//
// Those belong exclusively to:
//
//     controllers/milkCollectController.js
//
// IMPORTANT FARM CONTEXT RULE
// ----------------------------------------------------------
//
// Farm selection is NOT determined by this controller.
//
// The active farm is selected through:
//
//     /farm-context/switch
//
// and stored in the authenticated user's session.
//
// The farm-context middleware/controller exposes the active
// farm through:
//
//     req.farm
//     req.farmId
//
// The controller passes that selected farm to milkService.
//
// The controller does NOT calculate:
//
//     • farm production
//     • farm available milk
//     • farm sales
//     • farm revenue
//
// Those calculations belong to milkService.js.
//
// IMPORTANT
// ----------------------------------------------------------
//
// The controller NEVER does this:
//
//     farmTotals[0]
//
// to determine the active farm.
//
// The active farm comes from the farm-context system.
//
// ==========================================================


const mongoose =
    require("mongoose");


const milkService =
    require("../services/milkService");


// ==========================================================
// AUTHENTICATED USER
// ==========================================================
//
// Application normally uses:
//
//     req.session.user
//
// Some middleware may expose:
//
//     req.user
//
// Support both.
//
// ==========================================================

function getUser(
    req
) {

    return (
        req.session?.user ||
        req.user ||
        null
    );

}


// ==========================================================
// ACTIVE FARM ID
// ==========================================================
//
// The farm-context middleware should expose:
//
//     req.farmId
//
// The session also contains the active farm:
//
//     req.session.activeFarmId
//
// Support both.
//
// req.farmId is preferred because the middleware has already
// resolved and validated the active farm.
//
// ==========================================================

function getActiveFarmId(
    req
) {

    const farmId =
        req.farmId ||
        req.session?.activeFarmId ||
        req.session?.farmContext?.farmId ||
        null;


    if (
        !farmId
    ) {

        return null;

    }


    return String(
        farmId
    );

}


// ==========================================================
// ADMIN CHECK
// ==========================================================

function isAdmin(
    req
) {

    const user =
        getUser(req);


    return Boolean(
        user &&
        user.role === "admin"
    );

}


// ==========================================================
// OBJECT ID VALIDATION
// ==========================================================

function isValidObjectId(
    value
) {

    return mongoose.Types.ObjectId.isValid(
        value
    );

}


// ==========================================================
// REQUIRE ACTIVE FARM
// ==========================================================
//
// The controller requires an active farm for operations that
// are farm-scoped.
//
// The controller does NOT verify whether the user owns the
// farm.
//
// That authorization belongs to the farm-context layer and
// milkService.
//
// ==========================================================

function requireActiveFarm(
    req
) {

    const farmId =
        getActiveFarmId(req);


    if (
        !farmId
    ) {

        const error =
            new Error(
                "A dairy farm must be selected."
            );


        error.code =
            "MILK_FARM_REQUIRED";


        throw error;

    }


    if (
        !isValidObjectId(
            farmId
        )
    ) {

        const error =
            new Error(
                "Invalid active dairy farm."
            );


        error.code =
            "MILK_FARM_ACCESS_DENIED";


        throw error;

    }


    return farmId;

}


// ==========================================================
// ERROR RESPONSE
// ==========================================================

function sendError(
    res,
    error,
    fallback
) {

    console.error(
        error
    );


    // ======================================================
    // BUSINESS ERRORS
    // ======================================================

    const businessErrors = [

        "MILK_USER_REQUIRED",

        "MILK_ADMIN_REQUIRED",

        "MILK_FARM_REQUIRED",

        "MILK_FARM_ACCESS_DENIED",

        "MILK_INVALID_ANIMAL",

        "MILK_NO_RECORDS",

        "MILK_TIME_CLOSED",

        "MILK_INVALID_QUANTITY",

        "MILK_DUPLICATE_RECORD",

        "MILK_ALREADY_RECORDED",

        "MILK_SAVE_FAILED",

        "MILK_NOT_FOUND",

        "MILK_INVALID_DAY",

        "MILK_INVALID_MONTH",

        "MILK_INVALID_PRICE",

        "MILK_INVALID_CUSTOMER",

        "MILK_INSUFFICIENT",

        "MILK_DAY_LOCKED",

        "MILK_INVALID_ORDER",

        "MILK_ORDER_NOT_FOUND",

        "MILK_ORDER_INACTIVE",

        "MILK_ORDER_NOT_ACTIVE",

        "MILK_ORDER_ALREADY_PROCESSED",

        "MILK_SUMMARY_NOT_FOUND"

    ];


    if (
        error?.code &&
        businessErrors.includes(
            error.code
        )
    ) {

        return res
            .status(400)
            .send(
                error.message ||
                fallback ||
                "Unable to complete the request."
            );

    }


    return res
        .status(500)
        .send(
            error?.message ||
            fallback ||
            "An error occurred."
        );

}


// ==========================================================
// GET MILK STATISTICS
// ==========================================================
//
// GET /stats
//
// Supported:
//
// /stats
//
// /stats?type=day&date=2026-08-13
//
// /stats?type=month&month=2026-08
//
// IMPORTANT
// ----------------------------------------------------------
//
// Statistics are calculated for the ACTIVE FARM.
//
// The controller passes:
//
//     user
//     farmId
//
// to milkService.
//
// ==========================================================

exports.getMilkStats =
async function(
    req,
    res
) {

    try {

        // ==================================================
        // AUTHENTICATION
        // ==================================================

        const user =
            getUser(req);


        if (!user) {

            return res.redirect(
                "/login"
            );

        }


        // ==================================================
        // ACTIVE FARM
        // ==================================================

        const farmId =
            requireActiveFarm(req);


        // ==================================================
        // TYPE
        // ==================================================

        const type =
            req.query?.type ||
            "day";


        // ==================================================
        // DAILY STATISTICS
        // ==================================================

        if (
            type === "day"
        ) {

            const kenyaParts =
                milkService.getKenyaDateParts();


            const selectedDate =
                req.query?.date ||
                kenyaParts.date;


            const data =
                await milkService.getDailyStats({

                    day:
                        selectedDate,

                    farmId,

                    user

                });


            return res.render(
                "milkStats",
                {

                    type:
                        "day",

                    date:
                        selectedDate,

                    month:
                        "",

                    records:
                        Array.isArray(
                            data?.records
                        )
                            ? data.records
                            : [],

                    stats:
                        data?.stats ||
                        {},

                    sales:
                        Array.isArray(
                            data?.sales
                        )
                            ? data.sales
                            : [],

                    farmTotals:
                        Array.isArray(
                            data?.farmTotals
                        )
                            ? data.farmTotals
                            : [],

                    activeFarm:
                        data?.activeFarm ||
                        req.farm ||
                        null,

                    farmId,

                    user

                }
            );

        }


        // ==================================================
        // MONTHLY STATISTICS
        // ==================================================

        if (
            type === "month"
        ) {

            const kenyaParts =
                milkService.getKenyaDateParts();


            const selectedMonth =
                req.query?.month ||
                kenyaParts.monthKey;


            const data =
                await milkService.getMonthlyStats({

                    month:
                        selectedMonth,

                    farmId,

                    user

                });


            return res.render(
                "milkStats",
                {

                    type:
                        "month",

                    date:
                        "",

                    month:
                        selectedMonth,

                    records:
                        Array.isArray(
                            data?.records
                        )
                            ? data.records
                            : [],

                    stats:
                        data?.stats ||
                        {},

                    sales:
                        Array.isArray(
                            data?.sales
                        )
                            ? data.sales
                            : [],

                    farmTotals:
                        Array.isArray(
                            data?.farmTotals
                        )
                            ? data.farmTotals
                            : [],

                    activeFarm:
                        data?.activeFarm ||
                        req.farm ||
                        null,

                    farmId,

                    user

                }
            );

        }


        // ==================================================
        // INVALID TYPE
        // ==================================================

        return res.status(
            400
        ).render(
            "milkStats",
            {

                type:
                    "",

                date:
                    "",

                month:
                    "",

                records:
                    [],

                stats: {

                    total:
                        0,

                    production:
                        0,

                    consumed:
                        0,

                    sold:
                        0,

                    available:
                        0,

                    price:
                        0,

                    cash:
                        0,

                    revenue:
                        0,

                    locked:
                        false,

                    avg:
                        0

                },

                sales:
                    [],

                farmTotals:
                    [],

                activeFarm:
                    req.farm ||
                    null,

                farmId,

                user

            }
        );

    }

    catch (error) {

        return sendError(
            res,
            error,
            "Unable to load milk statistics."
        );

    }

};


// ==========================================================
// SAVE DAILY STATISTICS
// ==========================================================
//
// POST /stats/day
//
// ADMIN ONLY.
//
// The active farm is passed to the service.
//
// ==========================================================

exports.saveDailyStats =
async function(
    req,
    res
) {

    try {

        const user =
            getUser(req);


        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (!user) {

            return res.redirect(
                "/login"
            );

        }


        // ==================================================
        // ADMIN ONLY
        // ==================================================

        if (
            user.role !== "admin"
        ) {

            return res.status(
                403
            ).send(
                "Only administrators can save daily statistics."
            );

        }


        // ==================================================
        // ACTIVE FARM
        // ==================================================

        const farmId =
            requireActiveFarm(req);


        // ==================================================
        // REQUEST DATA
        // ==================================================

        const day =
            req.body?.day;


        const price =
            req.body?.price;


        if (!day) {

            throw new Error(
                "Day is required."
            );

        }


        // ==================================================
        // SAVE
        // ==================================================

        await milkService.saveDailyStats({

            day,

            price,

            farmId,

            user

        });


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.redirect(
            `/stats?type=day&date=${encodeURIComponent(day)}`
        );

    }

    catch (error) {

        return sendError(
            res,
            error,
            "Unable to save daily statistics."
        );

    }

};


// ==========================================================
// GET SALES PAGE
// ==========================================================
//
// GET /sales
//
// IMPORTANT
// ----------------------------------------------------------
//
// getSalesPageData receives:
//
//     farmId
//     user
//
// The service determines:
//
//     • farm production
//     • farm total production
//     • farm milk available
//     • farm milk sold
//     • farm revenue
//
// The controller simply passes the result to sales.ejs.
//
// ==========================================================

exports.getSalesPage =
async function(
    req,
    res
) {

    try {

        const user =
            getUser(req);


        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (!user) {

            return res.redirect(
                "/login"
            );

        }


        // ==================================================
        // ACTIVE FARM
        // ==================================================

        const farmId =
            requireActiveFarm(req);


        // ==================================================
        // PAGE DATA
        // ==================================================

        const data =
            await milkService.getSalesPageData({

                farmId,

                user

            });


        // ==================================================
        // FARM TOTALS
        // ==================================================

        const farmTotals =
            Array.isArray(
                data?.farmTotals
            )
                ? data.farmTotals
                : [];


        // ==================================================
        // RENDER
        // ==================================================

        return res.render(
            "sales",
            {

                standingOrders:
                    Array.isArray(
                        data?.standingOrders
                    )
                        ? data.standingOrders
                        : [],

                manualSales:
                    Array.isArray(
                        data?.manualSales
                    )
                        ? data.manualSales
                        : [],

                farmTotals,

                selectedFarmId:
                    farmId,

                activeFarm:
                    data?.activeFarm ||
                    req.farm ||
                    null,

                currentPrice:
                    Number(
                        data?.currentPrice ?? 50
                    ),

                totalSales:
                    Number(
                        data?.totalSales || 0
                    ),

                totalProduction:
                    Number(
                        data?.totalProduction || 0
                    ),

                totalRevenue:
                    Number(
                        data?.totalRevenue || 0
                    ),

                availableMilk:
                    Number(
                        data?.availableMilk || 0
                    ),

                farmId,

                user

            }
        );

    }

    catch (error) {

        return sendError(
            res,
            error,
            "Unable to load sales page."
        );

    }

};


// ==========================================================
// SUBMIT MANUAL SALE
// ==========================================================
//
// POST /sales/manual
//
// The farm comes from the ACTIVE FARM CONTEXT.
//
// A submitted farmId is deliberately NOT trusted.
//
// ==========================================================

exports.submitManualSale =
async function(
    req,
    res
) {

    try {

        const user =
            getUser(req);


        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (!user) {

            return res.redirect(
                "/login"
            );

        }


        // ==================================================
        // ACTIVE FARM
        // ==================================================

        const farmId =
            requireActiveFarm(req);


        // ==================================================
        // CUSTOMER
        // ==================================================

        const customerName =
            typeof req.body?.customerName === "string"

                ? req.body.customerName.trim()

                : "";


        if (!customerName) {

            throw new Error(
                "Customer name is required."
            );

        }


        // ==================================================
        // LITERS
        // ==================================================

        const rawLiters =
            req.body?.liters;


        if (
            rawLiters === undefined ||
            rawLiters === null ||
            rawLiters === ""
        ) {

            throw new Error(
                "Liters are required."
            );

        }


        const liters =
            Number(
                rawLiters
            );


        if (
            !Number.isFinite(
                liters
            ) ||
            liters <= 0
        ) {

            throw new Error(
                "Liters must be a valid number greater than zero."
            );

        }


        // ==================================================
        // SAVE FARM-SCOPED SALE
        // ==================================================

        await milkService.submitManualSale({

            farmId,

            customerName,

            liters,

            user

        });


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.redirect(
            `/sales?success=${encodeURIComponent(
                "Sale recorded successfully."
            )}`
        );

    }

    catch (error) {

        return sendError(
            res,
            error,
            "Unable to save manual sale."
        );

    }

};


// ==========================================================
// SUBMIT STANDING ORDER SALE
// ==========================================================
//
// POST /sales/standing-order
//
// Required:
//
//     standingOrderId
//
// Farm:
//
//     ACTIVE FARM CONTEXT
//
// ==========================================================

exports.submitStandingOrderSale =
async function(
    req,
    res
) {

    try {

        const user =
            getUser(req);


        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (!user) {

            return res.redirect(
                "/login"
            );

        }


        // ==================================================
        // ACTIVE FARM
        // ==================================================

        const farmId =
            requireActiveFarm(req);


        // ==================================================
        // STANDING ORDER
        // ==================================================

        const standingOrderId =
            req.body?.standingOrderId;


        if (!standingOrderId) {

            throw new Error(
                "Standing order was not specified."
            );

        }


        if (
            !isValidObjectId(
                standingOrderId
            )
        ) {

            throw new Error(
                "Invalid standing order."
            );

        }


        // ==================================================
        // SAVE FARM-SCOPED SALE
        // ==================================================

        await milkService.submitStandingOrderSale({

            farmId,

            standingOrderId,

            user

        });


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.redirect(
            `/sales?success=${encodeURIComponent(
                "Standing order sale recorded."
            )}`
        );

    }

    catch (error) {

        return sendError(
            res,
            error,
            "Unable to save standing order sale."
        );

    }

};


// ==========================================================
// UPDATE MILK PRICE
// ==========================================================
//
// POST /sales/price
//
// ADMIN ONLY.
//
// Price is global unless milkService explicitly scopes the
// price to a farm.
//
// ==========================================================

exports.updateMilkPrice =
async function(
    req,
    res
) {

    try {

        const user =
            getUser(req);


        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (!user) {

            return res.redirect(
                "/login"
            );

        }


        // ==================================================
        // ADMIN ONLY
        // ==================================================

        if (
            user.role !== "admin"
        ) {

            return res.status(
                403
            ).send(
                "Only administrators can update the milk price."
            );

        }


        // ==================================================
        // ACTIVE FARM
        // ==================================================

        const farmId =
            requireActiveFarm(req);


        // ==================================================
        // PRICE
        // ==================================================

        const rawPrice =
            req.body?.price;


        const price =
            Number(
                rawPrice
            );


        if (
            !Number.isFinite(price) ||
            price < 0
        ) {

            throw new Error(
                "Milk price must be a valid number."
            );

        }


        // ==================================================
        // UPDATE
        // ==================================================

        await milkService.updateMilkPrice({

            price,

            farmId,

            user

        });


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.redirect(
            `/sales?success=${encodeURIComponent(
                "Milk price updated successfully."
            )}`
        );

    }

    catch (error) {

        return sendError(
            res,
            error,
            "Unable to update milk price."
        );

    }

};


// ==========================================================
// ADD STANDING ORDER
// ==========================================================
//
// POST /sales/standing-order/add
//
// IMPORTANT
// ----------------------------------------------------------
//
// Standing orders are created inside the active farm context.
//
// ==========================================================

exports.addStandingOrder =
async function(
    req,
    res
) {

    try {

        const user =
            getUser(req);


        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (!user) {

            return res.redirect(
                "/login"
            );

        }


        // ==================================================
        // ACTIVE FARM
        // ==================================================

        const farmId =
            requireActiveFarm(req);


        // ==================================================
        // CUSTOMER
        // ==================================================

        const customerName =
            typeof req.body?.customerName === "string"

                ? req.body.customerName.trim()

                : "";


        if (!customerName) {

            throw new Error(
                "Customer name is required."
            );

        }


        // ==================================================
        // LITERS
        // ==================================================

        const liters =
            Number(
                req.body?.liters
            );


        if (
            !Number.isFinite(liters) ||
            liters <= 0
        ) {

            throw new Error(
                "Liters must be a valid number greater than zero."
            );

        }


        // ==================================================
        // CREATE ORDER
        // ==================================================

        await milkService.addStandingOrder({

            customerName,

            liters,

            farmId,

            user

        });


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.redirect(
            `/sales?success=${encodeURIComponent(
                "Standing order added successfully."
            )}`
        );

    }

    catch (error) {

        return sendError(
            res,
            error,
            "Unable to add standing order."
        );

    }

};


// ==========================================================
// OMIT STANDING ORDER
// ==========================================================
//
// POST /sales/standing-order/omit
//
// ==========================================================

exports.omitStandingOrder =
async function(
    req,
    res
) {

    try {

        const user =
            getUser(req);


        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (!user) {

            return res.redirect(
                "/login"
            );

        }


        // ==================================================
        // ACTIVE FARM
        // ==================================================

        const farmId =
            requireActiveFarm(req);


        // ==================================================
        // ORDER ID
        // ==================================================

        const id =
            req.body?.id;


        if (!id) {

            throw new Error(
                "Standing order was not specified."
            );

        }


        if (
            !isValidObjectId(id)
        ) {

            throw new Error(
                "Invalid standing order."
            );

        }


        // ==================================================
        // OMIT
        // ==================================================

        await milkService.omitStandingOrder({

            orderId:
                id,

            farmId,

            user

        });


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.redirect(
            `/sales?success=${encodeURIComponent(
                "Standing order omitted."
            )}`
        );

    }

    catch (error) {

        return sendError(
            res,
            error,
            "Unable to omit standing order."
        );

    }

};


// ==========================================================
// GET MILKING HISTORY
// ==========================================================
//
// GET:
//
//     /milk/history/:dairyId
//
// IMPORTANT
// ----------------------------------------------------------
//
// Historical milk records belong to the female animal.
//
// History must NOT depend on:
//
//     • isMilking
//     • current milking status
//
// The active farm is passed to the service where required.
//
// ==========================================================

exports.getMilkingHistory =
async function(
    req,
    res
) {

    try {

        // ==================================================
        // AUTHENTICATION
        // ==================================================

        const user =
            getUser(req);


        if (!user) {

            return res.redirect(
                "/login"
            );

        }


        // ==================================================
        // DAIRY ID
        // ==================================================

        const dairyId =
            req.params?.dairyId;


        if (!dairyId) {

            return res.status(
                400
            ).send(
                "Dairy animal was not specified."
            );

        }


        if (
            !isValidObjectId(
                dairyId
            )
        ) {

            return res.status(
                400
            ).send(
                "Invalid dairy animal."
            );

        }


        // ==================================================
        // MONTH
        // ==================================================

        const month =
            typeof req.query?.month === "string"

                ? req.query.month.trim()

                : "";


        // ==================================================
        // ACTIVE FARM
        // ==================================================

        const farmId =
            getActiveFarmId(req);


        // ==================================================
        // HISTORY
        // ==================================================

        const data =
            await milkService.getMilkingHistory({

                dairyId,

                month,

                farmId,

                user

            });


        // ==================================================
        // RENDER
        // ==================================================

        return res.render(
            "milkingHistory",
            {

                dairy:
                    data?.dairy ||
                    null,

                records:
                    Array.isArray(
                        data?.records
                    )
                        ? data.records
                        : [],

                grouped:
                    data?.grouped ||
                    {},

                monthlyTotal:
                    Number(
                        data?.monthlyTotal || 0
                    ),

                hasData:
                    Boolean(
                        data?.hasData
                    ),

                selectedMonth:
                    month,

                activeFarm:
                    data?.activeFarm ||
                    req.farm ||
                    null,

                farmId,

                user

            }
        );

    }

    catch (error) {

        console.error(
            "GET MILKING HISTORY ERROR:",
            error
        );


        return sendError(
            res,
            error,
            "Unable to load milking history."
        );

    }

};


// ==========================================================
// TOGGLE MILKING STATUS
// ==========================================================
//
// POST /milk/history/:id/status
//
// ADMIN ONLY.
//
// This changes ONLY the current `isMilking` status.
//
// It does NOT determine whether the animal can:
//
//     • have milk records
//     • have milk history
//     • be included in historical production
//
// ==========================================================

exports.toggleMilkingStatus =
async function(
    req,
    res
) {

    try {

        const user =
            getUser(req);


        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (!user) {

            return res.redirect(
                "/login"
            );

        }


        // ==================================================
        // ADMIN ONLY
        // ==================================================

        if (
            user.role !== "admin"
        ) {

            return res.status(
                403
            ).send(
                "Only administrators can change milking status."
            );

        }


        // ==================================================
        // DAIRY ID
        // ==================================================

        const id =
            req.params?.id;


        if (!id) {

            throw new Error(
                "Dairy animal was not specified."
            );

        }


        if (
            !isValidObjectId(id)
        ) {

            throw new Error(
                "Invalid dairy animal."
            );

        }


        // ==================================================
        // ACTIVE FARM
        // ==================================================

        const farmId =
            getActiveFarmId(req);


        // ==================================================
        // TOGGLE
        // ==================================================

        await milkService.toggleMilkingStatus({

            dairyId:
                id,

            farmId,

            user

        });


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.redirect(
            `/milk/history/${encodeURIComponent(id)}`
        );

    }

    catch (error) {

        return sendError(
            res,
            error,
            "Unable to change milking status."
        );

    }

};


// ==========================================================
// LOCK DAILY SUMMARY
// ==========================================================
//
// POST /stats/day/lock
//
// ADMIN ONLY.
//
// ==========================================================

exports.lockDay =
async function(
    req,
    res
) {

    try {

        const user =
            getUser(req);


        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (!user) {

            return res.redirect(
                "/login"
            );

        }


        // ==================================================
        // ADMIN ONLY
        // ==================================================

        if (
            user.role !== "admin"
        ) {

            return res.status(
                403
            ).send(
                "Only administrators can lock daily summaries."
            );

        }


        // ==================================================
        // ACTIVE FARM
        // ==================================================

        const farmId =
            requireActiveFarm(req);


        // ==================================================
        // DAY
        // ==================================================

        const day =
            req.body?.day;


        if (!day) {

            throw new Error(
                "Day is required."
            );

        }


        // ==================================================
        // LOCK
        // ==================================================

        await milkService.lockDay({

            day,

            farmId,

            user

        });


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.redirect(
            `/stats?type=day&date=${encodeURIComponent(day)}`
        );

    }

    catch (error) {

        return sendError(
            res,
            error,
            "Unable to lock daily summary."
        );

    }

};


// ==========================================================
// UNLOCK DAILY SUMMARY
// ==========================================================
//
// POST /stats/day/unlock
//
// ADMIN ONLY.
//
// ==========================================================

exports.unlockDay =
async function(
    req,
    res
) {

    try {

        const user =
            getUser(req);


        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (!user) {

            return res.redirect(
                "/login"
            );

        }


        // ==================================================
        // ADMIN ONLY
        // ==================================================

        if (
            user.role !== "admin"
        ) {

            return res.status(
                403
            ).send(
                "Only administrators can unlock daily summaries."
            );

        }


        // ==================================================
        // ACTIVE FARM
        // ==================================================

        const farmId =
            requireActiveFarm(req);


        // ==================================================
        // DAY
        // ==================================================

        const day =
            req.body?.day;


        if (!day) {

            throw new Error(
                "Day is required."
            );

        }


        // ==================================================
        // UNLOCK
        // ==================================================

        await milkService.unlockDay({

            day,

            farmId,

            user

        });


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.redirect(
            `/stats?type=day&date=${encodeURIComponent(day)}`
        );

    }

    catch (error) {

        return sendError(
            res,
            error,
            "Unable to unlock daily summary."
        );

    }

};


// ==========================================================
// CONTROLLER EXPORT SUMMARY
// ==========================================================
//
// The following functions belong here:
//
//     getMilkStats
//     saveDailyStats
//
//     getSalesPage
//     submitManualSale
//     submitStandingOrderSale
//     updateMilkPrice
//
//     addStandingOrder
//     omitStandingOrder
//
//     getMilkingHistory
//     toggleMilkingStatus
//
//     lockDay
//     unlockDay
//
// ----------------------------------------------------------
//
// The following functions DO NOT belong here:
//
//     getMilkPage
//     submitMilk
//     getEditMilk
//     updateMilkRecord
//
// Those belong to:
//
//     controllers/milkCollectController.js
//
// ==========================================================