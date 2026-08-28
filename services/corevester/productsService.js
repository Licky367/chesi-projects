const Product = require("../../models/corevester/products");

const cartStore = new Map(); // sessionId -> cart

const productsService = {

    async getAllProducts(filter = {}){
        const query = {};
        if(filter.category && filter.category !== 'all'){
            query.category = filter.category;
        }
        if(filter.search){
            query.name = { $regex: filter.search, $options: 'i' };
        }
        return await Product.find(query).sort({ createdAt: -1 }).lean();
    },

    async getCategories(){
        return await Product.distinct("category");
    },

    async getStats(){
        const totalProducts = await Product.countDocuments();
        const totalUnitsAgg = await Product.aggregate([{ $group: { _id: null, total: { $sum: "$units" } } }]);
        return {
            totalProducts,
            totalUnits: totalUnitsAgg[0]?.total || 0
        };
    },

    getCart(sessionId){
        return cartStore.get(sessionId) || [];
    },

    clearCart(sessionId){
        cartStore.set(sessionId, []);
    },

    async addToCart(sessionId, productId, qty = 1){
        const product = await Product.findById(productId);
        if(!product) throw new Error("Product not found");

        let cart = cartStore.get(sessionId) || [];
        const existing = cart.find(i => i.productId.toString() === productId);
        const currentQty = existing ? existing.qty : 0;

        if(currentQty + qty > product.units){
            throw new Error(`Only ${product.units - currentQty} units left`);
        }

        if(existing){
            existing.qty += qty;
        } else {
            cart.push({
                productId: product._id,
                name: product.name,
                price: product.unitSellPrice,
                qty: qty,
                image: product.image
            });
        }
        cartStore.set(sessionId, cart);
        return cart;
    },

    async removeFromCart(sessionId, productId){
        let cart = cartStore.get(sessionId) || [];
        cart = cart.filter(i => i.productId.toString() !== productId);
        cartStore.set(sessionId, cart);
        return cart;
    },

    async getProductsWithCartAdjustment(sessionId){
        const products = await this.getAllProducts();
        const cart = this.getCart(sessionId);
        return products.map(p => {
            const inCart = cart.find(c => c.productId.toString() === p._id.toString());
            return {
                ...p,
                availableUnits: p.units - (inCart ? inCart.qty : 0),
                inCartQty: inCart ? inCart.qty : 0
            };
        });
    },

    cartStore // export for packageService
};

module.exports = productsService;