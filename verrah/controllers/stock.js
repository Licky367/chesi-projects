// ==========================================================
// controllers/stock.js
// STOCK CONTROLLER
// VERRAH COSMETICS
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
//
// The controller validates the category and passes the
// resolved Category._id to the service.
//
// The service remains responsible for storing the category
// in the correct Stock format.
// ==========================================================

async function resolveCategoryId(value) {

    const raw =
        String(value ?? "").trim();

    if (!raw) {

        throw new Error(
            "Select a valid stock category."
        );
    }


    // ======================================================
    // CATEGORY ID
    // ======================================================

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


    // ======================================================
    // CATEGORY NAME
    // ======================================================

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
// Stock does NOT own the selling price.
//
// Product owns:
//
//     unitSellPrice
//
// This is used only when rendering the stock edit form.
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
// GET PRODUCTS FOR PRODUCT ALLOCATION
//
// The allocation EJS needs the available Products.
//
// Product allocation is separate from stock creation.
//
// Stock creation:
//     Stock
//         ↓
//     Product
//
// Later allocation:
//     Product
//         ↓
//     Substation
//
// Keep the Product query here read-only.
// ==========================================================

async function getProductsForAllocation() {

    return Product
        .find({
            isActive: true
        })
        .select(
            "_id name stock category subcategory units buyPrice unitSellPrice image description"
        )
        .sort({
            name: 1
        })
        .lean();
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


            // ==================================================
            // CREATE MODE
            // ==================================================

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


            // ==================================================
            // UPDATE MODE
            // ==================================================

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


            // ==================================================
            // PRODUCT OWNS SELLING PRICE
            // ==================================================

            const unitSellPrice =
                await getProductSellPrice(
                    selectedStock._id
                );


            // ==================================================
            // UPDATE FORM DATA
            //
            // IMPORTANT:
            //
            // In UPDATE mode, units now means:
            //
            //     ADDITIONAL UNITS
            //
            // Therefore the form must NOT be populated with
            // the current Stock.units value as if it were the
            // value to submit.
            //
            // We deliberately start the additional quantity
            // field at zero.
            // ==================================================

            const old = {

                ...selectedStock,

                category:
                    selectedStock.category ||
                    "",

                units: 0,

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
//         = INITIAL warehouse units
//
//     body.buyPrice
//         = TOTAL purchase cost for those units
//
// The service calculates:
//
//     unitBuyPrice =
//         totalPurchaseCost / units
//
// Then it creates:
//
//     Stock
//     Product
//
// Product starts with:
//
//     units = 0
//
// and receives the calculated Stock unit buy price.
//
// ----------------------------------------------------------
//
// UPDATE:
//
//     body.units
//         = ADDITIONAL warehouse units
//
//     body.buyPrice
//         = TOTAL purchase cost for those additional units
//
// The controller does NOT calculate:
//
//     current units
//     additional units
//     new total units
//     unit buy price
//
// The service owns all of that logic.
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


            // ==================================================
            // RESOLVE CATEGORY
            // ==================================================

            const categoryId =
                await resolveCategoryId(
                    req.body.category
                );


            // ==================================================
            // PASS FORM DATA TO SERVICE
            //
            // IMPORTANT:
            //
            // buyPrice is intentionally passed through without
            // calculation.
            //
            // The service interprets it as TOTAL PURCHASE COST
            // and calculates unitBuyPrice itself.
            // ==================================================

            const body = {

                ...req.body,

                category:
                    categoryId
            };


            // ==================================================
            // UPDATE
            // ==================================================

            if (stockId) {

                await service.updateStockEntry(
                    stockId,
                    body
                );
            }


            // ==================================================
            // CREATE
            // ==================================================

            else {

                await service.createStock(
                    body
                );
            }


            // ==================================================
            // RETURN TO STOCK LIST
            // ==================================================

            return res.redirect(
                "/stock?saved=1"
            );

        } catch (error) {

            console.error(
                "Create/update stock error:",
                error
            );


            // ==================================================
            // PRESERVE USER INPUT
            //
            // In UPDATE mode:
            //
            //     body.units
            //
            // is the additional quantity entered by the user.
            //
            // We preserve exactly that value when displaying
            // the error form.
            // ==================================================

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
//
// This is a SEPARATE operation from stock creation.
//
// Stock creation does NOT allocate anything to substations.
//
// This page is used later to allocate Product inventory from
// the warehouse to a Substation.
//
// The EJS receives:
//
//     stock
//     products
//     substations
//
// ==========================================================

exports.entry =
    async (
        req,
        res
    ) => {

        try {

            const [
                stock,
                products,
                substations
            ] = await Promise.all([

                service.getStock(
                    req.params.id
                ),

                getProductsForAllocation(),

                service.getSubstations()
            ]);


            // ==================================================
            // STOCK NOT FOUND
            // ==================================================

            if (!stock) {

                return res.redirect(
                    "/stock?error=Stock+not+found"
                );
            }


            // ==================================================
            // RENDER PRODUCT ALLOCATION PAGE
            //
            // IMPORTANT:
            //
            // products is explicitly passed to the EJS.
            // ==================================================

            return res.render(
                "stock/stock-entry",
                {
                    title:
                        "Allocate Product",

                    stock,

                    products,

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
// The service is responsible for keeping:
//
//     Stock.units
//     Product.units
//     Substation.productInventory.units
//
// synchronized.
//
// FIFO consumption and weighted unit buy price calculation
// are also handled by the service.
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


            // ==================================================
            // SUCCESS
            // ==================================================

            return res.redirect(
                `/stock/${req.params.id}?saved=1`
            );

        } catch (error) {

            console.error(
                "Create product from stock error:",
                error
            );


            // ==================================================
            // RELOAD FORM DATA
            //
            // The allocation form must receive products again
            // when validation fails.
            // ==================================================

            const [
                stock,
                products,
                substations
            ] = await Promise.all([

                service.getStock(
                    req.params.id
                ),

                getProductsForAllocation(),

                service.getSubstations()
            ]);


            // ==================================================
            // STOCK NO LONGER EXISTS
            // ==================================================

            if (!stock) {

                return res.redirect(
                    "/stock"
                );
            }


            // ==================================================
            // RENDER ALLOCATION FORM WITH ERROR
            // ==================================================

            return res
                .status(400)
                .render(
                    "stock/stock-entry",
                    {
                        title:
                            "Allocate Product",

                        stock,

                        products,

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