const router = require("express").Router();

const c =
    require("../controllers/stock");

const requireAdmin =
    require("../middleware/requireAdmin");

router.get(
    "/",
    requireAdmin,
    c.list
);

router.get(
    "/new",
    requireAdmin,
    c.newStockForm
);

router.post(
    "/",
    requireAdmin,
    c.createStock
);

router.get(
    "/:id",
    requireAdmin,
    c.entry
);

router.post(
    "/:id",
    requireAdmin,
    c.createProduct
);

module.exports = router;
