// ==========================================================
// services/salesService.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Contains ALL business logic for milk sales.
//
// RESPONSIBILITY
// ----------------------------------------------------------
// This service handles:
//
//   - MilkSummary operations
//   - Dairy/farm lookup
//   - farm access
//   - Nairobi calendar dates
//   - milk availability
//   - sales calculations
//   - milk pricing
//   - manual sales
//   - standing orders
//   - standing-order sales
//   - standing-order omission
//
// The controller should NOT duplicate these responsibilities.
//
// MODEL
// ----------------------------------------------------------
// MilkSummary
//
// OTHER MODELS
// ----------------------------------------------------------
// Dairy
// StandingOrder
//
// ==========================================================

const mongoose =
    require("mongoose");

const MilkSummary =
    require("../models/milkSummary");

const Dairy =
    require("../models/dairy");

const StandingOrder =
    require("../models/StandingOrder");


// ==========================================================
// CONSTANTS
// ==========================================================

const TIME_ZONE =
    "Africa/Nairobi";

const DEFAULT_PRICE =
    50;


// ==========================================================
// BASIC HELPERS
// ==========================================================

function isAdmin(
    user
) {

    return (
        user &&
        user.role === "admin"
    );

}


function isValidObjectId(
    value
) {

    return mongoose.Types.ObjectId.isValid(
        value
    );

}


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


function positiveNumber(
    value
) {

    const number =
        Number(value);


    if (
        !Number.isFinite(number) ||
        number <= 0
    ) {

        return null;

    }


    return number;

}


// ==========================================================
// ERROR HELPERS
// ==========================================================

function createError(
    message,
    code = null
) {

    const error =
        new Error(message);


    if (code) {

        error.code =
            code;

    }


    return error;

}


function getErrorMessage(
    error,
    fallback
) {

    if (
        error?.code ===
        "SUMMARY_LOCKED"
    ) {

        return error.message;

    }


    if (
        error?.message
    ) {

        return error.message;

    }


    return fallback;

}


// ==========================================================
// NAIROBI DATE HELPERS
// ==========================================================

function getTodayKey() {

    const parts =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone:
                    TIME_ZONE,

                year:
                    "numeric",

                month:
                    "2-digit",

                day:
                    "2-digit"
            }
        ).formatToParts(
            new Date()
        );


    const values =
        {};


    for (
        const part of parts
    ) {

        if (
            part.type !==
            "literal"
        ) {

            values[part.type] =
                part.value;

        }

    }


    return (
        values.year +
        "-" +
        values.month +
        "-" +
        values.day
    );

}


function getMonthKey(
    day
) {

    return day.slice(
        0,
        7
    );

}


// ==========================================================
// FARM HELPERS
// ==========================================================

function getFarmName(
    farm
) {

    if (!farm) {

        return "Dairy Farm";

    }


    return (
        farm.name ||
        farm.dairyName ||
        farm.title ||
        "Dairy Farm"
    );

}


function getFarmCode(
    farm
) {

    if (!farm) {

        return null;

    }


    const code =
        farm.code ??
        farm.farmCode;


    const number =
        Number(code);


    return Number.isFinite(number)
        ? number
        : null;

}


function getUserFarmId(
    user
) {

    if (!user) {

        return null;

    }


    return (
        user.farmId ||
        user.dairyId ||
        user.farm ||
        null
    );

}


function userCanAccessFarm(
    user,
    farmId
) {

    if (
        isAdmin(user)
    ) {

        return true;

    }


    const assignedFarmId =
        getUserFarmId(
            user
        );


    if (
        !assignedFarmId ||
        !farmId
    ) {

        return false;

    }


    return (
        String(assignedFarmId) ===
        String(farmId)
    );

}


async function findFarm(
    farmId
) {

    if (
        !farmId ||
        !isValidObjectId(
            farmId
        )
    ) {

        return null;

    }


    return Dairy.findById(
        farmId
    );

}


async function getAllFarms() {

    return Dairy.find({})
        .sort({
            name: 1
        });

}


// ==========================================================
// MILK SUMMARY
// ==========================================================

async function getTodaySummary() {

    return MilkSummary.findOne({
        day:
            getTodayKey()
    });

}


