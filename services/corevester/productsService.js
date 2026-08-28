// =========================================================
// services/corevester/productsService.js
// UPDATED: Cart now reduces Product.units in DB
// =========================================================
const Product = require("../../models/corevester/products");

const carts = new Map();

function normalizeString(value){ return String(value == null ? "" : value).trim(); }
function normalizeCategory(value){ return normalizeString(value); }
function normalizeImage(value){ const image = normalizeString(value); return image || ""; }
function getNumeric(value, fallback = 0){ const number = Number(value); return Number.isFinite(number) ? number : fallback; }
function getCartInternal(sessionId){
    const key = normalizeString(sessionId) || "anonymous";
    if (!carts.has(key)){ carts.set(key, []); }
    return carts.get(key);
}
function cloneCart(cart){
    return cart.map(item => ({
        productId: String(item.productId),
        name: item.name,
        price: Number(item.price || 0),
        qty: Number(item.qty || 0)
    }));
}

async function cleanCart(sessionId){
    const cart = getCartInternal(sessionId);
    if (!cart.length) return cart;
    const productIds = cart.map(item => String(item.productId));
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map();
    products.forEach(product => { productMap.set(String(product._id), product); });
    const cleaned = [];
    for (const item of cart){
        const product = productMap.get(String(item.productId));
        if (!product) continue;
        const stock = Math.max(0, getNumeric(product.units)) + Number(item.qty || 0); // stock + what is in cart
        let quantity = Math.max(0, Number(item.qty || 0));
        quantity = Math.min(quantity, stock);
        if (quantity <= 0) continue;
        cleaned.push({ productId: String(product._id), name: product.name, price: getNumeric(product.unitSellPrice), qty: quantity });
    }
    carts.set(normalizeString(sessionId), cleaned);
    return cleaned;
}

exports.getCategories = async () => {
    const categories = await Product.distinct("category");
    return categories.map(category => normalizeCategory(category)).filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
};

exports.getStats = async () => {
    const result = await Product.aggregate([{ $group: { _id: null, totalProducts: { $sum: 1 }, availableProducts: { $sum: { $cond: [{ $gt: [{ $ifNull: ["$units", 0] }, 0] }, 1, 0] } }, totalUnits: { $sum: { $ifNull: ["$units", 0] } } } }]);
    if (!result.length) return { totalProducts: 0, availableProducts: 0, totalUnits: 0 };
    return { totalProducts: Number(result[0].totalProducts || 0), availableProducts: Number(result[0].availableProducts || 0), totalUnits: Number(result[0].totalUnits || 0) };
};

exports.getProducts = async () => {
    return Product.find({}).sort({ category: 1, name: 1 }).lean();
};

exports.getProductsWithCartAdjustment = async (sessionId) => {
    const products = await Product.find({}).sort({ category: 1, name: 1 }).lean();
    await cleanCart(sessionId);
    return products;
};

exports.getCart = function(sessionId){
    const cart = getCartInternal(sessionId);
    return cloneCart(cart);
};

// =========================================================
// ADD TO CART - NOW REDUCES Product.units
// =========================================================
exports.addToCart = async function(sessionId, productId, quantity = 1){
    const id = normalizeString(productId);
    if (!id) throw new Error("Product ID is required.");
    const qty = Number.parseInt(quantity, 10);
    if (!Number.isInteger(qty) || qty < 1) throw new Error("Quantity must be at least 1.");

    const product = await Product.findById(id);
    if (!product) throw new Error("Product not found.");

    const stock = Math.max(0, getNumeric(product.units));
    if (stock <= 0) throw new Error("This product is out of stock.");
    if (qty > stock) throw new Error(`Only ${stock} unit${stock===1?"":"s"} available.`);

    // 1. REDUCE FROM PRODUCTS MODEL
    product.units = stock - qty;
    await product.save();

    // 2. INCREASE IN CARTS (Map - your carts model)
    const cart = getCartInternal(sessionId);
    const existing = cart.find(item => String(item.productId) === id);
    if (existing){
        existing.qty += qty;
        existing.name = product.name;
        existing.price = getNumeric(product.unitSellPrice);
    } else {
        cart.push({ productId: String(product._id), name: product.name, price: getNumeric(product.unitSellPrice), qty: qty });
    }

    return cloneCart(cart);
};

