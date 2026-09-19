// ==========================================================
// verrah/services/substationService/updateProductUnits.js
//
// UPDATE PRODUCT UNITS AT MULTIPLE SUBSTATIONS
//
// FIFO MODEL:
//
// Product.units
//      = total units allocated across all substations
//
// Product.fifoBatches
//      = FIFO cost layers for the entire Product allocation
//
// Stock.units
//      = warehouse units remaining
//
// Stock.purchaseBatches
//      = FIFO purchase layers for warehouse stock
//
// IMPORTANT:
//
// Increasing the total Product allocation:
//      Stock FIFO -> Product FIFO
//
// Decreasing the total Product allocation:
//      Product FIFO -> Stock FIFO
//
// Editing several substations at once is handled as ONE
// transaction. FIFO is applied only to the change in the
// Product's total allocation.
//
// Stock.purchaseBatches use:
//      purchasedAt
//
// Product.fifoBatches use:
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
// NUMBER HELPER
// ==========================================================

function number(value) {

    const result =
        Number(value);

    return Number.isFinite(result)
        ? result
        : 0;
}


// ==========================================================
// INTEGER VALIDATION
// ==========================================================

function isWholeNumber(value) {

    return (
        Number.isInteger(value) &&
        value >= 0
    );
}


// ==========================================================
// DATE HELPER
// ==========================================================

function validDate(
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
                number(batch.units)
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
                number(batch.units)
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
                    number(batch.units) *
                    number(batch.buyPrice)
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
                    number(batch.units) *
                    number(batch.buyPrice)
                )
            );
        },
        0
    );
}


// ==========================================================
// WEIGHTED AVERAGE FIFO PRICE
// ==========================================================

function weightedAveragePrice(
    batches
) {

    const units =
        productFifoUnits(
            batches
        );

    if (units <= 0) {
        return 0;
    }

    const value =
        productFifoValue(
            batches
        );

    return value / units;
}


// ==========================================================
// STOCK WEIGHTED AVERAGE
// ==========================================================

function stockWeightedAveragePrice(
    batches
) {

    const units =
        stockFifoUnits(
            batches
        );

    if (units <= 0) {
        return 0;
    }

    const value =
        stockFifoValue(
            batches
        );

    return value / units;
}


