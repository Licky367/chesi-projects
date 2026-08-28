// =========================================================
// controllers/corevester/productsController.js
// =========================================================
//
// COREVESTER MARKETPLACE CONTROLLER
//
// Responsible for:
//     - Rendering marketplace
//     - Rendering product details
//     - Cart requests
//     - Admin product creation
//     - Admin product deletion
//
// Product fields:
//     name
//     category
//     units
//     unitSellPrice
//     image
//
// =========================================================

console.log("... Loading productsController");

const productsService = require("../../services/corevester/productsService");

const Product = require("../../models/corevester/products");

console.log("✅ productsService loaded in productsController");
console.log("✅ Product model loaded");

// =========================================================
// SESSION / CART ID
// =========================================================
//
// Prefer authenticated user ID.
//
// If the user is not authenticated, use the Express session.
// This allows the marketplace to remain usable while still
// giving every browser session its own cart.
//
// =========================================================

function getSessionId(req) {
    try {
        if (
            req.user &&
            req.user._id
        ) {
            return String(req.user._id);
        }

        if (req.sessionID) {
            return String(req.sessionID);
        }

        if (req.session) {
            if (!req.session.__marketplaceCartId) {
                req.session.__marketplaceCartId =
                    "market-" +
                    Date.now() +
                    "-" +
                    Math.random()
                        .toString(36)
                        .slice(2);
            }

            return String(
                req.session.__marketplaceCartId
            );
        }

        return (
            "anonymous-" +
            String(req.ip || "unknown")
        );

    } catch (error) {
        console.error(
            "getSessionId error:",
            error.message
        );

        return "anonymous";
    }
}

// =========================================================
// CART SUMMARY
// =========================================================

function getCartSummary(cart) {
    const safeCart =
        Array.isArray(cart)
            ? cart
            : [];

    const cartCount =
        safeCart.reduce(
            (total, item) =>
                total +
                Number(item.qty || 0),
            0
        );

    const cartTotal =
        safeCart.reduce(
            (total, item) =>
                total +
                (
                    Number(item.price || 0) *
                    Number(item.qty || 0)
                ),
            0
        );

    return {
        cartCount,
        cartTotal
    };
}

// =========================================================
// GET /products
// =========================================================

exports.productsPage = async (req, res) => {
    try {
        const category =
            String(
                req.query.category || "all"
            ).trim();

        const search =
            String(
                req.query.search || ""
            ).trim();

        console.log(
            `[productsPage] category=${category} search=${search}`
        );

        // -------------------------------------------------
        // SESSION
        // -------------------------------------------------

        const sessionId =
            getSessionId(req);

        // -------------------------------------------------
        // LOAD MARKET DATA
        // -------------------------------------------------

        const [
            categories,
            stats,
            products
        ] = await Promise.all([
            productsService.getCategories(),

            productsService.getStats(),

            productsService.getProductsWithCartAdjustment(
                sessionId
            )
        ]);

        // -------------------------------------------------
        // FILTER CATEGORY
        // -------------------------------------------------

        let filtered =
            Array.isArray(products)
                ? products
                : [];

        if (
            category &&
            category.toLowerCase() !== "all"
        ) {
            const categoryLower =
                category.toLowerCase();

            filtered =
                filtered.filter(product => {
                    return String(
                        product.category || ""
                    ).toLowerCase() ===
                        categoryLower;
                });
        }

        // -------------------------------------------------
        // FILTER SEARCH
        // -------------------------------------------------

        if (search) {
            const searchLower =
                search.toLowerCase();

            filtered =
                filtered.filter(product => {
                    const name =
                        String(
                            product.name || ""
                        ).toLowerCase();

                    const productCategory =
                        String(
                            product.category || ""
                        ).toLowerCase();

                    return (
                        name.includes(searchLower) ||
                        productCategory.includes(searchLower)
                    );
                });
        }

        // -------------------------------------------------
        // CART
        // -------------------------------------------------

        const cart =
            productsService.getCart(
                sessionId
            );

        const {
            cartCount,
            cartTotal
        } =
            getCartSummary(cart);

        // -------------------------------------------------
        // RENDER
        // -------------------------------------------------

        return res.render(
            "products",
            {
                title:
                    "Marketplace - COREVESTER",

                products:
                    filtered,

                categories:
                    categories || [],

                activeCategory:
                    category || "all",

                search,

                stats:
                    stats || {
                        totalProducts: 0,
                        availableProducts: 0,
                        totalUnits: 0
                    },

                cart,

                cartCount,

                cartTotal,

                currentPath:
                    req.path
            }
        );

    } catch (error) {
        console.error(
            "❌ productsPage ERROR:",
            error.message
        );

        console.error(error.stack);

        return res.status(500).send(
            "Unable to load marketplace."
        );
    }
};

