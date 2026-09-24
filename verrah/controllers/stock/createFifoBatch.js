// ==========================================================
// verrah/controllers/stock/createFifoBatch.js
// STOCK FIFO BATCH CONTROLLER
// VERRAH COSMETICS
// ==========================================================
//
// POST:
//
//     /stock/:id/batches
//
// The :id is the Stock._id.
//
// Expected form body:
//
//     units
//     totalBuyingPrice
//     purchasedAt
//
// The service calculates the buy price per unit.
//
// ==========================================================

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

        // ==================================================
        // STOCK ID
        // ==================================================

        const stockId =
            req.params.id;


        // ==================================================
        // CREATE BATCH
        // ==================================================

        await createFifoBatch(
            stockId,
            req.body
        );


        // ==================================================
        // REDIRECT BACK TO STOCK
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
        // REDIRECT WITH ERROR
        // ==================================================

        return res.redirect(
            `/stock/${req.params.id}?error=${encodeURIComponent(
                error.message
            )}`
        );
    }
};