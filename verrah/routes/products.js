// ==========================================================
// routes/products.js
// PRODUCT ROUTES
// ==========================================================

const express = require("express");

const router =
  express.Router();

const controller =
  require("../controllers/products");

const categoryController =
  require("../controllers/categoryController");

const requireLogin =
  require("../middleware/requireLogin");

// ==========================================================
// PRODUCTS
// ==========================================================

router.get(
  "/",
  controller.list
);

// ==========================================================
// CATEGORY
// ==========================================================
//
// IMPORTANT:
// This MUST appear before /:id.
//
// Otherwise:
// /products/category/add
//
// could be interpreted as:
//
// /products/:id
//
// with id = "category".
//
// ==========================================================

router.get(
  "/category/add",
  categoryController.addForm
);

router.post(
  "/category/add",
  categoryController.create
);

// ==========================================================
// PRODUCT DETAILS
// ==========================================================

router.get(
  "/:id",
  controller.details
);

// ==========================================================
// ADD PRODUCT TO CART
// ==========================================================

router.post(
  "/:id/cart",
  requireLogin,
  controller.addToCart
);

module.exports = router;