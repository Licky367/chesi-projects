// ==========================================================
// controllers/products/search.js
// PRODUCT SEARCH CONTROLLER
// ==========================================================
//
// GET /products/search?q=...
//
// Renders:
//
//     views/products/search.ejs
//
// ==========================================================

const productService =
    require("../../services/products");


// ==========================================================
// SEARCH PRODUCTS
// ==========================================================
//
// The frontend sends:
//
//     /products/search?q=lip
//
// The service searches:
//
//     Product.name
//     Category.name
//
// ==========================================================

exports.search = async (req, res) => {

    try {

        // ====================================================
        // GET SEARCH TERM
        // ====================================================

        const query =
            String(
                req.query.q || ""
            ).trim();


        // ====================================================
        // EMPTY SEARCH
        // ====================================================
        //
        // Render the search page normally when no search term
        // has been entered.
        //
        // ====================================================

        if (!query) {

            return res.render(
                "products/search",
                {
                    title:
                        "Search Products | Verrah Cosmetics",

                    query: "",

                    products: [],

                    error: null
                }
            );

        }


        // ====================================================
        // SEARCH
        // ====================================================

        const products =
            await productService.searchProducts(
                query
            );


        // ====================================================
        // RENDER
        // ====================================================

        return res.render(
            "products/search",
            {
                title:
                    `Search: ${query} | Verrah Cosmetics`,

                query,

                products,

                error: null
            }
        );

    } catch (err) {

        console.error(
            "================================================"
        );

        console.error(
            "PRODUCT SEARCH ERROR"
        );

        console.error(
            "================================================"
        );

        console.error(err);


        // ====================================================
        // RENDER ERROR
        // ====================================================

        return res
            .status(500)
            .render(
                "products/search",
                {
                    title:
                        "Search Products | Verrah Cosmetics",

                    query:
                        String(
                            req.query.q || ""
                        ).trim(),

                    products: [],

                    error:
                        "Unable to search products."
                }
            );

    }

};