// ==========================================================
// NORMALIZE PRODUCT FIFO
//
// Oldest Product layer first.
//
// Product FIFO uses receivedAt.
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
                        validDate(
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
// Oldest Stock purchase first.
//
// Stock FIFO uses purchasedAt.
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
                        validDate(
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
// ASSERT PRODUCT FIFO CONSISTENCY
//
// Product.units must equal the total quantity contained
// in Product.fifoBatches.
//
// We intentionally DO NOT invent missing FIFO history.
// ==========================================================

function assertProductFifo(
    product
) {

    const productUnits =
        number(
            product.units
        );

    const batches =
        normalizeProductFifo(
            product.fifoBatches
        );

    const fifoUnits =
        productFifoUnits(
            batches
        );

    if (
        productUnits !==
        fifoUnits
    ) {

        throw new Error(
            `Product FIFO is inconsistent. Product contains ${productUnits} units, but its FIFO batches contain ${fifoUnits} units. Repair the Product FIFO before changing substation allocations.`
        );
    }

    return batches;
}


// ==========================================================
// ASSERT STOCK FIFO CONSISTENCY
//
// Stock.units must equal the total quantity in
// Stock.purchaseBatches when FIFO batches exist.
//
// We require FIFO here because the requested operation
// depends on exact purchase layers.
// ==========================================================

function assertStockFifo(
    stock
) {

    const stockUnits =
        number(
            stock.units
        );

    const batches =
        normalizeStockFifo(
            stock.purchaseBatches
        );

    const fifoUnits =
        stockFifoUnits(
            batches
        );

    if (
        stockUnits !==
        fifoUnits
    ) {

        throw new Error(
            `Source stock FIFO is inconsistent. Stock contains ${stockUnits} units, but its purchase batches contain ${fifoUnits} units. Repair the Stock FIFO before changing substation allocations.`
        );
    }

    return batches;
}


// ==========================================================
// CONSUME STOCK FIFO
//
// Oldest stock purchase batches are consumed first.
//
// Returns Product FIFO layers created from the consumed
// Stock layers.
// ==========================================================

function consumeStockFifo(
    stock,
    quantity
) {

    quantity =
        number(quantity);

    if (quantity <= 0) {
        return [];
    }

    let batches =
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

    const newStockBatches =
        [];

    for (
        const batch of batches
    ) {

        if (
            remaining <= 0
        ) {

            newStockBatches.push(
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

        const leftover =
            batchUnits -
            consumed;

        if (
            leftover > 0
        ) {

            newStockBatches.push(
                {
                    ...batch,

                    units:
                        leftover
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
        newStockBatches;

    stock.units =
        stockFifoUnits(
            newStockBatches
        );

    stock.buyPrice =
        stockWeightedAveragePrice(
            newStockBatches
        );

    return productLayers;
}


// ==========================================================
// RELEASE PRODUCT FIFO
//
// When total Product allocation decreases, the newest
// Product FIFO layers are released first.
//
// They are returned to the source Stock as purchase layers.
//
// This does NOT attempt to associate a FIFO layer with a
// particular substation. Product FIFO belongs to the
// Product as a whole.
// ==========================================================

function releaseProductFifo(
    product,
    quantity
) {

    quantity =
        number(quantity);

    if (quantity <= 0) {
        return [];
    }

    let batches =
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

    const newProductBatches =
        [];

    // ------------------------------------------------------
    // Newest Product FIFO layers are released first.
    // ------------------------------------------------------

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

            newProductBatches.unshift(
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

        const leftover =
            batchUnits -
            released;

        if (
            leftover > 0
        ) {

            newProductBatches.unshift(
                {
                    ...batch,

                    units:
                        leftover
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
        newProductBatches;

    product.units =
        productFifoUnits(
            newProductBatches
        );

    product.buyPrice =
        weightedAveragePrice(
            newProductBatches
        );

    return returnedStockLayers;
}


// ==========================================================
// ADD RETURNED FIFO LAYERS TO STOCK
// ==========================================================

function addReturnedStockLayers(
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
                        new Date(
                            a.purchasedAt
                        ) -
                        new Date(
                            b.purchasedAt
                        )
                    );
                }
            );

    stock.units =
        stockFifoUnits(
            stock.purchaseBatches
        );

    stock.buyPrice =
        stockWeightedAveragePrice(
            stock.purchaseBatches
        );
}


// ==========================================================
// GET ALL CURRENT PRODUCT ALLOCATIONS
//
// Used to calculate the Product's true current total across
// all active substations.
// ==========================================================

async function getCurrentProductAllocations(
    productId,
    session
) {

    const substations =
        await Substation
            .find({
                isActive: true
            })
            .select(
                "_id name productInventory"
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
                !Number.isInteger(
                    units
                ) ||
                units < 0
            ) {

                throw new Error(
                    `Invalid Product allocation found at substation ${substation.name || substation._id}.`
                );
            }

            total +=
                units;
        }
    }

    return {
        total,
        substations
    };
}


// ==========================================================
// NORMALIZE ALLOCATIONS FROM REQUEST
//
// Expected:
//
// {
//     productId: "...",
//     allocations: [
//         {
//             substationId: "...",
//             units: 10
//         },
//         ...
//     ]
// }
//
// productId is supplied separately by the controller route,
// so body.productId is optional.
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

    const normalized =
        [];

    for (
        const allocation of allocations
    ) {

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
            !isWholeNumber(
                units
            )
        ) {

            throw new Error(
                "Substation units must be whole numbers greater than or equal to zero."
            );
        }

        normalized.push(
            {
                substationId:
                    allocation.substationId,

                units
            }
        );
    }

    return normalized;
}


// ==========================================================
// UPDATE PRODUCT UNITS AT MULTIPLE SUBSTATIONS
// ==========================================================

exports.updateProductUnits = async (
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
                        .findOne(
                            {
                                _id:
                                    productId,

                                isActive:
                                    true
                            }
                        )
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
                        .findOne(
                            {
                                _id:
                                    product.stock,

                                isActive:
                                    true
                            }
                        )
                        .session(
                            session
                        );

                if (!stock) {

                    throw new Error(
                        "The source stock for this Product was not found."
                    );
                }


                // ==================================================
                // VERIFY PRODUCT FIFO
                // ==================================================

                let productFifo =
                    assertProductFifo(
                        product
                    );

                product.fifoBatches =
                    productFifo;


                // ==================================================
                // VERIFY STOCK FIFO
                // ==================================================

                let stockFifo =
                    assertStockFifo(
                        stock
                    );

                stock.purchaseBatches =
                    stockFifo;


                // ==================================================
                // GET CURRENT TOTAL ACROSS ALL SUBSTATIONS
                // ==================================================

                const currentAllocationData =
                    await getCurrentProductAllocations(
                        product._id,
                        session
                    );

                const currentAllocatedUnits =
                    currentAllocationData.total;


                // ==================================================
                // PRODUCT TOTAL MUST MATCH SUBSTATION TOTAL
                // ==================================================

                const storedProductUnits =
                    number(
                        product.units
                    );

                if (
                    storedProductUnits !==
                    currentAllocatedUnits
                ) {

                    throw new Error(
                        `Product allocation is inconsistent. Product contains ${storedProductUnits} units, but all substations contain ${currentAllocatedUnits} units for this Product.`
                    );
                }


                // ==================================================
                // LOAD SUBSTATIONS BEING EDITED
                // ==================================================

                const substationIds =
                    allocations.map(
                        allocation =>
                            allocation.substationId
                    );

                const substations =
                    await Substation
                        .find(
                            {
                                _id: {
                                    $in:
                                        substationIds
                                },

                                isActive:
                                    true
                            }
                        )
                        .session(
                            session
                        );

                if (
                    substations.length !==
                    allocations.length
                ) {

                    throw new Error(
                        "One or more selected substations were not found or are inactive."
                    );
                }


                // ==================================================
                // CALCULATE OLD/NEW UNITS
                //
                // Only the total Product change controls FIFO.
                // ==================================================

                let newAllocatedUnits =
                    currentAllocatedUnits;


                for (
                    const allocation of allocations
                ) {

                    const substation =
                        substations.find(
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
                            "Substation not found."
                        );
                    }

                    const inventory =
                        Array.isArray(
                            substation.productInventory
                        )
                            ? substation.productInventory
                            : [];

                    const existingEntry =
                        inventory.find(
                            entry =>
                                String(
                                    entry.productId
                                ) ===
                                String(
                                    product._id
                                )
                        );

                    const oldUnits =
                        existingEntry
                            ? number(
                                existingEntry.units
                            )
                            : 0;

                    newAllocatedUnits =
                        newAllocatedUnits -
                        oldUnits +
                        allocation.units;
                }


                // ==================================================
                // FINAL PRODUCT DELTA
                // ==================================================

                const delta =
                    newAllocatedUnits -
                    currentAllocatedUnits;


                // ==================================================
                // APPLY FIFO
                // ==================================================

                if (
                    delta > 0
                ) {

                    // ----------------------------------------------
                    // More Product units are being allocated.
                    //
                    // Consume oldest Stock purchase batches.
                    // ----------------------------------------------

                    const productLayers =
                        consumeStockFifo(
                            stock,
                            delta
                        );

                    product.fifoBatches =
                        [
                            ...product.fifoBatches,
                            ...productLayers
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
                                        new Date(
                                            a.receivedAt
                                        ) -
                                        new Date(
                                            b.receivedAt
                                        )
                                    );
                                }
                            );

                    product.units =
                        productFifoUnits(
                            product.fifoBatches
                        );

                    product.buyPrice =
                        weightedAveragePrice(
                            product.fifoBatches
                        );
                }


                else if (
                    delta < 0
                ) {

                    // ----------------------------------------------
                    // Fewer Product units are allocated.
                    //
                    // Release Product FIFO layers back to Stock.
                    //
                    // Newest Product layers are released first.
                    // ----------------------------------------------

                    const quantityToReturn =
                        Math.abs(
                            delta
                        );

                    const returnedLayers =
                        releaseProductFifo(
                            product,
                            quantityToReturn
                        );

                    addReturnedStockLayers(
                        stock,
                        returnedLayers
                    );
                }


                else {

                    // ----------------------------------------------
                    // No Product quantity change.
                    //
                    // FIFO remains untouched.
                    // ----------------------------------------------

                    product.units =
                        newAllocatedUnits;

                    product.buyPrice =
                        weightedAveragePrice(
                            product.fifoBatches
                        );
                }


                // ==================================================
                // FINAL FIFO INVARIANTS
                // ==================================================

                const finalProductFifoUnits =
                    productFifoUnits(
                        product.fifoBatches
                    );

                if (
                    finalProductFifoUnits !==
                    newAllocatedUnits
                ) {

                    throw new Error(
                        `Product FIFO reconciliation failed. Expected ${newAllocatedUnits} units but FIFO contains ${finalProductFifoUnits}.`
                    );
                }

                product.units =
                    newAllocatedUnits;

                product.buyPrice =
                    weightedAveragePrice(
                        product.fifoBatches
                    );


                // ==================================================
                // FINAL STOCK FIFO INVARIANT
                // ==================================================

                const finalStockFifoUnits =
                    stockFifoUnits(
                        stock.purchaseBatches
                    );

                const finalStockUnits =
                    number(
                        stock.units
                    );

                if (
                    finalStockFifoUnits !==
                    finalStockUnits
                ) {

                    throw new Error(
                        `Stock FIFO reconciliation failed. Stock contains ${finalStockUnits} units but its purchase batches contain ${finalStockFifoUnits}.`
                    );
                }

                stock.units =
                    finalStockFifoUnits;

                stock.buyPrice =
                    stockWeightedAveragePrice(
                        stock.purchaseBatches
                    );


                // ==================================================
                // UPDATE ALL SUBSTATION ALLOCATIONS
                // ==================================================

                for (
                    const allocation of allocations
                ) {

                    const substation =
                        substations.find(
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
                            "Substation not found."
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

                    let inventory =
                        substation.productInventory;

                    let entry =
                        inventory.find(
                            item =>
                                String(
                                    item.productId
                                ) ===
                                String(
                                    product._id
                                )
                        );


                    // ----------------------------------------------
                    // Create allocation if it does not exist.
                    // ----------------------------------------------

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

                        inventory.push(
                            entry
                        );
                    }


                    // ----------------------------------------------
                    // Update existing allocation.
                    // ----------------------------------------------

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
                }


                // ==================================================
                // SAVE SUBSTATIONS
                // ==================================================

                for (
                    const substation of substations
                ) {

                    substation.updatedAt =
                        new Date();

                    await substation.save(
                        {
                            session
                        }
                    );
                }


                // ==================================================
                // UPDATE PRODUCT TIMESTAMP
                // ==================================================

                product.updatedAt =
                    new Date();


                // ==================================================
                // UPDATE STOCK TIMESTAMP
                // ==================================================

                stock.totalsUpdatedAt =
                    new Date();


                // ==================================================
                // SAVE PRODUCT
                // ==================================================

                await product.save(
                    {
                        session
                    }
                );


                // ==================================================
                // SAVE STOCK
                // ==================================================

                await stock.save(
                    {
                        session
                    }
                );


                // ==================================================
                // RECALCULATE STOCK TOTALS
                //
                // Uses FIFO purchase values instead of:
                //
                // units × buyPrice
                //
                // whenever purchase batches are available.
                // ==================================================

                const allStocks =
                    await Stock
                        .find(
                            {
                                isActive:
                                    true
                            }
                        )
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
                // FIRST PASS
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

                        // ------------------------------------------
                        // Legacy fallback for a Stock record that
                        // has no FIFO batches and zero units.
                        //
                        // We do not invent FIFO here.
                        // ------------------------------------------

                        value =
                            number(
                                item.units
                            ) *
                            number(
                                item.buyPrice
                            );
                    }


                    const category =
                        item.category || "";


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
                // SECOND PASS
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
                                        item.category || ""
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

                        substationIds:
                            allocations.map(
                                allocation =>
                                    allocation.substationId
                            ),

                        previousUnits:
                            currentAllocatedUnits,

                        units:
                            newAllocatedUnits,

                        delta,

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