async function getOrCreateTodaySummary() {

    const day =
        getTodayKey();

    const month =
        getMonthKey(day);


    let summary =
        await MilkSummary.findOne({
            day
        });


    if (summary) {

        return summary;

    }


    try {

        return await MilkSummary.create({

            day,

            month,

            price:
                DEFAULT_PRICE,

            produced:
                0,

            consumed:
                0,

            available:
                0,

            cash:
                0,

            locked:
                false,

            cowProduction:
                [],

            farmProduction:
                [],

            sales:
                []

        });

    }

    catch (error) {

        if (
            error &&
            error.code ===
            11000
        ) {

            return MilkSummary.findOne({
                day
            });

        }


        throw error;

    }

}


function ensureSummaryUnlocked(
    summary
) {

    if (
        summary &&
        summary.locked
    ) {

        throw createError(
            "Today's milk summary has been finalized and can no longer be changed.",
            "SUMMARY_LOCKED"
        );

    }

}


// ==========================================================
// PRODUCTION
// ==========================================================

function getFarmProduction(
    summary,
    farmId
) {

    if (
        !summary ||
        !Array.isArray(
            summary.farmProduction
        )
    ) {

        return 0;

    }


    const entry =
        summary.farmProduction.find(
            item => {

                return (
                    item.farm &&
                    String(item.farm) ===
                    String(farmId)
                );

            }
        );


    return toNumber(
        entry?.liters,
        0
    );

}


function getTotalProduction(
    summary
) {

    return toNumber(
        summary?.produced,
        0
    );

}


// ==========================================================
// SALES CALCULATIONS
// ==========================================================

function getSales(
    summary
) {

    if (
        !summary ||
        !Array.isArray(
            summary.sales
        )
    ) {

        return [];

    }


    return summary.sales;

}


function calculateSales(
    sales
) {

    let liters =
        0;

    let revenue =
        0;


    for (
        const sale of sales || []
    ) {

        liters +=
            toNumber(
                sale.liters
            );

        revenue +=
            toNumber(
                sale.cash
            );

    }


    return {

        liters,

        revenue

    };

}


function calculateFarmSales(
    sales,
    farm
) {

    if (
        !Array.isArray(sales)
    ) {

        return {

            available:
                false,

            liters:
                0,

            revenue:
                0

        };

    }


    const farmId =
        farm?._id
            ? String(farm._id)
            : null;


    const farmCode =
        getFarmCode(farm);


    const containsFarmInformation =
        sales.some(
            sale => {

                return (
                    sale.farm ||
                    sale.farmId ||
                    sale.farmCode !==
                    undefined
                );

            }
        );


    if (
        !containsFarmInformation
    ) {

        return {

            available:
                false,

            liters:
                0,

            revenue:
                0

        };

    }


    const farmSales =
        sales.filter(
            sale => {

                if (
                    sale.farm &&
                    farmId
                ) {

                    return (
                        String(
                            sale.farm
                        ) ===
                        farmId
                    );

                }


                if (
                    sale.farmId &&
                    farmId
                ) {

                    return (
                        String(
                            sale.farmId
                        ) ===
                        farmId
                    );

                }


                if (
                    sale.farmCode !==
                    undefined &&
                    farmCode !==
                    null
                ) {

                    return (
                        Number(
                            sale.farmCode
                        ) ===
                        farmCode
                    );

                }


                return false;

            }
        );


    return {

        available:
            true,

        ...calculateSales(
            farmSales
        )

    };

}


// ==========================================================
// AVAILABLE MILK
// ==========================================================

function calculateAvailableMilk(
    summary,
    farmId = null
) {

    if (!summary) {

        return 0;

    }


    if (farmId) {

        const produced =
            getFarmProduction(
                summary,
                farmId
            );


        const farm =
            summary.farmProduction?.find(
                item =>
                    item.farm &&
                    String(item.farm) ===
                    String(farmId)
            );


        const farmSales =
            calculateFarmSales(
                summary.sales,
                farm
            );


        if (
            farmSales.available
        ) {

            return Math.max(
                0,
                produced -
                farmSales.liters
            );

        }


        // ----------------------------------------------------
        // The current sale schema does not necessarily carry
        // farm information. Do not assign global sales to a
        // specific farm when that information is unavailable.
        // ----------------------------------------------------

        return Math.max(
            0,
            produced
        );

    }


    return Math.max(
        0,
        toNumber(
            summary.available,
            Math.max(
                0,
                toNumber(
                    summary.produced
                ) -
                toNumber(
                    summary.consumed
                )
            )
        )
    );

}


