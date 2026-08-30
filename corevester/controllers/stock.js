const service = require("../services/stockService");

exports.list = async (req, res) => {
  try {
    res.render("stock/stock", {
      title: "Stock",
      stocks: await service.listStock(),
      error: req.query.error || null,
      saved: req.query.saved || ""
    });
  } catch (e) {
    res.status(500).render("stock/stock", {
      title: "Stock",
      stocks: [],
      error: e.message,
      saved: ""
    });
  }
};

exports.newStockForm = (req, res) => {
  res.render("stock/product-entry", {
    title: "Add Stock",
    error: null,
    old: {}
  });
};

exports.createStock = async (req, res) => {
  try {
    await service.createStock(req.body);

    res.redirect("/stock?saved=1");
  } catch (e) {
    res.status(400).render("stock/product-entry", {
      title: "Add Stock",
      error: e.message,
      old: req.body
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
      title: "Create Product",
      stock,
      substations,
      error: req.query.error || null,
      old: {},
      saved: req.query.saved || ""
    });
  } catch (e) {
    console.error(e);

    res.redirect(
      `/stock?error=${encodeURIComponent(e.message)}`
    );
  }
};

exports.createProduct = async (req, res) => {
  try {
    await service.createProductFromStock(
      req.params.id,
      req.body
    );

    res.redirect(
      `/stock/${req.params.id}?saved=1`
    );
  } catch (e) {
    console.error(e);

    const [stock, substations] = await Promise.all([
      service.getStock(req.params.id),
      service.getSubstations()
    ]);

    if (!stock) {
      return res.redirect("/stock");
    }

    res.status(400).render("stock/stock-entry", {
      title: "Create Product",
      stock,
      substations,
      error: e.message,
      old: req.body,
      saved: ""
    });
  }
};