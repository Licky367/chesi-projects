// ==========================================================
// controllers/products/details.js
// PRODUCT DETAILS CONTROLLER
// ==========================================================
//
// Handles:
//
// - Product details page
// - Product editing
//
// Product update route:
//
// POST /products/:id/update
//
// The route is protected by requireAdmin in the router.
//
// The controller passes the complete req.body to the service.
// ==========================================================

const productService =
    require("../../services/productService");


// ==========================================================
// PRODUCT DETAILS
// ==========================================================
//
// GET /products/:id
// ==========================================================

exports.details = async (
    req,
    res
) => {

    try {

        const product =
            await productService.getProduct(
                req.params.id
            );


        // ----------------------------------------------------
        // PRODUCT NOT FOUND
        // ----------------------------------------------------

        if (!product) {

            return res.status(404).render(
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


        // ----------------------------------------------------
        // RENDER PRODUCT
        // ----------------------------------------------------

        return res.render(
            "products/product-details",
            {
                title:
                    `${product.name} | Verrah Cosmetics`,

                product,

                error:
                    req.query.error ||
                    null,

                query:
                    req.query.added ||
                    ""
            }
        );

    } catch (err) {

        console.error(
            "=================================================="
        );

        console.error(
            "PRODUCT DETAILS ERROR"
        );

        console.error(
            err
        );

        console.error(
            "=================================================="
        );


        return res.status(404).render(
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
// UPDATE PRODUCT
// ==========================================================
//
// POST /products/:id/update
//
// The product ID is taken from:
//
//     req.params.id
//
// Editable fields are taken from:
//
//     req.body
//
// Example:
//
// req.body = {
//
//     unitSellPrice: "500"
//
// }
//
// The service handles:
//
// - Product validation
// - Product update
// - Linked Stock synchronization
// - Category conversion
// - FIFO protection
//
// ==========================================================

exports.updateProduct = async (
    req,
    res
) => {

    const productId =
        req.params.id;


    try {

        // ----------------------------------------------------
        // SEND COMPLETE UPDATE DATA TO SERVICE
        // ----------------------------------------------------
        //
        // Do NOT send only req.body.unitSellPrice.
        //
        // The service accepts the complete editable product
        // object so the same endpoint can update other product
        // fields as they are added to the editor.
        // ----------------------------------------------------

        const result =
            await productService.updateProduct(
                productId,
                req.body
            );


        // ----------------------------------------------------
        // UPDATE FAILED
        // ----------------------------------------------------

        if (
            !result ||
            !result.success
        ) {

            return res.redirect(
                `/products/${productId}?error=${encodeURIComponent(
                    result?.error ||
                    "Failed to update product."
                )}`
            );

        }


        // ----------------------------------------------------
        // UPDATE SUCCESSFUL
        // ----------------------------------------------------

        return res.redirect(
            `/substations/product/${result.product._id}`
        );

    } catch (err) {

        // ----------------------------------------------------
        // LOG ERROR
        // ----------------------------------------------------

        console.error(
            "=================================================="
        );

        console.error(
            "UPDATE PRODUCT ERROR"
        );

        console.error(
            err
        );

        console.error(
            "=================================================="
        );


        // ----------------------------------------------------
        // RETURN TO PRODUCT DETAILS
        // ----------------------------------------------------

        return res.redirect(
            `/products/${productId}?error=${encodeURIComponent(
                "Failed to update product."
            )}`
        );

    }

};