// ==========================================================
// verrah/routes/deposit.js
//
// VERRAH COSMETICS
// DAILY CASH DEPOSIT ROUTES
// ==========================================================

const express = require("express");

const router = express.Router();

const depositController =
    require("../controllers/deposit");


const depositToggle =
    require("../controllers/depositToggle");

const requireAdmin = require("../middleware/requireAdmin");


// ==========================================================
// M-PESA CALLBACK
//
// Must come before /:id so "mpesa" is not treated as an ID.
// ==========================================================

router.post(
    "/mpesa/callback",
    depositController.mpesaCallback
);


// ==========================================================
// DAILY CASH DEPOSIT PAGE
//
// GET /deposit/:id
// ==========================================================

router.get(
    "/:id",
    depositController.showDeposit
);


// ==========================================================
// INITIATE STK PUSH
//
// POST /deposit/:id/pay
// ==========================================================

router.post(
    "/:id/pay",
    depositController.initiatePayment
);


// ==========================================================
// Change Deposit Status
//
// POST /deposit/:id/depositToggle
// ==========================================================

router.post(
    "/:id/toggleDeposit",
    requireAdmin,
    toggleDailyCashSaleDeposit
);


module.exports = router;