// ==========================================================
// controllers/milkController.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Controller layer for:
//
// • Milk collection
// • Morning / evening sessions
// • Milk record creation
// • Milk record editing
// • Milk statistics
// • Daily summary locking
// • Milking history
// • Milking status
//
// SALES
// ----------------------------------------------------------
// Sales page and sales actions have been moved out of this
// controller.
//
// Sales-specific controller responsibilities now belong in:
//
//     controllers/salesController.js
//
// This controller must NOT contain:
//
// • GET /sales
// • POST /sales/price
// • POST /sales/manual
// • POST /sales/standing
// • POST /sales/standing/submit
// • POST /sales/standing/omit
//
// IMPORTANT
// ----------------------------------------------------------
// This controller does NOT define or modify routes.
//
// Existing routes remain responsible for deciding which
// controller method is called.
//
// ==========================================================


const milkService =
    require("../services/milkService");


// ==========================================================
// SMALL HELPERS
// ==========================================================


/**
 * Safely convert a value to a number.
 */
function toNumber(
    value,
    fallback = 0
) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;

}


/**
 * Safely normalize an ID.
 */
function normalizeId(
    value
) {

    if (
        value === undefined ||
        value === null
    ) {

        return null;

    }


    const id =
        String(value).trim();


    return id
        ? id
        : null;

}


/**
 * Safely obtain the logged-in user's ID.
 */
function getUserId(
    user
) {

    return normalizeId(
        user?._id
    );

}


/**
 * Determine whether the user is an administrator.
 */
function isAdminUser(
    user
) {

    return user?.role === "admin";

}


// ==========================================================
// GET MILK PAGE
// ==========================================================

exports.getMilkPage = async (
    req,
    res
) => {

    try {

        const data =
            await milkService.getMilkPageData();


        const currentSession =
            data?.session ||
            "closed";


        const isAdmin =
            isAdminUser(
                req.user
            );


        return res.render(
            "milk",
            {

                // --------------------------------------------------
                // ANIMALS
                // --------------------------------------------------

                dairies:
                    Array.isArray(
                        data?.dairies
                    )
                        ? data.dairies
                        : [],


                // --------------------------------------------------
                // FARMS
                // --------------------------------------------------

                farms:
                    Array.isArray(
                        data?.farms
                    )
                        ? data.farms
                        : [],


                // --------------------------------------------------
                // MILK RECORDS
                // --------------------------------------------------

                milkRecords:
                    Array.isArray(
                        data?.milkRecords
                    )
                        ? data.milkRecords
                        : [],


                morningRecords:
                    Array.isArray(
                        data?.morningRecords
                    )
                        ? data.morningRecords
                        : [],


                eveningRecords:
                    Array.isArray(
                        data?.eveningRecords
                    )
                        ? data.eveningRecords
                        : [],


                // --------------------------------------------------
                // SESSION
                // --------------------------------------------------

                session:
                    currentSession,

                sessionInfo:
                    data?.sessionInfo ||
                    null,


                // --------------------------------------------------
                // PERMISSIONS
                // --------------------------------------------------

                canSubmit:
                    Boolean(
                        data?.canSubmit
                    ),

                canEditMorning:
                    Boolean(
                        data?.canEditMorning
                    ),

                canEditEvening:
                    Boolean(
                        data?.canEditEvening
                    ),

                isAdmin,


                // --------------------------------------------------
                // USER
                // --------------------------------------------------

                user:
                    req.user,


                // --------------------------------------------------
                // FLASH
                // --------------------------------------------------

                success:
                    req.query.success === "1",

                error:
                    req.query.error ||
                    "",

                edit:
                    req.query.edit ||
                    ""

            }
        );

    } catch (err) {

        console.error(
            "Milk page error:",
            err
        );


        return res
            .status(500)
            .render(
                "milk",
                {

                    dairies: [],

                    farms: [],

                    milkRecords: [],

                    morningRecords: [],

                    eveningRecords: [],

                    session:
                        "closed",

                    sessionInfo:
                        null,

                    canSubmit:
                        false,

                    canEditMorning:
                        false,

                    canEditEvening:
                        false,

                    isAdmin:
                        isAdminUser(
                            req.user
                        ),

                    user:
                        req.user,

                    success:
                        false,

                    error:
                        "Error loading milk collection page.",

                    edit:
                        ""

                }
            );

    }

};


// ==========================================================
// SUBMIT MILK
// ==========================================================

