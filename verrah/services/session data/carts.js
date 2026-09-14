const Cart = require("../../models/carts");


// ==========================================================
// GET SESSION CART DATA
//
// Returns TWO separate datasets:
//
// userCart
// --------
// The cart belonging to the currently logged-in user.
//
// allCarts
// --------
// All carts belonging to all users.
//
// There is NO sessionId.
// Cart.user is the only cart identity.
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
    // LOGGED-IN USER'S CART
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
    // ALL USERS' CARTS
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