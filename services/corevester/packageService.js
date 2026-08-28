const Package = require("../../models/corevester/package");
const Product = require("../../models/corevester/products");
const productsService = require("./productsService");

module.exports = {

    async createFromCart(sessionId){
        const cart = productsService.getCart(sessionId);
        if(!cart || cart.length === 0) throw new Error("Cart empty");

        const total = cart.reduce((s,i) => s + (i.price * i.qty), 0);

        const pkg = await Package.create({
            clientId: sessionId,
            items: cart.map(c => ({
                productId: c.productId,
                name: c.name,
                price: c.price,
                qty: c.qty,
                image: c.image
            })),
            totalAmount: total,
            status: "pending"
        });

        // Deduct stock when ordered
        for(let item of cart){
            await Product.findByIdAndUpdate(item.productId, { $inc: { units: -item.qty } });
        }

        // Clear cart correctly
        productsService.clearCart(sessionId);

        return pkg;
    },

    async getClientPackages(sessionId){
        return await Package.find({ clientId: sessionId }).sort({ createdAt: -1 }).lean();
    },

    async getPackageById(id){
        return await Package.findById(id).lean();
    }
};