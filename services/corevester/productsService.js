// =========================================================
// services/corevester/productsService.js
// =========================================================

const Product = require("../../models/corevester/products");

// In-memory cart store (use req.session in production)
// Map: userId/ip -> [{productId, qty}]
const cartStore = new Map();

const productsService = {

    async getAllProducts(filter = {}){
        const query = {};
        if(filter.category && filter.category!== 'all'){
            query.category = filter.category;
        }
        if(filter.search){
            query.name = { $regex: filter.search, $options: 'i' };
        }
        const products = await Product.find(query).sort({ createdAt: -1 }).lean();
        return products;
    },

    async getCategories(){
        const cats = await Product.distinct("category");
        return cats;
    },

    async getStats(){
        const totalProducts = await Product.countDocuments(); // available products = total docs
        const totalUnits = await Product.aggregate([
            { $group: { _id: null, total: { $sum: "$units" } } }
        ]);
        const totalValue = await Product.aggregate([
            { $group: { _id: null, total: { $sum: { $multiply: ["$units", "$unitSellPrice"] } } } }
        ]);
        return {
            totalProducts,
            totalUnits: totalUnits[0]?.total || 0,
            totalValue: totalValue[0]?.total || 0
        };
    },

    // CART LOGIC
    getCart(sessionId){
        return cartStore.get(sessionId) || [];
    },

    async addToCart(sessionId, productId, qty = 1){
        const product = await Product.findById(productId);
        if(!product) throw new Error("Product not found");

        let cart = cartStore.get(sessionId) || [];
        const existing = cart.find(i => i.productId.toString() === productId);

        const currentQtyInCart = existing? existing.qty : 0;
        const requestedTotal = currentQtyInCart + qty;

        // Check stock: available = units - already in cart
        if(requestedTotal > product.units){
            throw new Error(`Only ${product.units - currentQtyInCart} units left`);
        }

        if(existing){
            existing.qty = requestedTotal;
        } else {
            cart.push({ productId, qty, name: product.name, price: product.unitSellPrice, image: product.image });
        }

        cartStore.set(sessionId, cart);
        return cart;
    },

    async removeFromCart(sessionId, productId){
        let cart = cartStore.get(sessionId) || [];
        cart = cart.filter(i => i.productId.toString()!== productId);
        cartStore.set(sessionId, cart);
        return cart;
    },

    async updateCartQty(sessionId, productId, qty){
        const product = await Product.findById(productId);
        if(qty > product.units) throw new Error(`Only ${product.units} units available`);

        let cart = cartStore.get(sessionId) || [];
        const item = cart.find(i => i.productId.toString() === productId);
        if(item){
            if(qty <= 0) return this.removeFromCart(sessionId, productId);
            item.qty = qty;
        }
        cartStore.set(sessionId, cart);
        return cart;
    },

    async checkout(sessionId){
        const cart = cartStore.get(sessionId) || [];
        if(cart.length === 0) throw new Error("Cart empty");

        // Deduct stock for real - this is where available reduces
        for(let item of cart){
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { units: -item.qty }
            });
        }

        cartStore.set(sessionId, []);
        return { success: true, orderCount: cart.length };
    },

    // For display: get products with adjusted available units
    async getProductsWithCartAdjustment(sessionId){
        const products = await this.getAllProducts();
        const cart = this.getCart(sessionId);

        return products.map(p => {
            const inCart = cart.find(c => c.productId.toString() === p._id.toString());
            const cartQty = inCart? inCart.qty : 0;
            return {
               ...p,
                availableUnits: p.units - cartQty, // reduces when added to cart
                inCartQty: cartQty
            };
        });
    }
};

module.exports = productsService;