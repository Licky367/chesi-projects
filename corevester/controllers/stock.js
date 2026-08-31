const service = require("../services/stockService");

function renderEntry(res, data, status = 200) {
  return res.status(status).render("stock/product-entry", {
    title: data.title || "Add / Update Stock Subcategory",
    error: data.error || null,
    saved: data.saved || "",
    old: data.old || {},
    stockCatalog: data.stockCatalog || [],
    categories: data.categories || service.getCategories(),
    selectedStockId: data.selectedStockId || ""
  });
}

async function loadCatalog() {
  return service.getStockCategories().catch(() => []);
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
    const stockCatalog = await loadCatalog();
    const selectedStock = req.query.stockId
      ? await service.getStock(req.query.stockId)
      : null;

    return renderEntry(res, {
      title: selectedStock ? "Update Stock Subcategory" : "Add Stock Subcategory",
      old: selectedStock || {},
      stockCatalog,
      categories: service.getCategories(),
      selectedStockId: selectedStock?._id?.toString() || "",
      error: req.query.error || null,
      saved: req.query.saved || ""
    });
  } catch (error) {
    console.error(error);
    return renderEntry(res, {
      title: "Add Stock Subcategory",
      error: error.message,
      stockCatalog: [],
      categories: service.getCategories()
    }, 500);
  }
};

exports.createOrUpdateStock = async (req, res) => {
  try {
    const stockId = String(req.body.stockId || "").trim();
    if (stockId) {
      await service.updateStockEntry(stockId, req.body);
    } else {
      await service.createStock(req.body);
    }
    return res.redirect("/stock?saved=1");
  } catch (error) {
    console.error(error);
    return renderEntry(res, {
      title: req.body.stockId ? "Update Stock Subcategory" : "Add Stock Subcategory",
      error: error.message,
      old: req.body,
      stockCatalog: await loadCatalog(),
      categories: service.getCategories(),
      selectedStockId: req.body.stockId || ""
    }, 400);
  }
};

exports.entry = async (req, res) => {
  try {
    const [stock, substations] = await Promise.all([
      service.getStock(req.params.id),
      service.getSubstations()
    ]);

    if (!stock) return res.redirect("/stock?error=Stock+not+found");

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
