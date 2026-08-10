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
// Replace this path only if your project uses a different
// authentication middleware.
// ==========================================================

const auth =
    require("../middleware/auth");


// ==========================================================
// FINANCIAL SUMMARY
// ==========================================================
//
// View:
//
//     views/financials/summary.ejs
//
// URL:
//
//     /financials/summary
//
// Supports:
//
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
// ==========================================================

router.get(

    "/summary",

    auth,

    financialsController
        .getFinancialSummaryPage

);


// ==========================================================
// LIABILITY ENTRY
// ==========================================================
//
// View:
//
//     views/financials/liability.ejs
//
// URL:
//
//     /financials/liability
//
// Used for:
//
//     - displaying the liability entry form
//     - selecting a dairy / asset
//     - entering a liability
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
// Creates a new liability record.
// ==========================================================

router.post(

    "/liability",

    auth,

    financialsController
        .recordLiability

);


// ==========================================================
// LIABILITY HISTORY
// ==========================================================
//
// View:
//
//     views/financials/history.ejs
//
// URL:
//
//     /financials/history
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
// Farm-owned liabilities remain visible here even though
// they are excluded from farm totalLiabilities calculations.
// ==========================================================

router.get(

    "/history",

    auth,

    financialsController
        .getLiabilityHistoryPage

);


// ==========================================================
// INDIVIDUAL DAIRY / ASSET FINANCIALS
// ==========================================================
//
// View:
//
//     views/financials/dairy.ejs
//
// URL:
//
//     /financials/dairy/:id
//
// Supports:
//
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
//
// Displays:
//
//     - current worth
//     - period liabilities
//     - period profit/loss
//     - asset details
//     - liability history
// ==========================================================

router.get(

    "/dairy/:id",

    auth,

    financialsController
        .getDairyFinancialPage

);


// ==========================================================
// API: INDIVIDUAL DAIRY / ASSET FINANCIALS
// ==========================================================
//
// URL:
//
//     /financials/api/dairy/:id
//
// Returns financial data for a single dairy / asset.
//
// This is kept separate from the EJS page route.
// ==========================================================

router.get(

    "/api/dairy/:id",

    auth,

    financialsController
        .getDairyFinancialApi

);


// ==========================================================
// API: FINANCIAL SUMMARY
// ==========================================================
//
// URL:
//
//     /financials/api/summary
//
// Supports:
//
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
//
// Returns the financial summary as JSON.
// ==========================================================

router.get(

    "/api/summary",

    auth,

    financialsController
        .getFinancialSummaryApi

);


// ==========================================================
// EXPORT ROUTER
// ==========================================================

module.exports =
    router;