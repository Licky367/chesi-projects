// =========================================================
// controllers/stock/batch.js
// STOCK FIFO BATCH CONTROLLER
// VERRAH COSMETICS
// ==========================================================
//
// ROUTES:
//
//     GET /stock/:id/batches
//         -> stock/batch/batches.ejs
//
//     GET /stock/:id/batch/:batchId
//         -> stock/batch/edit.ejs
//
//     POST /stock/:id/batch/:batchId
//         -> edits the selected FIFO batch
//
// IMPORTANT:
//
// The actual FIFO batch retrieval/editing logic remains in:
//
//     services/stockService/batchEdit.js
//
// ==========================================================
//
// STAFF RULE:
//
// Staff work with:
//
//     Product.fifoBatches
//
// Staff may ONLY see/edit batches where:
//
//     batch.StaffFIFOsubstation
//         ===
//     req.user.assignedSubstation
//
// ADMIN / NON-STAFF:
//
// Admin/non-staff users work with:
//
//     Stock.purchaseBatches
//
// req.user MUST therefore be passed to the service for:
//
//     1. retrieval
//     2. editing
//
// ==========================================================


const service =
    require("../../services/stockService");


// ==========================================================
// LIST ALL FIFO BATCHES
// ==========================================================
//
// GET /stock/:id/batches
//
// STAFF:
//
//     Returns only Product.fifoBatches belonging to the
//     authenticated staff member's assigned substation.
//
// ADMIN / OTHER:
//
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

            // ==================================================
            // VALIDATE STOCK ID
            // ==================================================

            if (!stockId) {

                throw new Error(
                    "Stock ID is required."
                );

            }


            // ==================================================
            // GET FIFO BATCHES
            // ==================================================
            //
            // IMPORTANT:
            //
            // req.user is required here.
            //
            // The service determines whether the request is
            // staff or admin/non-staff and retrieves the
            // appropriate FIFO batches.
            //
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
            // RENDER
            // ==================================================

            return res.render(
                "stock/batch/batches",
                {
                    title:
                        "Stock Batches",

                    stock,

                    batches,

                    /*
                     * Make authenticated user explicitly
                     * available to the EJS view.
                     */
                    user:
                        req.user,

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
// STAFF:
//
//     Finds the batch from Product.fifoBatches belonging to
//     their assigned substation only.
//
// ADMIN / OTHER:
//
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

            // ==================================================
            // VALIDATE STOCK ID
            // ==================================================

            if (!stockId) {

                throw new Error(
                    "Stock ID is required."
                );

            }


            // ==================================================
            // VALIDATE BATCH ID
            // ==================================================

            if (!batchId) {

                throw new Error(
                    "FIFO batch ID is required."
                );

            }


            // ==================================================
            // GET FIFO BATCHES
            // ==================================================
            //
            // IMPORTANT:
            //
            // req.user is passed so staff filtering happens
            // inside the service.
            //
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
                Array.isArray(batches)
                    ? batches.find(
                        currentBatch =>
                            String(
                                currentBatch._id
                            ) === batchId
                    )
                    : null;


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

                    /*
                     * Explicitly expose authenticated user
                     * to the EJS template.
                     */
                    user:
                        req.user,

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
// POST /stock/:id/batch/:batchId
//
// STAFF:
//
//     Product.fifoBatches
//         -> updated
//
//     Product.units
//         -> updated
//
//     Substation inventory
//         -> updated
//
//     Stock
//         -> NOT modified
//
// ADMIN / OTHER:
//
//     Stock.purchaseBatches
//         -> updated
//
//     Stock.units
//         -> updated
//
// ==========================================================
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

            // ==================================================
            // VALIDATE STOCK ID
            // ==================================================

            if (!stockId) {

                throw new Error(
                    "Stock ID is required."
                );

            }


            // ==================================================
            // VALIDATE BATCH ID
            // ==================================================

            if (!batchId) {

                throw new Error(
                    "FIFO batch ID is required."
                );

            }


            // ==================================================
            // FORM VALUES
            // ==================================================

            const units =
                req.body
                    ? req.body.units
                    : undefined;


            const buyPrice =
                req.body
                    ? req.body.buyPrice
                    : undefined;


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
            // NORMALIZE / VALIDATE UNITS
            // ==================================================

            const normalizedUnits =
                Number(units);


            if (
                !Number.isSafeInteger(
                    normalizedUnits
                ) ||
                normalizedUnits < 0
            ) {

                throw new Error(
                    "Units must be a non-negative whole number."
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
            // NORMALIZE / VALIDATE BUY PRICE
            // ==================================================

            const normalizedBuyPrice =
                Number(buyPrice);


            if (
                !Number.isFinite(
                    normalizedBuyPrice
                ) ||
                normalizedBuyPrice < 0
            ) {

                throw new Error(
                    "Buy price must be a non-negative number."
                );

            }


            // ==================================================
            // EDIT FIFO BATCH
            // ==================================================
            //
            // STAFF:
            //
            //     Product.fifoBatches
            //
            // ADMIN / OTHER:
            //
            //     Stock.purchaseBatches
            //
            // ==================================================

            await service.editFifoBatch(
                stockId,

                batchId,

                {
                    units:
                        normalizedUnits,

                    buyPrice:
                        normalizedBuyPrice
                },

                req.user
            );


            // ==================================================
            // STAFF SUCCESS
            // ==================================================
            //
            // Staff return to the sales page after a successful
            // Product FIFO/substation update.
            //
            // ==================================================

            if (
                req.user &&
                req.user.role === "staff"
            ) {

                return res.redirect(
                    "/sales"
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
            //
            // IMPORTANT:
            //
            // The edit page route is:
            //
            //     /stock/:id/batch/:batchId
            //
            // NOT:
            //
            //     /stock/:id/batches/:batchId
            //
            // ==================================================

            if (
                stockId &&
                batchId
            ) {

                return res.redirect(
                    `/stock/${stockId}/batch/${batchId}?error=${encodeURIComponent(
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