// ==========================================================
// routes/addOns.js
// ADD-ONS ROUTES
// ==========================================================
//
// CASH FLOW REPORT:
//
//     GET /cash/:id
//
// `:id`
//
//     MongoDB ObjectId of the Dairy whose financial history
//     is being viewed.
//
// Optional query:
//
//     ?date=YYYY-MM-DD
//
// Example:
//
//     /cash/66c123456789abcdef123456
//
//     /cash/66c123456789abcdef123456?date=2026-08-26
//
// ==========================================================


const express =
    require("express");

const router =
    express.Router();


// ==========================================================
// CONTROLLER
// ==========================================================

const reportController =
    require("../controllers/addOns/report");


// ==========================================================
// CASH FLOW / FINANCIAL REPORT
// ==========================================================

router.get(

    "/cash/:id",

    reportController

);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;