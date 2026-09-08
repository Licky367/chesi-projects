// ==========================================================
// verrah/services/categoryProductsService.js
// PRODUCTS BELONGING TO A PARTICULAR CATEGORY
// ==========================================================

const mongoose = require("mongoose");

const Product = require("../models/products");

// ----------------------------------------------------------
// Escape a value before using it inside a regular expression
// ----------------------------------------------------------

function escapeRegex(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

// ----------------------------------------------------------
// Convert category names such as:
// "skin-care" -> "Skin Care"
// "hair_care" -> "Hair Care"
// "makeup"    -> "Makeup"
// ----------------------------------------------------------

function categoryLabel(value) {
  return String(value || "other")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

// ----------------------------------------------------------
// Get products belonging to one category
// ----------------------------------------------------------

async function getProductsByCategory(categoryName) {
  if (
    !categoryName ||
    typeof categoryName !== "string"
  ) {
    const error = new Error(
      "Category name is required."
    );

    error.statusCode = 400;

    throw error;
  }

  const decodedCategoryName =
    decodeURIComponent(categoryName)
      .trim();

  if (!decodedCategoryName) {
    const error = new Error(
      "Category name is required."
    );

    error.statusCode = 400;

    throw error;
  }

  // --------------------------------------------------------
  // Find all active products whose category matches the
  // requested category.
  //
  // Product.category is currently a String in products.js.
  // We therefore DO NOT require a Category model.
  // --------------------------------------------------------

  const products =
    await Product.find({
      category: {
        $regex:
          `^${escapeRegex(decodedCategoryName)}$`,
        $options: "i"
      },

      isActive: true
    })
      .sort({
        subcategory: 1,
        name: 1,
        createdAt: 1
      })
      .lean();

  // --------------------------------------------------------
  // No products in this category
  // --------------------------------------------------------

  if (!products.length) {
    const error = new Error(
      `No products found in the "${decodedCategoryName}" category.`
    );

    error.statusCode = 404;

    throw error;
  }

  // --------------------------------------------------------
  // Use the actual stored category value from Product.
  // This keeps the page aligned with the database rather
  // than inventing a separate Category document.
  // --------------------------------------------------------

  const actualCategory =
    products[0].category;

  // --------------------------------------------------------
  // Group products by subcategory.
  //
  // Example:
  //
  // skin-care
  //   cleansers
  //   moisturizers
  //
  // hair-care
  //   shampoos
  //   conditioners
  // --------------------------------------------------------

  const subcategoryMap =
    new Map();

  const uncategorized = [];

  for (const product of products) {
    const subcategory =
      String(product.subcategory || "")
        .trim();

    if (!subcategory) {
      uncategorized.push(product);
      continue;
    }

    if (
      !subcategoryMap.has(subcategory)
    ) {
      subcategoryMap.set(
        subcategory,
        []
      );
    }

    subcategoryMap
      .get(subcategory)
      .push(product);
  }

  // --------------------------------------------------------
  // Convert grouped products into rows of six.
  //
  // 1 - 6   => row 1
  // 7 - 12  => row 2
  // 13 - 18 => row 3
  // etc.
  // --------------------------------------------------------

  function chunk(items, size = 6) {
    const rows = [];

    for (
      let index = 0;
      index < items.length;
      index += size
    ) {
      rows.push(
        items.slice(
          index,
          index + size
        )
      );
    }

    return rows;
  }

  const rows = [];

  for (
    const [
      subcategory,
      subcategoryProducts
    ]
    of subcategoryMap.entries()
  ) {
    const productRows =
      chunk(
        subcategoryProducts,
        6
      );

    for (
      const row of productRows
    ) {
      rows.push({
        hasSubcategory: true,

        subcategory,

        label:
          categoryLabel(
            subcategory
          ),

        products: row
      });
    }
  }

  // --------------------------------------------------------
  // Products without a subcategory
  // --------------------------------------------------------

  for (
    const row of chunk(
      uncategorized,
      6
    )
  ) {
    rows.push({
      hasSubcategory: false,

      subcategory: "",

      label: "Other",

      products: row
    });
  }

  // --------------------------------------------------------
  // Return everything required by the controller/view
  // --------------------------------------------------------

  return {
    category: {
      name: actualCategory,
      label:
        categoryLabel(
          actualCategory
        )
    },

    products,

    rows,

    totalProducts:
      products.length
  };
}

// ----------------------------------------------------------
// Exports
// ----------------------------------------------------------

module.exports = {
  getProductsByCategory
};