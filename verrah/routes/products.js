// =========================================================
// routes/products.js
// =========================================================
const express = require("express");
const router = express.Router();
const controller = require("../controllers/products");
const requireLogin = require("../middleware/requireLogin");

router.get("/", controller.list);
router.get("/:id", controller.details);
router.post("/:id/cart", requireLogin, controller.addToCart);

module.exports = router;
