// ==========================================================
// controllers/stock.js
// STOCK CONTROLLER
// ==========================================================

const service =
    require("../services/stockService");

const Category =
    require("../models/category");

const Product =
    require("../models/products");

// ==========================================================
// RESOLVE CATEGORY
//
// The form submits Category._id.
// The controller validates the category and passes the ID
// to the service.
//
// The service is responsible for converting the category
// into the value required by Stock.
// ==========================================================

async function resolveCategoryId(value) {

    const raw =
        String(value ?? "").trim();

    if (!raw) {
        throw new Error(
            "Select a valid stock category."
        );
    }

    // ------------------------------------------------------
    // CATEGORY ID
    // ------------------------------------------------------

    if (
        /^[a-fA-F0-9]{24}$/.test(raw)
    ) {

        const category =
            await Category
                .findOne({
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

        return String(
            category._id
        );
    }

    // ------------------------------------------------------
    // CATEGORY NAME
    // ------------------------------------------------------

    const category =
        await Category
            .findOne({
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

    return String(
        category._id
    );
}

// ==========================================================
// GET PRODUCT SELLING PRICE FOR STOCK
//
// Stock does NOT store sell price.
//
// Product owns:
//     unitSellPrice
//
// This is only used when rendering the stock edit form.
// ==========================================================

async function getProductSellPrice(
    stockId
) {

    if (!stockId) {
        return null;
    }

    const product =
        await Product
            .findOne({
                stock: stockId
            })
            .select("unitSellPrice")
            .lean();

    if (!product) {
        return null;
    }

    return product.unitSellPrice ?? null;
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

exports.list =
    async (
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

            const stockId =
                String(
                    req.query.stockId ||
                    ""
                ).trim();

            // --------------------------------------------------
            // CREATE MODE
            // --------------------------------------------------

            if (!stockId) {

                return renderForm(
                    res,
                    {
                        title:
                            "Add Stock Subcategory",

                        old: {},

                        selectedStockId:
                            ""
                    }
                );
            }

            // --------------------------------------------------
            // UPDATE MODE
            // --------------------------------------------------

            const selectedStock =
                await service.getStock(
                    stockId
                );

            if (!selectedStock) {

                return renderForm(
                    res,
                    {
                        title:
                            "Update Stock Subcategory",

                        error:
                            "Stock entry not found.",

                        old: {},

                        selectedStockId:
                            ""
                    },
                    404
                );
            }

            // --------------------------------------------------
            // Product owns unitSellPrice.
            //
            // Stock does NOT own sell price.
            // Fetch the Product linked to this Stock so the
            // edit form can display its current selling price.
            // --------------------------------------------------

            const unitSellPrice =
                await getProductSellPrice(
                    selectedStock._id
                );

            const old = {

                ...selectedStock,

                category:
                    selectedStock.category ||
                    "",

                // --------------------------------------------------
                // IMPORTANT:
                //
                // units represents the CURRENT TOTAL warehouse
                // balance when editing.
                // --------------------------------------------------

                units:
                    selectedStock.units ??
                    0,

                // --------------------------------------------------
                // Product selling price.
                //
                // Do NOT put sellPrice on Stock itself.
                // --------------------------------------------------

                unitSellPrice:
                    unitSellPrice ??
                    ""
            };

            return renderForm(
                res,
                {
                    title:
                        "Update Stock Subcategory",

                    old,

                    selectedStockId:
                        selectedStock._id
                            ?.toString() ||
                        ""
                }
            );

        } catch (error) {

            console.error(
                "Stock form error:",
                error
            );

            return renderForm(
                res,
                {
                    title:
                        req.query.stockId
                            ? "Update Stock Subcategory"
                            : "Add Stock Subcategory",

                    error:
                        error.message,

                    old: {},

                    selectedStockId:
                        req.query.stockId ||
                        ""
                },
                500
            );
        }
    };

// ==========================================================
// CREATE OR UPDATE STOCK
// ==========================================================
//
// CREATE:
//
//     body.units
//         = initial warehouse units
//
//     service creates:
//         1. Stock
//         2. Product
//
//     Product:
//         units = 0
//         buyPrice = Stock.buyPrice
//         unitSellPrice = submitted selling price
//
//     Substations:
//         NOT touched
//
// UPDATE:
//
//     body.units
//         = NEW TOTAL warehouse units
//
// The controller does NOT calculate additional units.
//
// The service calculates:
//
//     additionalUnits =
//         newTotalUnits - currentUnits
//
// The service enforces:
//
//     newTotalUnits >= currentUnits
//
// and:
//
//     if additionalUnits > 0,
//     buyPrice is required.
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
            // Resolve and validate category.
            //
            // The frontend submits Category._id.
            // --------------------------------------------------

            const categoryId =
                await resolveCategoryId(
                    req.body.category
                );

            // --------------------------------------------------
            // Preserve the submitted form values.
            //
            // The controller does not calculate units.
            // The service owns all stock quantity logic.
            // --------------------------------------------------

            const body = {

                ...req.body,

                category:
                    categoryId
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
            //
            // createStock now creates both:
            //
            //     Stock
            //     Product
            //
            // Product starts with:
            //
            //     units = 0
            //
            // and receives:
            //
            //     buyPrice = Stock.buyPrice
            //     unitSellPrice = submitted sell price
            //
            // No substation allocation occurs here.
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

            console.error(
                "Create/update stock error:",
                error
            );

            return renderForm(
                res,
                {
                    title:
                        req.body.stockId
                            ? "Update Stock Subcategory"
                            : "Add Stock Subcategory",

                    error:
                        error.message,

                    // --------------------------------------------------
                    // Preserve exactly what the user entered.
                    //
                    // Especially important for UPDATE because
                    // body.units is the requested NEW TOTAL.
                    // --------------------------------------------------

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
//
// This is a SEPARATE operation from stock creation.
//
// Stock creation does NOT allocate to substations.
//
// This form is used later when product units are dispatched
// from warehouse Stock to substations.
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

            console.error(
                "Stock entry error:",
                error
            );

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
//
// This is the actual allocation operation.
//
// The service is responsible for keeping these balances
// synchronized:
//
//     Stock.units
//         ↓
/*
        Stock.units decreases

        Product.units increases

        Substation.productInventory.units increases
*/
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

            console.error(
                "Create product from stock error:",
                error
            );

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