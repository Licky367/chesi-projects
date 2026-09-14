const sessionDataService =
    require("../../services/sessionDataService");


// ==========================================================
// LOAD SESSION DATA
//
// Stores TWO SEPARATE CART DATASETS:
//
// req.session.userCart
//     -> logged-in user's own cart
//
// req.session.allCarts
//     -> all carts belonging to all users
// ==========================================================

const loadSessionData = async (req, res, next) => {

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
        // PUT DATA INTO SESSION
        // ==================================================

        req.session.userCart = userCart;

        req.session.allCarts = allCarts;


        // ==================================================
        // CONTINUE
        // ==================================================

        return next();

    } catch (error) {

        console.error(
            "Session data error:",
            error
        );

        return next(error);
    }
};


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {
    loadSessionData
};