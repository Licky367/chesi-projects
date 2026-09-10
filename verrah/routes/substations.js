// ==========================================================
// verrah/routes/substations.js
// SUBSTATION ROUTES
// ==========================================================

const router = require("express").Router();

const c =
  require("../controllers/substations");

const requireAdmin =
  require("../middleware/requireAdmin");

const substationsUpload =
  require("../middleware/substationsUpload");


// ==========================================================
// SUBSTATIONS
// ==========================================================

router.get(
  "/",
  requireAdmin,
  c.list
);

router.get(
  "/new",
  requireAdmin,
  c.newForm
);

router.post(
  "/",
  requireAdmin,
  c.create
);


// ==========================================================
// PRODUCTS
// ==========================================================

router.get(
  "/product/:id",
  requireAdmin,
  c.productDetail
);

router.post(
  "/product/:id",
  requireAdmin,
  c.updateProductUnits
);


// ==========================================================
// BRANCH EDITING
// ==========================================================

router.get(
  "/branch/:id/edit",
  requireAdmin,
  c.editForm
);

router.post(
  "/branch/:id/edit",
  requireAdmin,
  c.update
);


// ==========================================================
// SUBSTATION ICON
// ==========================================================

router.get(
  "/branch/icon/:id",
  requireAdmin,
  c.editIconForm
);

router.post(
  "/branch/icon/:id",
  requireAdmin,
  substationsUpload.single("substationIcon"),
  c.updateIcon
);


// ==========================================================
// SUBSTATION IMAGES
// ==========================================================

router.get(
  "/branch/images/:id",
  requireAdmin,
  c.editImagesForm
);

router.post(
  "/branch/images/:id",
  requireAdmin,
  substationsUpload.array(
    "images",
    20
  ),
  c.updateImages
);


// ==========================================================
// SUBSTATION DETAILS
// ==========================================================

router.get(
  "/:id",
  requireAdmin,
  c.detail
);


module.exports = router;