// ==========================================================
// controllers/milkController.js
// ==========================================================

const milkService =
    require("../services/milkService");


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
            data?.session || "closed";


        const isAdmin =
            req.user?.role === "admin";


        return res.render(
            "milk",
            {

                dairies:
                    data?.dairies || [],

                milkRecords:
                    data?.milkRecords || [],

                morningRecords:
                    data?.morningRecords || [],

                eveningRecords:
                    data?.eveningRecords || [],

                session:
                    currentSession,

                sessionInfo:
                    data?.sessionInfo || null,

                canSubmit:
                    data?.canSubmit || false,

                canEditMorning:
                    data?.canEditMorning || false,

                canEditEvening:
                    data?.canEditEvening || false,

                isAdmin,

                user:
                    req.user,

                success:
                    req.query.success === "1",

                error:
                    req.query.error || "",

                edit:
                    req.query.edit || ""

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

                    milkRecords: [],

                    morningRecords: [],

                    eveningRecords: [],

                    session: "closed",

                    sessionInfo: null,

                    canSubmit: false,

                    canEditMorning: false,

                    canEditEvening: false,

                    isAdmin:
                        req.user?.role === "admin",

                    user:
                        req.user,

                    success: false,

                    error:
                        "Error loading milk collection page.",

                    edit: ""

                }
            );

    }

};


// ==========================================================
// SUBMIT MILK
// ==========================================================
//
// IMPORTANT
//
// Each submitted record represents ONE ANIMAL.
//
// The service is responsible for:
//
// 1. Verifying the animal exists.
// 2. Verifying the record belongs to an animal.
// 3. Reading the animal's assetCode.
// 4. Resolving the parent Dairy Farm.
// 5. Saving the individual Milk record.
// 6. Updating/rebuilding MilkSummary.
// 7. Preventing duplicate morning/evening records.
// ==========================================================

exports.submitMilk = async (
    req,
    res
) => {

    try {

        if (
            !req.user ||
            !req.user._id
        ) {

            throw new Error(
                "You must be logged in to record milk."
            );

        }


        let records =
            req.body.records;


        // --------------------------------------------------
        // SUPPORT SINGLE RECORD SUBMISSION
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
                        req.body.remarks || ""

                }

            ];

        }


        // --------------------------------------------------
        // VALIDATE SUBMISSION
        // --------------------------------------------------

        if (!records) {

            throw new Error(
                "No milk records were submitted."
            );

        }


        // --------------------------------------------------
        // NORMALIZE SINGLE OBJECT
        //
        // Some forms may submit one object instead of an
        // array.
        // --------------------------------------------------

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


        // --------------------------------------------------
        // SAVE
        // --------------------------------------------------
        //
        // The service owns all animal/farm logic.
        // --------------------------------------------------

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
            req.user?.role !== "admin"
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
            encodeURIComponent(id)
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
//
// The animal/farm relationship is NOT changed here.
//
// Only the quantity and remarks are editable.
//
// The service must update MilkSummary after the change.
// ==========================================================

exports.updateMilkRecord = async (
    req,
    res
) => {

    try {

        const {
            id
        } = req.params;


        if (
            req.user?.role !== "admin"
        ) {

            return res.redirect(
                "/milk?error=" +
                encodeURIComponent(
                    "Only administrators can edit milk records."
                )
            );

        }


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


        const numericLiters =
            Number(
                req.body.liters
            );


        if (
            !Number.isFinite(
                numericLiters
            ) ||
            numericLiters < 0
        ) {

            throw new Error(
                "Milk quantity must be a valid number."
            );

        }


        const updated =
            await milkService.editMilkRecord({

                recordId:
                    id,

                liters:
                    numericLiters,

                remarks:
                    typeof req.body.remarks === "string"
                        ? req.body.remarks
                        : "",

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
// GET MILK STATS
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
        // DAILY STATISTICS
        // ==================================================

        if (
            type === "day"
        ) {

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

                    type: "day",

                    date:
                        selectedDate,

                    month:
                        "",

                    records:
                        data?.records || [],

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
                        data?.sales || [],

                    user:
                        req.user

                }
            );

        }


        // ==================================================
        // MONTHLY STATISTICS
        // ==================================================

        if (
            type === "month"
        ) {

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

                    type: "month",

                    date:
                        "",

                    month:
                        selectedMonth,

                    records:
                        data?.records || [],

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
                        data?.sales || [],

                    user:
                        req.user

                }
            );

        }


        // ==================================================
        // INVALID TYPE
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
            `/milkStats?type=day&date=${encodeURIComponent(day)}`
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
// SALES PAGE
// ==========================================================
//
// ADMIN:
//
//   /sales
//       -> ALL FARM SUMMARY
//
//   /sales?farmId=<ID>
//       -> SELECTED FARM
//
// DAIRY WORKER:
//
//   /sales
//       -> THEIR ASSIGNED FARM
//
// The service is responsible for resolving the farm and
// calculating milk available from the farm's animals.
// ==========================================================

