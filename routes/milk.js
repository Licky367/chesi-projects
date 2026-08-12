const express = require("express");

const router = express.Router();


// ==========================================================
// CONTROLLERS
// ==========================================================

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
   * Make the authenticated user available
   * to controllers and services.
   */

  req.user =
    req.session.user;


  next();
};


// ==========================================================
// MILK COLLECTION
// ==========================================================
//
// All routes in this section are handled by:
//
//     milkController
//
// milkController should use:
//
//     services/milkService.js
//
// There is NO sales logic here.
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
 * Create milk records
 *
 * POST /milk
 *
 * Used by the milk collection forms.
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
 * Edit an existing milk record
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
 * Display milk-record edit page
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
//
// Statistics here are MILK PRODUCTION statistics.
//
// Sales are NOT handled by milkService.
// ==========================================================


/*
 * Get milk statistics
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
 * Save daily milk statistics / milk price
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
 * Get milking history for one animal
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
// ==========================================================
//
// IMPORTANT:
//
// Sales are completely separated from milkService.
//
// These routes are handled ONLY by:
//
//     salesController
//
// salesController should use its own:
//
//     services/salesService.js
//
// milkController / milkService.js must NOT handle:
//
//     • manual sales
//     • standing-order sales
//     • sales page data
//     • sales totals
//     • sales consumption
//     • sales cash
//     • standing-order processing
// ==========================================================


/*
 * Display sales page
 *
 * GET /sales
 *
 * Administrator:
 *     GET /sales
 *     GET /sales?farmId=<ID>
 *
 * Dairy worker:
 *     GET /sales
 *
 * salesController determines what the
 * authenticated user is allowed to see.
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
 * Permission checking belongs to
 * salesController / salesService.
 */

router.post(
  "/sales/price",
  requireLogin,
  salesController.updateMilkPrice
);


// ==========================================================
// STANDING ORDERS
// ==========================================================
//
// Standing orders belong to the SALES module.
//
// They are therefore handled by:
//
//     salesController
//
// and NOT milkController.
// ==========================================================


/*
 * Add a standing order
 *
 * POST /sales/standing
 */

router.post(
  "/sales/standing",
  requireLogin,
  salesController.addStandingOrder
);


/*
 * Process today's standing-order sale
 *
 * POST /sales/standing/submit
 */

router.post(
  "/sales/standing/submit",
  requireLogin,
  salesController.submitStandingOrderSale
);


/*
 * Omit/deactivate a standing order
 *
 * POST /sales/standing/omit
 */

router.post(
  "/sales/standing/omit",
  requireLogin,
  salesController.omitStandingOrder
);


// ==========================================================
// EXPORT ROUTER
// ==========================================================

module.exports = router;