const express = require("express");

const router = express.Router();
const controller =
  require("../controllers/packagePaymentController");

// GET /packages/:id/payment-summary
router.get(
  "/:id/payment-summary",
  controller.summary
);

module.exports = router;
