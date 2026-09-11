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

// ----------------------------------------------------------
// LIST SUBSTATIONS
// GET /substations
// ----------------------------------------------------------

router.get(
    "/",
    requireAdmin,
    controller.list
);


// ----------------------------------------------------------
// NEW SUBSTATION FORM
// GET /substations/new
// ----------------------------------------------------------

router.get(
    "/new",
    requireAdmin,
    controller.newForm
);


// ----------------------------------------------------------
// CREATE SUBSTATION
// POST /substations
//
// Supports:
// - Normal form fields
// - GPS latitude
// - GPS longitude
// - substationIcon image upload
// - substationIconUrl
// ----------------------------------------------------------

router.post(
    "/",
    requireAdmin,
    substationsUpload.single(
        "substationIcon"
    ),
    controller.create
);


// ==========================================================
// PRODUCTS
// ==========================================================

// ----------------------------------------------------------
// PRODUCT DETAIL
// GET /substations/product/:id
// ----------------------------------------------------------

router.get(
    "/product/:id",
    requireAdmin,
    controller.productDetail
);


// ----------------------------------------------------------
// UPDATE PRODUCT UNITS
// POST /substations/product/:id
// ----------------------------------------------------------

router.post(
    "/product/:id",
    requireAdmin,
    controller.updateProductUnits
);


// ==========================================================
// BRANCH / SUBSTATION EDITING
// ==========================================================

// ----------------------------------------------------------
// EDIT SUBSTATION FORM
// GET /substations/branch/:id/edit
// ----------------------------------------------------------

router.get(
    "/branch/:id/edit",
    requireAdmin,
    controller.editForm
);


// ----------------------------------------------------------
// UPDATE SUBSTATION
// POST /substations/branch/:id/edit
//
// Supports:
// - Name
// - Location
// - Phone number
// - Directions
// - GPS latitude
// - GPS longitude
// - Description
// - Uploaded substation icon
// - Image URL icon
// ----------------------------------------------------------

router.post(
    "/branch/:id/edit",
    requireAdmin,
    substationsUpload.single(
        "substationIcon"
    ),
    controller.update
);


// ==========================================================
// SUBSTATION ICON
// ==========================================================

// ----------------------------------------------------------
// EDIT ICON FORM
// GET /substations/branch/icon/:id
// ----------------------------------------------------------

router.get(
    "/branch/icon/:id",
    requireAdmin,
    controller.editIconForm
);


// ----------------------------------------------------------
// UPDATE ICON
// POST /substations/branch/icon/:id
//
// Supports uploaded icon through:
// name="substationIcon"
// ----------------------------------------------------------

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

// ----------------------------------------------------------
// EDIT IMAGES FORM
// GET /substations/branch/images/:id
// ----------------------------------------------------------

router.get(
    "/branch/images/:id",
    requireAdmin,
    controller.editImagesForm
);


// ----------------------------------------------------------
// UPDATE / ADD IMAGES
// POST /substations/branch/images/:id
//
// Supports up to 20 uploaded images through:
// name="images"
// ----------------------------------------------------------

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

// ----------------------------------------------------------
// DETAIL PAGE
// GET /substations/:id
// ----------------------------------------------------------

router.get(
    "/:id",
    requireAdmin,
    controller.detail
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports = router;