// ==========================================================
// verrah/services/substationService/updateProductUnits.js
// UPDATE PRODUCT UNITS AT SUBSTATION
// ==========================================================
//
// FIFO UNIT MANAGEMENT
//
// When increasing substation units:
//
//     Substation
//          ↑
//     Product.units
//          ↑
//     Product.fifoBatches
//          ↑
//     Stock.purchaseBatches
//
// Stock.purchaseBatches are consumed oldest-first.
//
// Example:
//
// Stock:
//
// Batch 1 → 100 units @ 100
// Batch 2 → 50 units  @ 120
//
// Allocate 120 units:
//
// Batch 1 → consume 100
// Batch 2 → consume 20
//
// Product receives:
//
// 100 @ 100
// 20  @ 120
//
// ----------------------------------------------------------
//
// When reducing substation units:
//
// Product FIFO units are removed from the newest allocated
// FIFO layers first.
//
// The removed units are returned to the source Stock using
// their original purchase prices.
//
// IMPORTANT:
//
// - Stock.purchaseBatches are never repriced.
// - Product.fifoBatches are never repriced.
// - Product.buyPrice is recalculated from Product.fifoBatches.
// - Stock.buyPrice is recalculated from Stock.purchaseBatches.
// - Stock.units always equals the remaining Stock FIFO units.
// - Product.units always equals the remaining Product FIFO units.
// - Substation inventory units are included in Product.units.
// ==========================================================

const mongoose =
    require("mongoose");

const Substation =
    require("../../models/substations");

const Product =
    require("../../models/products");

const Stock =
    require("../../models/stock");


// ==========================================================
// FIFO HELPERS
// ==========================================================


// ----------------------------------------------------------
// NORMALIZE DATE
// ----------------------------------------------------------

const normalizeDate =
    value => {

        const date =
            value instanceof Date
                ? value
                : new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return new Date();
        }

        return date;
    };


// ----------------------------------------------------------
// SORT FIFO BATCHES
// ----------------------------------------------------------
//
// Oldest receivedAt first.
//
// If two batches have the same date, their existing array
// order is preserved by the stable sort implementation used
// by modern Node.js.
// ----------------------------------------------------------

const sortOldestFirst =
    batches => {

        return [...batches].sort(
            (a, b) => {

                return (
                    normalizeDate(
                        a.receivedAt
                    ).getTime() -
                    normalizeDate(
                        b.receivedAt
                    ).getTime()
                );

            }
        );

    };


// ----------------------------------------------------------
// SORT NEWEST FIRST
// ----------------------------------------------------------

const sortNewestFirst =
    batches => {

        return [...batches].sort(
            (a, b) => {

                return (
                    normalizeDate(
                        b.receivedAt
                    ).getTime() -
                    normalizeDate(
                        a.receivedAt
                    ).getTime()
                );

            }
        );

    };


// ----------------------------------------------------------
// CALCULATE FIFO VALUE
// ----------------------------------------------------------

const calculateFifoValue =
    batches => {

        let value = 0;


        for (
            const batch of batches || []
        ) {

            const units =
                Number(
                    batch.units || 0
                );

            const buyPrice =
                Number(
                    batch.buyPrice || 0
                );


            if (
                units > 0 &&
                Number.isFinite(
                    buyPrice
                )
            ) {

                value +=
                    units *
                    buyPrice;

            }

        }


        return value;

    };


// ----------------------------------------------------------
// CALCULATE FIFO WEIGHTED BUY PRICE
// ----------------------------------------------------------

const calculateFifoAverage =
    batches => {

        let totalUnits = 0;
        let totalValue = 0;


        for (
            const batch of batches || []
        ) {

            const units =
                Number(
                    batch.units || 0
                );

            const buyPrice =
                Number(
                    batch.buyPrice || 0
                );


            if (
                units <= 0
            ) {
                continue;
            }


            totalUnits +=
                units;

            totalValue +=
                units *
                buyPrice;

        }


        if (
            totalUnits <= 0
        ) {
            return 0;
        }


        return (
            totalValue /
            totalUnits
        );

    };


// ----------------------------------------------------------
// CLEAN FIFO BATCHES
// ----------------------------------------------------------
//
// Removes zero/negative batches and normalizes numbers.
// ----------------------------------------------------------

const cleanFifoBatches =
    batches => {

        return (
            batches || []
        )
            .map(
                batch => ({
                    units:
                        Number(
                            batch.units || 0
                        ),

                    buyPrice:
                        Number(
                            batch.buyPrice || 0
                        ),

                    receivedAt:
                        normalizeDate(
                            batch.receivedAt
                        )
                })
            )
            .filter(
                batch =>
                    batch.units > 0
            );

    };


