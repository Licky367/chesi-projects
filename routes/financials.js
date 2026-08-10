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
//
// Replace this with your project's existing authentication
// middleware if the middleware has a different path/name.
//
// Server-side authentication is required.
// ==========================================================

const auth =
    require("../middleware/auth");


// ==========================================================
// FINANCIAL HOME / SUMMARY
// ==========================================================

router.get(

    "/",

    auth,

    financialsController
        .getFinancialSummaryPage

);


// ==========================================================
// LIABILITY ENTRY PAGE
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

router.post(

    "/liability",

    auth,

    financialsController
        .recordLiability

);


// ==========================================================
// LIABILITY HISTORY
// ==========================================================

router.get(

    "/history",

    auth,

    financialsController
        .getLiabilityHistoryPage

);


// ==========================================================
// INDIVIDUAL DAIRY FINANCIALS
// ==========================================================

router.get(

    "/dairy/:id",

    auth,

    financialsController
        .getDairyFinancialPage

);


// ==========================================================
// API: INDIVIDUAL DAIRY FINANCIALS
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

router.get(

    "/api/summary",

    auth,

    financialsController
        .getFinancialSummaryApi

);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;