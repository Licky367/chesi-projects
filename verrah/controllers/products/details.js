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

                        product: null,

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

                    product: null,

                    error:
                        "Product not found."
                }
            );

    }

};


// ==========================================================
// POST /products/price
// ==========================================================
//
// Admin-only price update.
//
// Expected body:
//
//     productId
//     unitSellPrice
//
// The route/middleware is responsible for ensuring that
// only an admin can reach this controller.
//
// ==========================================================

exports.updatePrice = async (req, res) => {

    try {

        const {
            productId,
            unitSellPrice
        } = req.body;


        // ====================================================
        // UPDATE PRICE
        // ====================================================

        const result =
            await productService.updatePrice(
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
        // RETURN TO PRODUCT WHEN POSSIBLE
        // ====================================================

        if (req.body && req.body.productId) {

            return res.redirect(
                `/products/${req.body.productId}?error=${encodeURIComponent(
                    "Failed to update product price."
                )}`
            );

        }


        // ====================================================
        // NO PRODUCT ID
        // ====================================================

        return res
            .status(400)
            .send(
                "Failed to update product price."
            );

    }

};
