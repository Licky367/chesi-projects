// ==========================================================
// routes/Milk-Report.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Routes for the complete milk module.
//
// Mounted in server.js as:
//
//     app.use("/", milkRoutes);
//
// Therefore:
//
//     /milk
//     /stats
//     /sales
//     /milk/history/:dairyId
//
// are the final application URLs.
//
// FARM CONTEXT
// ----------------------------------------------------------
// The milk module operates inside an ACTIVE FARM CONTEXT.
//
// Farm context is handled separately from milk business logic:
//
//     controllers/farmContextController.js
//
// The farm-context controller determines which farm the
// authenticated user is currently working with.
//
// Dairy workers:
//     • Can switch only between assigned farms.
//
// Admins:
//     • Are not restricted by assignedFarm.
//     • Can switch to any available dairy farm.
//
// Milk controllers:
//     • Receive the authenticated user.
//     • Receive/use the active farm context.
//     • Do not calculate farm ownership themselves.
//
// ==========================================================


const express =
    require("express");


const router =
    express.Router();


const milkCollectController =
    require("../controllers/milkCollectController");


const milkController =
    require("../controllers/milkController");


const farmContextController =
    require("../controllers/farmContextController");


// ==========================================================
// FARM CONTEXT
// ==========================================================
//
// These routes control the farm currently selected by the
// authenticated user.
//
// IMPORTANT
// ----------------------------------------------------------
// These routes are intentionally separate from the milk
// controller.
//
// The selected farm is stored in the user's session/context.
//
// ==========================================================


// ==========================================================
// GET FARM CONTEXT
// ==========================================================
//
// GET /farm-context
//
// Used when a page or client needs to inspect the current
// active farm.
//
// ==========================================================

router.get(
    "/farm-context",
    farmContextController.getContext
);


// ==========================================================
// SWITCH ACTIVE FARM
// ==========================================================
//
// POST /farm-context/switch
//
// Expected body:
//
//     farmId
//     returnTo
//
// Example:
//
//     POST /farm-context/switch
//
//     farmId=665...
//     returnTo=/sales
//
// The farm-context controller is responsible for:
//
//     • authentication
//     • checking the requested farm
//     • checking assignedFarm for dairyWorker
//     • allowing admin farm switching
//     • storing the active farm
//     • redirecting to returnTo
//
// ==========================================================

router.post(
    "/farm-context/switch",
    farmContextController.switchFarm
);


// ==========================================================
// CLEAR ACTIVE FARM
// ==========================================================
//
// POST /farm-context/clear
//
// This removes the currently selected farm from the
// session/context.
//
// Useful when the user wants to leave farm-specific mode.
//
// ==========================================================

router.post(
    "/farm-context/clear",
    farmContextController.clearFarmContext
);


// ==========================================================
// MILK COLLECTION
// ==========================================================
//
// Controller:
//     milkCollectController
//
// GET  /milk
// POST /milk
//
// IMPORTANT
// ----------------------------------------------------------
// The collection controller remains responsible ONLY for
// milk collection.
//
// It must use the active farm context supplied by the
// application/session.
//
// ==========================================================


router.get(
    "/milk",
    milkCollectController.getMilkPage
);


router.post(
    "/milk",
    milkCollectController.submitMilk
);


// ==========================================================
// MILK STATISTICS
// ==========================================================
//
// GET /stats
// POST /stats/day
//
// Examples:
//
//     GET /stats
//
//     GET /stats?type=day&date=2026-08-13
//
//     GET /stats?type=month&month=2026-08
//
// Farm selection is handled by the active farm context.
//
// ==========================================================


router.get(
    "/stats",
    milkController.getMilkStats
);


router.post(
    "/stats/day",
    milkController.saveDailyStats
);


// ==========================================================
// MILK SALES
// ==========================================================
//
// GET /sales
//
// The sales controller obtains the active farm context and
// asks milkService for farm-scoped sales data.
//
// ==========================================================


router.get(
    "/sales",
    milkController.getSalesPage
);


