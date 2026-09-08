// ==========================================================
// verrah/services/categoryProductsService.js
// CATEGORY PRODUCTS SERVICE
// ==========================================================

const mongoose =
  require("mongoose");

const Category =
  require("../models/category");

const Product =
  require("../models/products");


// ==========================================================
// GET PRODUCTS BELONGING TO A CATEGORY
// ==========================================================

async function getProductsByCategory(
  categoryId
) {

  // --------------------------------------------------------
  // Validate ObjectId
  // --------------------------------------------------------

  if (
    !categoryId ||
    !mongoose.Types.ObjectId.isValid(
      categoryId
    )
  ) {

    const error =
      new Error(
        "Invalid category ID."
      );

    error.statusCode = 400;

    throw error;
  }


  // --------------------------------------------------------
  // Find category
  // --------------------------------------------------------

  const category =
    await Category.findOne({
      _id: categoryId,
      isActive: true
    }).lean();


  if (!category) {

    const error =
      new Error(
        "Category not found."
      );

    error.statusCode = 404;

    throw error;
  }


  // --------------------------------------------------------
  // Find products belonging to this category
  // --------------------------------------------------------

  const products =
    await Product.find({
      category: category._id,
      isActive: true
    })
      .sort({
        subcategory: 1,
        name: 1,
        createdAt: 1
      })
      .lean();


  // --------------------------------------------------------
  // Return category + products
  // --------------------------------------------------------

  return {
    category,
    products
  };
}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {
  getProductsByCategory
};