exports.getSalesPage = async (
    req,
    res
) => {

    try {

        if (
            !req.user ||
            !req.user._id
        ) {

            return res
                .status(401)
                .send(
                    "You must be logged in to access sales."
                );

        }


        const isAdmin =
            req.user.role === "admin";


        const requestedFarmId =
            typeof req.query.farmId === "string" &&
            req.query.farmId.trim()
                ? req.query.farmId.trim()
                : null;


        const data =
            await milkService.getSalesPageData({

                user:
                    req.user,

                farmId:
                    requestedFarmId

            });


        const selectedFarmId =
            data?.selectedFarmId ||
            (
                isAdmin
                    ? requestedFarmId
                    : data?.workerFarmId || null
            );


        const farmSelected =
            Boolean(
                selectedFarmId
            );


        const canSell =
            isAdmin
                ? farmSelected
                : Boolean(
                    data?.workerFarmId
                );


        return res.render(
            "sales",
            {

                farms:
                    data?.farms || [],

                selectedFarm:
                    data?.selectedFarm || null,

                selectedFarmId,

                isAdmin,

                canSell,

                standingOrders:
                    data?.standingOrders || [],

                manualSales:
                    data?.manualSales || [],

                currentPrice:
                    data?.currentPrice ?? 50,

                availableMilk:
                    Number(
                        data?.availableMilk || 0
                    ),

                totalSales:
                    Number(
                        data?.totalSales || 0
                    ),

                revenue:
                    Number(
                        data?.revenue || 0
                    ),

                allFarmAvailableMilk:
                    Number(
                        data?.allFarmAvailableMilk || 0
                    ),

                allFarmRevenue:
                    Number(
                        data?.allFarmRevenue || 0
                    ),

                allFarmTotalSales:
                    Number(
                        data?.allFarmTotalSales || 0
                    ),

                user:
                    req.user,

                success:
                    req.query.success === "1",

                error:
                    req.query.error || ""

            }
        );

    } catch (err) {

        console.error(
            "Sales page error:",
            err
        );


        return res
            .status(500)
            .send(
                err.message ||
                "Error loading sales page."
            );

    }

};


// ==========================================================
// SUBMIT MANUAL SALE
// ==========================================================

exports.submitManualSale = async (
    req,
    res
) => {

    try {

        if (
            !req.user ||
            !req.user._id
        ) {

            throw new Error(
                "You must be logged in to record a sale."
            );

        }


        const {
            customerName,
            liters
        } = req.body;


        let farmId =
            typeof req.body.farmId === "string" &&
            req.body.farmId.trim()
                ? req.body.farmId.trim()
                : null;


        if (
            req.user.role === "admin" &&
            !farmId
        ) {

            throw new Error(
                "Select a farm before recording a sale."
            );

        }


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


        const redirectFarm =
            saved.farmId ||
            farmId;


        const redirectUrl =
            redirectFarm

                ? `/sales?farmId=${encodeURIComponent(
                    redirectFarm
                )}&success=1`

                : "/sales?success=1";


        return res.redirect(
            redirectUrl
        );

    } catch (err) {

        console.error(
            "Manual sale error:",
            err
        );


        const farmId =
            typeof req.body.farmId === "string" &&
            req.body.farmId.trim()
                ? req.body.farmId.trim()
                : "";


        const redirect =
            farmId

                ? `/sales?farmId=${encodeURIComponent(
                    farmId
                )}&error=${encodeURIComponent(
                    err.message ||
                    "Unable to save manual sale."
                )}`

                : `/sales?error=${encodeURIComponent(
                    err.message ||
                    "Unable to save manual sale."
                )}`;


        return res.redirect(
            redirect
        );

    }

};


// ==========================================================
// SUBMIT STANDING ORDER SALE
// ==========================================================

exports.submitStandingOrderSale = async (
    req,
    res
) => {

    try {

        if (
            !req.user ||
            !req.user._id
        ) {

            throw new Error(
                "You must be logged in to record a sale."
            );

        }


        const {
            standingOrderId
        } = req.body;


        if (!standingOrderId) {

            throw new Error(
                "Standing order ID is required."
            );

        }


        const farmId =
            req.user.role === "admin"

                ? (
                    typeof req.body.farmId === "string" &&
                    req.body.farmId.trim()
                        ? req.body.farmId.trim()
                        : null
                )

                : null;


        if (
            req.user.role === "admin" &&
            !farmId
        ) {

            throw new Error(
                "Select a farm before recording a standing order sale."
            );

        }


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


        const redirectFarm =
            saved.farmId ||
            farmId;


        const redirectUrl =
            redirectFarm

                ? `/sales?farmId=${encodeURIComponent(
                    redirectFarm
                )}&success=1`

                : "/sales?success=1";


        return res.redirect(
            redirectUrl
        );

    } catch (err) {

        console.error(
            "Standing sale error:",
            err
        );


        const farmId =
            typeof req.body.farmId === "string" &&
            req.body.farmId.trim()
                ? req.body.farmId.trim()
                : "";


        const redirect =
            farmId

                ? `/sales?farmId=${encodeURIComponent(
                    farmId
                )}&error=${encodeURIComponent(
                    err.message ||
                    "Unable to save standing order sale."
                )}`

                : `/sales?error=${encodeURIComponent(
                    err.message ||
                    "Unable to save standing order sale."
                )}`;


        return res.redirect(
            redirect
        );

    }

};


