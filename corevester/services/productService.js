const Product = require("../models/products");

const label = (value) =>
  String(value || "other")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

function chunk(items, size = 6) {
  const rows = [];

  for (let i = 0; i < items.length; i += size) {
    rows.push({
      products: items.slice(i, i + size)
    });
  }

  return rows;
}

/*
 * Products are grouped:
 *
 * Category
 *   Subcategory
 *     Row 1: max 6 horizontally scrollable
 *     Row 2: next 6
 *     ...
 *
 * Products without a subcategory are placed in the final "Other" rows
 * of their category.
 */
async function getProductsByCategory() {
  const products = await Product.find({ isActive: true })
    .sort({
      category: 1,
      subcategory: 1,
      name: 1,
      createdAt: 1
    })
    .lean();

  const categoryMap = new Map();

  for (const product of products) {
    const category =
      product.category || "other";

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        label: label(category),
        subcategoryMap: new Map(),
        uncategorized: []
      });
    }

    const group = categoryMap.get(category);

    const subcategory =
      String(product.subcategory || "").trim();

    if (!subcategory) {
      group.uncategorized.push(product);
      continue;
    }

    if (!group.subcategoryMap.has(subcategory)) {
      group.subcategoryMap.set(
        subcategory,
        {
          subcategory,
          label: label(subcategory),
          products: []
        }
      );
    }

    group.subcategoryMap
      .get(subcategory)
      .products
      .push(product);
  }

  return Array.from(categoryMap.values()).map(
    (group) => {
      const rows = [];

      for (const subcategory of group.subcategoryMap.values()) {
        for (const row of chunk(subcategory.products, 6)) {
          rows.push({
            hasSubcategory: true,
            subcategory:
              subcategory.subcategory,
            label:
              subcategory.label,
            products:
              row.products
          });
        }
      }

      /*
       * Null/undefined/blank subcategories belong at the end
       * of their category, exactly as requested.
       */
      for (const row of chunk(group.uncategorized, 6)) {
        rows.push({
          hasSubcategory: false,
          subcategory: "",
          label: "Other",
          products: row.products
        });
      }

      return {
        category: group.category,
        label: group.label,
        rows
      };
    }
  );
}

async function getProduct(id) {
  return Product.findOne({
    _id: id,
    isActive: true
  }).lean();
}

module.exports = {
  getProductsByCategory,
  getProduct
};
