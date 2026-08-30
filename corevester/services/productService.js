// =========================================================
// services/productService.js
// MARKETPLACE PRODUCT SERVICE
// =========================================================
const Product = require("../models/products");

async function getProductsByCategory() {
  const products = await Product.find({ isActive: true })
    .sort({ category: 1, name: 1 })
    .lean();

  const map = new Map();
  for (const product of products) {
    const category = product.category || "other";
    if (!map.has(category)) map.set(category, []);
    map.get(category).push(product);
  }

  return Array.from(map.entries()).map(([category, items]) => ({
    category,
    label: category.replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    products: items
  }));
}

async function getProduct(id) {
  return Product.findOne({ _id: id, isActive: true }).lean();
}

module.exports = { getProductsByCategory, getProduct };
