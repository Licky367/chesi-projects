// ==========================================================
// verrah/controllers/stock/createFifoBatch.js
// CREATE FIFO BATCH
// ==========================================================

const {
    createFifoBatch
} = require("../../services/stockService");


// ==========================================================
// CREATE FIFO BATCH
// ==========================================================

exports.createFifoBatch = async (req, res) => {

    try {

        const stockId = req.params.id;

        await createFifoBatch(
            stockId,
            req.body,
            req.user
        );

        // ------------------------------------------------------
        // STAFF
        // ------------------------------------------------------

        if (
            req.user &&
            req.user.role === "staff"
        ) {
            return res.redirect("/products");
        }

        // ------------------------------------------------------
        // ADMIN / OTHER ROLES
        // ------------------------------------------------------

        return res.redirect(
            `/stock/${stockId}`
        );

    } catch (error) {

        console.error(
            "Create FIFO batch error:",
            error
        );

        // ------------------------------------------------------
        // STAFF ERROR
        // ------------------------------------------------------

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

        // ------------------------------------------------------
        // ADMIN / OTHER ROLES ERROR
        // ------------------------------------------------------

        return res.redirect(
            `/stock/${req.params.id}?error=${encodeURIComponent(
                error.message
            )}`
        );
    }
};