// ==========================================================
// STANDING ORDER HELPERS
// ==========================================================

function getStandingOrderFarmId(
    order
) {

    if (!order) {

        return null;

    }


    return (
        order.farm ||
        order.farmId ||
        order.dairy ||
        null
    );

}


function isOrderFuture(
    order
) {

    if (!order) {

        return false;

    }


    const effective =
        order.effectiveDate ||
        order.startDate ||
        order.activeFrom;


    if (!effective) {

        return false;

    }


    const date =
        new Date(effective);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return false;

    }


    const effectiveKey =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone:
                    TIME_ZONE,

                year:
                    "numeric",

                month:
                    "2-digit",

                day:
                    "2-digit"
            }
        ).format(date);


    return (
        effectiveKey >
        getTodayKey()
    );

}


async function getOrdersForFarm(
    farmId
) {

    const query =
        {};


    if (farmId) {

        if (
            StandingOrder.schema.path(
                "farm"
            )
        ) {

            query.farm =
                farmId;

        }

        else if (
            StandingOrder.schema.path(
                "farmId"
            )
        ) {

            query.farmId =
                farmId;

        }

        else if (
            StandingOrder.schema.path(
                "dairy"
            )
        ) {

            query.dairy =
                farmId;

        }

    }


    return StandingOrder.find(
        query
    )
        .sort({
            createdAt: 1
        })
        .lean();

}


function prepareStandingOrders(
    orders,
    summary
) {

    const sales =
        getSales(
            summary
        );


    return orders.map(
        order => {

            const orderId =
                String(
                    order._id
                );


            const saleRecordedToday =
                sales.some(
                    sale => {

                        return (
                            sale.standingOrderId &&
                            String(
                                sale.standingOrderId
                            ) ===
                            orderId
                        );

                    }
                );


            return {

                ...order,

                isFuture:
                    isOrderFuture(
                        order
                    ),

                saleRecordedToday

            };

        }
    );

}


// ==========================================================
// PAGE DATA
// ==========================================================

function getEmptySalesPageData(
    {
        user = null,
        error = null
    } = {}
) {

    return {

        farms: [],

        selectedFarm:
            null,

        selectedFarmId:
            null,

        isAdmin:
            isAdmin(user),

        canSell:
            false,

        standingOrders:
            [],

        manualSales:
            [],

        currentPrice:
            DEFAULT_PRICE,

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

        user,

        success:
            false,

        error

    };

}


