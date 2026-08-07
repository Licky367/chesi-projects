const express = require("express");
const router = express.Router();

const nursingController = require("../controllers/nursingController");

// existing routes
router.get("/", nursingController.renderNursingList);
router.post("/purchase", nursingController.createPurchase);

router.get("/:id", nursingController.renderBatchDetails);

router.post("/:id/death", nursingController.recordDeath);
router.post("/:id/sell", nursingController.sellPoultry);
router.post("/:id/cage", nursingController.cageBatch);

// NEW ROUTE (IMPORTANT)
router.post("/:id/eggs", nursingController.collectEggs);

module.exports = router;