console.log("... Loading services/corevester/packageService.js");


let Package, Product, productsService;

try {
    Package = require("../../models/corevester/package");
    console.log("✅ Package model loaded in packageService");
} catch (err) {
    console.error("❌ FAILED to load Package model in packageService");
    console.error("Path tried:../../models/corevester/package");
    console.error(err.message);
    console.error(err.stack);
    throw err;
}

try {
    Product = require("../../models/corevester/products");
    console.log("✅ Product model loaded in packageService");
} catch (err) {
    console.error("❌ FAILED to load Product model in packageService");
    console.error(err.message);
    console.error(err.stack);
    throw err;
}

try {
    productsService = require("./productsService");
    console.log("✅ productsService loaded in packageService");
} catch (err) {
    console.error("❌ FAILED to load productsService in packageService");
    console.error(err.message);
    console.error(err.stack);
    throw err;
}

module.exports = {

    async createFromCart(sessionId){
        console.log(`[packageService.createFromCart] sessionId=${sessionId}`);
        const cart = productsService.getCart(sessionId);
        if(!cart || cart.length === 0) throw new Error("Cart empty");

        const total = cart.reduce((s,i) => s + (i.price * i.qty), 0);
        console.log(`Cart total: ${total} items: ${cart.length}`);

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

        console.log(`Package created: ${pkg._id}`);

        for(let item of cart){
            await Product.findByIdAndUpdate(item.productId, { $inc: { units: -item.qty } });
        }

        productsService.clearCart(sessionId);
        console.log("Cart cleared");
        return pkg;
    },

    async getClientPackages(sessionId){
        return await Package.find({ clientId: sessionId }).sort({ createdAt: -1 }).lean();
    },

    async getPackageById(id){
        return await Package.findById(id).lean();
    }
};

console.log("✅ packageService loaded successfully");