// ==========================================================
// routes/milk.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Routes for the complete milk module:
//
// MILK COLLECTION
// ----------------------------------------------------------
// • GET  /milk
// • POST /milk
// • GET  /milk/edit/:id
// • POST /milk/:id
//
// OTHER MILK FEATURES
// ----------------------------------------------------------
// • Milk statistics
// • Daily statistics
// • Milk sales
// • Standing orders
// • Milk pricing
// • Milking history
// • Milking status
//
// ==========================================================


const express =
    require("express");


const router =
    express.Router();


// ==========================================================
// CONTROLLERS
// ==========================================================


// ==========================================================
// MILK COLLECTION CONTROLLER
// ==========================================================
//
// Responsible for:
//
// • Milk recording page
// • Milk record submission
// • Milk record editing
//
// ==========================================================

const milkCollectController =
    require("../controllers/milkCollectController");


// ==========================================================
// GENERAL MILK CONTROLLER
// ==========================================================
//
// Responsible for:
//
// • Milk statistics
// • Daily statistics
// • Milk sales
// • Standing orders
// • Milk pricing
// • Milking history
// • Milking status
//
// ==========================================================

const milkController =
    require("../controllers/milkController");


// ==========================================================
// MILK COLLECTION
// ==========================================================


// ==========================================================
// GET /milk
// ==========================================================
//
// Displays today's milk recording page.
//
// ==========================================================

router.get(
    "/milk",
    milkCollectController.getMilkPage
);


// ==========================================================
// POST /milk
// ==========================================================
//
// Saves today's milk records.
//
// ==========================================================

router.post(
    "/milk",
    milkCollectController.submitMilk
);


// ==========================================================
// MILK RECORD EDITING
// ==========================================================


// ==========================================================
// GET /milk/edit/:id
// ==========================================================
//
// Opens an existing milk record for editing.
//
// ADMIN ONLY.
//
// The controller/service performs the authorization check.
//
// ==========================================================

router.get(
    "/milk/edit/:id",
    milkCollectController.getEditMilk
);


// ==========================================================
// POST /milk/:id
// ==========================================================
//
// Updates an existing milk record.
//
// ADMIN ONLY.
//
// The controller/service performs the authorization check.
//
// ==========================================================

router.post(
    "/milk/:id",
    milkCollectController.updateMilkRecord
);


// ==========================================================
// MILK STATISTICS
// ==========================================================


// ==========================================================
// GET /stats
// ==========================================================
//
// Examples:
//
//     /stats
//
//     /stats?type=day&date=2026-08-13
//
//     /stats?type=month&month=2026-08
//
// ==========================================================

router.get(
    "/stats",
    milkController.getMilkStats
);


// ==========================================================
// POST /stats/day
// ==========================================================
//
// Saves daily milk statistics.
//
// ==========================================================

router.post(
    "/stats/day",
    milkController.saveDailyStats
);


// ==========================================================
// MILK SALES
// ==========================================================


// ==========================================================
// GET /sales
// ==========================================================

router.get(
    "/sales",
    milkController.getSalesPage
);


// ==========================================================
// POST /sales/manual
// ==========================================================

router.post(
    "/sales/manual",
    milkController.submitManualSale
);


// ==========================================================
// POST /sales/standing-order
// ==========================================================

router.post(
    "/sales/standing-order",
    milkController.submitStandingOrderSale
);


// ==========================================================
// POST /sales/price
// ==========================================================
//
// ADMIN CONTROLLED.
//
// ==========================================================

router.post(
    "/sales/price",
    milkController.updateMilkPrice
);


// ==========================================================
// STANDING ORDERS
// ==========================================================


// ==========================================================
// POST /sales/standing-order/add
// ==========================================================

router.post(
    "/sales/standing-order/add",
    milkController.addStandingOrder
);


// ==========================================================
// POST /sales/standing-order/omit
// ==========================================================

router.post(
    "/sales/standing-order/omit",
    milkController.omitStandingOrder
);


// ==========================================================
// MILKING HISTORY
// ==========================================================


// ==========================================================
// GET /milk/history/:dairyId
// ==========================================================

router.get(
    "/milk/history/:dairyId",
    milkController.getMilkingHistory
);


// ==========================================================
// MILKING STATUS
// ==========================================================


// ==========================================================
// POST /milk/history/:id/status
// ==========================================================
//
// ADMIN CONTROLLED.
//
// ==========================================================

router.post(
    "/milk/history/:id/status",
    milkController.toggleMilkingStatus
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;