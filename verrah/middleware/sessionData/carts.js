const sessionDataService =
    require("../services/sessionDataService");


// ==========================================================
// SESSION DATA MIDDLEWARE
//
// Loads cart data for the logged-in user and places it
// into the current session.
//
// req.session.userCart
// --------------------
// Current user's cart.
//
// req.session.allCarts
// --------------------
// All carts belonging to all users.
// ==========================================================

const sessionData = async (req, res, next) => {

    try {

        // ==================================================
        // NO LOGGED-IN USER
        // ==================================================

        if (!req.user) {

            req.session.userCart = null;
            req.session.allCarts = [];

            return next();
        }


        // ==================================================
        // GET CART DATA
        // ==================================================

        const {
            userCart,
            allCarts
        } =
            await sessionDataService.getSessionCartData(
                req.user
            );


        // ==================================================
        // STORE USER'S CART
        // ==================================================

        req.session.userCart = userCart;


        // ==================================================
        // STORE ALL CARTS
        // ==================================================

        req.session.allCarts = allCarts;


        // ==================================================
        // CONTINUE TO NEXT MIDDLEWARE / ROUTE
        // ==================================================

        return next();

    } catch (error) {

        console.error(
            "Session data middleware error:",
            error
        );

        return next(error);
    }
};


// ==========================================================
// EXPORT
// ==========================================================

module.exports = sessionData;