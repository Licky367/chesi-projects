// ==========================================================
// routes/milk.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Routes for the complete milk module.
//
// Mounted in server.js as:
//
//     app.use("/", milkRoutes);
//
// Therefore the final application URLs are:
//
//     /milk
//     /stats
//     /sales
//     /milk/history/:dairyId
//
// IMPORTANT
// ----------------------------------------------------------
// Changing an animal's `isMilking` status is a DAIRY
// PROFILE operation, not a milk-history operation.
//
// Therefore:
//
//     /dairy/:id/toggle-milking
//
// belongs in the dairy router.
//
// ==========================================================


const express =
    require("express");


const router =
    express.Router();


const milkCollectController =
    require("../controllers/milkCollectController");


const milkController =
    require("../controllers/milkController");


// ==========================================================
// 🥛 MILK COLLECTION
// ==========================================================
//
// GET  /milk
// POST /milk
//
// ==========================================================

router.get(
    "/milk",
    milkCollectController.getMilkPage
);


router.post(
    "/milk",
    milkCollectController.submitMilk
);



// ==========================================================
// 📊 MILK STATISTICS
// ==========================================================
//
// GET  /stats
//
// Examples:
//
//     /stats
//     /stats?type=day&date=2026-08-13
//     /stats?type=month&month=2026-08
//
// ==========================================================

router.get(
    "/stats",
    milkController.getMilkStats
);


// ==========================================================
// SAVE DAILY MILK STATISTICS
// ==========================================================
//
// POST /stats/day
//
// ==========================================================

router.post(
    "/stats/day",
    milkController.saveDailyStats
);



// ==========================================================
// 💰 MILK SALES
// ==========================================================
//
// GET /sales
//
// ==========================================================

router.get(
    "/sales",
    milkController.getSalesPage
);



// ==========================================================
// MANUAL SALE
// ==========================================================
//
// POST /sales/manual
//
// ==========================================================

router.post(
    "/sales/manual",
    milkController.submitManualSale
);



// ==========================================================
// STANDING ORDER SALE
// ==========================================================
//
// POST /sales/standing-order
//
// ==========================================================

router.post(
    "/sales/standing-order",
    milkController.submitStandingOrderSale
);



// ==========================================================
// MILK PRICE
// ==========================================================
//
// POST /sales/price
//
// Authorization is handled by the controller.
//
// ==========================================================

router.post(
    "/sales/price",
    milkController.updateMilkPrice
);



// ==========================================================
// ADD STANDING ORDER
// ==========================================================
//
// POST /sales/standing-order/add
//
// ==========================================================

router.post(
    "/sales/standing-order/add",
    milkController.addStandingOrder
);



// ==========================================================
// OMIT STANDING ORDER
// ==========================================================
//
// POST /sales/standing-order/omit
//
// ==========================================================

router.post(
    "/sales/standing-order/omit",
    milkController.omitStandingOrder
);



// ==========================================================
// 🐄 MILKING HISTORY
// ==========================================================
//
// GET /milk/history/:dairyId
//
// Examples:
//
//     /milk/history/6a6c7fb83fa21932d62e72bd
//
// Optional query:
//
//     ?month=2026-08
//
// IMPORTANT
// ----------------------------------------------------------
// The history controller must NOT require the animal to be
// assigned to a dairy farm.
//
// Any valid female dairy animal, or an animal whose code
// satisfies your even-code rule, can have its history viewed
// according to the controller's selection logic.
//
// ==========================================================

router.get(
    "/milk/history/:dairyId",
    milkController.getMilkingHistory
);



// ==========================================================
// MODULE EXPORT
// ==========================================================

module.exports =
    router;



// ==========================================================
// ROUTE SUMMARY
// ==========================================================
//
// GET
//
//     /milk
//     /stats
//     /sales
//     /milk/history/:dairyId
//
//
// POST
//
//     /milk
//     /stats/day
//     /sales/manual
//     /sales/standing-order
//     /sales/price
//     /sales/standing-order/add
//     /sales/standing-order/omit
//
// ==========================================================
//
// NOTE:
//
// There is intentionally NO:
//
//     /milk/history/:id/status
//
// here.
//
// `isMilking` belongs to the dairy profile:
//
//     /dairy/:id/toggle-milking
//
// That route must be defined in routes/dairy.js.
//
// ==========================================================