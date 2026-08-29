// =========================================================
// controllers/products.js
// =========================================================
const productService = require("../services/productService");
const cartService = require("../services/cartService");

exports.list = async (req, res) => {
  try {
    const categories = await productService.getProductsByCategory();
    res.render("products/products", {
      title: "Products | CoreVester",
      categories
    });
  } catch (err) {
    console.error(err);
    res.status(500).render("products/products", {
      title: "Products | CoreVester",
      categories: [],
      error: "Unable to load products."
    });
  }
};

exports.details = async (req, res) => {
  try {
    const product = await productService.getProduct(req.params.id);

    if (!product) {
      return res.status(404).render("products/product-details", {
        title: "Product not found | CoreVester",
        product: null,
        error: "Product not found."
      });
    }

    res.render("products/product-details", {
      title: `${product.name} | CoreVester`,
      product,
      error: req.query.error || null,
      query: req.query.added || ""
    });
  } catch (err) {
    console.error(err);
    res.status(404).render("products/product-details", {
      title: "Product | CoreVester",
      product: null,
      error: "Product not found."
    });
  }
};

exports.addToCart = async (req, res) => {
  try {
    await cartService.addToCart(req, req.params.id, req.body.qty);
    res.redirect(`/products/${req.params.id}?added=1`);
  } catch (err) {
    console.error(err);
    res.redirect(`/products/${req.params.id}?error=${encodeURIComponent(err.message)}`);
  }
};
