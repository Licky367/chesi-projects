const Cart = require("../models/carts");


// ==========================================================
// GET SESSION CART DATA
//
// RETURNS TWO SEPARATE DATASETS:
//
// 1. userCart
//    The cart belonging to the currently logged-in user.
//
// 2. allCarts
//    Every cart belonging to every user.
//
// Cart.user is the cart identity.
// There is NO sessionId.
// There are NO guest carts.
// ==========================================================

const getSessionCartData = async (user) => {

    // ======================================================
    // NO LOGGED-IN USER
    // ======================================================

    if (!user || !user._id) {

        return {
            userCart: null,
            allCarts: []
        };
    }


    // ======================================================
    // USER'S OWN CART
    // ======================================================

    const userCart = await Cart
        .findOne({
            user: user._id
        })
        .populate(
            "user",
            "name email role"
        )
        .lean();


    // ======================================================
    // ALL CARTS
    // ======================================================

    const allCarts = await Cart
        .find({})
        .populate(
            "user",
            "name email role"
        )
        .sort({
            updatedAt: -1
        })
        .lean();


    // ======================================================
    // RETURN BOTH DATASETS
    // ======================================================

    return {
        userCart: userCart || null,
        allCarts
    };
};


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {
    getSessionCartData
};