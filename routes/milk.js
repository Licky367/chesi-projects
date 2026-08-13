// ==========================================================
// routes/milk.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Complete milk module routes.
//
// ==========================================================


const express =
    require("express");


const router =
    express.Router();


// ==========================================================
// CONTROLLERS
// ==========================================================

const milkCollectController =
    require("../controllers/milkCollectController");


const milkController =
    require("../controllers/milkController");


// ==========================================================
// MILK COLLECTION
// ==========================================================


// GET /milk
router.get(
    "/milk",
    milkCollectController.getMilkPage
);


// POST /milk
router.post(
    "/milk",
    milkCollectController.submitMilk
);


// ==========================================================
// MILK RECORD EDITING
// ==========================================================


// GET /milk/edit/:id
router.get(
    "/milk/edit/:id",
    milkCollectController.getEditMilk
);


// POST /milk/:id
router.post(
    "/milk/:id",
    milkCollectController.updateMilkRecord
);


// ==========================================================
// MILK STATISTICS
// ==========================================================

router.get(
    "/stats",
    milkController.getMilkStats
);


router.post(
    "/stats/day",
    milkController.saveDailyStats
);


// ==========================================================
// MILK SALES
// ==========================================================

router.get(
    "/sales",
    milkController.getSalesPage
);


router.post(
    "/sales/manual",
    milkController.submitManualSale
);


router.post(
    "/sales/standing-order",
    milkController.submitStandingOrderSale
);


router.post(
    "/sales/price",
    milkController.updateMilkPrice
);


// ==========================================================
// STANDING ORDERS
// ==========================================================

router.post(
    "/sales/standing-order/add",
    milkController.addStandingOrder
);


router.post(
    "/sales/standing-order/omit",
    milkController.omitStandingOrder
);


// ==========================================================
// MILKING HISTORY
// ==========================================================

router.get(
    "/milk/history/:dairyId",
    milkController.getMilkingHistory
);


// ==========================================================
// MILKING STATUS
// ==========================================================

router.post(
    "/milk/history/:id/status",
    milkController.toggleMilkingStatus
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;