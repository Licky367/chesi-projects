const router = require("express").Router();
const controller = require("../controllers/stock");
const requireAdmin = require("../middleware/requireAdmin");

router.get("/", requireAdmin, controller.list);
router.get("/new", requireAdmin, controller.newStockForm);
router.post("/", requireAdmin, controller.createOrUpdateStock);
router.get("/:id", requireAdmin, controller.entry);
router.post("/:id", requireAdmin, controller.createProduct);

module.exports = router;
