const router = require("express").Router();

const controller = require("../controllers/stock");
const requireAdmin = require("../middleware/requireAdmin");

// Stock management is admin-only.
router.get(
    "/",
    requireAdmin,
    controller.list
);

// Create a new category OR select an existing category to update.
router.get(
    "/new",
    requireAdmin,
    controller.newStockForm
);

// The POST handler decides whether this is a new Stock category or an update.
router.post(
    "/",
    requireAdmin,
    controller.createOrUpdateStock
);

// Allocate warehouse Stock into a marketplace Product.
router.get(
    "/:id",
    requireAdmin,
    controller.entry
);

router.post(
    "/:id",
    requireAdmin,
    controller.createProduct
);

module.exports = router;
