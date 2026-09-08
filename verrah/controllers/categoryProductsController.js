// ==========================================================
// verrah/controllers/categoryProductsController.js
// CATEGORY PRODUCTS CONTROLLER
// ==========================================================

const mongoose = require("mongoose");

const categoryProductsService =
  require("../services/categoryProductsService");

// ==========================================================
// GET PRODUCTS BY CATEGORY
//
// URL:
// /products/:categoryName
//
// Example:
// /products/skin-care
// /products/makeup
// /products/hair-care
// ==========================================================

exports.list = async (
  req,
  res,
  next
) => {
  try {
    const categoryName =
      req.params.categoryName;

    // ------------------------------------------------------
    // IMPORTANT:
    //
    // The existing application already has:
    //
    // GET /products/:id
    //
    // Therefore, if the value looks like a MongoDB ObjectId,
    // this request is most likely an individual product URL.
    //
    // Pass it to the existing product route instead of
    // treating the ObjectId as a category.
    // ------------------------------------------------------

    if (
      mongoose.Types.ObjectId.isValid(
        categoryName
      ) &&
      String(categoryName).length === 24
    ) {
      return next();
    }

    // ------------------------------------------------------
    // Ask the service for the category products
    // ------------------------------------------------------

    const data =
      await categoryProductsService
        .getProductsByCategory(
          categoryName
        );

    // ------------------------------------------------------
    // Render category page
    // ------------------------------------------------------

    return res.render(
      "products/category",
      {
        title:
          `${data.category.label} | Verrah Cosmetics`,

        category:
          data.category,

        products:
          data.products,

        rows:
          data.rows,

        totalProducts:
          data.totalProducts,

        error: null
      }
    );

  } catch (error) {
    console.error(
      "Category products controller error:",
      error
    );

    // ------------------------------------------------------
    // Category does not exist / has no products
    // ------------------------------------------------------

    if (
      error.statusCode === 404
    ) {
      return res.status(404).render(
        "products/category",
        {
          title:
            "Category | Verrah Cosmetics",

          category: {
            name:
              req.params.categoryName,

            label:
              String(
                req.params.categoryName ||
                "Products"
              )
                .replace(
                  /[-_]+/g,
                  " "
                )
                .replace(
                  /\b\w/g,
                  (character) =>
                    character.toUpperCase()
                )
          },

          products: [],

          rows: [],

          totalProducts: 0,

          error:
            error.message
        }
      );
    }

    // ------------------------------------------------------
    // Bad request
    // ------------------------------------------------------

    if (
      error.statusCode === 400
    ) {
      return res.status(400).render(
        "products/category",
        {
          title:
            "Products | Verrah Cosmetics",

          category: null,

          products: [],

          rows: [],

          totalProducts: 0,

          error:
            error.message
        }
      );
    }

    // ------------------------------------------------------
    // Unexpected server error
    // ------------------------------------------------------

    return res.status(500).render(
      "error",
      {
        title:
          "Server Error | Verrah Cosmetics",

        error:
          "Unable to load products."
      }
    );
  }
};