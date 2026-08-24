// ==========================================================
// routes/milkSales.js
// ==========================================================
//
// ROUTES:
//
//     GET  /milk/sales
//     POST /milk/sales/price
//     POST /milk/sales/sell
//
// ==========================================================


const express =
    require("express");


const router =
    express.Router();


const milkSalesController =
    require("../controllers/milkSalesController");


// ==========================================================
// AUTH MIDDLEWARE
//
// Replace this with the exact middleware used by your project.
// ==========================================================

const {
    isAuthenticated
} =
    require("../middleware/auth");


// ==========================================================
// MILK SALES PAGE
// ==========================================================

router.get(
    "/sales",

    isAuthenticated,

    milkSalesController.getMilkSalesPage
);


// ==========================================================
// UPDATE PRICE
//
// ADMIN ONLY
// ==========================================================

router.post(
    "/sales/price",

    isAuthenticated,

    milkSalesController.updateMilkPrice
);


// ==========================================================
// SELL MILK
// ==========================================================

router.post(
    "/sales/sell",

    isAuthenticated,

    milkSalesController.sellMilk
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;