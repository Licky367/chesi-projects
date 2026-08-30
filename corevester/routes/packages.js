const express =
  require("express");

const router =
  express.Router();

const controller =
  require("../controllers/packages");

const paymentController =
  require("../controllers/packagePaymentController");

const requireLogin =
  require("../middleware/requireLogin");

router.get(
  "/",
  requireLogin,
  controller.list
);

// ---------------------------------------------------------
// IMPORTANT:
// These specific routes MUST come before /:id.
// ---------------------------------------------------------

router.get(
  "/:id/payment-summary",
  requireLogin,
  controller.paymentSummary
);

router.post(
  "/:id/payment-summary/verify",
  requireLogin,
  paymentController.verify
);

router.get(
  "/:id/payment-summary/status",
  requireLogin,
  paymentController.status
);

// Existing STK route retained.
router.post(
  "/:id/pay",
  requireLogin,
  controller.pay
);

// Generic package route MUST remain last.
router.get(
  "/:id",
  requireLogin,
  controller.details
);

module.exports =
  router;