async function getSalesPageData(
    {
        user,
        farmId
    }
) {

    if (!user) {

        return {

            redirect:
                "/login"

        };

    }


    const admin =
        isAdmin(user);


    let selectedFarmId =
        farmId ||
        null;


    // --------------------------------------------------------
    // Workers can only use their assigned farm.
    // --------------------------------------------------------

    if (!admin) {

        selectedFarmId =
            getUserFarmId(
                user
            );


        if (!selectedFarmId) {

            return {

                data:
                    getEmptySalesPageData({

                        user,

                        error:
                            "No dairy farm has been assigned to your account."

                    })

            };

        }

    }


    if (
        selectedFarmId &&
        !isValidObjectId(
            selectedFarmId
        )
    ) {

        selectedFarmId =
            null;

    }


    let farms =
        [];


    if (admin) {

        farms =
            await getAllFarms();

    }
    else {

        const assignedFarm =
            await findFarm(
                selectedFarmId
            );


        if (assignedFarm) {

            farms = [
                assignedFarm
            ];

        }

    }


    const summary =
        await getTodaySummary();


    const globalSales =
        calculateSales(
            summary?.sales || []
        );


    const allFarmAvailableMilk =
        summary
            ? calculateAvailableMilk(
                summary
            )
            : 0;


    // --------------------------------------------------------
    // Admin landing page before selecting a farm.
    // --------------------------------------------------------

    if (
        admin &&
        !selectedFarmId
    ) {

        return {

            data: {

                farms,

                selectedFarm:
                    null,

                selectedFarmId:
                    null,

                isAdmin:
                    true,

                canSell:
                    false,

                standingOrders:
                    [],

                manualSales:
                    [],

                currentPrice:
                    summary?.price ??
                    DEFAULT_PRICE,

                availableMilk:
                    0,

                totalSales:
                    0,

                revenue:
                    0,

                allFarmAvailableMilk,

                allFarmRevenue:
                    globalSales.revenue,

                allFarmTotalSales:
                    globalSales.liters,

                user,

                success:
                    false,

                error:
                    null

            }

        };

    }


    const selectedFarm =
        await findFarm(
            selectedFarmId
        );


    if (!selectedFarm) {

        return {

            data: {

                farms,

                selectedFarm:
                    null,

                selectedFarmId:
                    null,

                isAdmin:
                    admin,

                canSell:
                    false,

                standingOrders:
                    [],

                manualSales:
                    [],

                currentPrice:
                    summary?.price ??
                    DEFAULT_PRICE,

                availableMilk:
                    0,

                totalSales:
                    0,

                revenue:
                    0,

                allFarmAvailableMilk,

                allFarmRevenue:
                    globalSales.revenue,

                allFarmTotalSales:
                    globalSales.liters,

                user,

                success:
                    false,

                error:
                    "The selected dairy farm could not be found."

            },

            status:
                404

        };

    }


    if (
        !userCanAccessFarm(
            user,
            selectedFarm._id
        )
    ) {

        return {

            data: {

                farms,

                selectedFarm:
                    null,

                selectedFarmId:
                    null,

                isAdmin:
                    admin,

                canSell:
                    false,

                standingOrders:
                    [],

                manualSales:
                    [],

                currentPrice:
                    DEFAULT_PRICE,

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

                user,

                success:
                    false,

                error:
                    "You are not authorized to access this dairy farm."

            },

            status:
                403

        };

    }


    const farmProduced =
        summary
            ? getFarmProduction(
                summary,
                selectedFarm._id
            )
            : 0;


    const farmSales =
        calculateFarmSales(
            summary?.sales || [],
            selectedFarm
        );


    const manualSales =
        (
            summary?.sales || []
        ).filter(
            sale =>
                !sale.standingOrderId
        );


    const selectedTotalSales =
        farmSales.available
            ? farmSales.liters
            : 0;


    const selectedRevenue =
        farmSales.available
            ? farmSales.revenue
            : 0;


    const availableMilk =
        farmSales.available
            ? Math.max(
                0,
                farmProduced -
                selectedTotalSales
            )
            : Math.max(
                0,
                farmProduced
            );


    const orders =
        await getOrdersForFarm(
            selectedFarmId
        );


    const standingOrders =
        prepareStandingOrders(
            orders,
            summary
        );


    return {

        data: {

            farms,

            selectedFarm,

            selectedFarmId,

            isAdmin:
                admin,

            canSell:
                !summary?.locked,

            standingOrders,

            manualSales,

            currentPrice:
                summary?.price ??
                DEFAULT_PRICE,

            availableMilk,

            totalSales:
                selectedTotalSales,

            revenue:
                selectedRevenue,

            allFarmAvailableMilk,

            allFarmRevenue:
                globalSales.revenue,

            allFarmTotalSales:
                globalSales.liters,

            user,

            success:
                false,

            error:
                null

        }

    };

}


// ==========================================================
// SAVE MILK PRICE
// ==========================================================

async function saveMilkPrice(
    {
        user,
        farmId,
        price
    }
) {

    if (
        !isAdmin(user)
    ) {

        throw createError(
            "Only administrators can change the milk price."
        );

    }


    if (
        !farmId ||
        !isValidObjectId(
            farmId
        )
    ) {

        throw createError(
            "A valid dairy farm must be selected."
        );

    }


    const numericPrice =
        toNumber(
            price,
            NaN
        );


    if (
        !Number.isFinite(
            numericPrice
        ) ||
        numericPrice < 0
    ) {

        throw createError(
            "Please enter a valid milk price."
        );

    }


    const farm =
        await findFarm(
            farmId
        );


    if (!farm) {

        throw createError(
            "The selected dairy farm was not found."
        );

    }


    const summary =
        await getOrCreateTodaySummary();


    ensureSummaryUnlocked(
        summary
    );


    summary.price =
        numericPrice;


    await summary.save();


    return summary;

}


// ==========================================================
// RECORD MANUAL SALE
// ==========================================================

