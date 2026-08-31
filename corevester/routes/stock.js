const router = require("express").Router();

const controller = require("../controllers/stock");
const requireAdmin = require("../middleware/requireAdmin");

// List stock
router.get(
  "/",
  requireAdmin,
  controller.list
);

// Show stock creation / edit form
router.get(
  "/new",
  requireAdmin,
  controller.newStockForm
);

// Create new stock OR update existing stock
router.post(
  "/",
  requireAdmin,
  controller.createStock
);

// Show product allocation form for a stock item
router.get(
  "/:id",
  requireAdmin,
  controller.entry
);

// Create product from stock
router.post(
  "/:id",
  requireAdmin,
  controller.createProduct
);

module.exports = router;