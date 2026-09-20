// ==========================================================
// controllers/stock/batch.js
// STOCK FIFO BATCH CONTROLLER
// VERRAH COSMETICS
// ==========================================================
//
// Routes:
//
//     GET /stock/:id/batches
//         -> stock/batch/batches.ejs
//
//     GET /stock/:id/batches/:batchId
//         -> stock/batch/edit.ejs
//
//     POST /stock/:id/batches/:batchId
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
// GET /stock/:id/batches/:batchId
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
                `/stock/${stockId}/batches?error=${encodeURIComponent(
                    error.message
                )}`
            );
        }
    };


// ==========================================================
// EDIT PARTICULAR FIFO BATCH
// ==========================================================
//
// POST /stock/:id/batches/:batchId
//
// The edit form submits:
//
//     units
//     buyPrice
//
// The batch ID is NOT expected in req.body.
//
// It comes directly from:
//
//     req.params.batchId
//
// Example:
//
//     POST /stock/68xxxxxxxxxxxxxxxxxxxxxx/batches/69xxxxxxxxxxxxxxxxxxxxxx
//
// Body:
//
//     units=80
//     buyPrice=1000
//
// The service performs the actual database update.
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
                req.params.batchId ||
                ""
            ).trim();


        try {

            // ==================================================
            // REQUIRE STOCK ID
            // ==================================================

            if (!stockId) {

                throw new Error(
                    "Stock ID is required."
                );
            }


            // ==================================================
            // REQUIRE BATCH ID
            // ==================================================

            if (!batchId) {

                throw new Error(
                    "FIFO batch ID is required."
                );
            }


            // ==================================================
            // REQUIRE FORM VALUES
            // ==================================================

            const units =
                req.body.units;

            const buyPrice =
                req.body.buyPrice;


            if (
                units === undefined ||
                units === null ||
                String(units).trim() === ""
            ) {

                throw new Error(
                    "Units are required."
                );
            }


            if (
                buyPrice === undefined ||
                buyPrice === null ||
                String(buyPrice).trim() === ""
            ) {

                throw new Error(
                    "Buy price is required."
                );
            }


            // ==================================================
            // EDIT FIFO BATCH
            // ==================================================
            //
            // IMPORTANT:
            //
            // batchId comes from req.params.batchId because the
            // form submits it as part of the URL:
            //
            // /stock/:id/batches/:batchId
            //
            // units and buyPrice come from req.body.
            // ==================================================

            await service.editFifoBatch(
                stockId,
                batchId,
                {
                    units,
                    buyPrice
                }
            );


            // ==================================================
            // SUCCESS
            // ==================================================
            //
            // Return to the batch list.
            //
            // ?saved=1 allows the batches page to display the
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
            // RETURN TO EDIT PAGE
            // ==================================================

            if (
                stockId &&
                batchId
            ) {

                return res.redirect(
                    `/stock/${stockId}/batches/${batchId}?error=${encodeURIComponent(
                        error.message
                    )}`
                );
            }


            // ==================================================
            // FALLBACK
            // ==================================================

            return res.redirect(
                `/stock/${stockId}/batches?error=${encodeURIComponent(
                    error.message
                )}`
            );
        }
    };