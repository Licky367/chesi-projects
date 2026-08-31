const service = require("../services/stockService");

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
    const stockCatalog =
      await service.getStockCategories();

    const selectedStock =
      req.query.stockId
        ? await service.getStock(req.query.stockId)
        : null;

    res.render("stock/product-entry", {
      title: selectedStock
        ? "Update Stock Subcategory"
        : "Add Stock Subcategory",
      error: req.query.error || null,
      saved: req.query.saved || "",
      old: selectedStock || {},
      stockCatalog,
      selectedStockId:
        selectedStock?._id?.toString() || ""
    });
  } catch (error) {
    console.error(error);

    res.status(500).render(
      "stock/product-entry",
      {
        title: "Add Stock Subcategory",
        error: error.message,
        saved: "",
        old: {},
        stockCatalog: [],
        selectedStockId: ""
      }
    );
  }
};

exports.createOrUpdateStock = async (req, res) => {
  try {
    const stockId =
      String(req.body.stockId || "").trim();

    if (stockId) {
      await service.updateStockEntry(
        stockId,
        req.body
      );
    } else {
      await service.createStock(req.body);
    }

    return res.redirect("/stock?saved=1");
  } catch (error) {
    console.error(error);

    const stockCatalog =
      await service
        .getStockCategories()
        .catch(() => []);

    return res.status(400).render(
      "stock/product-entry",
      {
        title: req.body.stockId
          ? "Update Stock Subcategory"
          : "Add Stock Subcategory",
        error: error.message,
        saved: "",
        old: req.body,
        stockCatalog,
        selectedStockId:
          req.body.stockId || ""
      }
    );
  }
};

exports.entry = async (req, res) => {
  try {
    const [stock, substations] =
      await Promise.all([
        service.getStock(req.params.id),
        service.getSubstations()
      ]);

    if (!stock) {
      return res.redirect(
        "/stock?error=Stock+not+found"
      );
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

    res.redirect(
      `/stock?error=${encodeURIComponent(
        error.message
      )}`
    );
  }
};

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
    console.error(error);

    const [stock, substations] =
      await Promise.all([
        service.getStock(req.params.id),
        service.getSubstations()
      ]);

    if (!stock) {
      return res.redirect("/stock");
    }

    return res.status(400).render(
      "stock/stock-entry",
      {
        title: "Allocate Product",
        stock,
        substations,
        error: error.message,
        old: req.body,
        saved: ""
      }
    );
  }
};