async function recordManualSale(
    {
        user,
        farmId,
        customerName,
        liters
    }
) {

    if (!user) {

        throw createError(
            "You must be logged in."
        );

    }


    if (
        !isAdmin(user)
    ) {

        farmId =
            getUserFarmId(
                user
            );

    }


    if (
        !farmId ||
        !isValidObjectId(
            farmId
        )
    ) {

        throw createError(
            "A valid dairy farm is required."
        );

    }


    if (
        !userCanAccessFarm(
            user,
            farmId
        )
    ) {

        throw createError(
            "You are not authorized to sell milk from this farm."
        );

    }


    customerName =
        String(
            customerName || ""
        ).trim();


    if (!customerName) {

        throw createError(
            "Customer name is required."
        );

    }


    liters =
        positiveNumber(
            liters
        );


    if (liters === null) {

        throw createError(
            "Please enter a valid quantity of milk."
        );

    }


    const farm =
        await findFarm(
            farmId
        );


    if (!farm) {

        throw createError(
            "The selected dairy farm was not found."
        );

    }


    const summary =
        await getOrCreateTodaySummary();


    ensureSummaryUnlocked(
        summary
    );


    const availableMilk =
        calculateAvailableMilk(
            summary,
            farmId
        );


    if (
        liters >
        availableMilk
    ) {

        throw createError(
            "Insufficient milk available on this farm. Available: " +
            availableMilk.toFixed(2) +
            " L."
        );

    }


    const price =
        toNumber(
            summary.price,
            DEFAULT_PRICE
        );


    const cash =
        liters *
        price;


    summary.sales.push({

        customerName,

        liters,

        price,

        cash,

        standingOrderId:
            null,

        createdAt:
            new Date()

    });


    summary.consumed =
        toNumber(
            summary.consumed
        ) +
        liters;


    summary.cash =
        toNumber(
            summary.cash
        ) +
        cash;


    summary.available =
        Math.max(
            0,
            toNumber(
                summary.produced
            ) -
            toNumber(
                summary.consumed
            )
        );


    await summary.save();


    return {

        summary,

        farmId,

        liters,

        price,

        cash

    };

}


// ==========================================================
// CREATE STANDING ORDER
// ==========================================================

async function createStandingOrder(
    {
        user,
        farmId,
        customerName,
        liters
    }
) {

    if (!user) {

        throw createError(
            "You must be logged in."
        );

    }


    if (
        !isAdmin(user)
    ) {

        farmId =
            getUserFarmId(
                user
            );

    }


    if (
        !farmId ||
        !isValidObjectId(
            farmId
        )
    ) {

        throw createError(
            "A valid dairy farm is required."
        );

    }


    if (
        !userCanAccessFarm(
            user,
            farmId
        )
    ) {

        throw createError(
            "You are not authorized to create a standing order for this farm."
        );

    }


    customerName =
        String(
            customerName || ""
        ).trim();


    if (!customerName) {

        throw createError(
            "Customer name is required."
        );

    }


    liters =
        positiveNumber(
            liters
        );


    if (liters === null) {

        throw createError(
            "Please enter a valid daily milk quantity."
        );

    }


    const farm =
        await findFarm(
            farmId
        );


    if (!farm) {

        throw createError(
            "The selected dairy farm was not found."
        );

    }


    const orderData = {

        customerName,

        liters

    };


    // --------------------------------------------------------
    // Adapt to the existing StandingOrder schema.
    // --------------------------------------------------------

    if (
        StandingOrder.schema.path(
            "farm"
        )
    ) {

        orderData.farm =
            farmId;

    }

    else if (
        StandingOrder.schema.path(
            "farmId"
        )
    ) {

        orderData.farmId =
            farmId;

    }

    else if (
        StandingOrder.schema.path(
            "dairy"
        )
    ) {

        orderData.dairy =
            farmId;

    }


    if (
        StandingOrder.schema.path(
            "effectiveDate"
        )
    ) {

        orderData.effectiveDate =
            new Date();

    }


    const order =
        new StandingOrder(
            orderData
        );


    await order.save();


    return order;

}


// ==========================================================
// SUBMIT STANDING-ORDER SALE
// ==========================================================