// =========================================================
// UPDATE CART QTY - ADJUSTS Product.units by diff
// =========================================================
exports.updateCartQty = async function(sessionId, productId, quantity){
    const id = normalizeString(productId);
    const qty = Number.parseInt(quantity, 10);
    if (!id) throw new Error("Product ID is required.");
    if (!Number.isInteger(qty) || qty < 1) throw new Error("Quantity must be at least 1.");

    const cart = getCartInternal(sessionId);
    const existingIndex = cart.findIndex(item => String(item.productId) === id);
    if (existingIndex === -1) throw new Error("Item not in cart.");

    const product = await Product.findById(id);
    if (!product) throw new Error("Product not found.");

    const oldQty = Number(cart[existingIndex].qty || 0);
    const diff = qty - oldQty; // positive = need more stock

    const stock = Math.max(0, getNumeric(product.units));
    if (diff > 0 && stock < diff) throw new Error(`Only ${stock + oldQty} unit${(stock+oldQty)===1?"":"s"} available.`);

    // Adjust DB stock
    product.units = Math.max(0, stock - diff);
    await product.save();

    cart[existingIndex] = { productId: String(product._id), name: product.name, price: getNumeric(product.unitSellPrice), qty };
    return cloneCart(cart);
};

// =========================================================
// REMOVE FROM CART - RETURNS STOCK TO PRODUCTS
// =========================================================
exports.removeFromCart = async function(sessionId, productId){
    const id = normalizeString(productId);
    if (!id) throw new Error("Product ID is required.");

    const cart = getCartInternal(sessionId);
    const item = cart.find(i => String(i.productId) === id);
    
    if (item){
        const product = await Product.findById(id);
        if (product){
            product.units = Number(product.units || 0) + Number(item.qty || 0);
            await product.save();
        }
    }

    const filtered = cart.filter(item => String(item.productId) !== id);
    carts.set(normalizeString(sessionId), filtered);
    return cloneCart(filtered);
};

// =========================================================
// CREATE PRODUCT - NOW SUPPORTS description, usage, precautions
// =========================================================
exports.createProduct = async function(data = {}){
    const name = normalizeString(data.name);
    const category = normalizeCategory(data.category);
    const units = Number.parseInt(data.units, 10);
    const unitSellPrice = Number(data.unitSellPrice);
    const image = normalizeImage(data.image);
    const description = normalizeString(data.description);
    const usage = normalizeString(data.usage);
    const precautions = normalizeString(data.precautions);
    const specifications = normalizeString(data.specifications);

    if (!name) throw new Error("Product name is required.");
    if (!category) throw new Error("Product category is required.");
    if (!Number.isInteger(units) || units < 1) throw new Error("Units must be at least 1.");
    if (!Number.isFinite(unitSellPrice) || unitSellPrice < 0) throw new Error("Selling price must be a valid amount.");

    const existing = await Product.findOne({
        name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
        category: { $regex: `^${escapeRegex(category)}$`, $options: "i" }
    }).lean();
    if (existing) throw new Error(`${name} is already listed in the marketplace.`);

    const product = await Product.create({
        name, category, units, unitSellPrice, image,
        description: description || undefined,
        usage: usage || undefined,
        precautions: precautions || undefined,
        specifications: specifications || undefined
    });

    return product.toObject();
};

exports.deleteProduct = async function(productId){
    const id = normalizeString(productId);
    if (!id) throw new Error("Product ID is required.");
    const product = await Product.findById(id);
    if (!product) throw new Error("Product not found.");
    const result = product.toObject();
    await Product.deleteOne({ _id: product._id });
    for (const [sessionId, cart] of carts.entries()){
        const filtered = cart.filter(item => String(item.productId) !== String(product._id));
        carts.set(sessionId, filtered);
    }
    return result;
};

function escapeRegex(value){ return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

console.log("✅ productsService loaded successfully - NOW WITH STOCK REDUCTION");