exports.submitMilk = async (
    req,
    res
) => {

    try {

        if (
            !getUserId(
                req.user
            )
        ) {

            throw new Error(
                "You must be logged in to record milk."
            );

        }


        let records =
            req.body.records;


        // --------------------------------------------------
        // SUPPORT A SINGLE RECORD
        // --------------------------------------------------

        if (
            !records &&
            req.body.dairy
        ) {

            records = [

                {

                    dairy:
                        req.body.dairy,

                    liters:
                        req.body.liters,

                    remarks:
                        req.body.remarks ||
                        ""

                }

            ];

        }


        if (!records) {

            throw new Error(
                "No milk records were submitted."
            );

        }


        if (
            !Array.isArray(records)
        ) {

            records = [
                records
            ];

        }


        if (
            !records.length
        ) {

            throw new Error(
                "No milk records were submitted."
            );

        }


        const saved =
            await milkService.saveMilkRecords(
                records,
                req.user
            );


        if (
            !Array.isArray(saved) ||
            !saved.length
        ) {

            throw new Error(
                "The milk records could not be saved."
            );

        }


        return res.redirect(
            "/milk?success=1"
        );

    } catch (err) {

        console.error(
            "Submit milk error:",
            err
        );


        return res.redirect(
            "/milk?error=" +
            encodeURIComponent(
                err.message ||
                "Unable to save milk record."
            )
        );

    }

};


// ==========================================================
// GET EDIT MILK
// ==========================================================

exports.getEditMilk = async (
    req,
    res
) => {

    try {

        const {
            id
        } = req.params;


        if (!id) {

            return res.redirect(
                "/milk?error=" +
                encodeURIComponent(
                    "Milk record was not specified."
                )
            );

        }


        if (
            !isAdminUser(
                req.user
            )
        ) {

            return res.redirect(
                "/milk?error=" +
                encodeURIComponent(
                    "Only administrators can edit milk records."
                )
            );

        }


        return res.redirect(
            "/milk?edit=" +
            encodeURIComponent(
                id
            )
        );

    } catch (err) {

        console.error(
            "Get edit milk error:",
            err
        );


        return res.redirect(
            "/milk?error=" +
            encodeURIComponent(
                err.message ||
                "Unable to open milk record."
            )
        );

    }

};


// ==========================================================
// UPDATE MILK RECORD
// ==========================================================

exports.updateMilkRecord = async (
    req,
    res
) => {

    try {

        if (
            !isAdminUser(
                req.user
            )
        ) {

            return res.redirect(
                "/milk?error=" +
                encodeURIComponent(
                    "Only administrators can edit milk records."
                )
            );

        }


        const {
            id
        } = req.params;


        if (!id) {

            throw new Error(
                "Milk record ID is missing."
            );

        }


        if (
            req.body.liters === undefined ||
            req.body.liters === null ||
            req.body.liters === ""
        ) {

            throw new Error(
                "Milk quantity is required."
            );

        }


        const liters =
            Number(
                req.body.liters
            );


        if (
            !Number.isFinite(liters) ||
            liters < 0
        ) {

            throw new Error(
                "Milk quantity must be a valid number."
            );

        }


        const remarks =
            typeof req.body.remarks === "string"
                ? req.body.remarks.trim()
                : "";


        const updated =
            await milkService.editMilkRecord({

                recordId:
                    id,

                liters,

                remarks,

                user:
                    req.user

            });


        if (!updated) {

            throw new Error(
                "Milk record could not be updated."
            );

        }


        return res.redirect(
            "/milk?success=1"
        );

    } catch (err) {

        console.error(
            "Update milk record error:",
            err
        );


        return res.redirect(
            "/milk?error=" +
            encodeURIComponent(
                err.message ||
                "Unable to update milk record."
            )
        );

    }

};


// ==========================================================
// GET MILK STATISTICS
// ==========================================================
//
// ROUTE:
//
// GET /stats
//
// NOT:
//
// /milkStats
//
// ==========================================================

exports.getMilkStats = async (
    req,
    res
) => {

    try {

        const {
            type = "day",
            date,
            month
        } = req.query;


        // ==================================================
        // DAILY
        // ==================================================

        if (type === "day") {

            const selectedDate =
                date ||
                milkService
                    .getKenyaDateParts()
                    .date;


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
                        data?.stats || {

                            total: 0,

                            consumed: 0,

                            available: 0,

                            price: 50,

                            cash: 0,

                            locked: false

                        },

                    sales:
                        Array.isArray(
                            data?.sales
                        )
                            ? data.sales
                            : [],

                    user:
                        req.user

                }
            );

        }


        // ==================================================
        // MONTHLY
        // ==================================================

        if (type === "month") {

            const selectedMonth =
                month ||
                milkService
                    .getKenyaDateParts()
                    .monthKey;


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
                        data?.stats || {

                            total: 0,

                            consumed: 0,

                            available: 0,

                            price: 50,

                            cash: 0,

                            locked: false,

                            avg: 0

                        },

                    sales:
                        Array.isArray(
                            data?.sales
                        )
                            ? data.sales
                            : [],

                    user:
                        req.user

                }
            );

        }


        // ==================================================
        // UNKNOWN TYPE
        // ==================================================

        return res.render(
            "milkStats",
            {

                type: "",

                date: "",

                month: "",

                records: [],

                stats: {

                    total: 0,

                    consumed: 0,

                    available: 0,

                    price: 50,

                    cash: 0,

                    locked: false,

                    avg: 0

                },

                sales: [],

                user:
                    req.user

            }
        );

    } catch (err) {

        console.error(
            "Milk stats error:",
            err
        );


        return res
            .status(500)
            .send(
                "Error loading milk statistics."
            );

    }

};


