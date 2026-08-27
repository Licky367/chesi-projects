const express = require("express");
const router = express.Router();
const controller = require("../../controllers/corevester/stockController");

router.get("/", controller.stockPage);
router.post("/create", controller.createStock);
router.put("/:id", controller.updateStock);
router.delete("/:id", controller.deleteStock);

module.exports = router;