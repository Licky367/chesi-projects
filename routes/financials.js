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

const auth =
    require("../middleware/auth");


// ==========================================================
// FINANCIAL SUMMARY
// ==========================================================
//
// GET:
//
//     /financials/summary
//
// View:
//
//     views/financials/summary.ejs
//
// FILTERED:
//
//     revenue
//     liabilities
//     profit/loss
//
// CURRENT:
//
//     currentWorth
//     buyingPrice
//     sellingPrice
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
// GET:
//
//     /financials/liability
//
// View:
//
//     views/financials/liability.ejs
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
// POST:
//
//     /financials/liability
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
// GET:
//
//     /financials/history
//
// View:
//
//     views/financials/history.ejs
//
// FILTER:
//
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
// ==========================================================

router.get(

    "/history",

    auth,

    financialsController
        .getLiabilityHistoryPage

);


// ==========================================================
// STANDALONE ASSETS
// ==========================================================
//
// GET:
//
//     /financials/standalone
//
// View:
//
//     views/financials/standalone.ejs
//
// IMPORTANT:
//
// This is a LIST PAGE.
//
// There is NO individual standalone asset page.
//
// Tapping "Standalone Assets" from the financial summary
// opens this page.
//
// The page displays a table containing ALL standalone
// assets.
//
// FILTERED:
//
//     revenue
//     liabilities
//     profit/loss
//
// CURRENT:
//
//     currentWorth
//     buyingPrice
//     sellingPrice
//
// Supports:
//
//     ?startDate=YYYY-MM-DD
//     ?endDate=YYYY-MM-DD
// ==========================================================

router.get(

    "/standalone",

    auth,

    financialsController
        .getStandaloneAssetsPage

);


// ==========================================================
// INDIVIDUAL DAIRY / ASSET
// ==========================================================
//
// GET:
//
//     /financials/dairy/:id
//
// View:
//
//     views/financials/dairy.ejs
//
// Used for an individual Dairy record.
//
// This can represent:
//
//     - animal
//     - farm asset
//     - identified Dairy record
//
// FILTERED:
//
//     revenue
//     liabilities
//     profit/loss
//
// CURRENT:
//
//     currentWorth
//     buyingPrice
//     sellingPrice
// ==========================================================

router.get(

    "/dairy/:id",

    auth,

    financialsController
        .getDairyFinancialPage

);


// ==========================================================
// FARM FINANCIAL PAGE
// ==========================================================
//
// GET:
//
//     /financials/farm/:id
//
// View:
//
//     views/financials/dairy.ejs
//
// Opened when a FARM is selected.
//
// Displays:
//
//     Farm
//     + all assets belonging to the farm
//
// FILTERED:
//
//     revenue
//     liabilities
//     profit/loss
//
// CURRENT:
//
//     currentWorth
//     buyingPrice
//     sellingPrice
// ==========================================================

router.get(

    "/farm/:id",

    auth,

    financialsController
        .getFarmFinancialPage

);


// ==========================================================
// API: FINANCIAL SUMMARY
// ==========================================================
//
// GET:
//
//     /financials/api/summary
//
// FILTERED:
//
//     revenue
//     liabilities
//     profit/loss
//
// CURRENT:
//
//     currentWorth
//     buyingPrice
//     sellingPrice
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
// GET:
//
//     /financials/api/dairy/:id
//
// FILTERED:
//
//     revenue
//     liabilities
//     profit/loss
//
// CURRENT:
//
//     currentWorth
//     buyingPrice
//     sellingPrice
// ==========================================================

router.get(

    "/api/dairy/:id",

    auth,

    financialsController
        .getDairyFinancialApi

);


// ==========================================================
// API: FARM
// ==========================================================
//
// GET:
//
//     /financials/api/farm/:id
//
// FILTERED:
//
//     revenue
//     liabilities
//     profit/loss
//
// CURRENT:
//
//     currentWorth
//     buyingPrice
//     sellingPrice
// ==========================================================

router.get(

    "/api/farm/:id",

    auth,

    financialsController
        .getFarmFinancialApi

);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;