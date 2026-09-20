// ==========================================================
// controllers/stock/batch.js
// STOCK FIFO BATCH CONTROLLER
// VERRAH COSMETICS
// ==========================================================
//
// Renders:
//
//     GET /stock/:id/batches
//         -> stock/batch.ejs
//
//     GET /stock/:id/batch/:batchId
//         -> stock/batch.ejs
//
// The actual FIFO batch retrieval/editing logic remains in:
//
//     services/stockService/batchEdit.js
//
// This controller is responsible only for preparing data
// and rendering the EJS pages.
// ==========================================================

const service =
    require("../../services/stockService");


// ==========================================================
// LIST ALL FIFO BATCHES
// ==========================================================
//
// Route:
//
// GET /stock/:id/batches
//
// Displays every FIFO purchase batch belonging to the stock.
// ==========================================================

exports.batches =
    async (
        req,
        res
    ) => {

        try {

            const stockId =
                String(
                    req.params.id ||
                    ""
                ).trim();


            // ==================================================
            // GET STOCK + FIFO BATCHES
            // ==================================================

            const {
                stock,
                batches
            } =
                await service.getFifoBatches(
                    stockId
                );


            // ==================================================
            // RENDER
            // ==================================================

            return res.render(
                "stock/batches",
                {
                    title:
                        "Stock Batches",

                    stock,

                    batches,

                    error:
                        req.query.error ||
                        null,

                    saved:
                        req.query.saved ||
                        ""
                }
            );

        } catch (error) {

            console.error(
                "Stock batches page error:",
                error
            );

            return res.redirect(
                `/stock?error=${encodeURIComponent(
                    error.message
                )}`
            );
        }
    };


// ==========================================================
// VIEW / EDIT PARTICULAR FIFO BATCH
// ==========================================================
//
// Route:
//
// GET /stock/:id/batch/:batchId
//
// Displays one particular FIFO batch and allows the EJS to
// submit its edited units and buy price.
//
// IMPORTANT:
//
// The batch itself is identified by the embedded MongoDB
// subdocument _id:
//
//     stock.purchaseBatches._id
//
// No batch data is modified by this GET request.
// ==========================================================

exports.batch =
    async (
        req,
        res
    ) => {

        try {

            const stockId =
                String(
                    req.params.id ||
                    ""
                ).trim();

            const batchId =
                String(
                    req.params.batchId ||
                    ""
                ).trim();


            // ==================================================
            // GET STOCK + FIFO BATCHES
            // ==================================================

            const {
                stock,
                batches
            } =
                await service.getFifoBatches(
                    stockId
                );


            // ==================================================
            // FIND PARTICULAR BATCH
            // ==================================================

            const batch =
                batches.find(
                    currentBatch =>
                        String(
                            currentBatch._id
                        ) === batchId
                );


            // ==================================================
            // BATCH NOT FOUND
            // ==================================================

            if (!batch) {

                return res.redirect(
                    `/stock/${stockId}/batches?error=${encodeURIComponent(
                        "FIFO batch not found."
                    )}`
                );
            }


            // ==================================================
            // RENDER
            // ==================================================

            return res.render(
                "stock/batch",
                {
                    title:
                        "Edit Stock Batch",

                    stock,

                    batch,

                    batches,

                    error:
                        req.query.error ||
                        null,

                    saved:
                        req.query.saved ||
                        ""
                }
            );

        } catch (error) {

            console.error(
                "Stock batch page error:",
                error
            );

            return res.redirect(
                `/stock/${req.params.id}/batches?error=${encodeURIComponent(
                    error.message
                )}`
            );
        }
    };