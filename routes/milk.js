// ==========================================================
// routes/milk.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Routes for the complete milk module:
//
// • Milk collection
// • Milk record submission
// • Milk record editing
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


// ----------------------------------------------------------
// MILK COLLECTION CONTROLLER
// ----------------------------------------------------------
//
// Responsible ONLY for:
//
// • GET /milk
// • POST /milk
// • GET /milk/edit/:id
// • POST /milk/:id
//
// This controller does NOT belong to:
//
// • statistics
// • sales
// • standing orders
// • pricing
// • history
//
// ----------------------------------------------------------

const milkCollectController =
    require("../controllers/milkCollectController");


// ----------------------------------------------------------
// GENERAL MILK CONTROLLER
// ----------------------------------------------------------
//
// Responsible for:
//
// • Statistics
// • Sales
// • Standing orders
// • Milk pricing
// • Milking history
// • Milking status
//
// ----------------------------------------------------------

const milkController =
    require("../controllers/milkController");


// ==========================================================
// MILK COLLECTION
// ==========================================================


// ----------------------------------------------------------
// GET /milk
// ----------------------------------------------------------
//
// Milk collection page.
//
// ----------------------------------------------------------

router.get(
    "/milk",
    milkCollectController.getMilkPage
);


// ----------------------------------------------------------
// POST /milk
// ----------------------------------------------------------
//
// Submit milk collection records.
//
// ----------------------------------------------------------

router.post(
    "/milk",
    milkCollectController.submitMilk
);


// ==========================================================
// MILK RECORD EDITING
// ==========================================================


// ----------------------------------------------------------
// GET /milk/edit/:id
// ----------------------------------------------------------
//
// Open a milk record for editing.
//
// ADMIN ONLY.
//
// ----------------------------------------------------------

router.get(
    "/milk/edit/:id",
    milkCollectController.getEditMilk
);


// ----------------------------------------------------------
// POST /milk/:id
// ----------------------------------------------------------
//
// Update an existing milk record.
//
// ADMIN ONLY.
//
// ----------------------------------------------------------

router.post(
    "/milk/:id",
    milkCollectController.updateMilkRecord
);


// ==========================================================
// MILK STATISTICS
// ==========================================================


// ----------------------------------------------------------
// GET /stats
// ----------------------------------------------------------
//
// Examples:
//
// /stats
// /stats?type=day&date=2026-08-13
// /stats?type=month&month=2026-08
//
// ----------------------------------------------------------

router.get(
    "/stats",
    milkController.getMilkStats
);


// ----------------------------------------------------------
// POST /stats/day
// ----------------------------------------------------------
//
// Save daily milk statistics / milk price.
//
// ----------------------------------------------------------

router.post(
    "/stats/day",
    milkController.saveDailyStats
);


// ==========================================================
// MILK SALES
// ==========================================================


// ----------------------------------------------------------
// GET /sales
// ----------------------------------------------------------

router.get(
    "/sales",
    milkController.getSalesPage
);


// ----------------------------------------------------------
// POST /sales/manual
// ----------------------------------------------------------

router.post(
    "/sales/manual",
    milkController.submitManualSale
);


// ----------------------------------------------------------
// POST /sales/standing-order
// ----------------------------------------------------------

router.post(
    "/sales/standing-order",
    milkController.submitStandingOrderSale
);


// ----------------------------------------------------------
// POST /sales/price
// ----------------------------------------------------------
//
// ADMIN ONLY.
//
// ----------------------------------------------------------

router.post(
    "/sales/price",
    milkController.updateMilkPrice
);


// ==========================================================
// STANDING ORDERS
// ==========================================================


// ----------------------------------------------------------
// POST /sales/standing-order/add
// ----------------------------------------------------------

router.post(
    "/sales/standing-order/add",
    milkController.addStandingOrder
);


// ----------------------------------------------------------
// POST /sales/standing-order/omit
// ----------------------------------------------------------

router.post(
    "/sales/standing-order/omit",
    milkController.omitStandingOrder
);


// ==========================================================
// MILKING HISTORY
// ==========================================================


// ----------------------------------------------------------
// GET /milk/history/:dairyId
// ----------------------------------------------------------

router.get(
    "/milk/history/:dairyId",
    milkController.getMilkingHistory
);


// ==========================================================
// MILKING STATUS
// ==========================================================


// ----------------------------------------------------------
// POST /milk/history/:id/status
// ----------------------------------------------------------
//
// ADMIN ONLY.
//
// ----------------------------------------------------------

router.post(
    "/milk/history/:id/status",
    milkController.toggleMilkingStatus
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;