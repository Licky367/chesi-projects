// ==========================================================
// controllers/products/addToCart.js
// ADD TO CART CONTROLLER
// ==========================================================

const cartService =
    require("../../services/cartService");


// ==========================================================
// POST /products/:id
// ==========================================================

exports.addToCart = async (req, res) => {

    try {

        await cartService.addToCart(
            req,
            req.params.id,
            req.body.qty
        );


        return res.redirect(
            "/carts"
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