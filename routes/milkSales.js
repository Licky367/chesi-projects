// ==========================================================
// routes/milkSales.js
// ==========================================================
//
// MILK SALES ROUTES
//
// MOUNT:
//
//     app.use(
//         "/milk",
//         milkSalesRoutes
//     );
//
// FINAL ROUTES:
//
//     GET  /milk/sales
//
//     POST /milk/sales/price
//
//     POST /milk/sales/sell
//
// ==========================================================


const express =
    require("express");


const router =
    express.Router();


const milkSalesController =
    require(
        "../controllers/milkSalesController"
    );


// ==========================================================
// GET MILK SALES PAGE
// ==========================================================
//
// FINAL:
//
//     GET /milk/sales
//
// ==========================================================

router.get(
    "/sales",
    milkSalesController.getMilkSalesPage
);


// ==========================================================
// UPDATE MILK PRICE
// ==========================================================
//
// FINAL:
//
//     POST /milk/sales/price
//
// ==========================================================

router.post(
    "/sales/price",
    milkSalesController.updateMilkPrice
);


// ==========================================================
// SELL MILK
// ==========================================================
//
// FINAL:
//
//     POST /milk/sales/sell
//
// ==========================================================

router.post(
    "/sales/sell",
    milkSalesController.sellMilk
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;