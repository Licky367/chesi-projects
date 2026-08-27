const Package = require("../../models/corevester/package");
const Product = require("../../models/corevester/products");
const productsService = require("./productsService");

module.exports = {
    async createFromCart(sessionId){
        const cart = productsService.getCart(sessionId);
        if(cart.length===0) throw new Error("Cart empty");

        const total = cart.reduce((s,i)=> s + (i.price * i.qty), 0);

        // Create package
        const pkg = await Package.create({
            clientId: sessionId,
            items: cart,
            totalAmount: total
        });

        // Deduct stock NOW (when ordered, not when added to cart)
        for(let item of cart){
            await Product.findByIdAndUpdate(item.productId, { $inc: { units: -item.qty } });
        }

        // Clear cart
        productsService.getCart(sessionId).length = 0;
        // or using your store Map
        const cartStore = require("./productsService").cartStore || null;
        // if you exported cartStore, clear it
        try{
            const ps = require("./productsService");
            if(ps.cartStore) ps.cartStore.set(sessionId, []);
        }catch(e){}

        return pkg;
    },

    async getClientPackages(sessionId){
        return await Package.find({ clientId: sessionId }).sort({ createdAt: -1 }).lean();
    },

    async getPackageById(id){
        return await Package.findById(id).lean();
    }
};