// ==========================================================
// CONSUME STOCK FIFO
// ==========================================================
//
// Removes units from Stock.purchaseBatches.
//
// Oldest purchase is consumed first.
//
// Returns the exact FIFO layers consumed so they can be added
// to Product.fifoBatches.
// ==========================================================

const consumeStockFifo =
    (
        stock,
        quantity
    ) => {

        let remaining =
            Number(quantity || 0);


        if (
            remaining <= 0
        ) {
            return [];
        }


        const batches =
            sortOldestFirst(
                cleanFifoBatches(
                    stock.purchaseBatches
                )
            );


        const consumed = [];


        for (
            const batch of batches
        ) {

            if (
                remaining <= 0
            ) {
                break;
            }


            const available =
                Number(
                    batch.units || 0
                );


            if (
                available <= 0
            ) {
                continue;
            }


            const take =
                Math.min(
                    available,
                    remaining
                );


            consumed.push({
                units:
                    take,

                buyPrice:
                    batch.buyPrice,

                receivedAt:
                    batch.receivedAt
            });


            batch.units =
                available -
                take;


            remaining -=
                take;

        }


        if (
            remaining > 0
        ) {

            throw new Error(
                `Only ${Number(
                    quantity || 0
                ) - remaining} FIFO units are available in the source stock. You need ${quantity} units.`
            );

        }


        // ----------------------------------------------------
        // WRITE BACK REMAINING STOCK FIFO
        // ----------------------------------------------------

        stock.purchaseBatches =
            batches
                .filter(
                    batch =>
                        Number(
                            batch.units || 0
                        ) > 0
                )
                .sort(
                    (a, b) =>
                        normalizeDate(
                            a.receivedAt
                        ).getTime() -
                        normalizeDate(
                            b.receivedAt
                        ).getTime()
                );


        return consumed;

    };


// ==========================================================
// RETURN PRODUCT FIFO TO STOCK
// ==========================================================
//
// When product/substation units are reduced, Product FIFO
// layers are removed newest-first.
//
// Their original buyPrice and receivedAt are preserved.
//
// The returned layers are merged back into Stock FIFO.
// ==========================================================

const returnProductFifoToStock =
    (
        product,
        stock,
        quantity
    ) => {

        let remaining =
            Number(quantity || 0);


        if (
            remaining <= 0
        ) {
            return;
        }


        const productBatches =
            sortNewestFirst(
                cleanFifoBatches(
                    product.fifoBatches
                )
            );


        const returned = [];


        for (
            const batch of productBatches
        ) {

            if (
                remaining <= 0
            ) {
                break;
            }


            const available =
                Number(
                    batch.units || 0
                );


            if (
                available <= 0
            ) {
                continue;
            }


            const take =
                Math.min(
                    available,
                    remaining
                );


            returned.push({
                units:
                    take,

                buyPrice:
                    batch.buyPrice,

                receivedAt:
                    batch.receivedAt
            });


            batch.units =
                available -
                take;


            remaining -=
                take;

        }


        if (
            remaining > 0
        ) {

            throw new Error(
                `Product FIFO contains only ${Number(
                    quantity || 0
                ) - remaining} units available to return. You cannot remove ${quantity} units.`
            );

        }


        // ----------------------------------------------------
        // WRITE BACK PRODUCT FIFO
        // ----------------------------------------------------

        product.fifoBatches =
            productBatches
                .filter(
                    batch =>
                        Number(
                            batch.units || 0
                        ) > 0
                )
                .sort(
                    (a, b) =>
                        normalizeDate(
                            a.receivedAt
                        ).getTime() -
                        normalizeDate(
                            b.receivedAt
                        ).getTime()
                );


        // ----------------------------------------------------
        // RETURN FIFO LAYERS TO STOCK
        // ----------------------------------------------------

        const stockBatches =
            cleanFifoBatches(
                stock.purchaseBatches
            );


        for (
            const returnedBatch of returned
        ) {

            stockBatches.push({
                units:
                    returnedBatch.units,

                buyPrice:
                    returnedBatch.buyPrice,

                receivedAt:
                    returnedBatch.receivedAt
            });

        }


        stock.purchaseBatches =
            stockBatches.sort(
                (a, b) =>
                    normalizeDate(
                        a.receivedAt
                    ).getTime() -
                    normalizeDate(
                        b.receivedAt
                    ).getTime()
            );

    };


// ==========================================================
// RECALCULATE PRODUCT FIFO TOTALS
// ==========================================================

