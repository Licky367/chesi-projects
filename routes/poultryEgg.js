const express = require("express");
const router = express.Router();
const controller = require("../controllers/eggController");

router.get("/", controller.renderEggPage);
router.post("/sell", controller.sellEggs);

module.exports = router;