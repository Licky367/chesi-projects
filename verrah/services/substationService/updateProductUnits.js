// ==========================================================
// verrah/services/substationService/updateProductUnits.js
//
// UPDATE PRODUCT UNITS AT MULTIPLE SUBSTATIONS
//
// IMPORTANT:
//
// Substation inventory is the quantity being edited.
//
// Product.units is synchronized with the total quantity held
// across the substations.
//
// Product.fifoBatches represent the FIFO cost layers for the
// Product quantity.
//
// Stock.purchaseBatches represent FIFO layers remaining in
// warehouse Stock.
//
// When existing Product.units and substation inventory are
// already inconsistent, the substation inventory is treated
// as the current physical allocation and Product is repaired
// to match it.
//
// FIFO is only moved between Stock and Product when the NEW
// allocation differs from the CURRENT substation allocation.
//
// Stock.purchaseBatches:
//      purchasedAt
//
// Product.fifoBatches:
//      receivedAt
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
// NUMBER
// ==========================================================

function number(value) {

    const result =
        Number(value);

    return Number.isFinite(result)
        ? result
        : 0;
}


// ==========================================================
// VALID WHOLE NUMBER
// ==========================================================

function validUnits(value) {

    return (
        Number.isInteger(value) &&
        value >= 0
    );
}


// ==========================================================
// DATE
// ==========================================================

function dateValue(
    value,
    fallback
) {

    const date =
        value
            ? new Date(value)
            : null;

    if (
        date &&
        !Number.isNaN(
            date.getTime()
        )
    ) {
        return date;
    }

    return fallback;
}


// ==========================================================
// PRODUCT FIFO UNITS
// ==========================================================

function productFifoUnits(
    batches
) {

    return (
        Array.isArray(batches)
            ? batches
            : []
    ).reduce(
        (
            total,
            batch
        ) => {

            return (
                total +
                number(
                    batch.units
                )
            );
        },
        0
    );
}


// ==========================================================
// STOCK FIFO UNITS
// ==========================================================

function stockFifoUnits(
    batches
) {

    return (
        Array.isArray(batches)
            ? batches
            : []
    ).reduce(
        (
            total,
            batch
        ) => {

            return (
                total +
                number(
                    batch.units
                )
            );
        },
        0
    );
}


// ==========================================================
// PRODUCT FIFO VALUE
// ==========================================================

function productFifoValue(
    batches
) {

    return (
        Array.isArray(batches)
            ? batches
            : []
    ).reduce(
        (
            total,
            batch
        ) => {

            return (
                total +
                (
                    number(
                        batch.units
                    ) *
                    number(
                        batch.buyPrice
                    )
                )
            );
        },
        0
    );
}


// ==========================================================
// STOCK FIFO VALUE
// ==========================================================

function stockFifoValue(
    batches
) {

    return (
        Array.isArray(batches)
            ? batches
            : []
    ).reduce(
        (
            total,
            batch
        ) => {

            return (
                total +
                (
                    number(
                        batch.units
                    ) *
                    number(
                        batch.buyPrice
                    )
                )
            );
        },
        0
    );
}


// ==========================================================
// PRODUCT WEIGHTED BUY PRICE
// ==========================================================

function productWeightedPrice(
    batches
) {

    const units =
        productFifoUnits(
            batches
        );

    if (
        units <= 0
    ) {
        return 0;
    }

    return (
        productFifoValue(
            batches
        ) /
        units
    );
}


// ==========================================================
// STOCK WEIGHTED BUY PRICE
// ==========================================================

function stockWeightedPrice(
    batches
) {

    const units =
        stockFifoUnits(
            batches
        );

    if (
        units <= 0
    ) {
        return 0;
    }

    return (
        stockFifoValue(
            batches
        ) /
        units
    );
}


// ==========================================================
// NORMALIZE PRODUCT FIFO
//
// Oldest first.
// ==========================================================

