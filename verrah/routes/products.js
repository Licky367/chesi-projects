// =========================================================
// routes/products.js
// =========================================================

const express = require("express");

const router =
  express.Router();

const controller =
  require("../controllers/products");

const categoryProductsController =
  require(
    "../controllers/categoryProductsController"
  );

const requireLogin =
  require("../middleware/requireLogin");


// =========================================================
// ALL PRODUCTS
//
// GET /products
// =========================================================

router.get(
  "/",
  controller.list
);


// =========================================================
// PRODUCTS BY CATEGORY
//
// GET /products/category/:id
//
// IMPORTANT:
// This MUST come before /:id.
// Otherwise "category" can be interpreted as the :id.
// =========================================================

router.get(
  "/category/:id",
  categoryProductsController.list
);


// =========================================================
// PRODUCT DETAILS
//
// GET /products/:id
// =========================================================

router.get(
  "/:id",
  controller.details
);


// =========================================================
// ADD PRODUCT TO CART
//
// POST /products/:id/cart
// =========================================================

router.post(
  "/:id/cart",
  requireLogin,
  controller.addToCart
);


// =========================================================
// EXPORT
// =========================================================

module.exports = router;