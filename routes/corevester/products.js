// =========================================================
// routes/corevester/products.js
// =========================================================

const express = require("express");

const router = express.Router();

const productsController = require(
    "../../controllers/corevester/productsController"
);

// =========================================================
// MARKETPLACE
// =========================================================

router.get(
    "/products",
    productsController.productsPage
);

router.get(
    "/products/:id",
    productsController.productDetails
);

// =========================================================
// CART
// =========================================================

router.post(
    "/products/add-to-cart",
    productsController.addToCart
);

router.post(
    "/products/update-cart-qty",
    productsController.updateCartQty
);

router.post(
    "/products/remove-from-cart",
    productsController.removeFromCart
);

// =========================================================
// ADMIN PRODUCTS
// =========================================================

router.post(
    "/admin/products/create",
    productsController.createProduct
);

router.delete(
    "/admin/products/:id",
    productsController.deleteProduct
);

module.exports = router;