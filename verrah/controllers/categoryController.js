// ==========================================================
// verrah/controllers/categoryController.js
// CATEGORY CONTROLLER
// ==========================================================

const categoryService =
  require("../services/categoryService");

// ==========================================================
// ADD CATEGORY FORM
// ==========================================================

exports.addForm = async (req, res) => {
  return res.render(
    "products/category/add",
    {
      title: "Add Category | Verrah Cosmetics",

      error: null,

      success: null,

      formData: {
        name: "",
        categoryIconUrl: ""
      }
    }
  );
};

// ==========================================================
// CREATE CATEGORY
// ==========================================================

exports.create = async (req, res) => {
  try {
    const category =
      await categoryService.createCategory(
        req.body,
        req.file
      );

    return res.redirect(
      `/products/category/${category._id}`
    );
  } catch (error) {
    console.error(
      "Create category error:",
      error
    );

    return res
      .status(error.statusCode || 400)
      .render(
        "products/category/add",
        {
          title:
            "Add Category | Verrah Cosmetics",

          error:
            error.message ||
            "Unable to create category.",

          success: null,

          formData: {
            name:
              req.body?.name || "",

            categoryIconUrl:
              req.body?.categoryIconUrl || ""
          }
        }
      );
  }
};

// ==========================================================
// CATEGORY PRODUCTS
// ==========================================================

exports.products = async (req, res) => {
  try {
    const result =
      await categoryService.getCategoryProducts(
        req.params.id
      );

    return res.render(
      "products/category",
      {
        title:
          `${result.category.name} | Verrah Cosmetics`,

        category:
          result.category,

        products:
          result.products,

        error: null
      }
    );
  } catch (error) {
    console.error(
      "Category products error:",
      error
    );

    return res
      .status(error.statusCode || 500)
      .render(
        "products/category",
        {
          title:
            "Category | Verrah Cosmetics",

          category: null,

          products: [],

          error:
            error.message ||
            "Unable to load category."
        }
      );
  }
};