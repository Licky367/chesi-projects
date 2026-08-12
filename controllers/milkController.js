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
// • Milk sales
// • Standing orders
// • Farm selection
// • Milk price management
// • Milking history
// • Milking status
//
// IMPORTANT
// ----------------------------------------------------------
// This controller does NOT define or modify routes.
//
// Existing routes remain responsible for deciding which
// controller method is called.
//
// SALES
// ----------------------------------------------------------
//
// GET
//      /sales
//
// ADMIN
//      /sales
//          -> all-farm overview
//
//      /sales?farmId=<FARM_ID>
//          -> selected farm
//
// WORKER
//      /sales
//          -> automatically assigned farm
//
// SALES ACTIONS
// ----------------------------------------------------------
//
// POST /sales/price
// POST /sales/manual
// POST /sales/standing
// POST /sales/standing/submit
// POST /sales/standing/omit
//
// STATISTICS
// ----------------------------------------------------------
//
// GET /stats
//
// NOT:
//      /milkStats
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
 * Normalize farm ID.
 */
function normalizeFarmId(
    value
) {

    return normalizeId(value);

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


/**
 * Build a redirect back to the sales page while
 * preserving the selected farm.
 *
 * Example:
 *
 * /sales?farmId=123&success=1
 *
 */
function salesRedirect(
    farmId,
    query = {}
) {

    const params =
        new URLSearchParams();


    const normalizedFarmId =
        normalizeFarmId(
            farmId
        );


    if (normalizedFarmId) {

        params.set(
            "farmId",
            normalizedFarmId
        );

    }


    Object.entries(
        query || {}
    ).forEach(
        ([key, value]) => {

            if (
                value !== undefined &&
                value !== null &&
                value !== ""
            ) {

                params.set(
                    key,
                    String(value)
                );

            }

        }
    );


    const queryString =
        params.toString();


    return queryString
        ? `/sales?${queryString}`
        : "/sales";

}


/**
 * Render the sales page with safe defaults.
 *
 * This prevents EJS from crashing if the service
 * fails or returns incomplete data.
 */
function renderSalesPage(
    res,
    {

        status = 200,

        user = null,

        isAdmin = false,

        farms = [],

        selectedFarm = null,

        selectedFarmId = null,

        canSell = false,

        standingOrders = [],

        manualSales = [],

        currentPrice = 50,

        availableMilk = 0,

        totalSales = 0,

        revenue = 0,

        allFarmAvailableMilk = 0,

        allFarmRevenue = 0,

        allFarmTotalSales = 0,

        success = false,

        error = ""

    } = {}
) {

    return res
        .status(status)
        .render(
            "sales",
            {

                // --------------------------------------------------
                // USER
                // --------------------------------------------------

                user,

                isAdmin,


                // --------------------------------------------------
                // FARM SELECTION
                // --------------------------------------------------

                farms,

                selectedFarm,

                selectedFarmId,


                // --------------------------------------------------
                // PERMISSIONS
                // --------------------------------------------------

                canSell,


                // --------------------------------------------------
                // STANDING ORDERS
                // --------------------------------------------------

                standingOrders,


                // --------------------------------------------------
                // MANUAL SALES
                // --------------------------------------------------

                manualSales,


                // --------------------------------------------------
                // PRICE
                // --------------------------------------------------

                currentPrice,


                // --------------------------------------------------
                // FARM TOTALS
                // --------------------------------------------------

                availableMilk,

                totalSales,

                revenue,


                // --------------------------------------------------
                // GLOBAL ADMIN TOTALS
                // --------------------------------------------------

                allFarmAvailableMilk,

                allFarmRevenue,

                allFarmTotalSales,


                // --------------------------------------------------
                // FLASH MESSAGES
                // --------------------------------------------------

                success,

                error

            }
        );

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
// GET SALES PAGE
// ==========================================================
//
// ADMIN
// ----------------------------------------------------------
//
// /sales
//      -> all farm overview
//
// /sales?farmId=<ID>
//      -> selected farm
//
// WORKER
// ----------------------------------------------------------
//
// /sales
//      -> automatically assigned farm
//
// ==========================================================

exports.getSalesPage = async (
    req,
    res
) => {

    try {

        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (
            !getUserId(
                req.user
            )
        ) {

            return res
                .status(401)
                .send(
                    "You must be logged in to access sales."
                );

        }


        const isAdmin =
            isAdminUser(
                req.user
            );


        // ==================================================
        // REQUESTED FARM
        // ==================================================

        const requestedFarmId =
            normalizeFarmId(
                req.query.farmId
            );


        // ==================================================
        // SERVICE
        // ==================================================

        const data =
            await milkService.getSalesPageData({

                user:
                    req.user,

                farmId:
                    requestedFarmId

            });


        // ==================================================
        // FARMS
        // ==================================================

        const farms =
            Array.isArray(
                data?.farms
            )
                ? data.farms
                : [];


        // ==================================================
        // SELECTED FARM ID
        // ==================================================
        //
        // Admin:
        //   Uses explicitly selected farm.
        //
        // Worker:
        //   Uses assigned farm supplied by service.
        //
        // ==================================================

        let selectedFarmId =
            null;


        if (isAdmin) {

            selectedFarmId =
                normalizeFarmId(
                    data?.selectedFarmId ||
                    requestedFarmId
                );

        } else {

            selectedFarmId =
                normalizeFarmId(
                    data?.selectedFarmId ||
                    data?.workerFarmId
                );

        }


        // ==================================================
        // SELECTED FARM
        // ==================================================

        const selectedFarm =
            data?.selectedFarm ||
            null;


        // ==================================================
        // CAN SELL
        // ==================================================
        //
        // Admin can sell only after selecting a farm.
        //
        // Worker can sell when the service has assigned
        // a farm.
        //
        // ==================================================

        const canSell =
            isAdmin
                ? Boolean(
                    selectedFarmId &&
                    selectedFarm
                )
                : Boolean(
                    selectedFarmId
                );


        // ==================================================
        // FARM VALUES
        // ==================================================

        const availableMilk =
            toNumber(
                data?.availableMilk,
                0
            );


        const totalSales =
            toNumber(
                data?.totalSales,
                0
            );


        const revenue =
            toNumber(
                data?.revenue,
                0
            );


        const currentPrice =
            Number.isFinite(
                Number(
                    data?.currentPrice
                )
            )
                ? Number(
                    data.currentPrice
                )
                : 50;


        // ==================================================
        // MANUAL SALES
        // ==================================================

        const manualSales =
            Array.isArray(
                data?.manualSales
            )
                ? data.manualSales
                : [];


        // ==================================================
        // STANDING ORDERS
        // ==================================================

        const standingOrders =
            Array.isArray(
                data?.standingOrders
            )
                ? data.standingOrders
                : [];


        // ==================================================
        // GLOBAL ADMIN TOTALS
        // ==================================================

        const allFarmAvailableMilk =
            toNumber(
                data?.allFarmAvailableMilk,
                0
            );


        const allFarmRevenue =
            toNumber(
                data?.allFarmRevenue,
                0
            );


        const allFarmTotalSales =
            toNumber(
                data?.allFarmTotalSales,
                0
            );


        // ==================================================
        // RENDER
        // ==================================================

        return renderSalesPage(
            res,
            {

                user:
                    req.user,

                isAdmin,

                farms,

                selectedFarm,

                selectedFarmId,

                canSell,

                standingOrders,

                manualSales,

                currentPrice,

                availableMilk,

                totalSales,

                revenue,

                allFarmAvailableMilk,

                allFarmRevenue,

                allFarmTotalSales,

                success:
                    req.query.success === "1",

                error:
                    req.query.error ||
                    ""

            }
        );

    } catch (err) {

        console.error(
            "Sales page error:",
            err
        );


        return renderSalesPage(
            res,
            {

                status:
                    500,

                user:
                    req.user,

                isAdmin:
                    isAdminUser(
                        req.user
                    ),

                farms: [],

                selectedFarm:
                    null,

                selectedFarmId:
                    null,

                canSell:
                    false,

                standingOrders: [],

                manualSales: [],

                currentPrice:
                    50,

                availableMilk:
                    0,

                totalSales:
                    0,

                revenue:
                    0,

                allFarmAvailableMilk:
                    0,

                allFarmRevenue:
                    0,

                allFarmTotalSales:
                    0,

                success:
                    false,

                error:
                    err.message ||
                    "Error loading sales page."

            }
        );

    }

};


// ==========================================================
// SUBMIT MANUAL SALE
// ==========================================================
//
// EJS FORM:
//
// POST /sales/manual
//
// Fields:
//
// customerName
// liters
// farmId -> admin only
//
// Workers do not need farmId because the service resolves
// their assigned farm.
// ==========================================================

exports.submitManualSale = async (
    req,
    res
) => {

    let farmId =
        normalizeFarmId(
            req.body.farmId
        );


    try {

        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (
            !getUserId(
                req.user
            )
        ) {

            throw new Error(
                "You must be logged in to record a sale."
            );

        }


        // ==================================================
        // INPUT
        // ==================================================

        const customerName =
            typeof req.body.customerName === "string"
                ? req.body.customerName.trim()
                : "";


        const liters =
            Number(
                req.body.liters
            );


        // ==================================================
        // VALIDATION
        // ==================================================

        if (!customerName) {

            throw new Error(
                "Customer name is required."
            );

        }


        if (
            !Number.isFinite(liters) ||
            liters <= 0
        ) {

            throw new Error(
                "Liters must be a valid amount greater than zero."
            );

        }


        // ==================================================
        // ADMIN FARM REQUIREMENT
        // ==================================================

        if (
            isAdminUser(
                req.user
            ) &&
            !farmId
        ) {

            throw new Error(
                "Select a farm before recording a sale."
            );

        }


        // ==================================================
        // SERVICE
        // ==================================================

        const saved =
            await milkService.submitManualSale({

                customerName,

                liters,

                farmId,

                user:
                    req.user

            });


        if (!saved) {

            throw new Error(
                "Manual sale could not be recorded."
            );

        }


        // ==================================================
        // REDIRECT
        // ==================================================

        const redirectFarm =
            normalizeFarmId(
                saved?.farmId ||
                saved?.farm?._id ||
                farmId
            );


        return res.redirect(
            salesRedirect(
                redirectFarm,
                {
                    success:
                        "1"
                }
            )
        );

    } catch (err) {

        console.error(
            "Manual sale error:",
            err
        );


        return res.redirect(
            salesRedirect(
                farmId,
                {

                    error:
                        err.message ||
                        "Unable to save manual sale."

                }
            )
        );

    }

};


// ==========================================================
// SUBMIT STANDING ORDER SALE
// ==========================================================
//
// EJS FORM:
//
// POST /sales/standing/submit
//
// Fields:
//
// standingOrderId
// customerName
// liters
// farmId -> admin only
//
// The service should use standingOrderId as the authoritative
// standing order and should not trust the hidden customerName
// or liters values for database integrity.
// ==========================================================

exports.submitStandingOrderSale = async (
    req,
    res
) => {

    let farmId =
        normalizeFarmId(
            req.body.farmId
        );


    try {

        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (
            !getUserId(
                req.user
            )
        ) {

            throw new Error(
                "You must be logged in to record a sale."
            );

        }


        // ==================================================
        // INPUT
        // ==================================================

        const standingOrderId =
            normalizeId(
                req.body.standingOrderId
            );


        if (!standingOrderId) {

            throw new Error(
                "Standing order ID is required."
            );

        }


        // ==================================================
        // ADMIN FARM REQUIREMENT
        // ==================================================

        if (
            isAdminUser(
                req.user
            ) &&
            !farmId
        ) {

            throw new Error(
                "Select a farm before recording a standing order sale."
            );

        }


        // ==================================================
        // SERVICE
        // ==================================================

        const saved =
            await milkService.submitStandingOrderSale({

                standingOrderId,

                farmId,

                user:
                    req.user

            });


        if (!saved) {

            throw new Error(
                "Standing order sale could not be recorded."
            );

        }


        // ==================================================
        // REDIRECT
        // ==================================================

        const redirectFarm =
            normalizeFarmId(
                saved?.farmId ||
                saved?.farm?._id ||
                farmId
            );


        return res.redirect(
            salesRedirect(
                redirectFarm,
                {
                    success:
                        "1"
                }
            )
        );

    } catch (err) {

        console.error(
            "Standing sale error:",
            err
        );


        return res.redirect(
            salesRedirect(
                farmId,
                {

                    error:
                        err.message ||
                        "Unable to save standing order sale."

                }
            )
        );

    }

};


// ==========================================================
// UPDATE MILK PRICE
// ==========================================================
//
// EJS FORM:
//
// POST /sales/price
//
// Fields:
//
// farmId
// price
//
// ADMIN ONLY.
// ==========================================================

exports.updateMilkPrice = async (
    req,
    res
) => {

    let farmId =
        normalizeFarmId(
            req.body.farmId
        );


    try {

        // ==================================================
        // ADMIN CHECK
        // ==================================================

        if (
            !isAdminUser(
                req.user
            )
        ) {

            return res.redirect(
                "/sales?error=" +
                encodeURIComponent(
                    "Only administrators can change the milk price."
                )
            );

        }


        // ==================================================
        // FARM
        // ==================================================

        if (!farmId) {

            throw new Error(
                "Select a farm before changing the milk price."
            );

        }


        // ==================================================
        // PRICE
        // ==================================================

        const price =
            Number(
                req.body.price
            );


        if (
            !Number.isFinite(price) ||
            price < 0
        ) {

            throw new Error(
                "Milk price must be a valid number greater than or equal to zero."
            );

        }


        // ==================================================
        // SERVICE
        // ==================================================

        await milkService.updateMilkPrice({

            price,

            farmId,

            user:
                req.user

        });


        // ==================================================
        // REDIRECT
        // ==================================================

        return res.redirect(
            salesRedirect(
                farmId,
                {
                    success:
                        "1"
                }
            )
        );

    } catch (err) {

        console.error(
            "Milk price update error:",
            err
        );


        return res.redirect(
            salesRedirect(
                farmId,
                {

                    error:
                        err.message ||
                        "Unable to update milk price."

                }
            )
        );

    }

};


// ==========================================================
// ADD STANDING ORDER
// ==========================================================
//
// EJS FORM:
//
// POST /sales/standing
//
// Fields:
//
// farmId
// customerName
// liters
//
// ==========================================================

exports.addStandingOrder = async (
    req,
    res
) => {

    let farmId =
        normalizeFarmId(
            req.body.farmId
        );


    try {

        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (
            !getUserId(
                req.user
            )
        ) {

            throw new Error(
                "You must be logged in to create a standing order."
            );

        }


        // ==================================================
        // INPUT
        // ==================================================

        const customerName =
            typeof req.body.customerName === "string"
                ? req.body.customerName.trim()
                : "";


        const liters =
            Number(
                req.body.liters
            );


        // ==================================================
        // VALIDATION
        // ==================================================

        if (!customerName) {

            throw new Error(
                "Customer name is required."
            );

        }


        if (
            !Number.isFinite(liters) ||
            liters <= 0
        ) {

            throw new Error(
                "Liters must be a valid amount greater than zero."
            );

        }


        // ==================================================
        // ADMIN FARM REQUIREMENT
        // ==================================================

        if (
            isAdminUser(
                req.user
            ) &&
            !farmId
        ) {

            throw new Error(
                "Select a farm before creating a standing order."
            );

        }


        // ==================================================
        // SERVICE
        // ==================================================

        const order =
            await milkService.addStandingOrder({

                customerName,

                liters,

                farmId,

                user:
                    req.user

            });


        if (!order) {

            throw new Error(
                "Standing order could not be created."
            );

        }


        // ==================================================
        // REDIRECT
        // ==================================================

        const redirectFarm =
            normalizeFarmId(
                order?.farmId ||
                order?.farm?._id ||
                farmId
            );


        return res.redirect(
            salesRedirect(
                redirectFarm,
                {
                    success:
                        "1"
                }
            )
        );

    } catch (err) {

        console.error(
            "Add standing order error:",
            err
        );


        return res.redirect(
            salesRedirect(
                farmId,
                {

                    error:
                        err.message ||
                        "Unable to add standing order."

                }
            )
        );

    }

};


// ==========================================================
// OMIT STANDING ORDER
// ==========================================================
//
// EJS FORM:
//
// POST /sales/standing/omit
//
// Fields:
//
// id
// farmId
//
// ADMIN ONLY.
// ==========================================================

exports.omitStandingOrder = async (
    req,
    res
) => {

    let farmId =
        normalizeFarmId(
            req.body.farmId
        );


    try {

        // ==================================================
        // ADMIN CHECK
        // ==================================================

        if (
            !isAdminUser(
                req.user
            )
        ) {

            return res.redirect(
                salesRedirect(
                    farmId,
                    {

                        error:
                            "Only administrators can omit standing orders."

                    }
                )
            );

        }


        // ==================================================
        // ORDER ID
        // ==================================================

        const orderId =
            normalizeId(
                req.body.id
            );


        if (!orderId) {

            throw new Error(
                "Standing order ID is required."
            );

        }


        // ==================================================
        // FARM
        // ==================================================

        if (!farmId) {

            throw new Error(
                "Farm ID is required."
            );

        }


        // ==================================================
        // SERVICE
        // ==================================================

        await milkService.omitStandingOrder({

            orderId,

            farmId,

            user:
                req.user

        });


        // ==================================================
        // REDIRECT
        // ==================================================

        return res.redirect(
            salesRedirect(
                farmId,
                {
                    success:
                        "1"
                }
            )
        );

    } catch (err) {

        console.error(
            "Omit standing order error:",
            err
        );


        return res.redirect(
            salesRedirect(
                farmId,
                {

                    error:
                        err.message ||
                        "Unable to omit standing order."

                }
            )
        );

    }

};


// ==========================================================
// MILKING HISTORY
// ==========================================================
//
// ROUTE:
//
// /milk/history/:dairyId
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