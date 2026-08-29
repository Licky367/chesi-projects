const express = require("express");
const router = express.Router();
const controller = require("../controllers/stock");

router.get("/", controller.list);

router.get("/new", controller.newStockForm);
router.post("/", controller.createStock);

router.get("/:id", controller.entry);
router.post("/:id", controller.createProduct);

module.exports = router;
