const mongoose = require("mongoose");
const Product = require("../models/products");

function titleCase(value) {
  return String(value || "other")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/*
 * Category -> subcategory rows -> products.
 *
 * Each named subcategory gets its own row(s), with six products per row.
 * Each row is horizontally scrollable by CSS.
 *
 * Products whose subcategory is blank/null/undefined are NOT given a
 * separate "Uncategorized" row. They are appended to the final row of
 * that category, filling available positions first and then creating
 * additional rows of six as needed.
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
    const category = product.category || "other";

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        label: titleCase(category),
        named: new Map(),
        noSubcategory: []
      });
    }

    const group = categoryMap.get(category);
    const subcategory = String(product.subcategory || "").trim();

    if (subcategory) {
      if (!group.named.has(subcategory)) {
        group.named.set(subcategory, []);
      }

      group.named.get(subcategory).push(product);
    } else {
      group.noSubcategory.push(product);
    }
  }

  return Array.from(categoryMap.values()).map((categoryGroup) => {
    const rows = [];

    for (const [subcategory, items] of categoryGroup.named.entries()) {
      for (let i = 0; i < items.length; i += 6) {
        rows.push({
          subcategory,
          label: subcategory,
          products: items.slice(i, i + 6),
          hasSubcategory: true
        });
      }
    }

    /*
     * Blank subcategory products belong to the last row of the category.
     * Fill an existing final row if it has fewer than six cards.
     * Otherwise start another row.
     */
    for (const product of categoryGroup.noSubcategory) {
      let lastRow = rows[rows.length - 1];

      if (
        !lastRow ||
        lastRow.products.length >= 6
      ) {
        lastRow = {
          subcategory: "",
          label: "",
          products: [],
          hasSubcategory: false
        };

        rows.push(lastRow);
      }

      lastRow.products.push(product);
    }

    return {
      category: categoryGroup.category,
      label: categoryGroup.label,
      rows
    };
  });
}

async function getProduct(id) {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  return Product.findOne({
    _id: id,
    isActive: true
  })
    .populate("substation", "name")
    .lean();
}

module.exports = {
  getProductsByCategory,
  getProduct
};