function normalizeProductFifo(
    batches
) {

    return (
        Array.isArray(batches)
            ? batches
            : []
    )
        .map(
            batch => {

                return {
                    ...(batch.toObject
                        ? batch.toObject()
                        : batch),

                    units:
                        number(
                            batch.units
                        ),

                    buyPrice:
                        number(
                            batch.buyPrice
                        ),

                    receivedAt:
                        dateValue(
                            batch.receivedAt,
                            new Date()
                        )
                };
            }
        )
        .filter(
            batch =>
                batch.units > 0
        )
        .sort(
            (
                a,
                b
            ) => {

                return (
                    a.receivedAt -
                    b.receivedAt
                );
            }
        );
}


// ==========================================================
// NORMALIZE STOCK FIFO
//
// Oldest first.
// ==========================================================

function normalizeStockFifo(
    batches
) {

    return (
        Array.isArray(batches)
            ? batches
            : []
    )
        .map(
            batch => {

                return {
                    ...(batch.toObject
                        ? batch.toObject()
                        : batch),

                    units:
                        number(
                            batch.units
                        ),

                    buyPrice:
                        number(
                            batch.buyPrice
                        ),

                    purchasedAt:
                        dateValue(
                            batch.purchasedAt,
                            new Date()
                        )
                };
            }
        )
        .filter(
            batch =>
                batch.units > 0
        )
        .sort(
            (
                a,
                b
            ) => {

                return (
                    a.purchasedAt -
                    b.purchasedAt
                );
            }
        );
}


// ==========================================================
// RECONCILE EXISTING PRODUCT FIFO TO SUBSTATION INVENTORY
//
// This is the important part.
//
// Example:
//
// Product.units       = 1
// Product FIFO        = 1
// Substation total    = 9
//
// We DO NOT consume 8 from Stock.
//
// The 9 units already exist in the substations.
//
// Product FIFO is therefore expanded to represent the
// existing 9-unit allocation.
//
// Missing historical FIFO quantity cannot be reconstructed.
// The existing Product.buyPrice is therefore used for the
// compatibility/reconciliation layer.
//
// If FIFO contains too many units, the newest layers are
// trimmed because substation inventory is authoritative.
// ==========================================================

function reconcileProductFifo(
    product,
    targetUnits
) {

    targetUnits =
        number(
            targetUnits
        );

    let batches =
        normalizeProductFifo(
            product.fifoBatches
        );

    let fifoUnits =
        productFifoUnits(
            batches
        );

    // ------------------------------------------------------
    // Nothing to reconcile.
    // ------------------------------------------------------

    if (
        fifoUnits ===
        targetUnits
    ) {

        product.fifoBatches =
            batches;

        product.units =
            targetUnits;

        product.buyPrice =
            productWeightedPrice(
                batches
            );

        return;
    }


    // ------------------------------------------------------
    // FIFO contains too few units.
    //
    // Add a compatibility layer using the Product's current
    // weighted buy price.
    // ------------------------------------------------------

    if (
        fifoUnits <
        targetUnits
    ) {

        const missing =
            targetUnits -
            fifoUnits;

        const price =
            number(
                product.buyPrice
            );

        const createdAt =
            dateValue(
                product.createdAt,
                new Date()
            );

        if (
            missing > 0
        ) {

            batches.push(
                {
                    units:
                        missing,

                    buyPrice:
                        price,

                    receivedAt:
                        createdAt
                }
            );
        }

        batches =
            normalizeProductFifo(
                batches
            );
    }


    // ------------------------------------------------------
    // FIFO contains too many units.
    //
    // Trim newest layers until FIFO matches the actual
    // substation allocation.
    // ------------------------------------------------------

    else {

        let excess =
            fifoUnits -
            targetUnits;

        const newestFirst =
            [...batches].sort(
                (
                    a,
                    b
                ) => {

                    return (
                        b.receivedAt -
                        a.receivedAt
                    );
                }
            );

        const remaining =
            [];

        for (
            const batch of newestFirst
        ) {

            if (
                excess <= 0
            ) {

                remaining.push(
                    batch
                );

                continue;
            }

            const remove =
                Math.min(
                    number(
                        batch.units
                    ),
                    excess
                );

            const unitsLeft =
                number(
                    batch.units
                ) -
                remove;

            if (
                unitsLeft > 0
            ) {

                remaining.push(
                    {
                        ...batch,

                        units:
                            unitsLeft
                    }
                );
            }

            excess -=
                remove;
        }

        batches =
            remaining.sort(
                (
                    a,
                    b
                ) => {

                    return (
                        a.receivedAt -
                        b.receivedAt
                    );
                }
            );
    }


    product.fifoBatches =
        batches;

    product.units =
        productFifoUnits(
            batches
        );

    product.buyPrice =
        productWeightedPrice(
            batches
        );
}


