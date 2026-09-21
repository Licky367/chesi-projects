// ==========================================================
// verrah/services/substationService/updateMultipleProductUnits.js
//
// UPDATE MULTIPLE PRODUCTS AT ONE SUBSTATION
//
// IMPORTANT:
//
// The substation inventory is the quantity being edited.
//
// Product.units is synchronized with the total quantity held
// across all substations.
//
// Product.fifoBatches represent FIFO cost layers for the
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
// allocation differs from the CURRENT allocation at the
// selected substation.
//
// This service updates MULTIPLE PRODUCTS belonging to ONE
// SUBSTATION in a single MongoDB transaction.
//
// Expected input:
//
// {
//     substationId: "...",
//
//     products: [
//         {
//             productId: "...",
//             units: 10
//         },
//
//         {
//             productId: "...",
//             units: 5
//         }
//     ]
// }
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
// The selected substation's current allocation is treated as
// the physical quantity already held there.
//
// No Stock movement occurs during reconciliation.
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

const fifoUnits =
    productFifoUnits(
        batches
    );


// ------------------------------------------------------
// ALREADY MATCHING
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
// FIFO HAS TOO FEW UNITS
//
// Create compatibility quantity using the Product's
// current buy price.
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
// FIFO HAS TOO MANY UNITS
//
// Trim newest layers.
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
// Newest Product FIFO layers are returned to Stock first.
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
// GET CURRENT PRODUCT ALLOCATION AT SUBSTATION
// ==========================================================

function getCurrentSubstationUnits(
substation,
productId
) {

const inventory =
    Array.isArray(
        substation.productInventory
    )
        ? substation.productInventory
        : [];


const entry =
    inventory.find(
        item =>
            String(
                item.productId
            ) ===
            String(
                productId
            )
    );


if (!entry) {

    return 0;

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
        `Invalid units found for Product ${productId} at this substation.`
    );

}


return units;

}

// ==========================================================
// NORMALIZE PRODUCT REQUEST
// ==========================================================

function normalizeProducts(
products
) {

if (
    !Array.isArray(
        products
    ) ||
    products.length === 0
) {

    throw new Error(
        "No products were supplied."
    );

}


const seen =
    new Set();


return products.map(
    item => {

        if (
            !mongoose.isValidObjectId(
                item.productId
            )
        ) {

            throw new Error(
                "Invalid product."
            );

        }


        const productId =
            String(
                item.productId
            );


        if (
            seen.has(
                productId
            )
        ) {

            throw new Error(
                "The same product was submitted more than once."
            );

        }


        seen.add(
            productId
        );


        const units =
            Number(
                item.units
            );


        if (
            !validUnits(
                units
            )
        ) {

            throw new Error(
                "Product units must be whole numbers greater than or equal to zero."
            );

        }


        return {
            productId:
                item.productId,

            units
        };

    }
);

}

// ==========================================================
// UPDATE MULTIPLE PRODUCTS
//
// ONE SUBSTATION
// ==========================================================

