const express = require("express");
const router = express.Router();
const controller = require("../controllers/incubationController");

router.get("/", controller.renderIncubationPage);
router.post("/create", controller.createIncubation);
router.post("/end/:id", controller.endIncubation);

module.exports = router;