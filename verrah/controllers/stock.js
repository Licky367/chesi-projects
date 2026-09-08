const service = require("../services/stockService");
const Category = require("../models/category");

// Resolve the category selected in /stock/new to the Category._id
// used by Stock.category. The dropdown itself continues to receive
// category names because the existing product-entry.ejs renders
// category values as strings.
async function resolveCategoryId(value) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    throw new Error("Select a valid stock category.");
  }

  // Accept the ObjectId as well, so existing clients/forms continue
  // to work if they submit the database id directly.
  if (/^[a-fA-F0-9]{24}$/.test(raw)) {
    const byId = await Category.findOne({
      _id: raw,
      isActive: true
    }).select("_id").lean();

    if (!byId) {
      throw new Error("The selected category was not found or is inactive.");
    }

    return String(byId._id);
  }

  const category = await Category.findOne({
    name: raw.toLowerCase(),
    isActive: true
  }).select("_id").lean();

  if (!category) {
    throw new Error("The selected category was not found or is inactive.");
  }

  return String(category._id);
}

exports.list = async (req, res) => {
  try {
    res.render("stock/stock", {
      title: "Stock Management",
      stocks: await service.listStock(),
      error: req.query.error || null,
      saved: req.query.saved || ""
    });
  } catch (error) {
    console.error(error);
    res.status(500).render("stock/stock", {
      title: "Stock Management",
      stocks: [],
      error: error.message,
      saved: ""
    });
  }
};

exports.newStockForm = async (req, res) => {
  try {
    const stockCatalog = await service.getStockCategories();
    const categoryDocuments = await service.getCategories();

    // /stock/new currently renders category as a string. Keep that
    // contract while sourcing the values from MongoDB Category.
    const categories = categoryDocuments.map(
      (category) => category.name
    );

    const selectedStock = req.query.stockId
      ? await service.getStock(req.query.stockId)
      : null;

    // The existing EJS compares old.category to the category string.
    // Normalize the populated Category object for the view only.
    const old = selectedStock
      ? {
          ...selectedStock,
          category:
            selectedStock.category?.name || selectedStock.category || ""
        }
      : {};

    res.render("stock/product-entry", {
      title: selectedStock
        ? "Update Stock Subcategory"
        : "Add Stock Subcategory",
      error: req.query.error || null,
      saved: req.query.saved || "",
      old,
      stockCatalog,
      categories,
      selectedStockId:
        selectedStock?._id?.toString() || ""
    });
  } catch (error) {
    console.error(error);
    res.status(500).render("stock/product-entry", {
      title: "Add Stock Subcategory",
      error: error.message,
      saved: "",
      old: {},
      stockCatalog: [],
      categories: [],
      selectedStockId: ""
    });
  }
};

exports.createOrUpdateStock = async (req, res) => {
  try {
    const stockId = String(req.body.stockId || "").trim();

    // The existing EJS submits the category name. Resolve it to the
    // Category._id before the stock service validates/saves it.
    const categoryId = await resolveCategoryId(req.body.category);
    const body = {
      ...req.body,
      category: categoryId
    };

    if (stockId) {
      await service.updateStockEntry(stockId, body);
    } else {
      await service.createStock(body);
    }

    return res.redirect("/stock?saved=1");
  } catch (error) {
    console.error(error);

    const stockCatalog = await service
      .getStockCategories()
      .catch(() => []);

    const categoryDocuments = await service
      .getCategories()
      .catch(() => []);

    const categories = categoryDocuments.map(
      (category) => category.name
    );

    return res.status(400).render("stock/product-entry", {
      title: req.body.stockId
        ? "Update Stock Subcategory"
        : "Add Stock Subcategory",
      error: error.message,
      saved: "",
      old: req.body,
      stockCatalog,
      categories,
      selectedStockId: req.body.stockId || ""
    });
  }
};

exports.entry = async (req, res) => {
  try {
    const [stock, substations] = await Promise.all([
      service.getStock(req.params.id),
      service.getSubstations()
    ]);

    if (!stock) {
      return res.redirect("/stock?error=Stock+not+found");
    }

    res.render("stock/stock-entry", {
      title: "Allocate Product",
      stock,
      substations,
      error: req.query.error || null,
      old: {},
      saved: req.query.saved || ""
    });
  } catch (error) {
    console.error(error);
    res.redirect(`/stock?error=${encodeURIComponent(error.message)}`);
  }
};

exports.createProduct = async (req, res) => {
  try {
    await service.createProductFromStock(req.params.id, req.body);
    return res.redirect(`/stock/${req.params.id}?saved=1`);
  } catch (error) {
    console.error(error);

    const [stock, substations] = await Promise.all([
      service.getStock(req.params.id),
      service.getSubstations()
    ]);

    if (!stock) return res.redirect("/stock");

    return res.status(400).render("stock/stock-entry", {
      title: "Allocate Product",
      stock,
      substations,
      error: error.message,
      old: req.body,
      saved: ""
    });
  }
};