// ==========================================================
// CONSUME STOCK FIFO
//
// Oldest Stock purchase batches are consumed first.
//
// Returns Product FIFO layers.
// ==========================================================

function consumeStockFifo(
    stock,
    quantity
) {

    quantity =
        number(
            quantity
        );

    if (
        quantity <= 0
    ) {
        return [];
    }

    const batches =
        normalizeStockFifo(
            stock.purchaseBatches
        );

    const available =
        stockFifoUnits(
            batches
        );

    if (
        available <
        quantity
    ) {

        throw new Error(
            `Only ${available} units remain in the source stock. You need ${quantity} additional units.`
        );
    }

    let remaining =
        quantity;

    const productLayers =
        [];

    const stockLayers =
        [];

    for (
        const batch of batches
    ) {

        if (
            remaining <= 0
        ) {

            stockLayers.push(
                batch
            );

            continue;
        }

        const batchUnits =
            number(
                batch.units
            );

        const consumed =
            Math.min(
                batchUnits,
                remaining
            );

        const left =
            batchUnits -
            consumed;

        if (
            consumed > 0
        ) {

            productLayers.push(
                {
                    units:
                        consumed,

                    buyPrice:
                        number(
                            batch.buyPrice
                        ),

                    receivedAt:
                        new Date(
                            batch.purchasedAt
                        )
                }
            );
        }

        if (
            left > 0
        ) {

            stockLayers.push(
                {
                    ...batch,

                    units:
                        left
                }
            );
        }

        remaining -=
            consumed;
    }

    if (
        remaining > 0
    ) {

        throw new Error(
            "Unable to consume the requested quantity from Stock FIFO."
        );
    }

    stock.purchaseBatches =
        stockLayers;

    stock.units =
        stockFifoUnits(
            stockLayers
        );

    stock.buyPrice =
        stockWeightedPrice(
            stockLayers
        );

    return productLayers;
}


// ==========================================================
// RELEASE PRODUCT FIFO
//
// When Product allocation genuinely decreases, release the
// newest Product FIFO layers first.
//
// Those layers return to the originating Stock.
// ==========================================================

function releaseProductFifo(
    product,
    quantity
) {

    quantity =
        number(
            quantity
        );

    if (
        quantity <= 0
    ) {
        return [];
    }

    const batches =
        normalizeProductFifo(
            product.fifoBatches
        );

    const available =
        productFifoUnits(
            batches
        );

    if (
        available <
        quantity
    ) {

        throw new Error(
            `Product FIFO contains only ${available} units available to return. You cannot remove ${quantity} units.`
        );
    }

    let remaining =
        quantity;

    const returnedStockLayers =
        [];

    const productLayers =
        [];

    for (
        let index =
            batches.length - 1;

        index >= 0;

        index--
    ) {

        const batch =
            batches[index];

        if (
            remaining <= 0
        ) {

            productLayers.unshift(
                batch
            );

            continue;
        }

        const batchUnits =
            number(
                batch.units
            );

        const released =
            Math.min(
                batchUnits,
                remaining
            );

        const left =
            batchUnits -
            released;

        if (
            released > 0
        ) {

            returnedStockLayers.push(
                {
                    units:
                        released,

                    buyPrice:
                        number(
                            batch.buyPrice
                        ),

                    purchasedAt:
                        new Date(
                            batch.receivedAt
                        )
                }
            );
        }

        if (
            left > 0
        ) {

            productLayers.unshift(
                {
                    ...batch,

                    units:
                        left
                }
            );
        }

        remaining -=
            released;
    }

    if (
        remaining > 0
    ) {

        throw new Error(
            "Unable to release the requested quantity from Product FIFO."
        );
    }

    product.fifoBatches =
        productLayers;

    product.units =
        productFifoUnits(
            productLayers
        );

    product.buyPrice =
        productWeightedPrice(
            productLayers
        );

    return returnedStockLayers;
}