async function submitStandingSale(
    {
        user,
        farmId,
        standingOrderId,
        liters,
        customerName
    }
) {

    if (!user) {

        throw createError(
            "You must be logged in."
        );

    }


    if (
        !standingOrderId ||
        !isValidObjectId(
            standingOrderId
        )
    ) {

        throw createError(
            "Invalid standing order."
        );

    }


    const order =
        await StandingOrder.findById(
            standingOrderId
        );


    if (!order) {

        throw createError(
            "Standing order not found."
        );

    }


    farmId =
        getStandingOrderFarmId(
            order
        ) ||
        farmId;


    if (
        !isAdmin(user)
    ) {

        farmId =
            getUserFarmId(
                user
            );

    }


    if (
        !farmId ||
        !isValidObjectId(
            farmId
        )
    ) {

        throw createError(
            "Unable to determine the dairy farm for this order."
        );

    }


    if (
        !userCanAccessFarm(
            user,
            farmId
        )
    ) {

        throw createError(
            "You are not authorized to submit this standing order."
        );

    }


    if (
        isOrderFuture(
            order
        )
    ) {

        throw createError(
            "This standing order becomes effective in the future."
        );

    }


    const summary =
        await getOrCreateTodaySummary();


    ensureSummaryUnlocked(
        summary
    );


    const alreadyRecorded =
        summary.sales.some(
            sale => {

                return (
                    sale.standingOrderId &&
                    String(
                        sale.standingOrderId
                    ) ===
                    String(
                        standingOrderId
                    )
                );

            }
        );


    if (
        alreadyRecorded
    ) {

        throw createError(
            "Today's sale for this standing order has already been recorded."
        );

    }


    liters =
        positiveNumber(
            liters
        );


    if (liters === null) {

        throw createError(
            "Please enter a valid amount of milk."
        );

    }


    const availableMilk =
        calculateAvailableMilk(
            summary,
            farmId
        );


    if (
        liters >
        availableMilk
    ) {

        throw createError(
            "Insufficient milk available on this farm. Available: " +
            availableMilk.toFixed(2) +
            " L."
        );

    }


    const price =
        toNumber(
            summary.price,
            DEFAULT_PRICE
        );


    const cash =
        liters *
        price;


    const finalCustomerName =
        String(
            order.customerName ||
            customerName ||
            "Customer"
        ).trim();


    summary.sales.push({

        customerName:
            finalCustomerName,

        liters,

        price,

        cash,

        standingOrderId,

        createdAt:
            new Date()

    });


    summary.consumed =
        toNumber(
            summary.consumed
        ) +
        liters;


    summary.cash =
        toNumber(
            summary.cash
        ) +
        cash;


    summary.available =
        Math.max(
            0,
            toNumber(
                summary.produced
            ) -
            toNumber(
                summary.consumed
            )
        );


    await summary.save();


    return {

        summary,

        farmId,

        standingOrderId,

        liters,

        price,

        cash

    };

}


// ==========================================================
// OMIT STANDING ORDER
// ==========================================================

async function omitStandingOrder(
    {
        user,
        farmId,
        standingOrderId
    }
) {

    if (
        !isAdmin(user)
    ) {

        throw createError(
            "Only administrators can omit standing orders."
        );

    }


    if (
        !standingOrderId ||
        !isValidObjectId(
            standingOrderId
        )
    ) {

        throw createError(
            "Invalid standing order."
        );

    }


    const order =
        await StandingOrder.findById(
            standingOrderId
        );


    if (!order) {

        throw createError(
            "Standing order not found."
        );

    }


    // --------------------------------------------------------
    // Prefer a logical inactive/omitted state.
    // --------------------------------------------------------

    if (
        StandingOrder.schema.path(
            "active"
        )
    ) {

        order.active =
            false;

        await order.save();

        return order;

    }


    if (
        StandingOrder.schema.path(
            "isActive"
        )
    ) {

        order.isActive =
            false;

        await order.save();

        return order;

    }


    if (
        StandingOrder.schema.path(
            "status"
        )
    ) {

        order.status =
            "omitted";

        await order.save();

        return order;

    }


    // --------------------------------------------------------
    // No logical state exists, so delete the order.
    // --------------------------------------------------------

    await StandingOrder.findByIdAndDelete(
        standingOrderId
    );


    return {

        _id:
            standingOrderId,

        deleted:
            true

    };

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    // --------------------------------------------------------
    // Controller-facing operations
    // --------------------------------------------------------

    getSalesPageData,

    getEmptySalesPageData,

    saveMilkPrice,

    recordManualSale,

    createStandingOrder,

    submitStandingSale,

    omitStandingOrder,

    // --------------------------------------------------------
    // Shared helpers intentionally exposed because the
    // controller uses them only for HTTP-level formatting.
    // --------------------------------------------------------

    getUserFarmId,

    getErrorMessage,

    isAdmin

};