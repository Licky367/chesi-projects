// ==========================================================
// verrah/controllers/categoryProductsController.js
// CATEGORY PRODUCTS CONTROLLER
// ==========================================================

const categoryProductsService =
  require(
    "../services/categoryProductsService"
  );


// ==========================================================
// GET /products/category/:id
// ==========================================================

exports.list = async (
  req,
  res
) => {

  try {

    const categoryId =
      req.params.id;


    // ------------------------------------------------------
    // Get category and products
    // ------------------------------------------------------

    const {
      category,
      products
    } =
      await categoryProductsService
        .getProductsByCategory(
          categoryId
        );


    // ------------------------------------------------------
    // Determine whether current user is admin
    // ------------------------------------------------------

    const isAdmin =
      Boolean(
        req.user &&
        String(
          req.user.role || ""
        ).toLowerCase() ===
          "admin"
      );


    // ------------------------------------------------------
    // Render category products page
    // ------------------------------------------------------

    return res.render(
      "products/category",
      {
        title:
          `${category.name} | Verrah Cosmetics`,

        category,

        products,

        isAdmin,

        error: null
      }
    );

  } catch (error) {

    console.error(
      "Category products error:",
      error
    );


    // ------------------------------------------------------
    // Category not found / invalid ID
    // ------------------------------------------------------

    if (
      error.statusCode === 400 ||
      error.statusCode === 404
    ) {

      return res.status(
        error.statusCode
      ).render(
        "products/category",
        {
          title:
            "Category | Verrah Cosmetics",

          category: null,

          products: [],

          isAdmin:
            Boolean(
              req.user &&
              String(
                req.user.role || ""
              ).toLowerCase() ===
                "admin"
            ),

          error:
            error.message
        }
      );
    }


    // ------------------------------------------------------
    // Unexpected error
    // ------------------------------------------------------

    return res.status(500).render(
      "error",
      {
        title:
          "Server Error | Verrah Cosmetics",

        error:
          "Unable to load category products."
      }
    );
  }
};