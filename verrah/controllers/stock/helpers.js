const Category = require("../../models/category");
const Product = require("../../models/products");

async function resolveCategoryId(value) {
    const raw = String(value ?? "").trim();
    if (!raw) throw new Error("Select a valid stock category.");
    if (/^[a-fA-F0-9]{24}$/.test(raw)) {
        const category = await Category.findOne({_id: raw, isActive: true}).select("_id").lean();
        if (!category) throw new Error("The selected category was not found or is inactive.");
        return String(category._id);
    }
    const category = await Category.findOne({name: raw.toLowerCase(), isActive: true}).select("_id").lean();
    if (!category) throw new Error("The selected category was not found or is inactive.");
    return String(category._id);
}

async function getProductSellPrice(stockId) {
    if (!stockId) return null;
    const product = await Product.findOne({stock: stockId}).select("unitSellPrice").lean();
    if (!product) return null;
    return product.unitSellPrice ?? null;
}

async function getProductsForAllocation() {
    return Product.find({isActive: true})
        .select("_id name stock category subcategory units buyPrice unitSellPrice image description")
        .sort({name: 1}).lean();
}

module.exports = {resolveCategoryId, getProductSellPrice, getProductsForAllocation};
