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
// ==========================================================

const service =
    require("../../services/stockService");


// ==========================================================
// LIST ALL FIFO BATCHES
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

            const {
                stock,
                batches
            } =
                await service.getFifoBatches(
                    stockId
                );

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

            if (!batchId) {

                throw new Error(
                    "FIFO batch ID is required."
                );
            }

            const {
                stock,
                batches
            } =
                await service.getFifoBatches(
                    stockId
                );

            const batch =
                batches.find(
                    currentBatch =>
                        String(
                            currentBatch._id
                        ) === batchId
                );

            if (!batch) {

                return res.redirect(
                    `/stock/${stockId}/batches?error=${encodeURIComponent(
                        "FIFO batch not found."
                    )}`
                );
            }

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
// Staff:
//     Product.fifoBatches -> updated
//     Product.units       -> updated
//     Substation inventory -> updated
//     Stock               -> NOT modified
//
// Admin / other roles:
//     Stock.purchaseBatches -> updated
//     Stock.units           -> updated
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

            if (!stockId) {

                throw new Error(
                    "Stock ID is required."
                );
            }

            if (!batchId) {

                throw new Error(
                    "FIFO batch ID is required."
                );
            }

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
            // IMPORTANT:
            //
            // PASS req.user.
            //
            // Without this, batchEdit.js cannot know that the
            // request belongs to staff, so it will execute the
            // normal Stock update branch.
            // ==================================================

            await service.editFifoBatch(
                stockId,
                batchId,
                {
                    units,
                    buyPrice
                },
                req.user
            );

            // ==================================================
            // STAFF
            // ==================================================

            if (
                req.user &&
                req.user.role === "staff"
            ) {

                return res.redirect(
                    `/products?saved=1`
                );
            }

            // ==================================================
            // ADMIN / OTHER ROLES
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
            // STAFF ERROR
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
            // EDIT PAGE ERROR
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