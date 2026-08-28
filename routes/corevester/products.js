const express = require("express");
const router = express.Router();
const productsController = require("../../controllers/corevester/productsController");

router.get("/", productsController.productsPage);
router.post("/add-to-cart", productsController.addToCart);
router.post("/remove-from-cart", productsController.removeFromCart);

// details LAST - otherwise / will be confused
router.get("/:id", productsController.productDetails);

module.exports = router;