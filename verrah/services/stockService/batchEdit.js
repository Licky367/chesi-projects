// ==========================================================
// services/stockService/batchEdit.js
// STOCK FIFO BATCH SERVICE
// VERRAH COSMETICS
// ==========================================================
//
// Handles:
//
//     1. Retrieving FIFO purchase batches
//     2. Editing an existing FIFO batch
//     3. Keeping Stock.units equal to the total remaining
//        units across purchaseBatches
//
// purchaseBatches.units represents CURRENT REMAINING STOCK.
//
// Therefore:
//
//     Stock.units
//         = SUM(purchaseBatches.units)
//
// ==========================================================

const mongoose =
    require("mongoose");

const Stock =
    require("../../models/stock");


// ==========================================================
// GET FIFO BATCHES
// ==========================================================
//
// Returns:
//
// {
//     stock,
//     batches
// }
//
// Batches are returned oldest-first so the service preserves
// FIFO ordering.
//
// The EJS can sort them differently for display.
// ==========================================================

async function getFifoBatches(
    stockId
) {

    // ======================================================
    // VALIDATE STOCK ID
    // ======================================================

    if (
        !mongoose.Types.ObjectId.isValid(
            stockId
        )
    ) {

        throw new Error(
            "Invalid stock ID."
        );
    }


    // ======================================================
    // FIND ACTIVE STOCK
    // ======================================================

    const stock =
        await Stock.findOne({
            _id: stockId,
            isActive: {
                $ne: false
            }
        });


    if (!stock) {

        throw new Error(
            "Stock not found."
        );
    }


    // ======================================================
    // GET PURCHASE BATCHES
    // ======================================================

    const batches =
        Array.isArray(
            stock.purchaseBatches
        )
            ? [...stock.purchaseBatches]
            : [];


    // ======================================================
    // FIFO ORDER
    // ======================================================
    //
    // Oldest purchase first.
    //
    // This is the natural order used when consuming stock
    // through FIFO.
    // ======================================================

    batches.sort(
        (
            a,
            b
        ) => {

            const aTime =
                a.purchasedAt
                    ? new Date(
                        a.purchasedAt
                    ).getTime()
                    : 0;

            const bTime =
                b.purchasedAt
                    ? new Date(
                        b.purchasedAt
                    ).getTime()
                    : 0;

            return (
                aTime -
                bTime
            );
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
//     purchaseBatches.units
//     purchaseBatches.buyPrice
//
// purchasedAt is deliberately NOT changed.
//
// IMPORTANT:
//
// After changing the batch units:
//
//     Stock.units
//         = SUM(all purchaseBatches.units)
//
// This means:
//
// Example:
//
// Batch A = 100
// Batch B = 50
//
// Stock.units = 150
//
// Edit Batch A:
//
// 100 -> 80
//
// Result:
//
// Batch A = 80
// Batch B = 50
//
// Stock.units = 130
//
// ==========================================================

async function editFifoBatch(
    stockId,
    batchId,
    body
) {

    // ======================================================
    // VALIDATE STOCK ID
    // ======================================================

    if (
        !mongoose.Types.ObjectId.isValid(
            stockId
        )
    ) {

        throw new Error(
            "Invalid stock ID."
        );
    }


    // ======================================================
    // VALIDATE BATCH ID
    // ======================================================

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
    // READ UNITS
    // ======================================================

    const units =
        Number(
            body.units
        );


    if (
        !Number.isFinite(
            units
        ) ||
        !Number.isInteger(
            units
        ) ||
        units < 0
    ) {

        throw new Error(
            "Units must be a whole number greater than or equal to 0."
        );
    }


    // ======================================================
    // READ BUY PRICE
    // ======================================================

    const buyPrice =
        Number(
            body.buyPrice
        );


    if (
        !Number.isFinite(
            buyPrice
        ) ||
        buyPrice < 0
    ) {

        throw new Error(
            "Buy price must be a valid number greater than or equal to 0."
        );
    }


    // ======================================================
    // START TRANSACTION
    // ======================================================

    const session =
        await mongoose.startSession();


    try {

        let updatedStock;


        await session.withTransaction(
            async () => {

                // ==========================================
                // LOAD ACTIVE STOCK
                // ==========================================

                const stock =
                    await Stock.findOne({
                        _id: stockId,
                        isActive: {
                            $ne: false
                        }
                    })
                    .session(
                        session
                    );


                if (!stock) {

                    throw new Error(
                        "Stock not found."
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
                        "FIFO batch not found."
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
                // RECALCULATE TOTAL STOCK UNITS
                // ==========================================
                //
                // Do NOT simply add/subtract from the old
                // Stock.units value.
                //
                // Recalculate from the actual batches so
                // Stock.units remains the source of the
                // aggregate total.
                // ==========================================

                let totalUnits = 0;


                for (
                    const currentBatch
                    of stock.purchaseBatches
                ) {

                    const currentUnits =
                        Number(
                            currentBatch.units
                        );


                    if (
                        Number.isFinite(
                            currentUnits
                        ) &&
                        currentUnits > 0
                    ) {

                        totalUnits +=
                            currentUnits;
                    }
                }


                // ==========================================
                // UPDATE STOCK TOTAL
                // ==========================================

                stock.units =
                    totalUnits;


                // ==========================================
                // REMOVE ZERO-UNIT BATCHES
                // ==========================================
                //
                // If the edited batch is set to zero,
                // remove it from the embedded batch list.
                //
                // This matches the existing FIFO stock
                // behaviour where consumed/empty batches are
                // no longer retained as active batches.
                // ==========================================

                stock.purchaseBatches =
                    stock.purchaseBatches.filter(
                        currentBatch =>
                            Number(
                                currentBatch.units
                            ) > 0
                    );


                // ==========================================
                // SAVE
                // ==========================================

                await stock.save({
                    session
                });


                updatedStock =
                    stock;
            }
        );


        return updatedStock;

    } finally {

        await session.endSession();
    }
}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getFifoBatches,

    editFifoBatch

};