// ==========================================================
// SAVE DAILY STATS
// ==========================================================

exports.saveDailyStats = async (
    req,
    res
) => {

    try {

        const {
            day,
            price
        } = req.body;


        if (!day) {

            throw new Error(
                "Day is required."
            );

        }


        await milkService.saveDailyStats({

            day,

            price

        });


        return res.redirect(
            `/stats?type=day&date=${encodeURIComponent(day)}`
        );

    } catch (err) {

        console.error(
            "Save daily stats error:",
            err
        );


        return res
            .status(500)
            .send(
                err.message ||
                "Unable to save daily statistics."
            );

    }

};


// ==========================================================
// MILKING HISTORY
// ==========================================================
//
// ROUTE:
//
// GET /milk/history/:dairyId
//
// ==========================================================

exports.getMilkingHistory = async (
    req,
    res
) => {

    try {

        const {
            dairyId
        } = req.params;


        const {
            month
        } = req.query;


        if (!dairyId) {

            throw new Error(
                "Dairy animal ID is required."
            );

        }


        const data =
            await milkService.getMilkingHistory({

                dairyId,

                month

            });


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
                    toNumber(
                        data?.monthlyTotal,
                        0
                    ),

                hasData:
                    Boolean(
                        data?.hasData
                    ),

                selectedMonth:
                    month ||
                    "",

                user:
                    req.user

            }
        );

    } catch (err) {

        console.error(
            "Milking history error:",
            err
        );


        return res
            .status(500)
            .send(
                err.message ||
                "Unable to load milking history."
            );

    }

};


// ==========================================================
// TOGGLE MILKING STATUS
// ADMIN ONLY
// ==========================================================

exports.toggleMilkingStatus = async (
    req,
    res
) => {

    try {

        const {
            id
        } = req.params;


        if (
            !isAdminUser(
                req.user
            )
        ) {

            return res
                .status(403)
                .send(
                    "Only administrators can change milking status."
                );

        }


        if (!id) {

            throw new Error(
                "Dairy animal ID is required."
            );

        }


        await milkService.toggleMilkingStatus({

            dairyId:
                id,

            user:
                req.user

        });


        return res.redirect(
            `/milk/history/${encodeURIComponent(id)}`
        );

    } catch (err) {

        console.error(
            "Toggle milking status error:",
            err
        );


        return res
            .status(500)
            .send(
                err.message ||
                "Unable to change milking status."
            );

    }

};


// ==========================================================
// LOCK DAILY SUMMARY
// ADMIN ONLY
// ==========================================================

exports.lockDay = async (
    req,
    res
) => {

    try {

        if (
            !isAdminUser(
                req.user
            )
        ) {

            return res
                .status(403)
                .send(
                    "Only administrators can lock a daily summary."
                );

        }


        const {
            day
        } = req.body;


        if (!day) {

            throw new Error(
                "Day is required."
            );

        }


        await milkService.lockDay(
            day
        );


        return res.redirect(
            `/stats?type=day&date=${encodeURIComponent(day)}`
        );

    } catch (err) {

        console.error(
            "Lock day error:",
            err
        );


        return res
            .status(500)
            .send(
                err.message ||
                "Unable to lock daily summary."
            );

    }

};


// ==========================================================
// UNLOCK DAILY SUMMARY
// ADMIN ONLY
// ==========================================================

exports.unlockDay = async (
    req,
    res
) => {

    try {

        if (
            !isAdminUser(
                req.user
            )
        ) {

            return res
                .status(403)
                .send(
                    "Only administrators can unlock a daily summary."
                );

        }


        const {
            day
        } = req.body;


        if (!day) {

            throw new Error(
                "Day is required."
            );

        }


        await milkService.unlockDay(
            day
        );


        return res.redirect(
            `/stats?type=day&date=${encodeURIComponent(day)}`
        );

    } catch (err) {

        console.error(
            "Unlock day error:",
            err
        );


        return res
            .status(500)
            .send(
                err.message ||
                "Unable to unlock daily summary."
            );

    }

};


// ==========================================================
// SESSION HELPERS
// ==========================================================
//
// These remain exported so existing routes/controllers can
// continue using the service-level session helpers.
// ==========================================================

exports.getMilkSession =
    milkService.getMilkSession;


exports.getKenyaDateParts =
    milkService.getKenyaDateParts;


exports.getSessionDeadline =
    milkService.getSessionDeadline;


exports.canSubmitSession =
    milkService.canSubmitSession;


exports.canAdminEditRecord =
    milkService.canAdminEditRecord;


// ==========================================================
// END OF milkController.js
// ==========================================================