const service = require("../services/stockService");
const Category = require("../models/category");

async function resolveCategoryId(value) {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error("Select a valid stock category.");

  if (/^[a-fA-F0-9]{24}$/.test(raw)) {
    const category = await Category.findOne({ _id: raw, isActive: true }).select("_id").lean();
    if (!category) throw new Error("The selected category was not found or is inactive.");
    return category._id;
  }

  const category = await Category.findOne({ name: raw.toLowerCase(), isActive: true }).select("_id").lean();
  if (!category) throw new Error("The selected category was not found or is inactive.");
  return category._id;
}

async function renderForm(res, data = {}, status = 200) {
  const categories = await service.getCategories().catch(() => []);
  const stockCatalog = await service.getStockCategories().catch(() => []);
  return res.status(status).render("stock/product-entry", {
    title: data.title || "Add Stock Subcategory",
    error: data.error || null,
    saved: data.saved || "",
    old: data.old || {},
    stockCatalog,
    categories,
    selectedStockId: data.selectedStockId || ""
  });
}

exports.list = async (req, res) => {
  try {
    res.render("stock/stock", { title: "Stock Management", stocks: await service.listStock(), error: req.query.error || null, saved: req.query.saved || "" });
  } catch (error) {
    console.error(error);
    res.status(500).render("stock/stock", { title: "Stock Management", stocks: [], error: error.message, saved: "" });
  }
};

exports.newStockForm = async (req, res) => {
  try {
    const selectedStock = req.query.stockId ? await service.getStock(req.query.stockId) : null;
    const old = selectedStock ? { ...selectedStock, category: selectedStock.category || "" } : {};
    return renderForm(res, {
      title: selectedStock ? "Update Stock Subcategory" : "Add Stock Subcategory",
      old,
      selectedStockId: selectedStock?._id?.toString() || ""
    });
  } catch (error) {
    console.error(error);
    return renderForm(res, { error: error.message }, 500);
  }
};

exports.createOrUpdateStock = async (req, res) => {
  try {
    const stockId = String(req.body.stockId || "").trim();
    const body = { ...req.body, category: await resolveCategoryId(req.body.category) };
    if (stockId) await service.updateStockEntry(stockId, body);
    else await service.createStock(body);
    return res.redirect("/stock?saved=1");
  } catch (error) {
    console.error(error);
    return renderForm(res, {
      title: req.body.stockId ? "Update Stock Subcategory" : "Add Stock Subcategory",
      error: error.message,
      old: req.body,
      selectedStockId: req.body.stockId || ""
    }, 400);
  }
};

exports.entry = async (req, res) => {
  try {
    const [stock, substations] = await Promise.all([service.getStock(req.params.id), service.getSubstations()]);
    if (!stock) return res.redirect("/stock?error=Stock+not+found");
    res.render("stock/stock-entry", { title: "Allocate Product", stock, substations, error: req.query.error || null, old: {}, saved: req.query.saved || "" });
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
    const [stock, substations] = await Promise.all([service.getStock(req.params.id), service.getSubstations()]);
    if (!stock) return res.redirect("/stock");
    return res.status(400).render("stock/stock-entry", { title: "Allocate Product", stock, substations, error: error.message, old: req.body, saved: "" });
  }
};
