const express = require("express");

const router = express.Router();

const milkController =
  require("../controllers/milkController");


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
 * IMPORTANT:
 *
 * The edit modal in milk.ejs uses:
 *
 *     POST /milk/:recordId
 *
 * Therefore this route MUST exist.
 *
 * Example:
 *
 *     POST /milk/68abc123...
 *
 * This is the route used when the administrator
 * taps "Edit" and saves the modal.
 */

router.post(
  "/milk/:id",
  requireLogin,
  milkController.updateMilkRecord
);


/*
 * Compatibility route.
 *
 * Keeps the older URL working if any existing page,
 * bookmark, form, or JavaScript still uses:
 *
 *     POST /milk/edit/:id
 *
 * It uses the same controller.
 */

router.post(
  "/milk/edit/:id",
  requireLogin,
  milkController.updateMilkRecord
);


/*
 * Compatibility GET route.
 *
 * If anything still links to:
 *
 *     /milk/edit/:id
 *
 * the controller redirects back to the milk page.
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
 *
 * Example:
 *
 * /milk/history/64abc123
 */

router.get(
  "/milk/history/:dairyId",
  requireLogin,
  milkController.getMilkingHistory
);


// ==========================================================
// TOGGLE MILKING STATUS
// ADMIN
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
// ==========================================================

/*
 * Sales page
 *
 * GET /sales
 */

router.get(
  "/sales",
  requireLogin,
  milkController.getSalesPage
);


/*
 * Manual sale
 *
 * POST /sales/manual
 */

router.post(
  "/sales/manual",
  requireLogin,
  milkController.submitManualSale
);


/*
 * Update milk selling price
 *
 * POST /sales/price
 */

router.post(
  "/sales/price",
  requireLogin,
  milkController.updateMilkPrice
);


/*
 * Submit a standing-order sale
 *
 * POST /sales/standing/submit
 */

router.post(
  "/sales/standing/submit",
  requireLogin,
  milkController.submitStandingOrderSale
);


// ==========================================================
// STANDING ORDERS
// ==========================================================

/*
 * Add standing order
 *
 * POST /sales/standing
 */

router.post(
  "/sales/standing",
  requireLogin,
  milkController.addStandingOrder
);


/*
 * Omit standing order
 *
 * POST /sales/standing/omit
 */

router.post(
  "/sales/standing/omit",
  requireLogin,
  milkController.omitStandingOrder
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports = router;