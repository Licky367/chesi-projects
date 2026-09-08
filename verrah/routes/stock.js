const router = require("express").Router();

const controller = require("../controllers/stock");
const requireAdmin = require("../middleware/requireAdmin");


// ==========================================================
// STOCK MANAGEMENT
// ==========================================================
//
// All stock-management operations remain restricted to admin.
// The controller handles:
//   - listing stock by subcategory
//   - creating stock/subcategories
//   - editing existing stock/subcategories
//   - allocating stock into products
//   - allocating product units across multiple substations
//
// ==========================================================


// ----------------------------------------------------------
// LIST STOCK
// ----------------------------------------------------------
//
// GET /stock
//
// Displays all stock grouped by:
//   Category
//      → Subcategory
//          → horizontally scrollable product/stock cards
//
// ----------------------------------------------------------

router.get(
  "/",
  requireAdmin,
  controller.list
);


// ----------------------------------------------------------
// STOCK CREATION / EDIT FORM
// ----------------------------------------------------------
//
// GET /stock/new
//
// New stock:
//
//   /stock/new
//
// Existing stock/subcategory:
//
//   /stock/new?stockId=<id>
//
// The controller determines whether this is a new
// stock entry or an update.
//
// ----------------------------------------------------------

router.get(
  "/new",
  requireAdmin,
  controller.newStockForm
);


// ----------------------------------------------------------
// CREATE OR UPDATE STOCK
// ----------------------------------------------------------
//
// POST /stock
//
// If req.body.stockId exists:
//     update the existing stock/subcategory.
//
// If req.body.stockId does not exist:
//     create a new stock/subcategory.
//
// This is why the controller method is:
//
//     createOrUpdateStock
//
// NOT:
//
//     createStock
//
// ----------------------------------------------------------

router.post(
  "/",
  requireAdmin,
  controller.createOrUpdateStock
);


// ----------------------------------------------------------
// PRODUCT ALLOCATION PAGE
// ----------------------------------------------------------
//
// GET /stock/:id
//
// Displays the selected stock/subcategory and allows the
// administrator to allocate units across MULTIPLE
// substations.
//
// Example:
//
//     Kitengela     20
//     Athi River    30
//     Nairobi       50
//     ----------------
//     Total        100
//
// The controller loads:
//     - the stock record
//     - all substations
//
// ----------------------------------------------------------

router.get(
  "/:id",
  requireAdmin,
  controller.entry
);


// ----------------------------------------------------------
// CREATE / ALLOCATE PRODUCT
// ----------------------------------------------------------
//
// POST /stock/:id
//
// Creates/updates the product represented by the selected
// stock/subcategory and distributes the requested units
// among the submitted substations.
//
// The service is responsible for:
//
//     Product.units += total allocated units
//
//     Stock.units -= total allocated units
//
// and recording the individual substation quantities.
//
// Product metadata such as category, subcategory, name,
// buy price, description, image and days is inherited from
// the stock record.
//
// ----------------------------------------------------------

router.post(
  "/:id",
  requireAdmin,
  controller.createProduct
);


module.exports = router;