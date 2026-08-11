const express = require("express");

const router = express.Router();

const milkController =
  require("../controllers/milkController");

// ==================================================
// AUTHENTICATION MIDDLEWARE
// ==================================================

const requireLogin = (req, res, next) => {

  if (
    !req.session ||
    !req.session.user
  ) {

    return res.redirect("/login");

  }

  req.user =
    req.session.user;

  next();

};


// ==================================================
// MILK COLLECTION
// ==================================================

// --------------------------------------------------
// MILK COLLECTION PAGE
// --------------------------------------------------

router.get(
  "/milk",
  requireLogin,
  milkController.getMilkPage
);


// --------------------------------------------------
// SUBMIT NEW MILK RECORDS
// --------------------------------------------------

router.post(
  "/milk",
  requireLogin,
  milkController.submitMilk
);


// --------------------------------------------------
// EDIT EXISTING MILK RECORD
// ADMIN ONLY
// --------------------------------------------------

router.post(
  "/milk/edit/:id",
  requireLogin,
  milkController.editMilkRecord
);


// ==================================================
// MILK STATISTICS
// ==================================================

// --------------------------------------------------
// MILK STATISTICS PAGE
// --------------------------------------------------

router.get(
  "/stats",
  requireLogin,
  milkController.getMilkStats
);


// --------------------------------------------------
// SAVE DAILY STATISTICS / PRICE
// --------------------------------------------------

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

// --------------------------------------------------
// SALES PAGE
// --------------------------------------------------

router.get(
  "/sales",
  requireLogin,
  milkController.getSalesPage
);


// --------------------------------------------------
// MANUAL SALE
// --------------------------------------------------

router.post(
  "/sales/manual",
  requireLogin,
  milkController.submitManualSale
);


// --------------------------------------------------
// UPDATE MILK PRICE
// --------------------------------------------------

router.post(
  "/sales/price",
  requireLogin,
  milkController.updateMilkPrice
);


// --------------------------------------------------
// STANDING ORDER SALE
// --------------------------------------------------

router.post(
  "/sales/standing/submit",
  requireLogin,
  milkController.submitStandingOrderSale
);


// ==================================================
// STANDING ORDERS
// ==================================================

// --------------------------------------------------
// ADD STANDING ORDER
// --------------------------------------------------

router.post(
  "/sales/standing",
  requireLogin,
  milkController.addStandingOrder
);


// --------------------------------------------------
// OMIT STANDING ORDER
// --------------------------------------------------

router.post(
  "/sales/standing/omit",
  requireLogin,
  milkController.omitStandingOrder
);


// ==================================================
// EXPORT
// ==================================================

module.exports = router;