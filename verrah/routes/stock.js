const router = require("express").Router();

const controller =
    require("../controllers/stock");

const requireAdmin =
    require("../middleware/requireAdmin");


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
    "/",
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


// ==========================================================
// CREATE NEW FIFO BATCH
// ==========================================================

// POST /stock/:id/batches - create a new FIFO batch.
//
// The :id is the Stock._id.
//
// Expected body:
//
//     units
//     totalBuyingPrice
//     purchasedAt
//
// The service calculates buyPrice per unit.

router.post(
    "/:id/batches",
    requireAdmin,
    controller.createFifoBatch
);


// ==========================================================
// EDIT FIFO BATCH
// ==========================================================

// GET /stock/:id/batch/:batchId - edit a specific FIFO batch.
router.get(
    "/:id/batch/:batchId",
    requireAdmin,
    controller.batch
);


// POST /stock/:id/batches/:batchId - save changes to FIFO batch.
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

