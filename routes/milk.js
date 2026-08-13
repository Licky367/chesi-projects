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


// ==========================================================
// CONTROLLERS
// ==========================================================

// ----------------------------------------------------------
// Milk collection controller
//
// Handles:
//
// • GET /milk
// • POST /milk
// • Milk record editing
//
// ----------------------------------------------------------

const milkCollectController =
    require("../controllers/milkCollectController");


// ----------------------------------------------------------
// General milk controller
//
// Handles:
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

// GET /milk
// ----------------------------------------------------------
// Displays the "Record Today's Milk" page.
//
// The controller determines:
//
// • User role
// • Assigned farms
// • Eligible milking animals
// • Existing morning records
// • Existing evening records
//
// Admin:
//     Sees all farms.
//
// Dairy worker:
//     Sees only assigned farms.
//
// ----------------------------------------------------------

router.get(
    "/milk",
    milkCollectController.getMilkPage
);


// ==========================================================
// MILK RECORD SUBMISSION
// ==========================================================

// POST /milk
// ----------------------------------------------------------
// Creates or submits milk records.
//
// The collection controller is responsible for:
//
// • Validating the farm
// • Validating the animal
// • Checking that the animal is female
// • Checking isMilking === true
// • Checking farm ownership/assignment
// • Saving morning/evening records
// • Updating MilkSummary
// • Updating farmTotal
//
// ----------------------------------------------------------

router.post(
    "/milk",
    milkCollectController.submitMilk
);


// ==========================================================
// MILK RECORD EDITING
// ==========================================================

// GET /milk/edit/:id
// ----------------------------------------------------------
// Opens an existing milk record for editing.
//
// Admin only.
//
// ----------------------------------------------------------

router.get(
    "/milk/edit/:id",
    milkCollectController.getEditMilk
);


// POST /milk/:id
// ----------------------------------------------------------
// Updates an existing milk record.
//
// Admin only.
//
// ----------------------------------------------------------

router.post(
    "/milk/:id",
    milkCollectController.updateMilkRecord
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
// /stats
// /stats?type=day&date=2026-08-13
// /stats?type=month&month=2026-08
//
// ----------------------------------------------------------

router.get(
    "/stats",
    milkController.getMilkStats
);


// ==========================================================
// DAILY MILK STATISTICS
// ==========================================================

// POST /tats/day
// ----------------------------------------------------------
// Saves daily milk statistics / milk price.
//
// NOTE:
// The original route says "/tats/day".
// If this was a typo, it should probably be:
//
//     /stats/day
//
// ----------------------------------------------------------

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
// ----------------------------------------------------------

router.get(
    "/sales",
    milkController.getSalesPage
);


// POST /sales/manual
// ----------------------------------------------------------
// Submits a manual milk sale.
// ----------------------------------------------------------

router.post(
    "/sales/manual",
    milkController.submitManualSale
);


// POST /sales/standing-order
// ----------------------------------------------------------
// Submits a standing-order milk sale.
// ----------------------------------------------------------

router.post(
    "/sales/standing-order",
    milkController.submitStandingOrderSale
);


// POST /sales/price
// ----------------------------------------------------------
// Updates the current milk price.
//
// ADMIN ONLY.
// ----------------------------------------------------------

router.post(
    "/sales/price",
    milkController.updateMilkPrice
);


// ==========================================================
// STANDING ORDERS
// ==========================================================

// POST /sales/standing-order/add
// ----------------------------------------------------------
// Adds a new standing order.
// ----------------------------------------------------------

router.post(
    "/sales/standing-order/add",
    milkController.addStandingOrder
);


// POST /sales/standing-order/omit
// ----------------------------------------------------------
// Omits an existing standing order.
// ----------------------------------------------------------

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
// ----------------------------------------------------------

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
//
// ADMIN ONLY.
// ----------------------------------------------------------

router.post(
    "/milk/history/:id/status",
    milkController.toggleMilkingStatus
);


// ==========================================================
// EXPORT ROUTER
// ==========================================================

module.exports = router;