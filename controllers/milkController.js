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
                    selectedDate
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
                    selectedMonth
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

        await milkService.saveDailyStats({

            day,

            price

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

        const data =
            await milkService.getSalesPageData();


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
            !Number.isFinite(liters) ||
            liters <= 0
        ) {

            throw new Error(
                "Liters must be a valid number greater than zero."
            );

        }


        // ==================================================
        // SAVE
        // ==================================================

        await milkService.submitManualSale({

            customerName,

            liters

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
        // STANDING ORDER ID
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
        // SAVE SALE
        // ==================================================

        await milkService.submitStandingOrderSale({

            standingOrderId

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
        // SAVE
        // ==================================================

        await milkService.addStandingOrder({

            customerName,

            liters

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
// GET /milk/history/:dairyId
//
// ==========================================================

exports.getMilkingHistory =
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
        // DAIRY ID
        // ==================================================

        const dairyId =
            req.params?.dairyId;


        if (!dairyId) {

            throw new Error(
                "Dairy animal was not specified."
            );

        }


        if (
            !isValidObjectId(dairyId)
        ) {

            throw new Error(
                "Invalid dairy animal."
            );

        }


        // ==================================================
        // MONTH
        // ==================================================

        const month =
            req.query?.month ||
            "";


        // ==================================================
        // HISTORY
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
// CONTROLLER EXPORT SUMMARY
// ==========================================================
//
// The following functions intentionally belong here:
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