// ==========================================================
// RETURN FIFO LAYERS TO STOCK
// ==========================================================

function returnLayersToStock(
    stock,
    returnedLayers
) {

    if (
        !Array.isArray(
            returnedLayers
        ) ||
        returnedLayers.length === 0
    ) {
        return;
    }

    const existing =
        normalizeStockFifo(
            stock.purchaseBatches
        );

    stock.purchaseBatches =
        [
            ...existing,
            ...returnedLayers
        ]
            .filter(
                batch =>
                    number(
                        batch.units
                    ) > 0
            )
            .sort(
                (
                    a,
                    b
                ) => {

                    return (
                        a.purchasedAt -
                        b.purchasedAt
                    );
                }
            );

    stock.units =
        stockFifoUnits(
            stock.purchaseBatches
        );

    stock.buyPrice =
        stockWeightedPrice(
            stock.purchaseBatches
        );
}


// ==========================================================
// GET CURRENT SUBSTATION TOTAL
//
// The existing substation inventory is authoritative for the
// physical allocation.
//
// We deliberately do NOT compare this against Product.units
// and throw an error.
// ==========================================================

async function getCurrentSubstationData(
    productId,
    session
) {

    const substations =
        await Substation
            .find({
                isActive:
                    true
            })
            .select(
                "_id name location productInventory"
            )
            .session(
                session
            )
            .lean();

    let total =
        0;

    for (
        const substation of substations
    ) {

        const inventory =
            Array.isArray(
                substation.productInventory
            )
                ? substation.productInventory
                : [];

        for (
            const entry of inventory
        ) {

            if (
                String(
                    entry.productId
                ) !==
                String(
                    productId
                )
            ) {
                continue;
            }

            const units =
                number(
                    entry.units
                );

            if (
                !validUnits(
                    units
                )
            ) {

                throw new Error(
                    `Invalid units found for Product at substation ${substation.name || substation._id}.`
                );
            }

            total +=
                units;
        }
    }

    return {
        substations,
        total
    };
}


// ==========================================================
// NORMALIZE REQUEST ALLOCATIONS
//
// Expected:
//
// allocations: [
//     {
//         substationId: "...",
//         units: 10
//     },
//     {
//         substationId: "...",
//         units: 5
//     }
// ]
// ==========================================================

function normalizeAllocations(
    body
) {

    const allocations =
        Array.isArray(
            body.allocations
        )
            ? body.allocations
            : [];

    if (
        allocations.length === 0
    ) {

        throw new Error(
            "No substation allocations were supplied."
        );
    }

    const seen =
        new Set();

    return allocations.map(
        allocation => {

            if (
                !mongoose.isValidObjectId(
                    allocation.substationId
                )
            ) {

                throw new Error(
                    "Invalid substation."
                );
            }

            const substationId =
                String(
                    allocation.substationId
                );

            if (
                seen.has(
                    substationId
                )
            ) {

                throw new Error(
                    "The same substation was submitted more than once."
                );
            }

            seen.add(
                substationId
            );

            const units =
                Number(
                    allocation.units
                );

            if (
                !validUnits(
                    units
                )
            ) {

                throw new Error(
                    "Substation units must be whole numbers greater than or equal to zero."
                );
            }

            return {
                substationId:
                    allocation.substationId,

                units
            };
        }
    );
}


// ==========================================================
// UPDATE PRODUCT UNITS
//
// MULTIPLE SUBSTATIONS
// ==========================================================

