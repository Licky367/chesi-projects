const router = require("express").Router();

const controller =
    require("../controllers/stock");

const requireAdmin =
    require("../middleware/requireAdmin");

const requireAccess =
    require("../middleware/requireAccess");


const requireAdminOrStaff =
    require("../middleware/requireStaffOrAdmin");


// ==========================================================
// STOCK LIST
// ==========================================================

// GET /stock - display all active stock records.
router.get(
    "/",
    requireAdminOrStaff,
    controller.list
);


// ==========================================================
// NEW STOCK
// ==========================================================

// GET /stock/new - create/update stock form.
router.get(
    "/new",
    requireAdminOrStaff,
    requireAccess,
    controller.newStockForm
);


// ==========================================================
// CREATE / UPDATE STOCK
// ==========================================================

// POST /stock - create or update stock.
router.post(
    "/",
    controller.createOrUpdateStock
);


// ==========================================================
// FIFO BATCHES
// ==========================================================

// GET /stock/:id/batches - display all FIFO batches.
router.get(
    "/:id/batches",
    requireAdminOrStaff,
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
    controller.createFifoBatch
);


// ==========================================================
// EDIT FIFO BATCH
// ==========================================================

// GET /stock/:id/batch/:batchId - edit a specific FIFO batch.
router.get(
    "/:id/batch/:batchId",
    requireAdminOrStaff,
    controller.batch
);


// POST /stock/:id/batches/:batchId - save changes to FIFO batch.
router.post(
    "/:id/batches/:batchId",
    controller.editBatches
);


// ==========================================================
// STOCK ENTRY / ALLOCATION
// ==========================================================

// GET /stock/:id - stock allocation/details page.
router.get(
    "/:id",
    requireAdminOrStaff,
    controller.entry
);


// POST /stock/:id - create/allocate product from stock.
router.post(
    "/:id",
    requireAdminOrStaff,
    controller.createProduct
);


module.exports = router;

