// ==========================================================
// verrah/controllers/products.js
// PRODUCT CONTROLLER
// ==========================================================

const productService =
  require("../services/productService");

const cartService =
  require("../services/cartService");


// ==========================================================
// PRODUCT LIST
// ==========================================================
//
// GET /products
//
// ==========================================================

exports.list = async (req, res) => {

  try {

    const categories =
      await productService
        .getProductsByCategory();


    return res.render(
      "products/products",
      {
        title: "Products | Verrah Cosmetics",

        categories,

        error: null
      }
    );

  } catch (err) {

    console.error(
      "PRODUCT LIST ERROR:",
      err
    );


    return res
      .status(500)
      .render(
        "products/products",
        {
          title:
            "Products | Verrah Cosmetics",

          categories: [],

          error:
            "Unable to load products."
        }
      );

  }

};


// ==========================================================
// PRODUCT DETAILS
// ==========================================================
//
// GET /products/:id
//
// ==========================================================

exports.details = async (req, res) => {

  try {

    const product =
      await productService.getProduct(
        req.params.id
      );


    // ======================================================
    // PRODUCT NOT FOUND
    // ======================================================

    if (!product) {

      return res
        .status(404)
        .render(
          "products/product-details",
          {
            title:
              "Product not found | Verrah Cosmetics",

            product: null,

            error:
              "Product not found."
          }
        );

    }


    // ======================================================
    // RENDER PRODUCT
    // ======================================================

    return res.render(
      "products/product-details",
      {
        title:
          `${product.name} | Verrah Cosmetics`,

        product,

        error:
          req.query.error || null,

        query:
          req.query.added || ""
      }
    );

  } catch (err) {

    console.error(
      "PRODUCT DETAILS ERROR:",
      err
    );


    return res
      .status(404)
      .render(
        "products/product-details",
        {
          title:
            "Product | Verrah Cosmetics",

          product: null,

          error:
            "Product not found."
        }
      );

  }

};


// ==========================================================
// ADD PRODUCT TO CART
// ==========================================================
//
// POST /products/:id
//
// ==========================================================

exports.addToCart = async (req, res) => {

  try {

    await cartService.addToCart(
      req,
      req.params.id,
      req.body.qty
    );


    return res.redirect(
      `/products/${req.params.id}?added=1`
    );

  } catch (err) {

    console.error(
      "ADD TO CART ERROR:",
      err
    );


    return res.redirect(
      `/products/${req.params.id}?error=${encodeURIComponent(
        err.message
      )}`
    );

  }

};