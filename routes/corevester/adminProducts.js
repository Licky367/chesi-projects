const express = require("express");
const router = express.Router();
const controller = require("../../controllers/corevester/adminProductsController");

router.get("/", controller.entryPage);
router.post("/create", controller.createProduct);
router.delete("/:id", controller.deleteProduct);

module.exports = router;