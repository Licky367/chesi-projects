const express = require("express");

const router = express.Router();

const milkController = require("../controllers/milkController");

// ==================================================
// AUTHENTICATION MIDDLEWARE
// ==================================================

const requireLogin = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect("/login");
  }

  req.user = req.session.user;

  next();
};

// ==================================================
// MILK COLLECTION
// ==================================================

router.get(
  "/milk",
  requireLogin,
  milkController.getMilkPage
);

router.post(
  "/milk",
  requireLogin,
  milkController.submitMilk
);

// ==================================================
// MILK STATISTICS
// ==================================================

router.get(
  "/stats",
  requireLogin,
  milkController.getMilkStats
);

router.post(
  "/stats/day",
  requireLogin,
  milkController.saveDailyStats
);

// ==================================================
// MILKING HISTORY
// ONE SPECIFIC DAIRY ANIMAL
// ==================================================

router.get(
  "/milk/history/:dairyId",
  requireLogin,
  milkController.getMilkingHistory
);

// ==================================================
// MILKING STATUS
// ONE SPECIFIC DAIRY ANIMAL
// ==================================================

router.post(
  "/dairy/:id/toggle-milking",
  requireLogin,
  milkController.toggleMilkingStatus
);

// ==================================================
// SALES
// ==================================================

// Sales page

router.get(
  "/sales",
  requireLogin,
  milkController.getSalesPage
);

// Manual sale

router.post(
  "/sales/manual",
  requireLogin,
  milkController.submitManualSale
);

// Update milk price

router.post(
  "/sales/price",
  requireLogin,
  milkController.updateMilkPrice
);

// Submit one standing-order sale

router.post(
  "/sales/standing/submit",
  requireLogin,
  milkController.submitStandingOrderSale
);

// ==================================================
// STANDING ORDERS
// ==================================================

router.post(
  "/sales/standing",
  requireLogin,
  milkController.addStandingOrder
);

router.post(
  "/sales/standing/omit",
  requireLogin,
  milkController.omitStandingOrder
);

// ==================================================
// EXPORT
// ==================================================

module.exports = router;