// =========================================================
// GET /products/:id
// =========================================================

exports.productDetails = async (req, res) => {
    try {
        const productId =
            String(
                req.params.id || ""
            ).trim();

        console.log(
            `[productDetails] id=${productId}`
        );

        if (!productId) {
            return res.status(404).render(
                "error/404",
                {
                    title:
                        "Product Not Found",

                    error:
                        "Product not found.",

                    user:
                        req.user || null
                }
            );
        }

        // -------------------------------------------------
        // LOAD PRODUCT
        // -------------------------------------------------

        const product =
            await Product
                .findById(productId)
                .lean();

        if (!product) {
            return res.status(404).render(
                "error/404",
                {
                    title:
                        "Product Not Found",

                    error:
                        "Product not found.",

                    user:
                        req.user || null
                }
            );
        }

        // -------------------------------------------------
        // CART
        // -------------------------------------------------

        const sessionId =
            getSessionId(req);

        const cart =
            productsService.getCart(
                sessionId
            );

        const cartItem =
            cart.find(item => {
                return String(
                    item.productId
                ) ===
                    String(product._id);
            });

        const inCartQty =
            cartItem
                ? Number(cartItem.qty || 0)
                : 0;

        const cartSummary =
            getCartSummary(cart);

        // -------------------------------------------------
        // AVAILABLE UNITS
        // -------------------------------------------------

        const productUnits =
            Number(
                product.units || 0
            );

        const availableUnits =
            Math.max(
                0,
                productUnits -
                inCartQty
            );

        // -------------------------------------------------
        // RENDER
        // -------------------------------------------------

        return res.render(
            "product-details",
            {
                title:
                    `${product.name || "Product"} - COREVESTER`,

                product,

                inCartQty,

                availableUnits,

                cartCount:
                    cartSummary.cartCount,

                cartTotal:
                    cartSummary.cartTotal,

                cart,

                currentPath:
                    req.path
            }
        );

    } catch (error) {
        console.error(
            "❌ productDetails ERROR:",
            error.message
        );

        console.error(error.stack);

        return res.status(500).send(
            "Unable to load product."
        );
    }
};

// =========================================================
// POST /products/add-to-cart
// =========================================================

exports.addToCart = async (req, res) => {
    try {
        const {
            productId,
            qty
        } = req.body || {};

        if (!productId) {
            return res.status(400).json({
                success: false,
                message:
                    "Product ID is required."
            });
        }

        const quantity =
            Number.parseInt(
                qty,
                10
            );

        if (
            !Number.isInteger(quantity) ||
            quantity < 1
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Quantity must be at least 1."
            });
        }

        const sessionId =
            getSessionId(req);

        const cart =
            await productsService.addToCart(
                sessionId,
                productId,
                quantity
            );

        const summary =
            getCartSummary(cart);

        return res.json({
            success: true,

            cart,

            cartCount:
                summary.cartCount,

            cartTotal:
                summary.cartTotal
        });

    } catch (error) {
        console.error(
            "❌ addToCart ERROR:",
            error.message
        );

        return res.status(400).json({
            success: false,

            message:
                error.message ||
                "Unable to add product to cart."
        });
    }
};

