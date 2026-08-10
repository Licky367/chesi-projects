// ==========================================================
// routes/financials.js
// ==========================================================

const express = require("express");

const router = express.Router();

const financialsController =
    require("../controllers/financialsController");

const auth =
    require("../middleware/auth");


// ==========================================================
// FINANCIAL SUMMARY
// ==========================================================
//
// GET /financials/summary
//
// Supports:
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
// ==========================================================

router.get(
    "/summary",
    auth,
    financialsController.getFinancialSummaryPage
);


// ==========================================================
// LIABILITY ENTRY
// ==========================================================
//
// GET /financials/liability
// ==========================================================

router.get(
    "/liability",
    auth,
    financialsController.getLiabilityEntryPage
);


// ==========================================================
// RECORD LIABILITY
// ==========================================================
//
// POST /financials/liability
// ==========================================================

router.post(
    "/liability",
    auth,
    financialsController.recordLiability
);


// ==========================================================
// LIABILITY HISTORY
// ==========================================================
//
// GET /financials/history
//
// Supports:
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
// ==========================================================

router.get(
    "/history",
    auth,
    financialsController.getLiabilityHistoryPage
);


// ==========================================================
// INDIVIDUAL DAIRY / ASSET FINANCIAL PAGE
// ==========================================================
//
// GET /financials/dairy/:id
//
// Supports:
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
// ==========================================================

router.get(
    "/dairy/:id",
    auth,
    financialsController.getDairyFinancialPage
);


// ==========================================================
// FARM FINANCIAL PAGE
// ==========================================================
//
// GET /financials/farm/:id
//
// Supports:
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
// ==========================================================

router.get(
    "/farm/:id",
    auth,
    financialsController.getFarmFinancialPage
);


// ==========================================================
// STANDALONE ASSETS FINANCIAL PAGE
// ==========================================================
//
// GET /financials/standalone
//
// This is a collection page.
//
// Supports:
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
//
// Displays all standalone assets:
//
//     code === null
//     assetCode === null
//
// Current values:
//
//     currentWorth
//     buyingPrice
//     sellingPrice
//
// Period values:
//
//     revenue
//     liabilities
//     profit/loss
// ==========================================================

router.get(
    "/standalone",
    auth,
    financialsController.getStandaloneFinancialPage
);


// ==========================================================
// API: FINANCIAL SUMMARY
// ==========================================================
//
// GET /financials/api/summary
//
// Supports:
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
// ==========================================================

router.get(
    "/api/summary",
    auth,
    financialsController.getFinancialSummaryApi
);


// ==========================================================
// API: INDIVIDUAL DAIRY / ASSET
// ==========================================================
//
// GET /financials/api/dairy/:id
//
// Supports:
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
// ==========================================================

router.get(
    "/api/dairy/:id",
    auth,
    financialsController.getDairyFinancialApi
);


// ==========================================================
// API: INDIVIDUAL FARM
// ==========================================================
//
// GET /financials/api/farm/:id
//
// Supports:
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
// ==========================================================

router.get(
    "/api/farm/:id",
    auth,
    financialsController.getFarmFinancialApi
);


// ==========================================================
// API: ALL STANDALONE ASSETS
// ==========================================================
//
// GET /financials/api/standalone
//
// Supports:
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
//
// Returns the standalone asset collection together with
// current values and filtered financial values.
// ==========================================================

router.get(
    "/api/standalone",
    auth,
    financialsController.getStandaloneFinancialApi
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports = router;