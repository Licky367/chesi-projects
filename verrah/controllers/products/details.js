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