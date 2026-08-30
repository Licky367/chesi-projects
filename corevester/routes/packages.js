// =========================================================
// routes/packages.js
// =========================================================
const express = require("express");

const router = express.Router();

const controller = require("../controllers/packages");
const requireLogin = require("../middleware/requireLogin");

router.get("/", requireLogin, controller.list);

router.get("/:id", requireLogin, controller.details);

// Start an M-Pesa payment for an existing package.
// This is primarily used for packages originally created
// with "Pay on delivery".
router.post("/:id/pay", requireLogin, controller.pay);

module.exports = router;
