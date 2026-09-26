// ==========================================================
// verrah/routes/products.js
// PRODUCT + CATEGORY ROUTES
// ==========================================================

const express =
  require("express");

const router =
  express.Router();


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
  require("../middleware/categoryUpload");


// ==========================================================
// PRODUCTS
// ==========================================================

// ----------------------------------------------------------
// PRODUCT LISTING
// GET /products
// ----------------------------------------------------------

router.get(
  "/",
  controller.list
);


// ----------------------------------------------------------
// PRODUCT SEARCH
// GET /products/search?q=...
// ----------------------------------------------------------

router.get(
  "/search",
  controller.search
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
// ----------------------------------------------------------

router.get(
  "/category/add/:id",
  requireAdmin,
  categoryController.editForm
);


// ----------------------------------------------------------
// UPDATE CATEGORY
// POST /products/category/add/:id
// ----------------------------------------------------------

router.post(
  "/category/add/:id",
  requireAdmin,
  categoryUpload.single("categoryIcon"),
  categoryController.update
);


// ==========================================================
// CATEGORY SUBCATEGORIES
// ==========================================================

// ----------------------------------------------------------
// DISPLAY CATEGORY SUBCATEGORIES
//
// GET /products/category/:id/categories
//
// Displays the category together with all its subcategories.
// ----------------------------------------------------------

router.get(
  "/category/:id/categories",
  requireAdmin,
  categoryController.subcategories
);


// ----------------------------------------------------------
// ADD CATEGORY SUBCATEGORY
//
// POST /products/category/:id/subcategory
//
// Adds one subcategory to the selected category.
// ----------------------------------------------------------

router.post(
  "/category/:id/subcategory",
  requireAdmin,
  categoryController.addSubcategory
);


// ----------------------------------------------------------
// CATEGORY PRODUCTS
//
// GET /products/category/:id
// ----------------------------------------------------------

router.get(
  "/category/:id",
  categoryController.products
);


// ==========================================================
// ADD MANY PRODUCTS TO CART
// ==========================================================

// ----------------------------------------------------------
// POST /products/addManyToCart
// ----------------------------------------------------------

router.post(
  "/addManyToCart",
  requireLogin,
  controller.addManyToCart
);


// ==========================================================
// PRODUCT UPDATE
// ==========================================================

// ----------------------------------------------------------
// POST /products/:id/update
// ----------------------------------------------------------

router.post(
  "/:id/update",
  requireAdmin,
  controller.updateProduct
);


// ==========================================================
// PRODUCT DETAILS
// ==========================================================

// ----------------------------------------------------------
// GET /products/:id
// ----------------------------------------------------------

router.get(
  "/:id",
  controller.details
);


// ==========================================================
// ADD PRODUCT TO CART
// ==========================================================

// ----------------------------------------------------------
// POST /products/:id/cart
// ----------------------------------------------------------

router.post(
  "/:id/cart",
  requireLogin,
  controller.addToCart
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
  router;