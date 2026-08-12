const express = require("express");

const router = express.Router();

const milkController =
  require("../controllers/milkController");

const salesController =
  require("../controllers/salesController");


// ==========================================================
// AUTHENTICATION MIDDLEWARE
// ==========================================================

const requireLogin = (req, res, next) => {

  if (
    !req.session ||
    !req.session.user
  ) {

    return res.redirect("/login");

  }

  /*
   * Make the logged-in user available to:
   *
   * controllers
   * services
   * req.user
   */

  req.user =
    req.session.user;

  next();

};


// ==========================================================
// MILK COLLECTION
// ==========================================================

/*
 * Display milk collection page
 *
 * GET /milk
 */

router.get(
  "/milk",
  requireLogin,
  milkController.getMilkPage
);


/*
 * Create a new individual milk record
 *
 * POST /milk
 *
 * Used by the individual animal forms
 * in milk.ejs.
 */

router.post(
  "/milk",
  requireLogin,
  milkController.submitMilk
);


// ==========================================================
// EDIT MILK RECORD
// ADMIN ONLY
// ==========================================================

/*
 * Edit a milk record
 *
 * POST /milk/:id
 */

router.post(
  "/milk/:id",
  requireLogin,
  milkController.updateMilkRecord
);


/*
 * Compatibility route
 *
 * POST /milk/edit/:id
 */

router.post(
  "/milk/edit/:id",
  requireLogin,
  milkController.updateMilkRecord
);


/*
 * Compatibility GET route
 *
 * GET /milk/edit/:id
 */

router.get(
  "/milk/edit/:id",
  requireLogin,
  milkController.getEditMilk
);


// ==========================================================
// MILK STATISTICS
// ==========================================================

/*
 * Daily/monthly milk statistics
 *
 * GET /stats?type=day
 * GET /stats?type=month
 */

router.get(
  "/stats",
  requireLogin,
  milkController.getMilkStats
);


/*
 * Save daily milk statistics / price
 *
 * POST /stats/day
 */

router.post(
  "/stats/day",
  requireLogin,
  milkController.saveDailyStats
);


// ==========================================================
// MILKING HISTORY
// ==========================================================

/*
 * History for one dairy animal
 *
 * GET /milk/history/:dairyId
 */

router.get(
  "/milk/history/:dairyId",
  requireLogin,
  milkController.getMilkingHistory
);


// ==========================================================
// TOGGLE MILKING STATUS
// ==========================================================

/*
 * Toggle whether an animal is currently being milked.
 *
 * POST /dairy/:id/toggle-milking
 */

router.post(
  "/dairy/:id/toggle-milking",
  requireLogin,
  milkController.toggleMilkingStatus
);


// ==========================================================
// SALES
// SALES CONTROLLER
// ==========================================================

/*
 * Display sales page
 *
 * ADMIN:
 *
 * GET /sales
 * GET /sales?farmId=<ID>
 *
 * DAIRY WORKER:
 *
 * GET /sales
 *
 * The controller determines the appropriate farm
 * based on the logged-in user.
 */

router.get(
  "/sales",
  requireLogin,
  salesController.getSalesPage
);


/*
 * Record a manual milk sale
 *
 * POST /sales/manual
 */

router.post(
  "/sales/manual",
  requireLogin,
  salesController.submitManualSale
);


/*
 * Update milk selling price
 *
 * POST /sales/price
 *
 * Administrator only.
 *
 * The controller is responsible for enforcing
 * the administrator permission.
 */

router.post(
  "/sales/price",
  requireLogin,
  salesController.updateMilkPrice
);


// ==========================================================
// STANDING ORDERS
// ==========================================================

/*
 * Add a new standing order
 *
 * POST /sales/standing
 */

router.post(
  "/sales/standing",
  requireLogin,
  salesController.addStandingOrder
);


/*
 * Submit today's sale for a standing order
 *
 * POST /sales/standing/submit
 */

router.post(
  "/sales/standing/submit",
  requireLogin,
  salesController.submitStandingOrderSale
);


/*
 * Omit a standing order
 *
 * POST /sales/standing/omit
 */

router.post(
  "/sales/standing/omit",
  requireLogin,
  salesController.omitStandingOrder
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports = router;