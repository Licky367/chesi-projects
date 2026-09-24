// ==========================================================
// services/stockService/batchCreate.js
// STOCK FIFO BATCH SERVICE
// VERRAH COSMETICS
// ==========================================================

const mongoose =
    require("mongoose");

const Stock =
    require("../../models/stock");

const {
    wholeNumber,
    number
} =
    require("./helpers");


// ==========================================================
// CREATE FIFO BATCH
// ==========================================================

async function createFifoBatch(
    stockId,
    body
) {

    // ------------------------------------------------------
    // VALIDATE STOCK ID
    // ------------------------------------------------------

    if (
        !mongoose.Types.ObjectId.isValid(
            stockId
        )
    ) {

        throw new Error(
            "Invalid stock ID."
        );
    }


    body =
        body || {};


    // ------------------------------------------------------
    // UNITS
    // ------------------------------------------------------

    const units =
        wholeNumber(
            body.units,
            "Units",
            true
        );


    // ------------------------------------------------------
    // TOTAL BUYING PRICE
    // ------------------------------------------------------

    const totalBuyingPrice =
        number(
            body.totalBuyingPrice,
            "Total buying price",
            true
        );


    // ------------------------------------------------------
    // BUY PRICE PER UNIT
    // ------------------------------------------------------

    const buyPrice =
        totalBuyingPrice /
        units;


    if (
        !Number.isFinite(
            buyPrice
        )
    ) {

        throw new Error(
            "Unable to calculate buy price per unit."
        );
    }


    // ------------------------------------------------------
    // PURCHASE DATE
    // ------------------------------------------------------

    const purchasedAt =
        body.purchasedAt
            ? new Date(
                body.purchasedAt
            )
            : new Date();


    if (
        Number.isNaN(
            purchasedAt.getTime()
        )
    ) {

        throw new Error(
            "Invalid purchase date."
        );
    }


    // ------------------------------------------------------
    // START TRANSACTION
    // ------------------------------------------------------

    const session =
        await mongoose.startSession();


    try {

        let updatedStock;


        await session.withTransaction(
            async () => {

                // ------------------------------------------
                // LOAD STOCK
                // ------------------------------------------

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


                // ------------------------------------------
                // ENSURE FIFO ARRAY
                // ------------------------------------------

                if (
                    !Array.isArray(
                        stock.purchaseBatches
                    )
                ) {

                    stock.purchaseBatches =
                        [];
                }


                // ------------------------------------------
                // CREATE FIFO BATCH
                // ------------------------------------------

                stock.purchaseBatches.push({

                    units,

                    buyPrice,

                    purchasedAt

                });


                // ------------------------------------------
                // RECALCULATE STOCK UNITS
                // ------------------------------------------

                let totalUnits = 0;


                for (
                    const batch
                    of stock.purchaseBatches
                ) {

                    const batchUnits =
                        Number(
                            batch.units
                        );


                    if (
                        Number.isFinite(
                            batchUnits
                        ) &&
                        batchUnits > 0
                    ) {

                        totalUnits +=
                            batchUnits;
                    }
                }


                stock.units =
                    totalUnits;


                // ------------------------------------------
                // SAVE
                // ------------------------------------------

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


module.exports = {

    createFifoBatch

};