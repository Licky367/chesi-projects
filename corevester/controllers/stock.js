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
      error: "Unable to load stock.",
      query: ""
    });
  }
};

exports.newStockForm = async (req, res) => {
  res.render("stock/product-entry", {
    title: "Add Stock | CoreVester",
    error: null,
    old: {}
  });
};

exports.createStock = async (req, res) => {
  try {
    await stockService.createStock(req.body);
    res.redirect("/stock?saved=1");
  } catch (err) {
    console.error(err);

    res.status(400).render("stock/product-entry", {
      title: "Add Stock | CoreVester",
      error: err.message,
      old: req.body
    });
  }
};

exports.entry = async (req, res) => {
  try {
    const [stock, substations] = await Promise.all([
      stockService.getStock(req.params.id),
      stockService.getSubstations()
    ]);

    if (!stock) {
      return res.status(404).redirect("/stock?error=Stock+item+not+found.");
    }

    res.render("stock/stock-entry", {
      title: `${stock.name} | Product Entry | CoreVester`,
      stock,
      substations,
      error: req.query.error || null,
      old: {}
    });
  } catch (err) {
    console.error(err);
    res.status(404).redirect("/stock");
  }
};

exports.createProduct = async (req, res) => {
  try {
    await stockService.createProductFromStock(req.params.id, req.body);
    res.redirect(`/stock/${req.params.id}?saved=1`);
  } catch (err) {
    console.error(err);

    const [stock, substations] = await Promise.all([
      stockService.getStock(req.params.id),
      stockService.getSubstations()
    ]);

    if (!stock) return res.status(404).redirect("/stock");

    res.status(400).render("stock/stock-entry", {
      title: `${stock.name} | Product Entry | CoreVester`,
      stock,
      substations,
      error: err.message,
      old: req.body
    });
  }
};
