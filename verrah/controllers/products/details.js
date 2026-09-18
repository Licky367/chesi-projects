// ==========================================================
// controllers/products/details.js
// PRODUCT DETAILS CONTROLLER
// ==========================================================

const productService =
    require("../../services/productService");


// ==========================================================
// GET /products/:id
// ==========================================================

exports.details = async (req, res) => {

    try {

        const product =
            await productService.getProduct(
                req.params.id
            );


        // ====================================================
        // NOT FOUND
        // ====================================================

        if (!product) {

            return res
                .status(404)
                .render(
                    "products/product-details",
                    {
                        title:
                            "Product not found | Verrah Cosmetics",

                        product:
                            null,

                        error:
                            "Product not found."
                    }
                );

        }


        // ====================================================
        // RENDER
        // ====================================================

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
            "================================================"
        );

        console.error(
            "PRODUCT DETAILS ERROR"
        );

        console.error(
            "================================================"
        );

        console.error(err);


        return res
            .status(404)
            .render(
                "products/product-details",
                {
                    title:
                        "Product | Verrah Cosmetics",

                    product:
                        null,

                    error:
                        "Product not found."
                }
            );

    }

};


// ==========================================================
// POST /products/:id/update
// ==========================================================
//
// Updates the product sell price.
//
// URL:
//
//     /products/:id/update
//
// Body:
//
//     unitSellPrice
//
// The route should be protected by requireAdmin.
//
// ==========================================================

exports.updateProduct = async (req, res) => {

    try {

        const productId =
            req.params.id;


        const {
            unitSellPrice
        } =
            req.body;


        // ====================================================
        // UPDATE PRICE
        // ====================================================

        const result =
            await productService.updateProduct(
                productId,
                unitSellPrice
            );


        // ====================================================
        // UPDATE FAILED
        // ====================================================

        if (!result.success) {

            return res.redirect(
                `/products/${productId}?error=${encodeURIComponent(
                    result.error
                )}`
            );

        }


        // ====================================================
        // SUCCESS
        // ====================================================

        return res.redirect(
            `/products/${result.product._id}`
        );

    } catch (err) {

        console.error(
            "================================================"
        );

        console.error(
            "UPDATE PRODUCT PRICE ERROR"
        );

        console.error(
            "================================================"
        );

        console.error(err);


        // ====================================================
        // RETURN TO PRODUCT
        // ====================================================

        return res.redirect(
            `/products/${req.params.id}?error=${encodeURIComponent(
                "Failed to update product price."
            )}`
        );

    }

};