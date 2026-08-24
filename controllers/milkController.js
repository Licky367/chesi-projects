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
// IMPORTANT FARM PRODUCTION RULE
// ----------------------------------------------------------
// Farm production and milk sales are FARM-SCOPED.
//
// The controller always passes the authenticated user to the
// milk service for operations that depend on farm ownership.
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
// ==========================================================


const mongoose =
    require("mongoose");


const milkService =
    require("../services/milkService");


// ==========================================================
// AUTHENTICATED USER
// ==========================================================
//
// The application uses:
//
//     req.session.user
//
// Some middleware may also expose:
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
    //
    // The service uses error.code for known business rules.
    //
    // Return a normal client error instead of turning a
    // business-rule failure into a generic 500.
    //
    // ======================================================

    const businessErrors = [

        "MILK_USER_REQUIRED",

        "MILK_ADMIN_REQUIRED",

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
// Statistics are requested in the context of the logged-in
// user.
//
// The service is responsible for determining the farms that
// belong to that user and calculating farm production.
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
                await milkService.getDailyStats(

                    selectedDate,

                    user

                );


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
                await milkService.getMonthlyStats(

                    selectedMonth,

                    user

                );


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

                    consumed:
                        0,

                    available:
                        0,

                    price:
                        0,

                    cash:
                        0,

                    locked:
                        false,

                    avg:
                        0

                },

                sales:
                    [],

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
// Farm-scoped statistics are handled by the service.
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
        //
        // Pass user into the service so the service can keep
        // the operation within the appropriate farm scope.
        //
        // ==================================================

        await milkService.saveDailyStats({

            day,

            price,

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
// IMPORTANT FARM RULE
// ----------------------------------------------------------
// The sales page belongs to the logged-in user's dairy farms.
//
// Therefore:
//
//     getSalesPageData(user)
//
// is mandatory.
//
// The service determines:
//
//     • farm production
//     • farm total production
//     • farm milk available
//     • farm milk sold
//     • farm revenue
//
// The controller simply passes the result to the view.
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
        // PAGE DATA
        // ==================================================
        //
        // IMPORTANT:
        //
        // User is passed into the service.
        //
        // The service MUST NOT calculate global milk totals
        // for this page.
        //
        // ==================================================

        const data =
            await milkService.getSalesPageData(
                user
            );


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

                currentPrice:
                    Number(
                        data?.currentPrice ?? 50
                    ),

                totalSales:
                    Number(
                        data?.totalSales || 0
                    ),

                availableMilk:
                    Number(
                        data?.availableMilk || 0
                    ),

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
// IMPORTANT FARM RULE
// ----------------------------------------------------------
// The service receives the logged-in user.
//
// It is responsible for determining the farm's:
//
//     production
//     sold quantity
//     available quantity
//
// and rejecting:
//
//     sale > farm available milk
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

            customerName,

            liters,

            user

        });


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.redirect(
            "/sales?success=Sale%20recorded%20successfully."
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
// IMPORTANT FARM RULE
// ----------------------------------------------------------
// The logged-in user is passed into the service.
//
// The service must:
//
//     1. Determine the user's farm.
//
//     2. Determine production for that farm.
//
//     3. Determine milk already sold by that farm.
//
//     4. Determine milk remaining for that farm.
//
//     5. Reject the sale if:
//
//            order liters > farm available milk
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

            standingOrderId,

            user

        });


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.redirect(
            "/sales?success=Standing%20order%20sale%20recorded."
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

        await milkService.updateMilkPrice(
            price
        );


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.redirect(
            "/sales?success=Milk%20price%20updated%20successfully."
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

            user

        });


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.redirect(
            "/sales?success=Standing%20order%20added%20successfully."
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

            user

        });


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.redirect(
            "/sales?success=Standing%20order%20omitted."
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
// ==========================================================
//
// IMPORTANT BUSINESS RULE
// ----------------------------------------------------------
//
// Milking history belongs to the FEMALE ANIMAL.
//
// It does NOT depend on:
//
//     • isMilking
//     • current milking status
//     • dairy-farm assignment
//     • dairy-worker assignment
//
// Therefore:
//
//     female + not currently milking
//
// MUST still be allowed to view historical milk records.
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
        // HISTORY
        // ==================================================
        //
        // The service performs the animal validation.
        //
        // In particular, history must NOT depend on:
        //
        //     isMilking
        //
        // ==================================================

        const data =
            await milkService.getMilkingHistory({

                dairyId,

                month,

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
// IMPORTANT:
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
        // TOGGLE
        // ==================================================

        await milkService.toggleMilkingStatus({

            dairyId:
                id,

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


        if (!user) {

            return res.redirect(
                "/login"
            );

        }


        if (
            user.role !== "admin"
        ) {

            return res.status(
                403
            ).send(
                "Only administrators can lock daily summaries."
            );

        }


        const day =
            req.body?.day;


        if (!day) {

            throw new Error(
                "Day is required."
            );

        }


        await milkService.lockDay(

            day,

            user

        );


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


        if (!user) {

            return res.redirect(
                "/login"
            );

        }


        if (
            user.role !== "admin"
        ) {

            return res.status(
                403
            ).send(
                "Only administrators can unlock daily summaries."
            );

        }


        const day =
            req.body?.day;


        if (!day) {

            throw new Error(
                "Day is required."
            );

        }


        await milkService.unlockDay(

            day,

            user

        );


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