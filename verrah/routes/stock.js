const router = require("express").Router();

const controller = require("../controllers/stock");
const requireAdmin = require("../middleware/requireAdmin");

// GET /stock - display all active stock records.
router.get("/", requireAdmin, controller.list);

// GET /stock/new - create/update stock form.
router.get("/new", requireAdmin, controller.newStockForm);

// POST /stock - create or update stock.
// After saving, the controller redirects to /stock?saved=1.
router.post("/", requireAdmin, controller.createOrUpdateStock);

// GET /stock/:id - stock allocation/details page.
router.get("/:id", requireAdmin, controller.entry);

// POST /stock/:id - create/allocate product from stock.
router.post("/:id", requireAdmin, controller.createProduct);

module.exports = router;
