const router = require("express").Router();

const controller = require("../controllers/stock");
const requireAdmin = require("../middleware/requireAdmin");

// ==========================================================
// STOCK LIST
// ==========================================================

// GET /stock - display all active stock records.
router.get(
    "/",
    requireAdmin,
    controller.list
);

// ==========================================================
// NEW STOCK
// ==========================================================

// GET /stock/new - create/update stock form.
router.get(
    "/new",
    requireAdmin,
    controller.newStockForm
);

// ==========================================================
// CREATE / UPDATE STOCK
// ==========================================================

// POST /stock - create or update stock.
router.post(
    "/new",
    requireAdmin,
    controller.createOrUpdateStock
);

// ==========================================================
// FIFO BATCHES
// ==========================================================

// GET /stock/:id/batches - display all FIFO batches.
router.get(
    "/:id/batches",
    requireAdmin,
    controller.batches
);

// GET /stock/:id/batch/:batchId - edit a specific FIFO batch.
router.get(
    "/:id/batch/:batchId",
    requireAdmin,
    controller.batch
);

// POST /stock/:id/batches/:batchId - save changes to FIFO batches.
router.post(
    "/:id/batches/:batchId",
    requireAdmin,
    controller.editBatches
);

// ==========================================================
// STOCK ENTRY / ALLOCATION
// ==========================================================

// GET /stock/:id - stock allocation/details page.
router.get(
    "/:id",
    requireAdmin,
    controller.entry
);

// POST /stock/:id - create/allocate product from stock.
router.post(
    "/:id",
    requireAdmin,
    controller.createProduct
);

module.exports = router;