// ==========================================================
// controllers/products/addManyToCart.js
// ADD MANY PRODUCTS TO CART CONTROLLER
// ==========================================================

const cartService =
    require("../../services/cartService");


// ==========================================================
// POST /products/add-many
// ==========================================================

exports.addManyToCart = async (req, res) => {

    try {

        const products =
            Array.isArray(req.body.products)
                ? req.body.products
                : [];


        // ======================================================
        // VALIDATE PRODUCTS
        // ======================================================

        if (!products.length) {

            throw new Error(
                "No products were selected."
            );

        }


        // ======================================================
        // ADD EACH PRODUCT TO CART
        // ======================================================

        for (const item of products) {

            if (
                !item ||
                !item.productId ||
                !item.qty
            ) {
                continue;
            }


            await cartService.addToCart(
                req,
                item.productId,
                item.qty
            );

        }


        // ======================================================
        // SUCCESS
        // ======================================================

        return res.redirect(
            "/carts"
        );


    } catch (err) {

        console.error(
            "ADD MANY PRODUCTS TO CART ERROR:",
            err
        );


        // ======================================================
        // ERROR
        // ======================================================

        return res.redirect(
            `/products?error=${encodeURIComponent(
                err.message
            )}`
        );

    }

};