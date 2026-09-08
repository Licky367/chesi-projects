const router = require("express").Router();
const c = require("../controllers/substations");
const requireAdmin = require("../middleware/requireAdmin");

router.get("/", requireAdmin, c.list);
router.get("/new", requireAdmin, c.newForm);
router.post("/", requireAdmin, c.create);
router.get("/product/:id", requireAdmin, c.productDetail);
router.post("/product/:id", requireAdmin, c.updateProductUnits);
router.get("/:id", requireAdmin, c.detail);

module.exports = router;
