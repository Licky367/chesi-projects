// =========================================================
// controllers/stock.js
// =========================================================

const service = require("../services/stockService");
const Category = require("../models/category");


// =========================================================
// RESOLVE CATEGORY ID
//
// Accepts:
//   - Category._id
//   - Category.name
//
// Returns:
//   - Category._id as a string
// =========================================================

async function resolveCategoryId(value) {

  const raw =
    String(value ?? "").trim();


  if (!raw) {

    throw new Error(
      "Select a valid stock category."
    );

  }


  // ---------------------------------------------------------
  // CATEGORY OBJECT ID
  // ---------------------------------------------------------

  if (
    /^[a-fA-F0-9]{24}$/.test(raw)
  ) {

    const byId =
      await Category
        .findOne({
          _id: raw,
          isActive: true
        })
        .select("_id")
        .lean();


    if (!byId) {

      throw new Error(
        "The selected category was not found or is inactive."
      );

    }


    return String(byId._id);

  }


  // ---------------------------------------------------------
  // CATEGORY NAME
  // ---------------------------------------------------------

  const category =
    await Category
      .findOne({
        name: raw.toLowerCase(),
        isActive: true
      })
      .select("_id")
      .lean();


  if (!category) {

    throw new Error(
      "The selected category was not found or is inactive."
    );

  }


  return String(category._id);

}


// =========================================================
// LIST STOCK
// =========================================================

exports.list = async (req, res) => {

  try {

    const stocks =
      await service.listStock();


    res.render("stock/stock", {

      title:
        "Stock Management",

      stocks,

      error:
        req.query.error || null,

      saved:
        req.query.saved || ""

    });

  } catch (error) {

    console.error(
      "Stock list error:",
      error
    );


    res.status(500).render(
      "stock/stock",
      {

        title:
          "Stock Management",

        stocks: [],

        error:
          error.message,

        saved:
          ""

      }
    );

  }

};


// =========================================================
// NEW / UPDATE STOCK FORM
//
// IMPORTANT:
//
// categories comes directly from:
//     models/category.js
//
// The EJS receives the complete Category documents:
//
//     category._id
//     category.name
//
// Therefore the dropdown submits Category._id.
// =========================================================

exports.newStockForm = async (req, res) => {

  try {

    const [
      stockCatalog,
      categories
    ] = await Promise.all([

      service.getStockCategories(),

      Category
        .find({
          isActive: true
        })
        .sort({
          name: 1
        })
        .lean()

    ]);


    const selectedStock =
      req.query.stockId
        ? await service.getStock(
            req.query.stockId
          )
        : null;


    // -------------------------------------------------------
    // PREPARE OLD FORM DATA
    // -------------------------------------------------------

    const old =
      selectedStock
        ? {
            ...selectedStock,

            _id:
              selectedStock._id
                ?.toString(),

            stockId:
              selectedStock._id
                ?.toString(),

            category:
              selectedStock.category?._id
                ?.toString()
                ||
                selectedStock.category
                ||
                ""
          }

        : {};


    res.render(
      "stock/product-entry",
      {

        title:
          selectedStock
            ? "Update Stock Subcategory"
            : "Add Stock Subcategory",

        error:
          req.query.error || null,

        saved:
          req.query.saved || "",

        old,

        stockCatalog,

        // Complete Category documents.
        //
        // EJS can therefore use:
        //
        // category._id
        // category.name
        categories,

        selectedStockId:
          selectedStock?._id
            ?.toString() || ""

      }
    );

  } catch (error) {

    console.error(
      "New stock form error:",
      error
    );


    res.status(500).render(
      "stock/product-entry",
      {

        title:
          "Add Stock Subcategory",

        error:
          error.message,

        saved:
          "",

        old: {},

        stockCatalog: [],

        categories: [],

        selectedStockId:
          ""

      }
    );

  }

};


// =========================================================
// CREATE OR UPDATE STOCK
// =========================================================

exports.createOrUpdateStock = async (req, res) => {

  try {

    const stockId =
      String(
        req.body.stockId || ""
      ).trim();


    // -------------------------------------------------------
    // CATEGORY
    //
    // EJS submits Category._id.
    //
    // resolveCategoryId() validates that:
    //
    //   - the category exists
    //   - the category is active
    //
    // The resolved MongoDB ID is then passed to the service.
    // -------------------------------------------------------

    const categoryId =
      await resolveCategoryId(
        req.body.category
      );


    const body = {

      ...req.body,

      category:
        categoryId

    };


    // -------------------------------------------------------
    // UPDATE
    // -------------------------------------------------------

    if (stockId) {

      await service.updateStockEntry(
        stockId,
        body
      );

    }


    // -------------------------------------------------------
    // CREATE
    // -------------------------------------------------------

    else {

      await service.createStock(
        body
      );

    }


    return res.redirect(
      "/stock?saved=1"
    );

  } catch (error) {

    console.error(
      "Create/update stock error:",
      error
    );


    // -------------------------------------------------------
    // RELOAD BACKEND DATA FOR FORM
    // -------------------------------------------------------

    const [
      stockCatalog,
      categories
    ] = await Promise.all([

      service
        .getStockCategories()
        .catch(() => []),

      Category
        .find({
          isActive: true
        })
        .sort({
          name: 1
        })
        .lean()
        .catch(() => [])

    ]);


    return res.status(400).render(
      "stock/product-entry",
      {

        title:
          req.body.stockId
            ? "Update Stock Subcategory"
            : "Add Stock Subcategory",

        error:
          error.message,

        saved:
          "",

        old:
          req.body,

        stockCatalog,

        // IMPORTANT:
        // Do NOT map these to strings.
        //
        // The EJS needs:
        // category._id
        // category.name
        categories,

        selectedStockId:
          req.body.stockId || ""

      }
    );

  }

};


// =========================================================
// PRODUCT ENTRY / ALLOCATION FORM
// =========================================================

exports.entry = async (req, res) => {

  try {

    const [
      stock,
      substations
    ] = await Promise.all([

      service.getStock(
        req.params.id
      ),

      service.getSubstations()

    ]);


    if (!stock) {

      return res.redirect(
        "/stock?error=Stock+not+found"
      );

    }


    res.render(
      "stock/stock-entry",
      {

        title:
          "Allocate Product",

        stock,

        substations,

        error:
          req.query.error || null,

        old: {},

        saved:
          req.query.saved || ""

      }
    );

  } catch (error) {

    console.error(
      "Stock entry error:",
      error
    );


    res.redirect(
      `/stock?error=${encodeURIComponent(
        error.message
      )}`
    );

  }

};


// =========================================================
// CREATE PRODUCT FROM STOCK
// =========================================================

exports.createProduct = async (req, res) => {

  try {

    await service.createProductFromStock(
      req.params.id,
      req.body
    );


    return res.redirect(
      `/stock/${req.params.id}?saved=1`
    );

  } catch (error) {

    console.error(
      "Create product error:",
      error
    );


    const [
      stock,
      substations
    ] = await Promise.all([

      service.getStock(
        req.params.id
      ),

      service.getSubstations()

    ]);


    if (!stock) {

      return res.redirect(
        "/stock"
      );

    }


    return res.status(400).render(
      "stock/stock-entry",
      {

        title:
          "Allocate Product",

        stock,

        substations,

        error:
          error.message,

        old:
          req.body,

        saved:
          ""

      }
    );

  }

};