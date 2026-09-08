// ==========================================================
// services/categoryService.js
// CATEGORY SERVICE
// ==========================================================

const Category =
  require("../models/category");


// ==========================================================
// HELPERS
// ==========================================================

const text =
  (value) =>
    String(
      value ?? ""
    ).trim();


// ==========================================================
// CLEAN CATEGORY NAME
// ==========================================================

function cleanCategoryName(
  value
) {

  return text(value)
    .replace(/\s+/g, " ");

}


// ==========================================================
// CREATE CATEGORY
// ==========================================================

exports.createCategory =
  async (
    body,
    file = null
  ) => {

    // ------------------------------------------------------
    // CATEGORY NAME
    // ------------------------------------------------------

    const name =
      cleanCategoryName(
        body?.name
      );

    if (!name) {

      const error =
        new Error(
          "Category name is required."
        );

      error.statusCode = 400;

      throw error;
    }


    // ------------------------------------------------------
    // CATEGORY ICON
    // ------------------------------------------------------

    let categoryIcon =
      text(
        body?.categoryIcon
      );


    // ------------------------------------------------------
    // FILE UPLOAD
    // ------------------------------------------------------
    //
    // If the application's upload middleware supplies
    // a file, use its stored path/URL.
    //
    // Supports common multer configurations:
    //
    // file.path
    // file.location
    // file.filename
    //
    // ------------------------------------------------------

    if (file) {

      if (file.location) {

        categoryIcon =
          file.location;

      } else if (file.path) {

        categoryIcon =
          file.path;

      } else if (
        file.filename
      ) {

        categoryIcon =
          file.filename;

      }

    }


    if (!categoryIcon) {

      const error =
        new Error(
          "Category icon is required."
        );

      error.statusCode = 400;

      throw error;
    }


    // ------------------------------------------------------
    // DUPLICATE CATEGORY
    // ------------------------------------------------------

    const existing =
      await Category.findOne({
        name: name.toLowerCase()
      });

    if (existing) {

      const error =
        new Error(
          `The category "${name}" already exists.`
        );

      error.statusCode = 409;

      throw error;
    }


    // ------------------------------------------------------
    // CREATE CATEGORY
    // ------------------------------------------------------
    //
    // MongoDB/Mongoose automatically creates:
    //
    // category._id
    //
    // We do NOT manually create category.id.
    //
    // ------------------------------------------------------

    const category =
      await Category.create({
        name:
          name.toLowerCase(),

        categoryIcon,

        isActive:
          true
      });


    // ------------------------------------------------------
    // RETURN CREATED CATEGORY
    // ------------------------------------------------------

    return category;
  };