console.log("... Loading routes/corevester/products.js");
const express = require("express");
const router = express.Router();

let productsController;
try {
    productsController = require("../../controllers/corevester/productsController");
    console.log("✅ productsController loaded in routes");
} catch (err) {
    console.error("❌ FAILED to load productsController inside routes/corevester/products.js");
    console.error(err.message);
    console.error(err.stack);
    // Return a dummy router that shows error instead of crashing
    router.get("/", (req,res)=> res.status(500).send("Controller load failed: " + err.message + "<pre>" + err.stack + "</pre>"));
    module.exports = router;
    return;
}

router.get("/", productsController.productsPage);
router.post("/add-to-cart", productsController.addToCart);
router.post("/remove-from-cart", productsController.removeFromCart);
router.get("/:id", productsController.productDetails);

console.log("✅ routes/corevester/products.js loaded");
module.exports = router;