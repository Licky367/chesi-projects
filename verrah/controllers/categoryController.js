// ==========================================================
// verrah/controllers/categoryController.js
// CATEGORY CONTROLLER
// ==========================================================

const categoryService =
  require("../services/categoryService");


// ==========================================================
// ADMIN STATUS
// ==========================================================

function getIsAdmin(req) {
  return Boolean(
    req.user &&
    String(req.user.role || "").toLowerCase() === "admin"
  );
}


// ==========================================================
// ADD CATEGORY FORM
// GET /products/category/add
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
      },

      isAdmin: getIsAdmin(req)
    }
  );
};


// ==========================================================
// CREATE CATEGORY
// POST /products/category/add
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
          },

          isAdmin: getIsAdmin(req)
        }
      );
  }
};


// ==========================================================
// CATEGORY PRODUCTS
// GET /products/category/:id
// ==========================================================

exports.products = async (req, res) => {
  try {

    const {
      category,
      products
    } =
      await categoryService.getCategoryProducts(
        req.params.id
      );

    return res.render(
      "products/category",
      {
        title:
          `${category.name} | Verrah Cosmetics`,

        category,

        products,

        isAdmin:
          getIsAdmin(req),

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

          isAdmin:
            getIsAdmin(req),

          error:
            error.message ||
            "Unable to load category."
        }
      );
  }
};