exports.updateMultipleProductUnits =
async (
substationId,
products
) => {

// ------------------------------------------------------
// VALIDATE SUBSTATION ID
// ------------------------------------------------------

if (
    !mongoose.isValidObjectId(
        substationId
    )
) {

    throw new Error(
        "Invalid substation."
    );

}


// ------------------------------------------------------
// NORMALIZE PRODUCTS
// ------------------------------------------------------

const requestedProducts =
    normalizeProducts(
        products
    );


// ------------------------------------------------------
// START TRANSACTION
// ------------------------------------------------------

const session =
    await mongoose.startSession();


try {

    let result;


    await session.withTransaction(
        async () => {

            // ==================================================
            // LOAD SUBSTATION
            // ==================================================

            const substation =
                await Substation
                    .findOne({
                        _id:
                            substationId,

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


            // ==================================================
            // PROCESS EACH PRODUCT
            // ==================================================

            const updatedProducts =
                [];


            for (
                const request
                of requestedProducts
            ) {

                // ----------------------------------------------
                // LOAD PRODUCT
                // ----------------------------------------------

                const product =
                    await Product
                        .findOne({
                            _id:
                                request.productId,

                            isActive:
                                true
                        })
                        .session(
                            session
                        );


                if (!product) {

                    throw new Error(
                        `Product ${request.productId} not found.`
                    );

                }


                // ----------------------------------------------
                // LOAD SOURCE STOCK
                // ----------------------------------------------

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
                        `The source stock for Product ${product.name} was not found.`
                    );

                }


                // ----------------------------------------------
                // CURRENT SUBSTATION ALLOCATION
                // ----------------------------------------------

                const currentUnits =
                    getCurrentSubstationUnits(
                        substation,
                        product._id
                    );


                // ----------------------------------------------
                // NEW SUBSTATION ALLOCATION
                // ----------------------------------------------

                const newUnits =
                    request.units;


                // ----------------------------------------------
                // REAL CHANGE
                //
                // Do NOT compare against Product.units.
                //
                // The selected substation's current physical
                // allocation is the source of truth.
                // ----------------------------------------------

                const delta =
                    newUnits -
                    currentUnits;


                // ----------------------------------------------
                // RECONCILE PRODUCT FIFO TO CURRENT TOTAL
                //
                // Before changing this product, determine its
                // actual quantity already distributed across
                // substations.
                // ----------------------------------------------

                const allSubstations =
                    await Substation
                        .find({
                            isActive:
                                true
                        })
                        .select(
                            "_id productInventory"
                        )
                        .session(
                            session
                        )
                        .lean();


                let currentTotal =
                    0;


                for (
                    const item
                    of allSubstations
                ) {

                    const inventory =
                        Array.isArray(
                            item.productInventory
                        )
                            ? item.productInventory
                            : [];


                    const entry =
                        inventory.find(
                            inventoryItem =>
                                String(
                                    inventoryItem.productId
                                ) ===
                                String(
                                    product._id
                                )
                        );


                    if (
                        entry
                    ) {

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
                                `Invalid units found for Product ${product.name}.`
                            );

                        }


                        currentTotal +=
                            units;

                    }

                }


                // ----------------------------------------------
                // REPAIR PRODUCT FIFO TO CURRENT PHYSICAL
                // ALLOCATION
                // ----------------------------------------------

                reconcileProductFifo(
                    product,
                    currentTotal
                );


                // ----------------------------------------------
                // ADD UNITS
                // ----------------------------------------------

                if (
                    delta > 0
                ) {

                    const addedLayers =
                        consumeStockFifo(
                            stock,
                            delta
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


                // ----------------------------------------------
                // REMOVE UNITS
                // ----------------------------------------------

                else if (
                    delta < 0
                ) {

                    const quantityToReturn =
                        Math.abs(
                            delta
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


                // ----------------------------------------------
                // UPDATE PRODUCT TOTAL
                // ----------------------------------------------

                const finalTotal =
                    currentTotal +
                    delta;


                product.units =
                    finalTotal;


                product.buyPrice =
                    productWeightedPrice(
                        product.fifoBatches
                    );


                // ----------------------------------------------
                // FIFO SAFETY CHECK
                // ----------------------------------------------

                const finalFifoUnits =
                    productFifoUnits(
                        product.fifoBatches
                    );


                if (
                    finalFifoUnits !==
                    finalTotal
                ) {

                    throw new Error(
                        `Product FIFO reconciliation failed for ${product.name}. Expected ${finalTotal} units but FIFO contains ${finalFifoUnits}.`
                    );

                }


                // ----------------------------------------------
                // UPDATE SUBSTATION INVENTORY
                // ----------------------------------------------

                let inventory =
                    Array.isArray(
                        substation.productInventory
                    )
                        ? substation.productInventory
                        : [];


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
                // CREATE INVENTORY ENTRY
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
                                newUnits,

                            updatedAt:
                                new Date()
                        };


                    substation.productInventory.push(
                        entry
                    );

                }


                // ----------------------------------------------
                // UPDATE INVENTORY ENTRY
                // ----------------------------------------------

                else {

                    entry.units =
                        newUnits;

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


                // ----------------------------------------------
                // SAVE PRODUCT
                // ----------------------------------------------

                product.updatedAt =
                    new Date();


                await product.save({
                    session
                });


                // ----------------------------------------------
                // SAVE STOCK
                // ----------------------------------------------

                stock.totalsUpdatedAt =
                    new Date();


                await stock.save({
                    session
                });


                // ----------------------------------------------
                // RESULT
                // ----------------------------------------------

                updatedProducts.push(
                    {
                        productId:
                            product._id,

                        productName:
                            product.name,

                        previousUnits:
                            currentUnits,

                        units:
                            newUnits,

                        delta,

                        productTotal:
                            finalTotal
                    }
                );

            }


            // ==================================================
            // SAVE SUBSTATION ONCE
            // ==================================================

            substation.updatedAt =
                new Date();


            await substation.save({
                session
            });


            // ==================================================
            // RECALCULATE STOCK TOTALS
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
            // CALCULATE STOCK VALUES
            // ==================================================

            for (
                const item
                of allStocks
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
                const item
                of allStocks
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
                    substationId,

                    updated:
                        updatedProducts.length,

                    products:
                        updatedProducts
                };

        }
    );


    return result;

}

finally {

    await session.endSession();

}

};