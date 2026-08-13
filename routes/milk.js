// ==========================================================
// routes/milk.js
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
// Controllers:
//
//     controllers/milkCollectController.js
//     controllers/milkController.js
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
// GET  /stats
// POST /stats/day
//
// Examples:
//
//     GET /stats
//     GET /stats?type=day&date=2026-08-13
//     GET /stats?type=month&month=2026-08
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
// GET  /sales
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
// Admin only check is handled by controller.
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
// Optional query:
//
//     ?month=2026-08
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
// Admin only check is handled by controller.
//
// ==========================================================

router.post(
    "/milk/history/:id/status",
    milkController.toggleMilkingStatus
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
// GET
//     /milk
//     /stats
//     /sales
//     /milk/history/:dairyId
//
// POST
//     /milk
//     /stats/day
//     /sales/manual
//     /sales/standing-order
//     /sales/price
//     /sales/standing-order/add
//     /sales/standing-order/omit
//     /milk/history/:id/status
//
// ==========================================================