// ==========================================================
// MANUAL SALE
// ==========================================================
//
// POST /sales/manual
//
// Expected body:
//
//     customerName
//     liters
//
// The service validates the sale against the ACTIVE FARM's
// available milk.
//
// ==========================================================


router.post(
    "/sales/manual",
    milkController.submitManualSale
);


// ==========================================================
// STANDING ORDER SALE
// ==========================================================
//
// POST /sales/standing-order
//
// Expected body:
//
//     standingOrderId
//
// The service determines the active farm and validates the
// available milk before recording the sale.
//
// ==========================================================


router.post(
    "/sales/standing-order",
    milkController.submitStandingOrderSale
);


// ==========================================================
// MILK PRICE
// ==========================================================
//
// POST /sales/price
//
// Admin only.
//
// The controller performs the admin authorization check.
//
// ==========================================================


router.post(
    "/sales/price",
    milkController.updateMilkPrice
);


// ==========================================================
// ADD STANDING ORDER
// ==========================================================
//
// POST /sales/standing-order/add
//
// Expected body:
//
//     customerName
//     liters
//
// ==========================================================


router.post(
    "/sales/standing-order/add",
    milkController.addStandingOrder
);


// ==========================================================
// OMIT STANDING ORDER
// ==========================================================
//
// POST /sales/standing-order/omit
//
// Expected body:
//
//     id
//
// ==========================================================


router.post(
    "/sales/standing-order/omit",
    milkController.omitStandingOrder
);


// ==========================================================
// MILKING HISTORY
// ==========================================================
//
// GET /milk/history/:dairyId
//
// Optional:
//
//     ?month=2026-08
//
// IMPORTANT
// ----------------------------------------------------------
// History belongs to the female animal and its records.
//
// The active farm context must NOT be used to incorrectly
// reject historical records simply because the animal is no
// longer currently assigned to the farm.
//
// The milk controller/service performs the actual validation.
//
// ==========================================================


router.get(
    "/milk/history/:dairyId",
    milkController.getMilkingHistory
);


// ==========================================================
// TOGGLE MILKING STATUS
// ==========================================================
//
// POST /milk/history/:id/status
//
// Admin only.
//
// This changes ONLY the current isMilking state.
//
// It does not delete or invalidate historical records.
//
// ==========================================================


router.post(
    "/milk/history/:id/status",
    milkController.toggleMilkingStatus
);


// ==========================================================
// LOCK DAILY SUMMARY
// ==========================================================
//
// POST /stats/day/lock
//
// Admin only.
//
// ==========================================================

router.post(
    "/stats/day/lock",
    milkController.lockDay
);


// ==========================================================
// UNLOCK DAILY SUMMARY
// ==========================================================
//
// POST /stats/day/unlock
//
// Admin only.
//
// ==========================================================

router.post(
    "/stats/day/unlock",
    milkController.unlockDay
);


// ==========================================================
// MODULE EXPORT
// ==========================================================

module.exports =
    router;


// ==========================================================
// ROUTE SUMMARY
// ==========================================================
//
// FARM CONTEXT
//
// GET
//     /farm-context
//
// POST
//     /farm-context/switch
//     /farm-context/clear
//
//
// MILK COLLECTION
//
// GET
//     /milk
//
// POST
//     /milk
//
//
// MILK STATISTICS
//
// GET
//     /stats
//
// POST
//     /stats/day
//     /stats/day/lock
//     /stats/day/unlock
//
//
// MILK SALES
//
// GET
//     /sales
//
// POST
//     /sales/manual
//     /sales/standing-order
//     /sales/price
//     /sales/standing-order/add
//     /sales/standing-order/omit
//
//
// MILKING HISTORY
//
// GET
//     /milk/history/:dairyId
//
// POST
//     /milk/history/:id/status
//
// ==========================================================
//
// IMPORTANT ARCHITECTURE
// ----------------------------------------------------------
//
// This route file does NOT determine:
//
//     • which farm belongs to a worker
//     • which farm is active
//     • farm production
//     • milk available
//     • milk sold
//     • farm revenue
//
// Those responsibilities belong to the farm-context layer
// and milkService respectively.
//
// ==========================================================