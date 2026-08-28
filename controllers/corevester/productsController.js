// =========================================================
// controllers/corevester/productsController.js
// =========================================================
console.log("... Loading productsController");

let productsService;
try {
    productsService = require("../../services/corevester/productsService");
    console.log("✅ productsService loaded in controller");
} catch (err) {
    console.error("❌ FAILED to load productsService inside productsController");
    console.error(err.message);
    console.error(err.stack);
    throw err;
}

let Product;
try {
    Product = require("../../models/corevester/products");
    console.log("✅ Product model loaded");
} catch (err) {
    console.error("❌ FAILED to load Product model");
    console.error(err.message);
    console.error(err.stack);
    throw err;
}

const getSessionId = (req) => {
    try {
        if (req.user && req.user._id) return req.user._id.toString();
        if (req.sessionID) return req.sessionID;
        if (req.ip) return req.ip;
        return "anonymous-" + Date.now();
    } catch (e) {
        console.error("getSessionId error:", e.message);
        return "anonymous";
    }
};

// GET /products?page - shop page
exports.productsPage = async (req, res) => {
    try {
        const category = req.query.category || 'all';
        const search = req.query.search || '';

        console.log(`[productsPage] category=${category} search=${search}`);

        const categories = await productsService.getCategories();
        const stats = await productsService.getStats();

        const sessionId = getSessionId(req);
        const products = await productsService.getProductsWithCartAdjustment(sessionId);

        // filter by category
        let filtered = products;
        if (category && category !== 'all') {
            filtered = filtered.filter(p => p.category === category);
        }
        if (search) {
            filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
        }

        const cart = productsService.getCart(sessionId);
        const cartCount = cart.reduce((s, i) => s + i.qty, 0);
        const cartTotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);

        return res.render("products", {
            title: "Products - COREVESTER",
            products: filtered,
            categories,
            activeCategory: category,
            stats,
            cart,
            cartCount,
            cartTotal,
            currentPath: req.path
        });

    } catch (err) {
        console.error("❌ productsPage ERROR:", err.message);
        console.error(err.stack);
        return res.status(500).send("productsPage error: " + err.message + "<pre>" + err.stack + "</pre>");
    }
};

// GET /products/:id - details
exports.productDetails = async (req, res) => {
    try {
        console.log(`[productDetails] id=${req.params.id}`);
        const product = await Product.findById(req.params.id).lean();
        if (!product) {
            console.warn(`Product not found: ${req.params.id}`);
            return res.status(404).render("error/404", {
                title: "Product Not Found",
                error: "Product not found",
                user: req.user || null
            });
        }

        const sessionId = getSessionId(req);
        const cart = productsService.getCart(sessionId);
        const inCart = cart.find(c => c.productId.toString() === product._id.toString());
        const cartCount = cart.reduce((s, i) => s + i.qty, 0);
        const cartTotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);

        return res.render("product-details", {
            title: product.name + " - COREVESTER",
            product,
            inCartQty: inCart ? inCart.qty : 0,
            availableUnits: product.units - (inCart ? inCart.qty : 0),
            cartCount,
            cartTotal,
            cart,
            currentPath: req.path
        });

    } catch (err) {
        console.error("❌ productDetails ERROR:", err.message);
        console.error(err.stack);
        return res.status(500).send("productDetails error: " + err.message + "<pre>" + err.stack + "</pre>");
    }
};

// POST /products/add-to-cart
exports.addToCart = async (req, res) => {
    try {
        const { productId, qty } = req.body;
        console.log(`[addToCart] productId=${productId} qty=${qty}`);
        if (!productId) throw new Error("productId required");

        const sessionId = getSessionId(req);
        const cart = await productsService.addToCart(sessionId, productId, parseInt(qty) || 1);

        return res.json({ success: true, cartCount: cart.reduce((s, i) => s + i.qty, 0) });
    } catch (err) {
        console.error("❌ addToCart ERROR:", err.message);
        return res.status(400).json({ success: false, message: err.message });
    }
};

// POST /products/remove-from-cart
exports.removeFromCart = async (req, res) => {
    try {
        const { productId } = req.body;
        console.log(`[removeFromCart] productId=${productId}`);
        const sessionId = getSessionId(req);
        const cart = await productsService.removeFromCart(sessionId, productId);
        return res.json({ success: true, cart });
    } catch (err) {
        console.error("❌ removeFromCart ERROR:", err.message);
        return res.status(400).json({ success: false, message: err.message });
    }
};

console.log("✅ productsController loaded successfully");