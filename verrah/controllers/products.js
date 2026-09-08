// ==========================================================
// controllers/products.js
// PRODUCT CONTROLLER
// VERRAH COSMETICS
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
// The service returns category groups containing:
//
//     label
//     categoryName
//     rows
//
// The frontend therefore works entirely with category names.
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
                title:
                    "Products | CoreVester",

                categories,

                error: null
            }
        );

    } catch (err) {

        console.error(
            "Error loading products:",
            err
        );


        return res
            .status(500)
            .render(
                "products/products",
                {
                    title:
                        "Products | CoreVester",

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
// The product ID is used internally to locate the product.
// Category information exposed to the view is:
//
//     product.categoryName
//
// NOT:
//
//     product.category._id
//
// ==========================================================

exports.details = async (req, res) => {

    try {

        const product =
            await productService.getProduct(
                req.params.id
            );


        if (!product) {

            return res
                .status(404)
                .render(
                    "products/product-details",
                    {
                        title:
                            "Product not found | CoreVester",

                        product: null,

                        error:
                            "Product not found."
                    }
                );

        }


        return res.render(
            "products/product-details",
            {
                title:
                    `${product.name} | CoreVester`,

                product,

                error:
                    req.query.error || null,

                query:
                    req.query.added || ""
            }
        );

    } catch (err) {

        console.error(
            "Error loading product:",
            err
        );


        return res
            .status(404)
            .render(
                "products/product-details",
                {
                    title:
                        "Product | CoreVester",

                    product: null,

                    error:
                        "Product not found."
                }
            );

    }

};


// ==========================================================
// ADD TO CART
// ==========================================================
//
// POST /products/:id/cart
//
// The product ID is required here because the cart needs
// to know which product is being purchased.
//
// This has nothing to do with the category ID.
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
            "Error adding product to cart:",
            err
        );


        return res.redirect(
            `/products/${req.params.id}?error=${encodeURIComponent(
                err.message
            )}`
        );

    }

};