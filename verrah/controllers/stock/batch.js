// ==========================================================
// controllers/stock/batch.js
// STOCK FIFO BATCH CONTROLLER
// VERRAH COSMETICS
// ==========================================================
//
// Renders:
//
//     GET /stock/:id/batches
//         -> stock/batch/batches.ejs
//
//     GET /stock/:id/batch/:batchId
//         -> stock/batch/edit.ejs
//
// Saves:
//
//     POST /stock/:id/batch/:batchId
//         -> edits the selected FIFO batch
//
// The actual FIFO batch retrieval/editing logic remains in:
//
//     services/stockService/batchEdit.js
//
// This controller is responsible for:
//     - preparing data
//     - rendering the EJS pages
//     - receiving the edit form
//     - calling the service to save the changes
// ==========================================================

const service =
    require("../../services/stockService");


// ==========================================================
// LIST ALL FIFO BATCHES
// ==========================================================
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
                "stock/batch/batches",
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
// GET /stock/:id/batch/:batchId
//
// Displays one particular FIFO batch.
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
            // RENDER EDIT PAGE
            // ==================================================

            return res.render(
                "stock/batch/edit",
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


// ==========================================================
// EDIT FIFO BATCHES
// ==========================================================
//
// POST /stock/:id/batches
//
// The edit form submits:
//
//     batchId
//     units
//     buyPrice
//
// Example:
//
//     batchId = 68xxxxxxxxxxxxxxxxxxxxxx
//     units = 80
//     buyPrice = 1000
//
// The service then updates:
//
//     purchaseBatches.units
//     purchaseBatches.buyPrice
//
// and recalculates:
//
//     Stock.units
//
// from all remaining FIFO batches.
// ==========================================================

exports.editBatches =
    async (
        req,
        res
    ) => {

        const stockId =
            String(
                req.params.id ||
                ""
            ).trim();

        const batchId =
            String(
                req.body.batchId ||
                ""
            ).trim();


        try {

            // ==================================================
            // REQUIRE BATCH ID
            // ==================================================

            if (!batchId) {

                throw new Error(
                    "FIFO batch ID is required."
                );
            }


            // ==================================================
            // EDIT FIFO BATCH
            // ==================================================
            //
            // IMPORTANT:
            //
            // The batch ID comes from the hidden input in the
            // EJS form, while the stock ID comes from the URL.
            //
            // The service performs the actual database update.
            // ==================================================

            await service.editFifoBatch(
                stockId,
                batchId,
                req.body
            );


            // ==================================================
            // SUCCESS
            // ==================================================
            //
            // Return to the batch list.
            //
            // ?saved=1 allows the batches page to display a
            // success message.
            // ==================================================

            return res.redirect(
                `/stock/${stockId}/batches?saved=1`
            );

        } catch (error) {

            console.error(
                "Stock FIFO batch edit error:",
                error
            );


            // ==================================================
            // VALID STOCK ID + BATCH ID
            // ==================================================
            //
            // If possible, return to the individual edit page
            // so the user can see the error.
            // ==================================================

            if (batchId) {

                return res.redirect(
                    `/stock/${stockId}/batch/${batchId}?error=${encodeURIComponent(
                        error.message
                    )}`
                );
            }


            // ==================================================
            // NO BATCH ID
            // ==================================================

            return res.redirect(
                `/stock/${stockId}/batches?error=${encodeURIComponent(
                    error.message
                )}`
            );
        }
    };