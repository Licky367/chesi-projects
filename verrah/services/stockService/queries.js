// ==========================================================
// verrah/services/stockService/queries.js
//
// STOCK QUERIES
//
// FIFO BUY PRICE:
//
// listStock() and getStock() expose:
//
//     buyPrice
//
// as the buy price of the OLDEST EXISTING FIFO stock batch.
//
// Existing means:
//
//     batch.units > 0
//
// Exhausted FIFO batches are ignored.
//
// Legacy stock.buyPrice is only used as a fallback when
// there are no remaining FIFO batches.
// ==========================================================

const mongoose =
    require("mongoose");

const Stock =
    require("../../models/stock");

const Substation =
    require("../../models/substations");

const Category =
    require("../../models/category");

const {
    text,
    displayLabel
} = require("./helpers");

const {
    getCategoryByName
} = require("./category");


// ==========================================================
// GET FIFO BUY PRICE
// ==========================================================
//
// Returns the buy price from the oldest FIFO purchase batch
// that still contains stock.
//
// FIFO order:
//
//     purchasedAt ASC
//
// Only batches with:
//
//     units > 0
//
// are considered.
//
// If no remaining FIFO batch exists, the legacy Stock.buyPrice
// is returned as a fallback.
// ==========================================================

function getFifoBuyPrice(stock) {

    const batches =
        Array.isArray(
            stock?.purchaseBatches
        )
            ? stock.purchaseBatches
            : [];


    const availableBatches =
        batches
            .filter(
                batch =>
                    Number(
                        batch?.units || 0
                    ) > 0
            )
            .sort(
                (a, b) =>
                    new Date(
                        a.purchasedAt
                    ).getTime() -
                    new Date(
                        b.purchasedAt
                    ).getTime()
            );


    const oldestBatch =
        availableBatches[0];


    if (oldestBatch) {

        return Number(
            oldestBatch.buyPrice || 0
        );

    }


    // ------------------------------------------------------
    // Legacy fallback
    // ------------------------------------------------------

    return Number(
        stock?.buyPrice || 0
    );

}


// ==========================================================
// APPLY FIFO BUY PRICE
// ==========================================================
//
// Keeps the complete stock object while replacing the
// exposed buyPrice with the current oldest FIFO batch price.
// ==========================================================

function withFifoBuyPrice(stock) {

    return {

        ...stock,

        buyPrice:
            getFifoBuyPrice(stock)

    };

}


// ==========================================================
// LIST STOCK
// ==========================================================

async function listStock() {

    const [
        stocks,
        categories
    ] =
        await Promise.all([

            Stock.find({
                isActive: true
            })

                .sort({
                    category: 1,
                    subcategory: 1,
                    name: 1,
                    createdAt: 1
                })

                .lean(),

            Category.find({
                isActive: true
            })

                .select(
                    "_id name categoryIcon isActive"
                )

                .sort({
                    name: 1
                })

                .lean()

        ]);


    // ======================================================
    // APPLY FIFO BUY PRICE
    // ======================================================

    const fifoStocks =
        stocks.map(
            withFifoBuyPrice
        );


    // ======================================================
    // CATEGORY MAP
    // ======================================================

    const categoryMap =
        new Map();


    for (
        const category
        of categories
    ) {

        const key =
            text(
                category.name
            ).toLowerCase();


        if (!key) {
            continue;
        }


        categoryMap.set(
            key,
            category
        );

    }


    // ======================================================
    // GROUP STOCK
    // ======================================================

    const groups =
        new Map();


    for (
        const stock
        of fifoStocks
    ) {

        const categoryName =
            text(
                stock.category
            ).toLowerCase();


        if (!categoryName) {
            continue;
        }


        const category =
            categoryMap.get(
                categoryName
            );


        if (!category) {
            continue;
        }


        if (
            !groups.has(
                categoryName
            )
        ) {

            groups.set(
                categoryName,
                {
                    category,
                    label:
                        displayLabel(
                            category.name
                        ),
                    stocks: []
                }
            );

        }


        groups
            .get(categoryName)
            .stocks
            .push(stock);

    }


    // ======================================================
    // BUILD ROWS
    // ======================================================

    return Array
        .from(
            groups.values()
        )
        .map(
            group => {

                const rows = [];


                for (
                    let i = 0;
                    i < group.stocks.length;
                    i += 6
                ) {

                    rows.push({

                        products:
                            group.stocks.slice(
                                i,
                                i + 6
                            )

                    });

                }


                return {

                    ...group,

                    rows

                };

            }
        );

}


// ==========================================================
// GET STOCK
// ==========================================================

async function getStock(
    id
) {

    if (
        !mongoose.isValidObjectId(
            id
        )
    ) {

        return null;

    }


    const stock =
        await Stock.findOne({

            _id:
                id,

            isActive:
                true

        })

            .lean();


    if (!stock) {
        return null;
    }


    // ======================================================
    // APPLY FIFO BUY PRICE
    // ======================================================

    const stockWithFifoPrice =
        withFifoBuyPrice(
            stock
        );


    // ======================================================
    // CATEGORY
    // ======================================================

    const category =
        await getCategoryByName(
            stock.category
        );


    // ======================================================
    // RETURN
    // ======================================================

    return {

        ...stockWithFifoPrice,

        categoryDocument:
            category || null

    };

}


// ==========================================================
// GET STOCK CATEGORIES
// ==========================================================

async function getStockCategories() {

    const stocks =
        await Stock.find({
            isActive: true
        })

            .select(
                [
                    "name",
                    "category",
                    "subcategory",
                    "days",
                    "image",
                    "units",
                    "buyPrice",
                    "unitBuyPrice",
                    "description",
                    "purchaseBatches"
                ].join(" ")
            )

            .sort({
                category: 1,
                subcategory: 1,
                name: 1
            })

            .lean();


    // ======================================================
    // APPLY FIFO BUY PRICE
    // ======================================================

    return stocks.map(
        withFifoBuyPrice
    );

}


// ==========================================================
// GET SUBSTATIONS
// ==========================================================

function getSubstations() {

    return Substation.find({
        isActive: true
    })

        .select(
            "name location description productInventory"
        )

        .sort({
            name: 1
        })

        .lean();

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    listStock,

    getStock,

    getStockCategories,

    getSubstations

};