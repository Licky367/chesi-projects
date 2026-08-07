const express = require("express");
const router = express.Router();

const controller = require("../controllers/poultryStatsController");

router.get("/", controller.renderStats);

module.exports = router;