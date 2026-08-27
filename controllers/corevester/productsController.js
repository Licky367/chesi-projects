// =========================================================
// controllers/corevester/productsController.js
// =========================================================

const productsService = require("../../services/corevester/productsService");

const getSessionId = (req) => {
    // simple session id - use req.ip + user id if logged in
    return req.user? req.user._id.toString() : req.ip;
};

exports.productsPage = async (req, res) => {
    try {
        const sessionId = getSessionId(req);
        const category = req.query.category || 'all';
        const search = req.query.search || '';

        let products = await productsService.getProductsWithCartAdjustment(sessionId);

        // filter after adjustment
        if(category!== 'all'){
            products = products.filter(p => p.category === category);
        }
        if(search){
            products = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
        }

        const categories = await productsService.getCategories();
        const stats = await productsService.getStats();
        const cart = productsService.getCart(sessionId);
        const cartTotal = cart.reduce((sum, i) => sum + (i.qty * i.price), 0);
        const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

        res.render("products", {
            title: "Products - COREVESTER",
            products,
            categories,
            stats,
            cart,
            cartTotal,
            cartCount,
            activeCategory: category,
            searchQuery: search,
            currentPath: req.path
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading products: " + err.message);
    }
};

exports.addToCart = async (req, res) => {
    try {
        const sessionId = getSessionId(req);
        const { productId, qty } = req.body;
        const cart = await productsService.addToCart(sessionId, productId, parseInt(qty) || 1);
        const cartCount = cart.reduce((s,i)=>s+i.qty,0);
        res.json({ success: true, cartCount, cart });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.removeFromCart = async (req, res) => {
    try {
        const sessionId = getSessionId(req);
        const cart = await productsService.removeFromCart(sessionId, req.body.productId);
        res.json({ success: true, cart });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.checkout = async (req, res) => {
    try {
        const sessionId = getSessionId(req);
        const result = await productsService.checkout(sessionId);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
exports.productDetails = async (req, res) => {
    try{
        const Product = require("../../models/corevester/products");
        const product = await Product.findById(req.params.id).lean();
        if(!product) return res.status(404).send("Product not found");

        const sessionId = getSessionId(req);
        const cart = productsService.getCart(sessionId);
        const inCart = cart.find(c=> c.productId.toString()=== product._id.toString());
        const cartCount = cart.reduce((s,i)=> s+i.qty, 0);
        const cartTotal = cart.reduce((s,i)=> s + (i.price * i.qty), 0);

        res.render("corevester/product-details", {
            title: product.name + " - COREVESTER",
            product,
            inCartQty: inCart? inCart.qty : 0,
            availableUnits: product.units - (inCart? inCart.qty : 0),
            cartCount,
            cartTotal,
            cart,
            currentPath: req.path
        });
    }catch(err){
        res.status(500).send(err.message);
    }
};