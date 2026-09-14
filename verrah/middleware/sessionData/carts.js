const sessionDataService =
    require("../services/session data");


// ==========================================================
// SESSION DATA MIDDLEWARE
// ==========================================================

const sessionData = async (req, res, next) => {

    try {

        // ==================================================
        // NO LOGGED-IN USER
        // ==================================================

        if (!req.user) {

            req.session.userCart = null;
            req.session.allCarts = [];

            res.locals.userCart = null;
            res.locals.allCarts = [];

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
        // SAVE TO SESSION
        // ==================================================

        req.session.userCart = userCart;
        req.session.allCarts = allCarts;


        // ==================================================
        // MAKE AVAILABLE TO EJS
        // ==================================================

        res.locals.userCart = userCart;
        res.locals.allCarts = allCarts;


        // ==================================================
        // CONTINUE
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