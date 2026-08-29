// =========================================================
// routes/packages.js
// =========================================================
const express = require("express");
const router = express.Router();
const controller = require("../controllers/packages");
const requireLogin = require("../middleware/requireLogin");

router.get("/", requireLogin, controller.list);
router.get("/:id", requireLogin, controller.details);

module.exports = router;
