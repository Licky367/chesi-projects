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
// IMPORTANT STAFF RULE:
//
// Staff work with Product.fifoBatches.
//
// Staff may ONLY see/edit batches where:
//
//     batch.StaffFIFOsubstation
//         ===
//     req.user.assignedSubstation
//
// Admin / non-staff users work with:
//
//     Stock.purchaseBatches
//
// req.user MUST therefore be passed to the service for BOTH
// retrieval and editing.
// ==========================================================

const service =
    require("../../services/stockService");


// ==========================================================
// LIST ALL FIFO BATCHES
// ==========================================================
//
// STAFF:
//     Returns only Product.fifoBatches belonging to their
//     assigned substation.
//
// ADMIN / OTHER:
//     Returns Stock.purchaseBatches.
//
// ==========================================================

exports.batches =
    async (
        req,
        res
    ) => {

        const stockId =
            String(
                req.params.id ||
                ""
            ).trim();

        try {

            if (!stockId) {

                throw new Error(
                    "Stock ID is required."
                );
            }

            // ==================================================
            // IMPORTANT:
            //
            // Pass req.user so batchEdit.js can determine:
            //
            // 1. staff vs admin
            // 2. staff assigned substation
            // 3. which Product.fifoBatches staff may see
            // ==================================================

            const {
                stock,
                batches
            } =
                await service.getFifoBatches(
                    stockId,
                    req.user
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

            // --------------------------------------------------
            // STAFF
            //
            // If staff is denied access or their assigned
            // substation is invalid, return them to products.
            // --------------------------------------------------

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

            // --------------------------------------------------
            // ADMIN / OTHER
            // --------------------------------------------------

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
// STAFF:
//     Finds the batch from their assigned substation only.
//
// ADMIN:
//     Finds the batch from Stock.purchaseBatches.
//
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

            // ==================================================
            // IMPORTANT:
            //
            // Pass req.user here too.
            //
            // For staff this ensures getFifoBatches() returns
            // ONLY Product.fifoBatches belonging to their
            // assigned substation.
            // ==================================================

            const {
                stock,
                batches
            } =
                await service.getFifoBatches(
                    stockId,
                    req.user
                );

            // ==================================================
            // FIND SELECTED BATCH
            // ==================================================

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

            // ==================================================
            // RENDER
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

            // --------------------------------------------------
            // STAFF
            // --------------------------------------------------

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

            // --------------------------------------------------
            // ADMIN / OTHER
            // --------------------------------------------------

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
// STAFF:
//     Product.fifoBatches -> updated
//     Product.units       -> updated
//     Substation inventory -> updated
//     Stock               -> NOT modified
//
// ADMIN / OTHER ROLES:
//     Stock.purchaseBatches -> updated
//     Stock.units           -> updated
//
// IMPORTANT:
//
// req.user is passed to the service so batchEdit.js can:
//
//     - identify staff
//     - identify assignedSubstation
//     - verify batch ownership
//     - prevent staff editing another substation's batch
//
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

            // ==================================================
            // FORM VALUES
            // ==================================================

            const units =
                req.body.units;

            const buyPrice =
                req.body.buyPrice;

            // ==================================================
            // VALIDATE UNITS
            // ==================================================

            if (
                units === undefined ||
                units === null ||
                String(units).trim() === ""
            ) {

                throw new Error(
                    "Units are required."
                );
            }

            // ==================================================
            // VALIDATE BUY PRICE
            // ==================================================

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
            // req.user is intentionally passed as the FOURTH
            // argument.
            //
            // Staff:
            //     Product.fifoBatches
            //
            // Admin:
            //     Stock.purchaseBatches
            //
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
            // STAFF SUCCESS
            // ==================================================
            //
            // Staff inventory/batch work is complete.
            // Return them to the sales/products area.
            //
            // ==================================================

            if (
                req.user &&
                req.user.role === "staff"
            ) {

                return res.redirect(
                    `/sales`
                );
            }

            // ==================================================
            // ADMIN / OTHER SUCCESS
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
            // ADMIN / OTHER ERROR
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

The key changes

Both retrieval calls are now:

await service.getFifoBatches(
    stockId,
    req.user
);

instead of:

await service.getFifoBatches(
    stockId
);

And editing remains:

await service.editFifoBatch(
    stockId,
    batchId,
    {
        units,
        buyPrice
    },
    req.user
);