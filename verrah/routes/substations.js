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
// SEARCH PRODUCTS IN A SUBSTATION
//
// GET /substations/:id/search?q=SEARCH_TERM
//
// Searches products belonging to the specified substation
// by:
// - Product name
// - Category name
// ----------------------------------------------------------

router.get(
    "/:id/search",
    controller.searchPage
);


// ----------------------------------------------------------
// PRODUCT DETAIL
// GET /substations/product/:id
// ----------------------------------------------------------

router.get(
    "/product/:id",
    requireAdminOrStaff,
    controller.productDetail
);


// ----------------------------------------------------------
// UPDATE PRODUCT UNITS
// POST /substations/product/:id
// ----------------------------------------------------------

router.post(
    "/product/:id",
    requireAdminOrStaff,
    controller.updateProductUnits
);


// ----------------------------------------------------------
// UPDATE MULTIPLE PRODUCTS AT ONE SUBSTATION
// POST /substations/productsUpdate/:id
//
// :id = substation ID
//
// Updates several product quantities belonging to the
// specified substation in one request.
// ----------------------------------------------------------

router.post(
    "/productsUpdate/:id",
    requireAdmin,
    controller.updateMultipleProductUnits
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