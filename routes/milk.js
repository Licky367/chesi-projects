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

const express = require("express");

const router = express.Router();

const milkController = require("../controllers/milkController");


// ==========================================================
// MILK COLLECTION
// ==========================================================

// GET /milk
// ----------------------------------------------------------
// Displays the milk collection page.
router.get(
    "/milk",
    milkController.getMilkPage
);


// POST /milk
// ----------------------------------------------------------
// Submits one animal's milk record.
router.post(
    "/milk",
    milkController.submitMilk
);


// ==========================================================
// MILK RECORD EDITING
// ==========================================================

// GET /milk/edit/:id
// ----------------------------------------------------------
// Opens the edit state for a milk record.
router.get(
    "/milk/edit/:id",
    milkController.getEditMilk
);


// POST /milk/:id
// ----------------------------------------------------------
// Updates an existing milk record.
router.post(
    "/milk/:id",
    milkController.updateMilkRecord
);


// ==========================================================
// MILK STATISTICS
// ==========================================================

// GET /stats
// ----------------------------------------------------------
// Displays daily or monthly milk statistics.
//
// Examples:
//
// /milkStats
// /milkStats?type=day&date=2026-08-13
// /milkStats?type=month&month=2026-08
//
router.get(
    "/stats",
    milkController.getMilkStats
);


// POST /tats/day
// ----------------------------------------------------------
// Saves daily milk statistics / milk price.
router.post(
    "/tats/day",
    milkController.saveDailyStats
);


// ==========================================================
// MILK SALES
// ==========================================================

// GET /sales
// ----------------------------------------------------------
// Displays the milk sales page.
router.get(
    "/sales",
    milkController.getSalesPage
);


// POST /sales/manual
// ----------------------------------------------------------
// Submits a manual milk sale.
router.post(
    "/sales/manual",
    milkController.submitManualSale
);


// POST /sales/standing-order
// ----------------------------------------------------------
// Submits a standing-order milk sale.
router.post(
    "/sales/standing-order",
    milkController.submitStandingOrderSale
);


// POST /sales/price
// ----------------------------------------------------------
// Updates the current milk price.
// ADMIN ONLY.
router.post(
    "/sales/price",
    milkController.updateMilkPrice
);


// POST /sales/standing-order
// ----------------------------------------------------------
// Adds a new standing order.
router.post(
    "/sales/standing-order/add",
    milkController.addStandingOrder
);


// POST /sales/standing-order/omit
// ----------------------------------------------------------
// Omits an existing standing order.
router.post(
    "/sales/standing-order/omit",
    milkController.omitStandingOrder
);


// ==========================================================
// MILKING HISTORY
// ==========================================================

// GET /milk/history/:dairyId
// ----------------------------------------------------------
// Displays the milking history for one dairy animal.
//
// Example:
//
// /milk/history/64xxxxxxxxxxxxxxxxxxxxxxxx
//
// Optional:
//
// /milk/history/64xxxxxxxxxxxxxxxxxxxxxxxx?month=2026-08
//
router.get(
    "/milk/history/:dairyId",
    milkController.getMilkingHistory
);


// ==========================================================
// MILKING STATUS
// ==========================================================

// POST /milk/history/:id/status
// ----------------------------------------------------------
// Toggles whether an animal is currently being milked.
// ADMIN ONLY.
router.post(
    "/milk/history/:id/status",
    milkController.toggleMilkingStatus
);


// ==========================================================
// EXPORT ROUTER
// ==========================================================

module.exports = router;