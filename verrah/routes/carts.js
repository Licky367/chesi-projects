// =========================================================
// routes/carts.js
// =========================================================
const express = require("express");
const router = express.Router();
const controller = require("../controllers/carts");
const requireLogin = require("../middleware/requireLogin");

router.get("/", requireLogin, controller.list);
router.get("/:id", requireLogin, controller.details);
router.post("/:id/remove", requireLogin, controller.remove);

router.post("/checkout", requireLogin, controller.checkout);

router.get("/payment/:id", requireLogin, controller.paymentPage);
router.get("/payment/:id/status", requireLogin, controller.paymentStatus);

module.exports = router;