exports.updateProductUnits =
async (
    productId,
    body
) => {

    body =
        body || {};

    if (
        !mongoose.isValidObjectId(
            productId
        )
    ) {

        throw new Error(
            "Invalid product."
        );
    }

    const allocations =
        normalizeAllocations(
            body
        );

    const session =
        await mongoose.startSession();

    try {

        let result;

        await session.withTransaction(
            async () => {

                // ==================================================
                // LOAD PRODUCT
                // ==================================================

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


                // ==================================================
                // LOAD SOURCE STOCK
                // ==================================================

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
                        "The source stock for this Product was not found."
                    );
                }


                // ==================================================
                // GET CURRENT SUBSTATION INVENTORY
                // ==================================================

                const currentData =
                    await getCurrentSubstationData(
                        product._id,
                        session
                    );

                const currentSubstationTotal =
                    currentData.total;


                // ==================================================
                // CALCULATE NEW TOTAL
                //
                // Only submitted substations are changed.
                // Unsubmitted substations retain their current
                // allocations.
                // ==================================================

                let newSubstationTotal =
                    currentSubstationTotal;


                for (
                    const allocation of allocations
                ) {

                    const substation =
                        currentData.substations.find(
                            item =>
                                String(
                                    item._id
                                ) ===
                                String(
                                    allocation.substationId
                                )
                        );

                    if (!substation) {

                        throw new Error(
                            "One or more selected substations were not found or are inactive."
                        );
                    }

                    const inventory =
                        Array.isArray(
                            substation.productInventory
                        )
                            ? substation.productInventory
                            : [];

                    const existing =
                        inventory.find(
                            item =>
                                String(
                                    item.productId
                                ) ===
                                String(
                                    product._id
                                )
                        );

                    const oldUnits =
                        existing
                            ? number(
                                existing.units
                            )
                            : 0;

                    newSubstationTotal =
                        newSubstationTotal -
                        oldUnits +
                        allocation.units;
                }


                // ==================================================
                // IMPORTANT:
                //
                // The current Product.units is NOT used as the
                // starting quantity.
                //
                // The current substation total is authoritative.
                //
                // This fixes situations such as:
                //
                // Product.units = 1
                // Substation total = 9
                //
                // We start from 9, not 1.
                // ==================================================

                const actualDelta =
                    newSubstationTotal -
                    currentSubstationTotal;


                // ==================================================
                // RECONCILE PRODUCT FIFO TO EXISTING SUBSTATION
                // INVENTORY BEFORE APPLYING THE NEW DELTA.
                //
                // This repairs an existing quantity mismatch
                // without moving anything to/from Stock.
                // ==================================================

                reconcileProductFifo(
                    product,
                    currentSubstationTotal
                );


                // ==================================================
                // APPLY ONLY THE REAL CHANGE
                // ==================================================

                if (
                    actualDelta > 0
                ) {

                    // ----------------------------------------------
                    // Additional units are genuinely being added
                    // to the Product allocation.
                    //
                    // Consume oldest Stock FIFO.
                    // ----------------------------------------------

                    const addedLayers =
                        consumeStockFifo(
                            stock,
                            actualDelta
                        );

                    product.fifoBatches =
                        [
                            ...normalizeProductFifo(
                                product.fifoBatches
                            ),
                            ...addedLayers
                        ];

                    product.fifoBatches =
                        normalizeProductFifo(
                            product.fifoBatches
                        );

                    product.units =
                        productFifoUnits(
                            product.fifoBatches
                        );

                    product.buyPrice =
                        productWeightedPrice(
                            product.fifoBatches
                        );
                }


                else if (
                    actualDelta < 0
                ) {

                    // ----------------------------------------------
                    // Product allocation genuinely decreased.
                    //
                    // Release newest Product FIFO layers and return
                    // them to the originating Stock.
                    // ----------------------------------------------

                    const quantityToReturn =
                        Math.abs(
                            actualDelta
                        );

                    const returnedLayers =
                        releaseProductFifo(
                            product,
                            quantityToReturn
                        );

                    returnLayersToStock(
                        stock,
                        returnedLayers
                    );
                }


                // ==================================================
                // FINAL PRODUCT QUANTITY
                // ==================================================

                product.units =
                    newSubstationTotal;

                product.buyPrice =
                    productWeightedPrice(
                        product.fifoBatches
                    );


                // ==================================================
                // FINAL PRODUCT FIFO CHECK
                // ==================================================

                const finalProductFifoUnits =
                    productFifoUnits(
                        product.fifoBatches
                    );

                if (
                    finalProductFifoUnits !==
                    newSubstationTotal
                ) {

                    throw new Error(
                        `Product FIFO reconciliation failed. Expected ${newSubstationTotal} units but FIFO contains ${finalProductFifoUnits}.`
                    );
                }


                // ==================================================
                // FINAL STOCK QUANTITY
                // ==================================================

                stock.units =
                    stockFifoUnits(
                        stock.purchaseBatches
                    );

                stock.buyPrice =
                    stockWeightedPrice(
                        stock.purchaseBatches
                    );


                // ==================================================
                // UPDATE SUBSTATIONS
                // ==================================================

                for (
                    const allocation of allocations
                ) {

                    const substation =
                        await Substation
                            .findOne({
                                _id:
                                    allocation.substationId,

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

                    if (
                        !Array.isArray(
                            substation.productInventory
                        )
                    ) {

                        substation.productInventory =
                            [];
                    }


                    let entry =
                        substation.productInventory.find(
                            item =>
                                String(
                                    item.productId
                                ) ===
                                String(
                                    product._id
                                )
                        );


                    // ------------------------------------------------
                    // CREATE INVENTORY ENTRY
                    // ------------------------------------------------

                    if (!entry) {

                        entry =
                            {
                                productId:
                                    product._id,

                                productName:
                                    product.name,

                                category:
                                    product.category,

                                subcategory:
                                    product.subcategory,

                                days:
                                    number(
                                        product.days
                                    ),

                                units:
                                    allocation.units,

                                updatedAt:
                                    new Date()
                            };

                        substation.productInventory.push(
                            entry
                        );
                    }


                    // ------------------------------------------------
                    // UPDATE INVENTORY ENTRY
                    // ------------------------------------------------

                    else {

                        entry.units =
                            allocation.units;

                        entry.productName =
                            product.name;

                        entry.category =
                            product.category;

                        entry.subcategory =
                            product.subcategory;

                        entry.days =
                            number(
                                product.days
                            );

                        entry.updatedAt =
                            new Date();
                    }


                    substation.updatedAt =
                        new Date();

                    await substation.save({
                        session
                    });
                }


                // ==================================================
                // UPDATE PRODUCT
                // ==================================================

                product.updatedAt =
                    new Date();

                await product.save({
                    session
                });


                // ==================================================
                // UPDATE STOCK
                // ==================================================

                stock.totalsUpdatedAt =
                    new Date();

                await stock.save({
                    session
                });


                // ==================================================
                // RECALCULATE ALL STOCK TOTALS
                // ==================================================

                const allStocks =
                    await Stock
                        .find({
                            isActive:
                                true
                        })
                        .select(
                            "_id category units buyPrice purchaseBatches"
                        )
                        .session(
                            session
                        )
                        .lean();


                const categoryTotals =
                    new Map();

                let overall =
                    0;


                // ==================================================
                // CALCULATE TOTAL STOCK VALUE
                // ==================================================

                for (
                    const item of allStocks
                ) {

                    const batches =
                        normalizeStockFifo(
                            item.purchaseBatches
                        );

                    let value =
                        0;

                    if (
                        batches.length > 0
                    ) {

                        value =
                            stockFifoValue(
                                batches
                            );
                    }

                    else {

                        value =
                            number(
                                item.units
                            ) *
                            number(
                                item.buyPrice
                            );
                    }

                    const category =
                        item.category ||
                        "";

                    categoryTotals.set(
                        category,
                        (
                            categoryTotals.get(
                                category
                            ) || 0
                        ) +
                        value
                    );

                    overall +=
                        value;
                }


                // ==================================================
                // SAVE STOCK TOTALS
                // ==================================================

                const now =
                    new Date();

                for (
                    const item of allStocks
                ) {

                    const batches =
                        normalizeStockFifo(
                            item.purchaseBatches
                        );

                    let value =
                        0;

                    if (
                        batches.length > 0
                    ) {

                        value =
                            stockFifoValue(
                                batches
                            );
                    }

                    else {

                        value =
                            number(
                                item.units
                            ) *
                            number(
                                item.buyPrice
                            );
                    }


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
                                        item.category ||
                                        ""
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


                // ==================================================
                // RESULT
                // ==================================================

                result =
                    {
                        productId:
                            product._id,

                        previousUnits:
                            currentSubstationTotal,

                        units:
                            newSubstationTotal,

                        delta:
                            actualDelta,

                        substationCount:
                            allocations.length
                    };
            }
        );


        return result;

    }

    finally {

        await session.endSession();
    }
};