// =========================================================
// controllers/stock.js
// MANAGEMENT / STOCK CONTROLLER
//
// /stock              -> stock.ejs
// /stock/new          -> product-entry.ejs
// /stock/:id          -> stock-entry.ejs
// =========================================================
const stockService = require("../services/stockService");

exports.list = async (req, res) => {
  try {
    const stocks = await stockService.listStock();
    res.render("stock/stock", {
      title: "Stock Management | CoreVester",
      stocks,
      error: req.query.error || null,
      query: req.query.saved || ""
    });
  } catch (err) {
    console.error(err);
    res.status(500).render("stock/stock", {
      title: "Stock Management | CoreVester",
      stocks: [],
      error: "Unable to load stock."
    });
  }
};

exports.newProductForm = async (req, res) => {
  res.render("stock/product-entry", {
    title: "Add Product | CoreVester",
    error: null,
    old: {}
  });
};

exports.createProduct = async (req, res) => {
  try {
    await stockService.createProductAndStock(req.body);
    res.redirect("/stock");
  } catch (err) {
    console.error(err);
    res.status(400).render("stock/product-entry", {
      title: "Add Product | CoreVester",
      error: err.message,
      old: req.body
    });
  }
};

exports.entry = async (req, res) => {
  try {
    const stock = await stockService.getStock(req.params.id);

    if (!stock) return res.status(404).redirect("/stock?error=Stock+item+not+found.");

    res.render("stock/stock-entry", {
      title: `${stock.name} | Stock | CoreVester`,
      stock,
      error: req.query.error || null,
      query: req.query.saved || ""
    });
  } catch (err) {
    console.error(err);
    res.status(404).redirect("/stock");
  }
};

exports.update = async (req, res) => {
  try {
    await stockService.updateStockAndProduct(req.params.id, req.body);
    res.redirect(`/stock/${req.params.id}?saved=1`);
  } catch (err) {
    console.error(err);
    res.redirect(`/stock/${req.params.id}?error=${encodeURIComponent(err.message)}`);
  }
};
