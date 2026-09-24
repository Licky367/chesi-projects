const {
    createFifoBatch
} = require("../../services/stockService");


// ==========================================================
// CREATE NEW FIFO BATCH
// ==========================================================

exports.createFifoBatch =
async (
    req,
    res
) => {

    try {

        const stockId =
            req.params.id;


        await createFifoBatch(
            stockId,
            req.body,
            req.user
        );


        // ==================================================
        // STAFF -> PRODUCTS
        // ==================================================

        if (
            req.user &&
            req.user.role === "staff"
        ) {

            return res.redirect(
                "/products"
            );
        }


        // ==================================================
        // OTHER ROLES -> EXISTING REDIRECT
        // ==================================================

        return res.redirect(
            `/stock/${stockId}`
        );

    } catch (error) {

        console.error(
            "Create FIFO batch error:",
            error
        );


        // ==================================================
        // STAFF -> PRODUCTS WITH ERROR
        // ==================================================

        if (
            req.user &&
            req.user.role === "staff"
        ) {

            return res.redirect(
                `/products?error=${encodeURIComponent(
                    error.message
                )}`
            );
        }


        // ==================================================
        // OTHER ROLES -> EXISTING ERROR REDIRECT
        // ==================================================

        return res.redirect(
            `/stock/${req.params.id}?error=${encodeURIComponent(
                error.message
            )}`
        );
    }
};