// ==========================================================
// verrah/routes/products.js
// PRODUCT + CATEGORY ROUTES
// ==========================================================

const express = require("express");

const router = express.Router();

// ----------------------------------------------------------
// CONTROLLERS
// ----------------------------------------------------------

const controller =
  require("../controllers/products");

const categoryController =
  require("../controllers/categoryController");

// ----------------------------------------------------------
// MIDDLEWARE
// ----------------------------------------------------------

const requireLogin =
  require("../middleware/requireLogin");

const requireAdmin =
  require("../middleware/requireAdmin");

const categoryUpload =
  require("../middleware/imageUpload");

// ==========================================================
// PRODUCTS
// ==========================================================

// Product listing
router.get(
  "/",
  controller.list
);

// ==========================================================
// CATEGORY
// ==========================================================

// ----------------------------------------------------------
// ADD CATEGORY FORM
// GET /products/category/add
// ----------------------------------------------------------

router.get(
  "/category/add",
  requireAdmin,
  categoryController.addForm
);

// ----------------------------------------------------------
// CREATE CATEGORY
// POST /products/category/add
//
// The middleware:
//
// 1. Parses multipart/form-data
// 2. Accepts one category image
// 3. Places it in public/uploads/categories
// 4. Makes the file available as req.file
// 5. Makes text fields available as req.body
// ----------------------------------------------------------

router.post(
  "/category/add",
  requireAdmin,
  categoryUpload.single("categoryIcon"),
  categoryController.create
);

// ----------------------------------------------------------
// EDIT CATEGORY FORM
// GET /products/category/add/:id
//
// Used by the admin Edit button.
//
// Example:
// /products/category/add/68abc123...
// ----------------------------------------------------------

router.get(
  "/category/add/:id",
  requireAdmin,
  categoryController.editForm
);

// ----------------------------------------------------------
// UPDATE CATEGORY
// POST /products/category/add/:id
//
// The same image upload middleware is used so the admin
// can optionally replace the existing category image.
// ----------------------------------------------------------

router.post(
  "/category/add/:id",
  requireAdmin,
  categoryUpload.single("categoryIcon"),
  categoryController.update
);

// ----------------------------------------------------------
// CATEGORY PRODUCTS
// GET /products/category/:id
// ----------------------------------------------------------

router.get(
  "/category/:id",
  categoryController.products
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

// ==========================================================
// EXPORT
// ==========================================================

module.exports = router;