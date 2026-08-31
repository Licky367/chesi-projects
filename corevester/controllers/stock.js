const service = require("../services/stockService");

function renderStockForm(res, data, status = 200) {
  return res.status(status).render("stock/product-entry", {
    title: data.title || "Add / Update Stock",
    error: data.error || null,
    old: data.old || {},
    stockCatalog: data.stockCatalog || [],
    selectedStockId: data.selectedStockId || "",
    saved: data.saved || ""
  });
}

/**
 * GET /stock
 * Display all stock categories.
 */
exports.list = async (req, res) => {
  try {
    const stocks = await service.listStock();

    return res.render("stock/stock", {
      title: "Stock",
      stocks,
      error: req.query.error || null,
      saved: req.query.saved || ""
    });
  } catch (e) {
    console.error("Error listing stock:", e);

    return res.status(500).render("stock/stock", {
      title: "Stock",
      stocks: [],
      error: e.message,
      saved: ""
    });
  }
};

/**
 * GET /stock/new
 * Display the stock creation/edit form.
 *
 * If ?stockId=... is supplied, the existing stock
 * category is loaded into the form for editing.
 */
exports.newStockForm = async (req, res) => {
  try {
    const stockCatalog = await service.getStockCatalog();
    const selectedStockId = req.query.stockId || "";

    let old = {};

    if (selectedStockId) {
      const selected = stockCatalog.find(
        (stock) =>
          String(stock._id) === String(selectedStockId)
      );

      if (selected) {
        old = {
          stockId: selected._id,
          name: selected.name,
          category: selected.category,
          subcategory: selected.subcategory || "",
          buyPrice: selected.buyPrice || 0,
          image: selected.image || "",
          description: selected.description || "",
          additionalUnits: ""
        };
      }
    }

    return renderStockForm(res, {
      title: selectedStockId
        ? "Edit Stock Category"
        : "Add / Update Stock",

      stockCatalog,
      selectedStockId,
      old,

      // Prevents "saved is not defined" in EJS
      saved: req.query.saved || ""
    });
  } catch (e) {
    console.error("Error loading stock form:", e);

    return renderStockForm(
      res,
      {
        title: "Add / Update Stock",
        error: e.message,
        saved: ""
      },
      500
    );
  }
};

/**
 * POST /stock
 * Create a new stock category or update an existing one.
 */
exports.createStock = async (req, res) => {
  try {
    await service.createOrUpdateStock(req.body);

    return res.redirect("/stock?saved=1");
  } catch (e) {
    console.error("Error creating/updating stock:", e);

    const stockCatalog = await service
      .getStockCatalog()
      .catch(() => []);

    return renderStockForm(
      res,
      {
        title: req.body.stockId
          ? "Edit Stock Category"
          : "Add / Update Stock",

        error: e.message,

        old: req.body,

        stockCatalog,

        selectedStockId: req.body.stockId || "",

        // Do not show success message after an error
        saved: ""
      },
      400
    );
  }
};

/**
 * GET /stock/:id
 * Display a specific stock category and the
 * product allocation form.
 */
exports.entry = async (req, res) => {
  try {
    const [stock, substations] = await Promise.all([
      service.getStock(req.params.id),
      service.getSubstations()
    ]);

    if (!stock) {
      return res.redirect(
        "/stock?error=Stock+not+found"
      );
    }

    return res.render("stock/stock-entry", {
      title: "Allocate Product",
      stock,
      substations,
      error: req.query.error || null,
      old: {},
      saved: req.query.saved || ""
    });
  } catch (e) {
    console.error("Error loading stock entry:", e);

    return res.redirect(
      `/stock?error=${encodeURIComponent(e.message)}`
    );
  }
};

/**
 * POST /stock/:id/product
 * Create a product from an existing stock category.
 */
exports.createProduct = async (req, res) => {
  try {
    await service.createProductFromStock(
      req.params.id,
      req.body
    );

    return res.redirect(
      `/stock/${req.params.id}?saved=1`
    );
  } catch (e) {
    console.error("Error creating product from stock:", e);

    const [stock, substations] = await Promise.all([
      service.getStock(req.params.id),
      service.getSubstations()
    ]);

    if (!stock) {
      return res.redirect(
        "/stock?error=Stock+not+found"
      );
    }

    return res.status(400).render(
      "stock/stock-entry",
      {
        title: "Allocate Product",
        stock,
        substations,
        error: e.message,
        old: req.body,
        saved: ""
      }
    );
  }
};