// ==========================================================
// UPDATE MILK PRICE
// ADMIN ONLY
// ==========================================================

exports.updateMilkPrice = async (
    req,
    res
) => {

    try {

        if (
            req.user?.role !== "admin"
        ) {

            return res.redirect(
                "/sales"
            );

        }


        const price =
            Number(
                req.body.price
            );


        if (
            !Number.isFinite(price) ||
            price < 0
        ) {

            throw new Error(
                "Milk price must be a valid number."
            );

        }


        await milkService.updateMilkPrice(
            price
        );


        const farmId =
            typeof req.body.farmId === "string" &&
            req.body.farmId.trim()
                ? req.body.farmId.trim()
                : "";


        return res.redirect(

            farmId

                ? `/sales?farmId=${encodeURIComponent(
                    farmId
                )}&success=1`

                : "/sales?success=1"

        );

    } catch (err) {

        console.error(
            "Price update error:",
            err
        );


        return res
            .status(500)
            .send(
                err.message ||
                "Unable to update milk price."
            );

    }

};


// ==========================================================
// ADD STANDING ORDER
// ==========================================================

exports.addStandingOrder = async (
    req,
    res
) => {

    try {

        if (
            !req.user ||
            !req.user._id
        ) {

            throw new Error(
                "You must be logged in to create a standing order."
            );

        }


        const {
            customerName,
            liters
        } = req.body;


        const farmId =
            typeof req.body.farmId === "string" &&
            req.body.farmId.trim()
                ? req.body.farmId.trim()
                : null;


        if (
            req.user.role === "admin" &&
            !farmId
        ) {

            throw new Error(
                "Select a farm before creating a standing order."
            );

        }


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


        const redirectFarm =
            order.farmId ||
            farmId;


        return res.redirect(

            redirectFarm

                ? `/sales?farmId=${encodeURIComponent(
                    redirectFarm
                )}&success=1`

                : "/sales?success=1"

        );

    } catch (err) {

        console.error(
            "Add standing order error:",
            err
        );


        const farmId =
            typeof req.body.farmId === "string" &&
            req.body.farmId.trim()
                ? req.body.farmId.trim()
                : "";


        const redirect =
            farmId

                ? `/sales?farmId=${encodeURIComponent(
                    farmId
                )}&error=${encodeURIComponent(
                    err.message ||
                    "Unable to add standing order."
                )}`

                : `/sales?error=${encodeURIComponent(
                    err.message ||
                    "Unable to add standing order."
                )}`;


        return res.redirect(
            redirect
        );

    }

};


// ==========================================================
// OMIT STANDING ORDER
// ADMIN ONLY
// ==========================================================

exports.omitStandingOrder = async (
    req,
    res
) => {

    try {

        if (
            req.user?.role !== "admin"
        ) {

            return res
                .status(403)
                .send(
                    "Only administrators can omit standing orders."
                );

        }


        const {
            id
        } = req.body;


        if (!id) {

            throw new Error(
                "Standing order ID is required."
            );

        }


        const farmId =
            typeof req.body.farmId === "string" &&
            req.body.farmId.trim()
                ? req.body.farmId.trim()
                : null;


        await milkService.omitStandingOrder({

            orderId:
                id,

            farmId,

            user:
                req.user

        });


        return res.redirect(

            farmId

                ? `/sales?farmId=${encodeURIComponent(
                    farmId
                )}&success=1`

                : "/sales?success=1"

        );

    } catch (err) {

        console.error(
            "Omit standing order error:",
            err
        );


        return res
            .status(500)
            .send(
                err.message ||
                "Unable to omit standing order."
            );

    }

};


// ==========================================================
// MILKING HISTORY
// ==========================================================
//
// dairyId = INDIVIDUAL ANIMAL _id
//
// The service resolves the animal and therefore its farm
// through:
//
// animal.assetCode
//
// The controller does not attempt to resolve the farm.
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
                    data?.dairy || null,

                records:
                    data?.records || [],

                grouped:
                    data?.grouped || {},

                monthlyTotal:
                    Number(
                        data?.monthlyTotal || 0
                    ),

                hasData:
                    data?.hasData || false,

                selectedMonth:
                    month || "",

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
//
// id = individual animal _id
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
            req.user?.role !== "admin"
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
            req.user?.role !== "admin"
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
            `/milkStats?type=day&date=${encodeURIComponent(day)}`
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
            req.user?.role !== "admin"
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
            `/milkStats?type=day&date=${encodeURIComponent(day)}`
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