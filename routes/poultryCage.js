const express = require("express");
const router = express.Router();
const controller = require("../controllers/cageController");

router.get("/", controller.renderCageList);

router.get("/:id", controller.renderCageDetails);

router.post("/:id/eggs", controller.collectEggs);
router.post("/:id/sell", controller.sellChicken);
router.post("/:id/dead", controller.recordDeadChicken);

module.exports = router;