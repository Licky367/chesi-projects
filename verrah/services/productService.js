const Product = require("../models/products");
const Stock = require("../models/stock");

const label = (value) =>
  String(value || "other")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

function chunk(items, size = 6) {
  const rows = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push({ products: items.slice(i, i + size) });
  }
  return rows;
}

function normalizeDirections(directions) {
  if (!directions) return undefined;
  const items = Array.isArray(directions.items)
    ? directions.items
        .map((item) => ({
          subtitle: String(item?.subtitle || "").trim(),
          content: String(item?.content || "").trim()
        }))
        .filter((item) => item.subtitle && item.content)
    : [];
  const title = String(directions.title || "").trim();
  if (!title && !items.length) return undefined;
  return { title, items };
}

async function getProductsByCategory() {
  const products = await Product.find({ isActive: true })
    .sort({ category: 1, subcategory: 1, name: 1, createdAt: 1 })
    .lean();

  const categoryMap = new Map();
  for (const product of products) {
    const category = product.category || "other";
    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        label: label(category),
        subcategoryMap: new Map(),
        uncategorized: []
      });
    }

    const group = categoryMap.get(category);
    const subcategory = String(product.subcategory || "").trim();

    if (!subcategory) {
      group.uncategorized.push(product);
      continue;
    }

    if (!group.subcategoryMap.has(subcategory)) {
      group.subcategoryMap.set(subcategory, {
        subcategory,
        label: label(subcategory),
        products: []
      });
    }
    group.subcategoryMap.get(subcategory).products.push(product);
  }

  return Array.from(categoryMap.values()).map((group) => {
    const rows = [];
    for (const subcategory of group.subcategoryMap.values()) {
      for (const row of chunk(subcategory.products, 6)) {
        rows.push({
          hasSubcategory: true,
          subcategory: subcategory.subcategory,
          label: subcategory.label,
          products: row.products
        });
      }
    }
    for (const row of chunk(group.uncategorized, 6)) {
      rows.push({
        hasSubcategory: false,
        subcategory: "",
        label: "Other",
        products: row.products
      });
    }

    return { category: group.category, label: group.label, rows };
  });
}

async function getProduct(id) {
  const product = await Product.findOne({
    _id: id,
    isActive: true
  }).lean();

  if (!product) return null;

  // Fallback for older Product documents created before directionsOfUse
  // was stored directly on Product.
  if (!normalizeDirections(product.directionsOfUse) && product.stock) {
    const stock = await Stock.findById(product.stock)
      .select("directionsOfUse")
      .lean();
    product.directionsOfUse = normalizeDirections(stock?.directionsOfUse);
  } else {
    product.directionsOfUse = normalizeDirections(product.directionsOfUse);
  }

  return product;
}

module.exports = {
  getProductsByCategory,
  getProduct
};
