const service = require("../services/stockService");
const Category = require("../models/category");

async function resolveCategoryId(value) {
  const raw = String(value ?? "").trim();

  if (!raw) throw new Error("Select a valid stock category.");

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
    const stocks = await service.listStock();

    return res.render("stock/stock", {
      title: "Stock Management",
      stocks,
      error: req.query.error || null,
      saved: req.query.saved || ""
    });
  } catch (error) {
    console.error("Stock list error:", error);

    return res.status(500).render("stock/stock", {
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

    const categories = categoryDocuments.map(category => category.name);

    const selectedStock = req.query.stockId
      ? await service.getStock(req.query.stockId)
      : null;

    const old = selectedStock
      ? {
          ...selectedStock,
          category: selectedStock.category?.name || selectedStock.category || ""
        }
      : {};

    return res.render("stock/product-entry", {
      title: selectedStock ? "Update Stock Subcategory" : "Add Stock Subcategory",
      error: req.query.error || null,
      saved: req.query.saved || "",
      old,
      stockCatalog,
      categories,
      selectedStockId: selectedStock?._id?.toString() || ""
    });
  } catch (error) {
    console.error(error);

    return res.status(500).render("stock/product-entry", {
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

    // Always return to the stock list after saving so the newly
    // created/updated stock is immediately visible at /stock.
    return res.redirect("/stock?saved=1");
  } catch (error) {
    console.error(error);

    const [stockCatalog, categoryDocuments] = await Promise.all([
      service.getStockCategories().catch(() => []),
      service.getCategories().catch(() => [])
    ]);

    const categories = categoryDocuments.map(category => category.name);

    return res.status(400).render("stock/product-entry", {
      title: req.body.stockId ? "Update Stock Subcategory" : "Add Stock Subcategory",
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

    return res.render("stock/stock-entry", {
      title: "Allocate Product",
      stock,
      substations,
      error: req.query.error || null,
      old: {},
      saved: req.query.saved || ""
    });
  } catch (error) {
    console.error(error);
    return res.redirect(`/stock?error=${encodeURIComponent(error.message)}`);
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
