// ==========================================================
// controllers/stock.js
// STOCK CONTROLLER
// ==========================================================

const service = require("../services/stockService");
const Category = require("../models/category");

// ==========================================================
// RESOLVE CATEGORY
//
// The form submits Category._id.
// The service will convert that ID into Category.name.
//
// The controller also accepts a category name.
// ==========================================================

async function resolveCategoryId(value) {
    const raw = String(value ?? "").trim();

    if (!raw) {
        throw new Error(
            "Select a valid stock category."
        );
    }

    // ------------------------------------------------------
    // CATEGORY ID
    // ------------------------------------------------------

    if (/^[a-fA-F0-9]{24}$/.test(raw)) {
        const category = await Category.findOne({
            _id: raw,
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

    // ------------------------------------------------------
    // CATEGORY NAME
    // ------------------------------------------------------

    const category = await Category.findOne({
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

// ==========================================================
// RENDER STOCK FORM
// ==========================================================

async function renderForm(
    res,
    data = {},
    status = 200
) {
    const [
        categories,
        stockCatalog
    ] = await Promise.all([
        service
            .getCategories()
            .catch(() => []),

        service
            .getStockCategories()
            .catch(() => [])
    ]);

    return res
        .status(status)
        .render(
            "stock/product-entry",
            {
                title:
                    data.title ||
                    "Add Stock Subcategory",

                error:
                    data.error ||
                    null,

                saved:
                    data.saved ||
                    "",

                old:
                    data.old ||
                    {},

                stockCatalog,

                categories,

                selectedStockId:
                    data.selectedStockId ||
                    ""
            }
        );
}

// ==========================================================
// LIST STOCK
// ==========================================================

exports.list = async (
    req,
    res
) => {
    try {
        const stocks =
            await service.listStock();

        return res.render(
            "stock/stock",
            {
                title:
                    "Stock Management",

                stocks,

                error:
                    req.query.error ||
                    null,

                saved:
                    req.query.saved ||
                    ""
            }
        );

    } catch (error) {
        console.error(
            "Stock list error:",
            error
        );

        return res
            .status(500)
            .render(
                "stock/stock",
                {
                    title:
                        "Stock Management",

                    stocks: [],

                    error:
                        error.message,

                    saved: ""
                }
            );
    }
};

// ==========================================================
// NEW / UPDATE STOCK FORM
// ==========================================================

exports.newStockForm =
    async (
        req,
        res
    ) => {
        try {
            const selectedStock =
                req.query.stockId
                    ? await service.getStock(
                        req.query.stockId
                    )
                    : null;

            const old =
                selectedStock
                    ? {
                        ...selectedStock,

                        category:
                            selectedStock.category ||
                            ""
                    }
                    : {};

            return renderForm(
                res,
                {
                    title:
                        selectedStock
                            ? "Update Stock Subcategory"
                            : "Add Stock Subcategory",

                    old,

                    selectedStockId:
                        selectedStock?._id
                            ?.toString() ||
                        ""
                }
            );

        } catch (error) {
            console.error(error);

            return renderForm(
                res,
                {
                    error:
                        error.message
                },
                500
            );
        }
    };

// ==========================================================
// CREATE OR UPDATE STOCK
// ==========================================================

exports.createOrUpdateStock =
    async (
        req,
        res
    ) => {
        try {
            const stockId =
                String(
                    req.body.stockId ||
                    ""
                ).trim();

            // --------------------------------------------------
            // The frontend submits Category._id.
            //
            // The service converts this into Category.name
            // before saving Stock.
            // --------------------------------------------------

            const categoryId =
                await resolveCategoryId(
                    req.body.category
                );

            const body = {
                ...req.body,
                category: categoryId
            };

            // --------------------------------------------------
            // UPDATE
            // --------------------------------------------------

            if (stockId) {
                await service.updateStockEntry(
                    stockId,
                    body
                );
            }

            // --------------------------------------------------
            // CREATE
            // --------------------------------------------------

            else {
                await service.createStock(
                    body
                );
            }

            // --------------------------------------------------
            // RETURN TO STOCK LIST
            // --------------------------------------------------

            return res.redirect(
                "/stock?saved=1"
            );

        } catch (error) {
            console.error(error);

            return renderForm(
                res,
                {
                    title:
                        req.body.stockId
                            ? "Update Stock Subcategory"
                            : "Add Stock Subcategory",

                    error:
                        error.message,

                    old:
                        req.body,

                    selectedStockId:
                        req.body.stockId ||
                        ""
                },
                400
            );
        }
    };

// ==========================================================
// STOCK ENTRY / PRODUCT ALLOCATION FORM
// ==========================================================

exports.entry =
    async (
        req,
        res
    ) => {
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

            return res.render(
                "stock/stock-entry",
                {
                    title:
                        "Allocate Product",

                    stock,

                    substations,

                    error:
                        req.query.error ||
                        null,

                    old: {},

                    saved:
                        req.query.saved ||
                        ""
                }
            );

        } catch (error) {
            console.error(error);

            return res.redirect(
                `/stock?error=${encodeURIComponent(
                    error.message
                )}`
            );
        }
    };

// ==========================================================
// CREATE PRODUCT FROM STOCK
// ==========================================================

exports.createProduct =
    async (
        req,
        res
    ) => {
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

            return res
                .status(400)
                .render(
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

                        saved: ""
                    }
                );
        }
    };