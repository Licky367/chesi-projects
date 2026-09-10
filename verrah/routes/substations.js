// ==========================================================
// verrah/routes/substations.js
// SUBSTATION ROUTES
// ==========================================================

const router =
    require("express").Router();

const controller =
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
    controller.list
);

router.get(
    "/new",
    requireAdmin,
    controller.newForm
);

router.post(
    "/",
    requireAdmin,
    controller.create
);


// ==========================================================
// PRODUCTS
// ==========================================================

router.get(
    "/product/:id",
    requireAdmin,
    controller.productDetail
);

router.post(
    "/product/:id",
    requireAdmin,
    controller.updateProductUnits
);


// ==========================================================
// BRANCH EDITING
// ==========================================================

router.get(
    "/branch/:id/edit",
    requireAdmin,
    controller.editForm
);

router.post(
    "/branch/:id/edit",
    requireAdmin,
    controller.update
);


// ==========================================================
// SUBSTATION ICON
// ==========================================================

router.get(
    "/branch/icon/:id",
    requireAdmin,
    controller.editIconForm
);

router.post(
    "/branch/icon/:id",
    requireAdmin,
    substationsUpload.single(
        "substationIcon"
    ),
    controller.updateIcon
);


// ==========================================================
// SUBSTATION IMAGES
// ==========================================================

router.get(
    "/branch/images/:id",
    requireAdmin,
    controller.editImagesForm
);

router.post(
    "/branch/images/:id",
    requireAdmin,
    substationsUpload.array(
        "images",
        20
    ),
    controller.updateImages
);


// ==========================================================
// SUBSTATION DETAILS
// ==========================================================

router.get(
    "/:id",
    requireAdmin,
    controller.detail
);


module.exports = router;
