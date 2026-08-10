// ==========================================================
// routes/financials.js
// ==========================================================

const express =
require("express");

const router =
express.Router();

const financialsController =
require("../controllers/financialsController");

// ==========================================================
// AUTHENTICATION
// ==========================================================
//
// All financial routes require server-side authentication.
//
// Client-side JavaScript must NOT be relied upon for
// financial authorization.
//
// Change this path only if your project uses a different
// authentication middleware.
// ==========================================================

const auth =
require("../middleware/auth");

// ==========================================================
// FINANCIAL SUMMARY PAGE
// ==========================================================
//
// View:
//
//     views/financials/summary.ejs
//
// URL:
//
//     GET /financials/summary
//
// Supports:
//
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
//
// Displays:
//
//     - total current worth
//     - total selling value
//     - total revenue
//     - total liabilities
//     - total profit/loss
//     - farms
//     - farm assets
//     - standalone assets
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

"/summary",

auth,

financialsController
.getFinancialSummaryPage

);

// ==========================================================
// LIABILITY ENTRY PAGE
// ==========================================================
//
// View:
//
//     views/financials/liability.ejs
//
// URL:
//
//     GET /financials/liability
//
// Used to:
//
//     - display liability form
//     - select a farm
//     - select a farm asset
//     - select a standalone asset
//     - record a liability
// ==========================================================

router.get(

"/liability",

auth,

financialsController
.getLiabilityEntryPage

);

// ==========================================================
// RECORD LIABILITY
// ==========================================================
//
// URL:
//
//     POST /financials/liability
//
// Creates a liability transaction.
//
// The transaction belongs directly to the selected
// Dairy record.
// ==========================================================

router.post(

"/liability",

auth,

financialsController
.recordLiability

);

// ==========================================================
// LIABILITY HISTORY PAGE
// ==========================================================
//
// View:
//
//     views/financials/history.ejs
//
// URL:
//
//     GET /financials/history
//
// Supports:
//
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
//
// Displays:
//
//     - standalone liabilities
//     - farm liabilities
//     - farm asset liabilities
//
// IMPORTANT:
//
// Farm-owned liabilities remain visible in history even
// when they are excluded from farm asset totals.
// ==========================================================

router.get(

"/history",

auth,

financialsController
.getLiabilityHistoryPage

);

// ==========================================================
// INDIVIDUAL DAIRY / ASSET FINANCIAL PAGE
// ==========================================================
//
// View:
//
//     views/financials/dairy.ejs
//
// URL:
//
//     GET /financials/dairy/:id
//
// Supports:
//
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
//
// Intended for an individual Dairy record.
//
// Depending on the record:
//
//     - animal
//     - farm asset
//     - other identified Dairy record
//
// Displays:
//
//     - current worth
//     - buying price
//     - selling price
//     - filtered revenue
//     - filtered liabilities
//     - filtered profit/loss
//     - liability history
// ==========================================================

router.get(

"/dairy/:id",

auth,

financialsController
.getDairyFinancialPage

);

// ==========================================================
// INDIVIDUAL FARM FINANCIAL PAGE
// ==========================================================
//
// View:
//
//     views/financials/dairy.ejs
//
// URL:
//
//     GET /financials/farm/:id
//
// Supports:
//
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
//
// Opened when a FARM name is selected.
//
// Displays:
//
//     FARM
//         - current worth
//         - buying price
//         - selling price
//         - revenue
//         - liabilities
//         - profit/loss
//
//     FARM ASSETS
//         - individual financial values
//
// Farm totals represent:
//
//     farm itself
//     + assets belonging to that farm
//
// Date filtering applies to:
//
//     revenue
//     liabilities
//     profit/loss
//
// Current values remain current.
// ==========================================================

router.get(

"/farm/:id",

auth,

financialsController
.getFarmFinancialPage

);

// ==========================================================
// STANDALONE ASSET PAGE
// ==========================================================
//
// View:
//
//     views/financials/standalone.ejs
//
// URL:
//
//     GET /financials/standalone
//
// Supports:
//
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
//
// Opened when a standalone asset name is selected.
//
// Displays:
//
//     - current worth
//     - buying price
//     - selling price
//     - filtered revenue
//     - filtered liabilities
//     - filtered profit/loss
//     - liability history
// ==========================================================

router.get(

"/standalone",

auth,

financialsController
.getStandaloneFinancialPage

);

// ==========================================================
// API: FINANCIAL SUMMARY
// ==========================================================
//
// URL:
//
//     GET /financials/api/summary
//
// Supports:
//
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
//
// Returns JSON.
//
// CURRENT:
//
//     currentWorth
//     buyingPrice
//     sellingPrice
//
// FILTERED:
//
//     revenue
//     liabilities
//     profit/loss
// ==========================================================

router.get(

"/api/summary",

auth,

financialsController
.getFinancialSummaryApi

);

// ==========================================================
// API: INDIVIDUAL DAIRY / ASSET
// ==========================================================
//
// URL:
//
//     GET /financials/api/dairy/:id
//
// Supports:
//
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
//
// Returns financial information for one Dairy record, whose code must be negative
// ==========================================================

router.get(

"/api/dairy/:id",

auth,

financialsController
.getDairyFinancialApi

);

// ==========================================================
// API: INDIVIDUAL FARM
// ==========================================================
//
// URL:
//
//     GET /financials/api/farm/:id
//
// Supports:
//
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
//
// Returns:
//
//     farm
//     assets
//     current values
//     filtered revenue
//     filtered liabilities
//     filtered profit/loss
// ==========================================================

router.get(

"/api/farm/:id",

auth,

financialsController
.getFarmFinancialApi

);

// ==========================================================
// API: ALL STANDALONE ASSET
// ==========================================================
//
// URL:
//
//     GET /financials/api/standalone
//
// Supports:
//
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
//
// Returns:
//
//     standalone asset
//     current values
//     filtered revenue
//     filtered liabilities
//     filtered profit/loss
// ==========================================================

router.get(

"/api/standalone",

auth,

financialsController
.getStandaloneFinancialApi

);

// ==========================================================
// EXPORT ROUTER
// ==========================================================

module.exports =
router;