// ==========================================================
// controllers/categoryController.js
// CATEGORY CONTROLLER
// ==========================================================

const categoryService =
  require("../services/categoryService");

// ==========================================================
// ADD CATEGORY FORM
// ==========================================================

exports.addForm =
  async (req, res) => {

    return res.render(
      "products/category/add",
      {
        title:
          "Add Category | Verrah Cosmetics",

        error:
          null,

        success:
          null,

        formData:
          {}
      }
    );
  };


// ==========================================================
// CREATE CATEGORY
// ==========================================================

exports.create =
  async (req, res) => {

    try {

      const category =
        await categoryService.createCategory(
          req.body,
          req.file
        );

      // ------------------------------------------------------
      // Redirect to the newly created category
      // ------------------------------------------------------

      return res.redirect(
        `/products/category/${category._id}`
      );

    } catch (error) {

      console.error(
        "Create category error:",
        error
      );

      return res
        .status(
          error.statusCode || 400
        )
        .render(
          "products/category/add",
          {
            title:
              "Add Category | Verrah Cosmetics",

            error:
              error.message ||
              "Unable to create category.",

            success:
              null,

            formData:
              req.body || {}
          }
        );
    }
  };