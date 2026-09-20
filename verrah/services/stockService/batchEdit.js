// ==========================================================
// controllers/stock/batchEdit.js
// STOCK FIFO BATCH EDIT CONTROLLER
// VERRAH COSMETICS
// ==========================================================
//
// Allows an existing FIFO purchase batch to be edited.
//
// Editable:
//     purchaseBatches.units
//     purchaseBatches.buyPrice
//
// Not editable:
//     purchaseBatches.purchasedAt
//
// IMPORTANT:
//
// Stock.units must always equal the sum of all remaining
// purchaseBatches.units.
//
// Therefore, when a batch's units change, Stock.units is
// adjusted by the difference.
//
// Example:
//
// Before:
//
// Batch A = 100 units @ 100
// Batch B = 50 units @ 120
// Stock.units = 150
//
// Edit Batch A:
//
// 100 -> 80 units
//
// After:
//
// Batch A = 80 units @ 100
// Batch B = 50 units @ 120
// Stock.units = 130
// ==========================================================

const mongoose =
    require("mongoose");

const Stock =
    require("../../models/stock");


// ==========================================================
// GET FIFO BATCHES
// ==========================================================
//
// Returns the stock together with its FIFO purchase batches.
//
// The batches are ordered by purchasedAt from oldest to newest.
// ==========================================================

async function getFifoBatches(
    stockId
) {

    if (
        !mongoose.Types.ObjectId.isValid(
            stockId
        )
    ) {

        throw new Error(
            "Invalid stock ID."
        );
    }

    const stock =
        await Stock
            .findOne({
                _id: stockId,
                isActive: true
            })
            .lean();

    if (!stock) {

        throw new Error(
            "Stock entry not found."
        );
    }

    const batches =
        Array.isArray(
            stock.purchaseBatches
        )
            ? [...stock.purchaseBatches]
            : [];

    batches.sort(
        (a, b) => {

            const aDate =
                new Date(
                    a.purchasedAt
                ).getTime();

            const bDate =
                new Date(
                    b.purchasedAt
                ).getTime();

            return aDate - bDate;
        }
    );

    return {
        stock,
        batches
    };
}


// ==========================================================
// EDIT FIFO BATCH
// ==========================================================
//
// Updates:
//
//     batch.units
//     batch.buyPrice
//
// The purchasedAt date remains unchanged.
//
// Stock.units is recalculated from the resulting FIFO
// batches.
//
// The operation is performed atomically using a transaction.
// ==========================================================

async function editFifoBatch(
    stockId,
    batchId,
    body
) {

    if (
        !mongoose.Types.ObjectId.isValid(
            stockId
        )
    ) {

        throw new Error(
            "Invalid stock ID."
        );
    }

    if (
        !mongoose.Types.ObjectId.isValid(
            batchId
        )
    ) {

        throw new Error(
            "Invalid FIFO batch ID."
        );
    }


    // ======================================================
    // VALIDATE UNITS
    // ======================================================

    const units =
        Number(
            body.units
        );

    if (
        !Number.isFinite(units) ||
        !Number.isInteger(units) ||
        units < 0
    ) {

        throw new Error(
            "Batch units must be a whole number greater than or equal to zero."
        );
    }


    // ======================================================
    // VALIDATE BUY PRICE
    // ======================================================

    const buyPrice =
        Number(
            body.buyPrice
        );

    if (
        !Number.isFinite(buyPrice) ||
        buyPrice < 0
    ) {

        throw new Error(
            "Batch buy price must be greater than or equal to zero."
        );
    }


    // ======================================================
    // START TRANSACTION
    // ======================================================

    const session =
        await mongoose.startSession();

    try {

        let result;

        await session.withTransaction(
            async () => {

                // ==========================================
                // LOAD STOCK
                // ==========================================

                const stock =
                    await Stock
                        .findOne({
                            _id: stockId,
                            isActive: true
                        })
                        .session(session);

                if (!stock) {

                    throw new Error(
                        "Stock entry not found."
                    );
                }


                // ==========================================
                // FIND FIFO BATCH
                // ==========================================

                const batch =
                    stock.purchaseBatches.id(
                        batchId
                    );

                if (!batch) {

                    throw new Error(
                        "FIFO stock batch not found."
                    );
                }


                // ==========================================
                // UPDATE BATCH
                // ==========================================

                batch.units =
                    units;

                batch.buyPrice =
                    buyPrice;


                // ==========================================
                // RECALCULATE WAREHOUSE UNITS
                // ==========================================
                //
                // This is important because the Stock model
                // requires:
                //
                // Stock.units ===
                // sum(purchaseBatches.units)
                // ==========================================

                const totalUnits =
                    stock.purchaseBatches.reduce(
                        (
                            total,
                            currentBatch
                        ) =>
                            total +
                            Number(
                                currentBatch.units ||
                                0
                            ),
                        0
                    );

                stock.units =
                    totalUnits;


                // ==========================================
                // REMOVE EMPTY BATCHES
                // ==========================================
                //
                // A batch with zero remaining units is no
                // longer part of the active FIFO queue.
                // ==========================================

                stock.purchaseBatches =
                    stock.purchaseBatches.filter(
                        currentBatch =>
                            Number(
                                currentBatch.units ||
                                0
                            ) > 0
                    );


                // ==========================================
                // SAVE
                // ==========================================

                await stock.save({
                    session
                });


                // ==========================================
                // RETURN UPDATED STOCK
                // ==========================================

                result =
                    stock.toObject();
            }
        );

        return result;

    } finally {

        await session.endSession();
    }
}


// ==========================================================
// EXPRESS: GET FIFO BATCHES
// ==========================================================
//
// Example route:
//
// GET /stock/:id/batches
// ==========================================================

exports.getBatches =
    async (
        req,
        res
    ) => {

        try {

            const {
                stock,
                batches
            } =
                await getFifoBatches(
                    req.params.id
                );

            return res.render(
                "stock/batches",
                {
                    title:
                        "Stock FIFO Batches",

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
                "Get FIFO batches error:",
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
// EXPRESS: EDIT FIFO BATCH
// ==========================================================
//
// Example route:
//
// POST /stock/:id/batches/:batchId/edit
// ==========================================================

exports.editBatch =
    async (
        req,
        res
    ) => {

        try {

            await editFifoBatch(
                req.params.id,
                req.params.batchId,
                req.body
            );


            // ==============================================
            // SUCCESS
            // ==============================================

            return res.redirect(
                `/stock/${req.params.id}/batches?saved=1`
            );

        } catch (error) {

            console.error(
                "Edit FIFO batch error:",
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
// EXPORT SERVICE FUNCTIONS
// ==========================================================
//
// These are exported so the controller can also be used
// directly from another controller if required.
// ==========================================================

exports.getFifoBatches =
    getFifoBatches;

exports.editFifoBatch =
    editFifoBatch;