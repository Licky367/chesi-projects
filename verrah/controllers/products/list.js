// ==========================================================
// controllers/products/list.js
// PRODUCT LIST CONTROLLER
// ==========================================================

const productService =
    require("../../services/productService");


// ==========================================================
// GET /products
// ==========================================================

exports.list = async (req, res) => {

    try {

        const categories =
            await productService.getProductsByCategory();


        return res.render(
            "products/products",
            {
                title:
                    "Products | Verrah Cosmetics",

                categories,

                error: null
            }
        );

    } catch (err) {

        console.error(
            "================================================"
        );

        console.error(
            "PRODUCT LIST ERROR"
        );

        console.error(
            "================================================"
        );

        console.error(err);


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