// =========================================================
// POST /products/update-cart-qty
// =========================================================

exports.updateCartQty = async (req, res) => {
    try {
        const {
            productId,
            qty
        } = req.body || {};

        if (!productId) {
            return res.status(400).json({
                success: false,
                message:
                    "Product ID is required."
            });
        }

        const quantity =
            Number.parseInt(
                qty,
                10
            );

        if (
            !Number.isInteger(quantity) ||
            quantity < 1
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Quantity must be at least 1."
            });
        }

        const sessionId =
            getSessionId(req);

        const cart =
            await productsService.updateCartQty(
                sessionId,
                productId,
                quantity
            );

        const summary =
            getCartSummary(cart);

        return res.json({
            success: true,

            cart,

            cartCount:
                summary.cartCount,

            cartTotal:
                summary.cartTotal
        });

    } catch (error) {
        console.error(
            "❌ updateCartQty ERROR:",
            error.message
        );

        return res.status(400).json({
            success: false,

            message:
                error.message ||
                "Unable to update cart."
        });
    }
};

// =========================================================
// POST /products/remove-from-cart
// =========================================================

exports.removeFromCart = async (req, res) => {
    try {
        const {
            productId
        } = req.body || {};

        if (!productId) {
            return res.status(400).json({
                success: false,
                message:
                    "Product ID is required."
            });
        }

        const sessionId =
            getSessionId(req);

        const cart =
            await productsService.removeFromCart(
                sessionId,
                productId
            );

        const summary =
            getCartSummary(cart);

        return res.json({
            success: true,

            cart,

            cartCount:
                summary.cartCount,

            cartTotal:
                summary.cartTotal
        });

    } catch (error) {
        console.error(
            "❌ removeFromCart ERROR:",
            error.message
        );

        return res.status(400).json({
            success: false,

            message:
                error.message ||
                "Unable to remove product."
        });
    }
};

// =========================================================
// POST /admin/products/create
// =========================================================
//
// FIELD NAMES ARE EXACTLY THOSE FROM THE PRODUCT ENTRY PAGE:
//
//     name
//     category
//     units
//     unitSellPrice
//     image
//
// =========================================================

exports.createProduct = async (req, res) => {
    try {
        const {
            name,
            category,
            units,
            unitSellPrice,
            image
        } = req.body || {};

        console.log(
            "[createProduct]",
            {
                name,
                category,
                units,
                unitSellPrice
            }
        );

        const product =
            await productsService.createProduct({
                name,
                category,
                units,
                unitSellPrice,
                image
            });

        return res.status(201).json({
            success: true,

            message:
                "Product added to marketplace.",

            product
        });

    } catch (error) {
        console.error(
            "❌ createProduct ERROR:",
            error.message
        );

        console.error(error.stack);

        return res.status(400).json({
            success: false,

            message:
                error.message ||
                "Unable to create product."
        });
    }
};

// =========================================================
// DELETE /admin/products/:id
// =========================================================

exports.deleteProduct = async (req, res) => {
    try {
        const productId =
            String(
                req.params.id || ""
            ).trim();

        if (!productId) {
            return res.status(400).json({
                success: false,
                message:
                    "Product ID is required."
            });
        }

        const result =
            await productsService.deleteProduct(
                productId
            );

        return res.json({
            success: true,

            message:
                "Product removed from marketplace.",

            product:
                result
        });

    } catch (error) {
        console.error(
            "❌ deleteProduct ERROR:",
            error.message
        );

        console.error(error.stack);

        return res.status(400).json({
            success: false,

            message:
                error.message ||
                "Unable to remove product."
        });
    }
};

console.log(
    "✅ productsController loaded successfully"
);