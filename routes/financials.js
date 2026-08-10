// ==========================================================
// routes/financials.js
// ==========================================================

const express =
    require("express");

const router =
    express.Router();


// ==========================================================
// CONTROLLERS
// ==========================================================

const financialsController =
    require("../controllers/financialsController");

const standaloneController =
    require("../controllers/standaloneController");


// ==========================================================
// AUTHENTICATION
// ==========================================================
//
// All financial routes require server-side authentication.
//
// Client-side JavaScript must NOT be relied upon for
// financial authorization.
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
// ==========================================================

router.get(

    "/farm/:id",

    auth,

    financialsController
        .getFarmFinancialPage

);


// ==========================================================
// STANDALONE ASSETS FINANCIAL PAGE
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
// IMPORTANT:
//
// This page is handled by a dedicated controller:
//
//     standaloneController
//
// The page displays ALL Dairy records that qualify as
// standalone assets.
//
// A standalone asset is:
//
//     code      -> empty
//     assetCode -> empty
//
// The page is therefore NOT an individual asset detail
// page and does NOT use:
//
//     /standalone/:id
//
// The controller is responsible for obtaining the complete
// standalone financial dataset required by standalone.ejs.
// ==========================================================

router.get(

    "/standalone",

    auth,

    standaloneController
        .getStandalonePage

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
// ==========================================================

router.get(

    "/api/farm/:id",

    auth,

    financialsController
        .getFarmFinancialApi

);


// ==========================================================
// API: ALL STANDALONE ASSETS
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
// This API remains on financialsController for now.
//
// We can move it to standaloneController later if the
// standalone page requires a dedicated API.
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