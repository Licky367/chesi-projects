// ==========================================================
// verrah/services/categoryService.js
// CATEGORY SERVICE
// ==========================================================

const mongoose =
  require("mongoose");

const Category =
  require("../models/category");

const Product =
  require("../models/products");

// ==========================================================
// HELPERS
// ==========================================================

function text(value) {
  return String(
    value ?? ""
  ).trim();
}

// ----------------------------------------------------------
// NORMALIZE CATEGORY NAME
// ----------------------------------------------------------

function cleanCategoryName(value) {
  return text(value)
    .replace(/\s+/g, " ");
}

// ----------------------------------------------------------
// VALIDATE IMAGE URL
// ----------------------------------------------------------

function isValidImageUrl(value) {
  if (!value) {
    return false;
  }

  try {
    const url =
      new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch (error) {
    return false;
  }
}

// ==========================================================
// CREATE CATEGORY
// ==========================================================

exports.createCategory = async (
  body = {},
  file = null
) => {
  const name =
    cleanCategoryName(body.name);

  const categoryIconUrl =
    text(body.categoryIconUrl);

  // --------------------------------------------------------
  // CATEGORY NAME
  // --------------------------------------------------------

  if (!name) {
    const error =
      new Error(
        "Category name is required."
      );

    error.statusCode = 400;

    throw error;
  }

  // --------------------------------------------------------
  // IMAGE SOURCE
  //
  // Exactly one of:
  //
  // 1. uploaded file
  // 2. image URL
  // --------------------------------------------------------

  const hasUpload =
    Boolean(file);

  const hasUrl =
    Boolean(categoryIconUrl);

  if (!hasUpload && !hasUrl) {
    const error =
      new Error(
        "Choose either an image to upload or enter an image URL."
      );

    error.statusCode = 400;

    throw error;
  }

  // --------------------------------------------------------
  // DO NOT ALLOW BOTH
  // --------------------------------------------------------

  if (hasUpload && hasUrl) {
    const error =
      new Error(
        "Use either an uploaded image or an image URL, not both."
      );

    error.statusCode = 400;

    throw error;
  }

  // --------------------------------------------------------
  // IMAGE URL VALIDATION
  // --------------------------------------------------------

  if (
    hasUrl &&
    !isValidImageUrl(categoryIconUrl)
  ) {
    const error =
      new Error(
        "The image URL must be a valid HTTP or HTTPS URL."
      );

    error.statusCode = 400;

    throw error;
  }

  // --------------------------------------------------------
  // CHECK DUPLICATE CATEGORY
  // --------------------------------------------------------

  const normalizedName =
    name.toLowerCase();

  const existing =
    await Category.findOne({
      name: normalizedName
    });

  if (existing) {
    const error =
      new Error(
        `The category "${name}" already exists.`
      );

    error.statusCode = 409;

    throw error;
  }

  // --------------------------------------------------------
  // DETERMINE STORED IMAGE
  // --------------------------------------------------------

  let categoryIcon = "";

  if (file) {
    categoryIcon =
      `/uploads/categories/${file.filename}`;
  }

  if (categoryIconUrl) {
    categoryIcon =
      categoryIconUrl;
  }

  // --------------------------------------------------------
  // CREATE CATEGORY
  // --------------------------------------------------------

  const category =
    await Category.create({
      name: normalizedName,

      categoryIcon,

      isActive: true
    });

  return category;
};

// ==========================================================
// GET CATEGORY
// ==========================================================

exports.getCategory = async (
  categoryId
) => {
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

  return category;
};

// ==========================================================
// GET PRODUCTS IN CATEGORY
// ==========================================================

exports.getCategoryProducts = async (
  categoryId
) => {
  const category =
    await exports.getCategory(
      categoryId
    );

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

  return {
    category,
    products
  };
};

// ==========================================================
// GET ACTIVE CATEGORIES
// ==========================================================

exports.getCategories =
  async () => {
    return Category.find({
      isActive: true
    })
      .select(
        "_id name categoryIcon isActive"
      )
      .sort({
        name: 1
      })
      .lean();
  };