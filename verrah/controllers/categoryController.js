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

      category: null,

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

          category: null,

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
// EDIT CATEGORY FORM
// GET /products/category/add/:id
// ==========================================================

exports.editForm = async (req, res) => {
  try {

    const category =
      await categoryService.getCategoryById(
        req.params.id
      );

    return res.render(
      "products/category/add",
      {
        title:
          `Edit ${category.name} | Verrah Cosmetics`,

        error: null,

        success: null,

        category,

        formData: {
          name:
            category.name || "",

          categoryIconUrl:
            ""
        },

        isAdmin:
          getIsAdmin(req)
      }
    );

  } catch (error) {

    console.error(
      "Edit category form error:",
      error
    );

    return res
      .status(error.statusCode || 404)
      .render(
        "products/category/add",
        {
          title:
            "Edit Category | Verrah Cosmetics",

          error:
            error.message ||
            "Unable to load category.",

          success: null,

          category: null,

          formData: {
            name: "",
            categoryIconUrl: ""
          },

          isAdmin:
            getIsAdmin(req)
        }
      );
  }
};


// ==========================================================
// UPDATE CATEGORY
// POST /products/category/add/:id
// ==========================================================

exports.update = async (req, res) => {
  try {

    const category =
      await categoryService.updateCategory(
        req.params.id,
        req.body,
        req.file
      );

    return res.redirect(
      `/products/category/${category._id}`
    );

  } catch (error) {

    console.error(
      "Update category error:",
      error
    );

    let category = null;

    try {

      category =
        await categoryService.getCategoryById(
          req.params.id
        );

    } catch (loadError) {

      console.error(
        "Reload category after update error:",
        loadError
      );

    }


    return res
      .status(error.statusCode || 400)
      .render(
        "products/category/add",
        {
          title:
            "Edit Category | Verrah Cosmetics",

          error:
            error.message ||
            "Unable to update category.",

          success: null,

          category,

          formData: {
            name:
              req.body?.name ||
              category?.name ||
              "",

            categoryIconUrl:
              req.body?.categoryIconUrl ||
              ""
          },

          isAdmin:
            getIsAdmin(req)
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