const reconcileProduct =
    product => {

        product.fifoBatches =
            cleanFifoBatches(
                product.fifoBatches
            );


        const units =
            product.fifoBatches.reduce(
                (
                    total,
                    batch
                ) =>
                    total +
                    Number(
                        batch.units || 0
                    ),
                0
            );


        const value =
            calculateFifoValue(
                product.fifoBatches
            );


        product.units =
            units;

        product.buyPrice =
            units > 0
                ? value / units
                : 0;

    };


// ==========================================================
// RECALCULATE STOCK FIFO TOTALS
// ==========================================================

const reconcileStock =
    stock => {

        stock.purchaseBatches =
            cleanFifoBatches(
                stock.purchaseBatches
            );


        const units =
            stock.purchaseBatches.reduce(
                (
                    total,
                    batch
                ) =>
                    total +
                    Number(
                        batch.units || 0
                    ),
                0
            );


        const value =
            calculateFifoValue(
                stock.purchaseBatches
            );


        stock.units =
            units;

        stock.buyPrice =
            units > 0
                ? value / units
                : 0;

    };


// ==========================================================
// UPDATE PRODUCT UNITS
// ==========================================================

exports.updateProductUnits =
    async (
        productId,
        body
    ) => {

        body =
            body || {};


        // ====================================================
        // VALIDATE PRODUCT
        // ====================================================

        if (
            !mongoose.isValidObjectId(
                productId
            )
        ) {

            throw new Error(
                "Invalid product."
            );

        }


        // ====================================================
        // VALIDATE SUBSTATION
        // ====================================================

        if (
            !mongoose.isValidObjectId(
                body.substationId
            )
        ) {

            throw new Error(
                "Invalid substation."
            );

        }


        // ====================================================
        // VALIDATE NEW UNITS
        // ====================================================

        const newUnits =
            Number(
                body.units
            );


        if (
            !Number.isInteger(
                newUnits
            ) ||
            newUnits < 0
        ) {

            throw new Error(
                "Units must be a whole number greater than or equal to zero."
            );

        }


        // ====================================================
        // START TRANSACTION
        // ====================================================

        const session =
            await mongoose.startSession();


        try {

            let result;


            await session.withTransaction(
                async () => {

                    // ========================================
                    // PRODUCT
                    // ========================================

                    const product =
                        await Product
                            .findOne({
                                _id:
                                    productId,

                                isActive:
                                    true
                            })
                            .session(
                                session
                            );


                    if (!product) {

                        throw new Error(
                            "Product not found."
                        );

                    }


                    // ========================================
                    // SOURCE STOCK
                    // ========================================

                    if (
                        !product.stock ||
                        !mongoose.isValidObjectId(
                            product.stock
                        )
                    ) {

                        throw new Error(
                            "This product is not linked to a valid source stock."
                        );

                    }


                    const stock =
                        await Stock
                            .findOne({
                                _id:
                                    product.stock,

                                isActive:
                                    true
                            })
                            .session(
                                session
                            );


                    if (!stock) {

                        throw new Error(
                            "The source stock was not found or is inactive."
                        );

                    }


                    // ========================================
                    // SUBSTATION
                    // ========================================

                    const substation =
                        await Substation
                            .findOne({
                                _id:
                                    body.substationId,

                                isActive:
                                    true
                            })
                            .session(
                                session
                            );


                    if (!substation) {

                        throw new Error(
                            "Substation not found or inactive."
                        );

                    }


                    // ========================================
                    // INVENTORY ENTRY
                    // ========================================

                    const inventory =
                        substation.productInventory.find(
                            entry =>
                                String(
                                    entry.productId
                                ) ===
                                String(
                                    product._id
                                )
                        );


                    if (!inventory) {

                        throw new Error(
                            "This product is not allocated to the selected substation."
                        );

                    }


                    // ========================================
                    // OLD UNITS
                    // ========================================

                    const oldUnits =
                        Number(
                            inventory.units || 0
                        );


                    // ========================================
                    // DELTA
                    // ========================================

                    const delta =
                        newUnits -
                        oldUnits;


                    // ========================================
                    // NO CHANGE
                    // ========================================

                    if (
                        delta === 0
                    ) {

                        inventory.updatedAt =
                            new Date();

                        inventory.productName =
                            product.name;

                        inventory.category =
                            product.category;

                        inventory.subcategory =
                            product.subcategory;

                        inventory.days =
                            Number(
                                product.days || 0
                            );


                        await substation.save({
                            session
                        });


                        reconcileProduct(
                            product
                        );

                        reconcileStock(
                            stock
                        );


                        await product.save({
                            session
                        });


                        await stock.save({
                            session
                        });


                        result = {

                            productId:
                                product._id,

                            substationId:
                                substation._id,

                            units:
                                newUnits,

                            delta: 0

                        };


                        return;

                    }


                    // ========================================
                    // INCREASE UNITS
                    // ========================================
                    //
                    // Consume source Stock FIFO.
                    //
                    // OLDEST PURCHASE FIRST.
                    // ========================================

                    if (
                        delta > 0
                    ) {

                        const consumedBatches =
                            consumeStockFifo(
                                stock,
                                delta
                            );


                        // ------------------------------------
                        // ADD CONSUMED FIFO TO PRODUCT
                        // ------------------------------------

                        const productBatches =
                            cleanFifoBatches(
                                product.fifoBatches
                            );


                        for (
                            const batch of
                                consumedBatches
                        ) {

                            productBatches.push({
                                units:
                                    batch.units,

                                buyPrice:
                                    batch.buyPrice,

                                receivedAt:
                                    batch.receivedAt
                            });

                        }


                        product.fifoBatches =
                            productBatches;

                    }


                    // ========================================
                    // DECREASE UNITS
                    // ========================================
                    //
                    // Return Product FIFO to Stock.
                    //
                    // Newest allocated layer is returned first.
                    //
                    // Original purchase price is preserved.
                    // ========================================

                    if (
                        delta < 0
                    ) {

                        const unitsToReturn =
                            Math.abs(
                                delta
                            );


                        returnProductFifoToStock(
                            product,
                            stock,
                            unitsToReturn
                        );

                    }


                    // ========================================
                    // RECONCILE PRODUCT FIFO
                    // ========================================

                    reconcileProduct(
                        product
                    );


                    // ========================================
                    // RECONCILE STOCK FIFO
                    // ========================================

                    reconcileStock(
                        stock
                    );


                    // ========================================
                    // UPDATE SUBSTATION INVENTORY
                    // ========================================

                    inventory.units =
                        newUnits;

                    inventory.updatedAt =
                        new Date();

                    inventory.productName =
                        product.name;

                    inventory.category =
                        product.category;

                    inventory.subcategory =
                        product.subcategory;

                    inventory.days =
                        Number(
                            product.days || 0
                        );


                    await substation.save({
                        session
                    });


                    // ========================================
                    // SAVE PRODUCT
                    // ========================================

                    product.updatedAt =
                        new Date();


                    await product.save({
                        session
                    });


                    // ========================================
                    // SAVE STOCK
                    // ========================================

                    stock.totalsUpdatedAt =
                        new Date();


                    await stock.save({
                        session
                    });


                    // ========================================
                    // LOAD ACTIVE STOCK
                    // ========================================

                    const allStocks =
                        await Stock
                            .find({
                                isActive:
                                    true
                            })
                            .select(
                                "_id category units purchaseBatches buyPrice"
                            )
                            .session(
                                session
                            )
                            .lean();


                    // ========================================
                    // CATEGORY TOTALS
                    // ========================================

                    const categoryTotals =
                        new Map();

                    let overall =
                        0;


                    for (
                        const item of
                            allStocks
                    ) {

                        const fifoValue =
                            calculateFifoValue(
                                item.purchaseBatches
                            );


                        const category =
                            item.category;


                        categoryTotals.set(
                            category,
                            (
                                categoryTotals.get(
                                    category
                                ) || 0
                            ) +
                            fifoValue
                        );


                        overall +=
                            fifoValue;

                    }


                    // ========================================
                    // CURRENT TIME
                    // ========================================

                    const now =
                        new Date();


                    // ========================================
                    // UPDATE STOCK TOTAL FIELDS
                    // ========================================

                    for (
                        const item of
                            allStocks
                    ) {

                        const value =
                            calculateFifoValue(
                                item.purchaseBatches
                            );


                        await Stock.updateOne(
                            {
                                _id:
                                    item._id
                            },

                            {
                                $set: {

                                    cashOutflow:
                                        value,

                                    categoryOveral:
                                        categoryTotals.get(
                                            item.category
                                        ) || 0,

                                    overal:
                                        overall,

                                    totalsUpdatedAt:
                                        now

                                }
                            },

                            {
                                session,

                                timestamps:
                                    true
                            }
                        );

                    }


                    // ========================================
                    // RESULT
                    // ========================================

                    result = {

                        productId:
                            product._id,

                        substationId:
                            substation._id,

                        units:
                            newUnits,

                        delta

                    };

                }
            );


            // =================================================
            // RETURN
            // =================================================

            return result;

        } finally {

            await session.endSession();

        }

    };