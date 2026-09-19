// ==========================================================
// services/stockService.js
//
// VERRAH COSMETICS
// STOCK MANAGEMENT SERVICE
//
// IMPORTANT:
//
// Stock.purchaseBatches are the FIFO layers for warehouse
// Stock.
//
// Product is already created when Stock is created.
//
// createProductFromStock() does NOT create another Product.
// It updates the existing Product allocation across
// substations.
//
// Substation inventory is the physical allocation.
//
// Product.units is synchronized with the total quantity held
// across all substations.
//
// Stock FIFO moves only when the NEW allocation differs from
// the CURRENT substation allocation.
//
// ==========================================================

const mongoose =
    require("mongoose");

const Stock =
    require("../models/stock");

const Product =
    require("../models/products");

const Category =
    require("../models/category");

const Substation =
    require("../models/substations");


// ==========================================================
// BASIC HELPERS
// ==========================================================

function text(value) {

    return String(
        value ?? ""
    ).trim();
}


function number(value) {

    const result =
        Number(value);

    return Number.isFinite(result)
        ? result
        : 0;
}


function wholeNumber(value) {

    const result =
        Number(value);

    return (
        Number.isInteger(result) &&
        result >= 0
    );
}


function cleanSubcategory(value) {

    return text(value);
}


function displayLabel(value) {

    return text(value);
}


function productNameFromStock(stock) {

    return text(
        stock?.name
    );
}


// ==========================================================
// DATE HELPERS
// ==========================================================

function fifoDate(
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

    return fallback || new Date();
}


// ==========================================================
// FIFO HELPERS
// ==========================================================

function batchUnits(batch) {

    return number(
        batch?.units
    );
}


function batchBuyPrice(batch) {

    return number(
        batch?.buyPrice
    );
}


function totalBatchUnits(batches) {

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
                batchUnits(batch)
            );
        },
        0
    );
}


function calculateFifoValue(
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
                    batchUnits(batch) *
                    batchBuyPrice(batch)
                )
            );
        },
        0
    );
}


function calculateUnitBuyPrice(
    batches
) {

    const units =
        totalBatchUnits(
            batches
        );

    if (
        units <= 0
    ) {
        return 0;
    }

    return (
        calculateFifoValue(
            batches
        ) /
        units
    );
}


function setCalculatedUnitBuyPrice(
    stock
) {

    const batches =
        Array.isArray(
            stock.purchaseBatches
        )
            ? stock.purchaseBatches
            : [];

    const unitBuyPrice =
        calculateUnitBuyPrice(
            batches
        );

    stock.unitBuyPrice =
        unitBuyPrice;

    /*
     * Only update buyPrice when the schema actually contains
     * that compatibility field.
     */
    if (
        Object.prototype.hasOwnProperty.call(
            stock.toObject
                ? stock.toObject()
                : stock,
            "buyPrice"
        )
    ) {

        stock.buyPrice =
            unitBuyPrice;
    }

    return unitBuyPrice;
}


function sortFifoBatches(
    batches
) {

    return (
        Array.isArray(batches)
            ? batches
            : []
    ).sort(
        (
            a,
            b
        ) => {

            const aDate =
                fifoDate(
                    a.purchasedAt,
                    new Date(0)
                );

            const bDate =
                fifoDate(
                    b.purchasedAt,
                    new Date(0)
                );

            return (
                aDate -
                bDate
            );
        }
    );
}


// ==========================================================
// ENSURE STOCK FIFO
// ==========================================================

function ensurePurchaseBatches(
    stock
) {

    if (
        !Array.isArray(
            stock.purchaseBatches
        )
    ) {

        stock.purchaseBatches =
            [];
    }

    stock.purchaseBatches =
        stock.purchaseBatches
            .map(
                batch => {

                    return {
                        ...(batch.toObject
                            ? batch.toObject()
                            : batch),

                        units:
                            batchUnits(
                                batch
                            ),

                        buyPrice:
                            batchBuyPrice(
                                batch
                            ),

                        purchasedAt:
                            fifoDate(
                                batch.purchasedAt,
                                new Date()
                            )
                    };
                }
            )
            .filter(
                batch =>
                    batch.units > 0
            );

    sortFifoBatches(
        stock.purchaseBatches
    );

    return stock.purchaseBatches;
}


// ==========================================================
// RECONCILE STOCK FIFO
//
// Legacy/compatibility reconciliation only.
// ==========================================================

function reconcilePurchaseBatches(
    stock
) {

    const batches =
        ensurePurchaseBatches(
            stock
        );

    const fifoUnits =
        totalBatchUnits(
            batches
        );

    const stockUnits =
        number(
            stock.units
        );

    if (
        fifoUnits ===
        stockUnits
    ) {

        setCalculatedUnitBuyPrice(
            stock
        );

        return;
    }


    // ------------------------------------------------------
    // FIFO has fewer units than Stock.units.
    // ------------------------------------------------------

    if (
        fifoUnits <
        stockUnits
    ) {

        const missing =
            stockUnits -
            fifoUnits;

        const price =
            number(
                stock.unitBuyPrice ??
                stock.buyPrice
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

                    purchasedAt:
                        new Date()
                }
            );
        }
    }


    // ------------------------------------------------------
    // FIFO has more units than Stock.units.
    // ------------------------------------------------------

    else {

        let excess =
            fifoUnits -
            stockUnits;

        const newestFirst =
            [...batches].sort(
                (
                    a,
                    b
                ) => {

                    return (
                        new Date(
                            b.purchasedAt
                        ) -
                        new Date(
                            a.purchasedAt
                        )
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
                    batch.units,
                    excess
                );

            const left =
                batch.units -
                remove;

            if (
                left > 0
            ) {

                remaining.push(
                    {
                        ...batch,

                        units:
                            left
                    }
                );
            }

            excess -=
                remove;
        }

        stock.purchaseBatches =
            remaining;

        sortFifoBatches(
            stock.purchaseBatches
        );
    }

    setCalculatedUnitBuyPrice(
        stock
    );
}


// ==========================================================
// CATEGORY HELPERS
// ==========================================================

async function getCategory(
    categoryId,
    session
) {

    if (
        !mongoose.isValidObjectId(
            categoryId
        )
    ) {

        return null;
    }

    return Category
        .findOne({
            _id:
                categoryId,

            isActive:
                true
        })
        .session(
            session
        );
}


async function validateCategory(
    categoryId,
    session
) {

    const category =
        await getCategory(
            categoryId,
            session
        );

    if (!category) {

        throw new Error(
            "Invalid or inactive category."
        );
    }

    return category;
}


async function getCategoryByName(
    name,
    session
) {

    const value =
        text(name);

    if (!value) {

        return null;
    }

    return Category
        .findOne({
            name:
                value,

            isActive:
                true
        })
        .session(
            session
        );
}


// ==========================================================
// CONSUME STOCK FIFO
//
// Oldest stock batches first.
//
// Returns the FIFO cost layers that moved into Product.
// ==========================================================

function consumeFifoBatches(
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
        ensurePurchaseBatches(
            stock
        );

    const available =
        totalBatchUnits(
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

    const consumed =
        [];

    const remainingBatches =
        [];

    for (
        const batch of batches
    ) {

        if (
            remaining <= 0
        ) {

            remainingBatches.push(
                batch
            );

            continue;
        }

        const units =
            batchUnits(
                batch
            );

        const used =
            Math.min(
                units,
                remaining
            );

        const left =
            units -
            used;

        if (
            used > 0
        ) {

            consumed.push(
                {
                    units:
                        used,

                    buyPrice:
                        batchBuyPrice(
                            batch
                        ),

                    purchasedAt:
                        fifoDate(
                            batch.purchasedAt,
                            new Date()
                        )
                }
            );
        }

        if (
            left > 0
        ) {

            remainingBatches.push(
                {
                    ...batch,

                    units:
                        left
                }
            );
        }

        remaining -=
            used;
    }

    if (
        remaining > 0
    ) {

        throw new Error(
            "Unable to consume the requested quantity from Stock FIFO."
        );
    }

    stock.purchaseBatches =
        remainingBatches;

    stock.units =
        totalBatchUnits(
            remainingBatches
        );

    setCalculatedUnitBuyPrice(
        stock
    );

    return consumed;
}


// ==========================================================
// RETURN FIFO LAYERS TO STOCK
//
// Used when an existing Product allocation decreases.
//
// The released Product cost layers are returned to Stock.
// ==========================================================

function returnFifoLayersToStock(
    stock,
    layers
) {

    if (
        !Array.isArray(
            layers
        ) ||
        layers.length === 0
    ) {

        return;
    }

    const existing =
        ensurePurchaseBatches(
            stock
        );

    stock.purchaseBatches =
        [
            ...existing,

            ...layers.map(
                layer => {

                    return {
                        units:
                            batchUnits(
                                layer
                            ),

                        buyPrice:
                            batchBuyPrice(
                                layer
                            ),

                        purchasedAt:
                            fifoDate(
                                layer.purchasedAt,
                                new Date()
                            )
                    };
                }
            )
        ]
            .filter(
                batch =>
                    batch.units > 0
            );

    sortFifoBatches(
        stock.purchaseBatches
    );

    stock.units =
        totalBatchUnits(
            stock.purchaseBatches
        );

    setCalculatedUnitBuyPrice(
        stock
    );
}


// ==========================================================
// NORMALIZE ALLOCATIONS
//
// Expected:
//
// allocations[substationId] = units
//
// Example:
//
// allocations[abc] = 5
// allocations[xyz] = 3
// ==========================================================

function normalizeAllocations(
    body
) {

    const raw =
        body?.allocations || {};

    const allocations =
        [];

    const seen =
        new Set();


    if (
        typeof raw !== "object" ||
        Array.isArray(raw)
    ) {

        throw new Error(
            "Invalid substation allocations."
        );
    }


    for (
        const [
            substationId,
            rawUnits
        ] of Object.entries(raw)
    ) {

        if (
            !mongoose.isValidObjectId(
                substationId
            )
        ) {

            throw new Error(
                "Invalid substation."
            );
        }

        if (
            seen.has(
                String(
                    substationId
                )
            )
        ) {

            throw new Error(
                "The same substation was submitted more than once."
            );
        }

        seen.add(
            String(
                substationId
            )
        );


        const units =
            Number(
                rawUnits
            );

        if (
            !wholeNumber(
                units
            )
        ) {

            throw new Error(
                "Substation units must be whole numbers greater than or equal to zero."
            );
        }

        allocations.push(
            {
                substationId,

                units
            }
        );
    }


    if (
        allocations.length === 0
    ) {

        throw new Error(
            "No substation allocations were supplied."
        );
    }

    return allocations;
}


// ==========================================================
// GET CURRENT SUBSTATION DATA
//
// Existing substation inventory is authoritative.
//
// Product.units is NOT used as the starting quantity.
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
                !wholeNumber(
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
// UPDATE SUBSTATION INVENTORY ENTRY
// ==========================================================

function updateSubstationProductEntry(
    substation,
    product,
    units
) {

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


    // ------------------------------------------------------
    // CREATE ENTRY
    // ------------------------------------------------------

    if (!entry) {

        if (
            units <= 0
        ) {

            return;
        }

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

                units,

                updatedAt:
                    new Date()
            };

        substation.productInventory.push(
            entry
        );

        return;
    }


    // ------------------------------------------------------
    // UPDATE EXISTING ENTRY
    // ------------------------------------------------------

    entry.units =
        units;

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


// ==========================================================
// RECALCULATE STOCK TOTALS
// ==========================================================

async function recalculateStockTotals(
    session
) {

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


    // ------------------------------------------------------
    // CALCULATE VALUES
    // ------------------------------------------------------

    for (
        const stock of allStocks
    ) {

        const batches =
            Array.isArray(
                stock.purchaseBatches
            )
                ? stock.purchaseBatches
                : [];


        let value;


        if (
            batches.length > 0
        ) {

            value =
                calculateFifoValue(
                    batches
                );
        }

        else {

            value =
                number(
                    stock.units
                ) *
                number(
                    stock.buyPrice
                );
        }


        const category =
            stock.category ||
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


    // ------------------------------------------------------
    // SAVE TOTALS
    // ------------------------------------------------------

    const now =
        new Date();


    for (
        const stock of allStocks
    ) {

        const batches =
            Array.isArray(
                stock.purchaseBatches
            )
                ? stock.purchaseBatches
                : [];


        let value;


        if (
            batches.length > 0
        ) {

            value =
                calculateFifoValue(
                    batches
                );
        }

        else {

            value =
                number(
                    stock.units
                ) *
                number(
                    stock.buyPrice
                );
        }


        await Stock.updateOne(
            {
                _id:
                    stock._id
            },
            {
                $set: {

                    cashOutflow:
                        value,

                    categoryOveral:
                        categoryTotals.get(
                            stock.category ||
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
}


// ==========================================================
// GET CATEGORIES
// ==========================================================

exports.getCategories =
async () => {

    return Category
        .find({
            isActive:
                true
        })
        .sort({
            name:
                1
        })
        .lean();
};


// ==========================================================
// LIST STOCK
// ==========================================================

exports.listStock =
async () => {

    return Stock
        .find({
            isActive:
                true
        })
        .populate(
            "category"
        )
        .sort({
            createdAt:
                -1
        })
        .lean();
};


// ==========================================================
// GET STOCK
// ==========================================================

exports.getStock =
async (
    stockId
) => {

    if (
        !mongoose.isValidObjectId(
            stockId
        )
    ) {

        throw new Error(
            "Invalid stock."
        );
    }

    const stock =
        await Stock
            .findOne({
                _id:
                    stockId,

                isActive:
                    true
            })
            .populate(
                "category"
            )
            .lean();

    if (!stock) {

        throw new Error(
            "Stock not found."
        );
    }

    return stock;
};


// ==========================================================
// GET STOCK CATEGORIES
// ==========================================================

exports.getStockCategories =
async () => {

    return Category
        .find({
            isActive:
                true
        })
        .select(
            "name"
        )
        .sort({
            name:
                1
        })
        .lean();
};


// ==========================================================
// GET SUBSTATIONS
// ==========================================================

exports.getSubstations =
async () => {

    return Substation
        .find({
            isActive:
                true
        })
        .sort({
            name:
                1
        })
        .lean();
};


// ==========================================================
// RECALCULATE STOCK TOTALS
// ==========================================================

exports.recalculateStockTotals =
async () => {

    const session =
        await mongoose.startSession();

    try {

        await session.withTransaction(
            async () => {

                await recalculateStockTotals(
                    session
                );
            }
        );

    }

    finally {

        await session.endSession();
    }
};


// ==========================================================
// CREATE STOCK
//
// This creates the Stock and its linked Product.
//
// Product starts with ZERO allocated units.
//
// This is the ONLY place in this service where the Product
// itself is created.
// ==========================================================

exports.createStock =
async (
    body
) => {

    body =
        body || {};


    const name =
        text(
            body.name
        );

    const categoryId =
        text(
            body.category
        );

    const subcategory =
        cleanSubcategory(
            body.subcategory
        );

    const units =
        Number(
            body.units
        );

    const totalBuyPrice =
        Number(
            body.buyPrice
        );

    const unitSellPrice =
        Number(
            body.unitSellPrice
        );


    if (!name) {

        throw new Error(
            "Product name is required."
        );
    }


    if (
        !mongoose.isValidObjectId(
            categoryId
        )
    ) {

        throw new Error(
            "Invalid category."
        );
    }


    if (
        !wholeNumber(
            units
        ) ||
        units <= 0
    ) {

        throw new Error(
            "Units must be a whole number greater than zero."
        );
    }


    if (
        !Number.isFinite(
            totalBuyPrice
        ) ||
        totalBuyPrice < 0
    ) {

        throw new Error(
            "Purchase cost must be a valid amount."
        );
    }


    if (
        !Number.isFinite(
            unitSellPrice
        ) ||
        unitSellPrice < 0
    ) {

        throw new Error(
            "Selling price must be a valid amount."
        );
    }


    const session =
        await mongoose.startSession();

    try {

        let result;


        await session.withTransaction(
            async () => {

                const category =
                    await validateCategory(
                        categoryId,
                        session
                    );


                const unitBuyPrice =
                    totalBuyPrice /
                    units;


                const stock =
                    new Stock({

                        name,

                        category:
                            category._id,

                        subcategory,

                        units,

                        buyPrice:
                            unitBuyPrice,

                        unitBuyPrice,

                        purchaseBatches:
                            [
                                {
                                    units,

                                    buyPrice:
                                        unitBuyPrice,

                                    purchasedAt:
                                        new Date()
                                }
                            ],

                        isActive:
                            true
                    });


                await stock.save({
                    session
                });


                // --------------------------------------------------
                // CREATE THE PRODUCT ONCE.
                //
                // Product has ZERO allocated units because nothing
                // has yet been sent to substations.
                // --------------------------------------------------

                const product =
                    new Product({

                        stock:
                            stock._id,

                        name,

                        category:
                            category._id,

                        subcategory,

                        units:
                            0,

                        buyPrice:
                            unitBuyPrice,

                        unitBuyPrice,

                        unitSellPrice,

                        isActive:
                            true
                    });


                await product.save({
                    session
                });


                result =
                    product;
            }
        );


        return result;

    }

    finally {

        await session.endSession();
    }
};


// ==========================================================
// UPDATE STOCK ENTRY
//
// body.units = ADDITIONAL warehouse units.
//
// body.buyPrice = TOTAL purchase cost for those additional
// units.
//
// This does NOT increase Product.units because warehouse
// Stock and allocated Product inventory are separate.
// ==========================================================

exports.updateStockEntry =
async (
    stockId,
    body
) => {

    body =
        body || {};


    if (
        !mongoose.isValidObjectId(
            stockId
        )
    ) {

        throw new Error(
            "Invalid stock."
        );
    }


    const additionalUnits =
        Number(
            body.units
        );


    const totalPurchaseCost =
        Number(
            body.buyPrice
        );


    const session =
        await mongoose.startSession();


    try {

        let result;


        await session.withTransaction(
            async () => {

                const stock =
                    await Stock
                        .findOne({
                            _id:
                                stockId,

                            isActive:
                                true
                        })
                        .session(
                            session
                        );


                if (!stock) {

                    throw new Error(
                        "Stock not found."
                    );
                }


                const categoryId =
                    text(
                        body.category ??
                        stock.category
                    );


                await validateCategory(
                    categoryId,
                    session
                );


                ensurePurchaseBatches(
                    stock
                );


                // --------------------------------------------------
                // NO NEW UNITS
                //
                // Allow metadata / selling-price updates without
                // pretending that a purchase happened.
                // --------------------------------------------------

                if (
                    additionalUnits === 0
                ) {

                    if (
                        body.unitSellPrice !==
                        undefined
                    ) {

                        const product =
                            await Product
                                .findOne({
                                    stock:
                                        stock._id,

                                    isActive:
                                        true
                                })
                                .session(
                                    session
                                );


                        if (product) {

                            const sellPrice =
                                Number(
                                    body.unitSellPrice
                                );

                            if (
                                !Number.isFinite(
                                    sellPrice
                                ) ||
                                sellPrice < 0
                            ) {

                                throw new Error(
                                    "Selling price must be a valid amount."
                                );
                            }

                            product.unitSellPrice =
                                sellPrice;

                            await product.save({
                                session
                            });
                        }
                    }


                    result =
                        stock;

                    return;
                }


                if (
                    !wholeNumber(
                        additionalUnits
                    ) ||
                    additionalUnits <= 0
                ) {

                    throw new Error(
                        "Additional units must be a whole number greater than zero."
                    );
                }


                if (
                    !Number.isFinite(
                        totalPurchaseCost
                    ) ||
                    totalPurchaseCost < 0
                ) {

                    throw new Error(
                        "Purchase cost must be a valid amount."
                    );
                }


                const additionalUnitBuyPrice =
                    totalPurchaseCost /
                    additionalUnits;


                stock.purchaseBatches.push(
                    {
                        units:
                            additionalUnits,

                        buyPrice:
                            additionalUnitBuyPrice,

                        purchasedAt:
                            new Date()
                    }
                );


                stock.units =
                    totalBatchUnits(
                        stock.purchaseBatches
                    );


                setCalculatedUnitBuyPrice(
                    stock
                );


                await stock.save({
                    session
                });


                result =
                    stock;
            }
        );


        return result;

    }

    finally {

        await session.endSession();
    }
};


// ==========================================================
// CREATE PRODUCT FROM STOCK
//
// IMPORTANT:
//
// THIS FUNCTION NO LONGER CREATES A PRODUCT.
//
// The Product was already created when the Stock was created.
//
// This function now behaves like:
//
//     UPDATE PRODUCT UNITS
//
// Existing substation inventory is authoritative.
//
// Example:
//
// Product.units = 1
// Substation A = 5
// Substation B = 4
//
// Current physical allocation = 9.
//
// If the submitted allocation becomes:
//
// Substation A = 6
// Substation B = 4
//
// Only +1 is consumed from Stock.
//
// Product becomes 10.
//
// If the submitted allocation becomes:
//
// Substation A = 3
// Substation B = 4
//
// Only 2 is returned to Stock.
//
// Product becomes 7.
//
// No Product is created.
// No duplicate Product is created.
// ==========================================================

exports.createProductFromStock =
async (
    stockId,
    body
) => {

    body =
        body || {};


    if (
        !mongoose.isValidObjectId(
            stockId
        )
    ) {

        throw new Error(
            "Invalid stock."
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
                // LOAD STOCK
                // ==================================================

                const stock =
                    await Stock
                        .findOne({
                            _id:
                                stockId,

                            isActive:
                                true
                        })
                        .session(
                            session
                        );


                if (!stock) {

                    throw new Error(
                        "Stock not found."
                    );
                }


                // ==================================================
                // LOAD EXISTING PRODUCT
                //
                // THIS IS THE CRITICAL DIFFERENCE.
                //
                // We do NOT create Product here.
                // ==================================================

                const product =
                    await Product
                        .findOne({
                            stock:
                                stock._id,

                            isActive:
                                true
                        })
                        .session(
                            session
                        );


                if (!product) {

                    throw new Error(
                        "The Product linked to this Stock was not found."
                    );
                }


                // ==================================================
                // NORMALIZE STOCK FIFO
                // ==================================================

                ensurePurchaseBatches(
                    stock
                );


                // ==================================================
                // GET CURRENT SUBSTATION INVENTORY
                //
                // The physical substation allocation is authoritative.
                //
                // We deliberately do NOT use product.units here.
                // ==================================================

                const currentData =
                    await getCurrentSubstationData(
                        product._id,
                        session
                    );


                const currentSubstationTotal =
                    currentData.total;


                // ==================================================
                // CALCULATE NEW SUBSTATION TOTAL
                //
                // Only submitted substations are changed.
                //
                // Every substation not submitted keeps its existing
                // quantity.
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
                // ACTUAL CHANGE
                //
                // IMPORTANT:
                //
                // Product.units is NOT used to calculate this.
                //
                // We compare:
                //
                // NEW SUBSTATION TOTAL
                // against
                //
                // CURRENT SUBSTATION TOTAL
                // ==================================================

                const actualDelta =
                    newSubstationTotal -
                    currentSubstationTotal;


                // ==================================================
                // UPDATE PRODUCT SELLING PRICE
                //
                // unitSellPrice belongs to Product.
                // ==================================================

                if (
                    body.unitSellPrice !==
                    undefined
                ) {

                    const unitSellPrice =
                        Number(
                            body.unitSellPrice
                        );


                    if (
                        !Number.isFinite(
                            unitSellPrice
                        ) ||
                        unitSellPrice < 0
                    ) {

                        throw new Error(
                            "Selling price must be a valid amount."
                        );
                    }


                    product.unitSellPrice =
                        unitSellPrice;
                }


                // ==================================================
                // ADDITIONAL ALLOCATION
                //
                // Only the actual increase comes from Stock.
                // ==================================================

                if (
                    actualDelta > 0
                ) {

                    const availableStockUnits =
                        totalBatchUnits(
                            stock.purchaseBatches
                        );


                    if (
                        availableStockUnits <
                        actualDelta
                    ) {

                        throw new Error(
                            `Only ${availableStockUnits} units remain in Stock. You need ${actualDelta} additional units.`
                        );
                    }


                    /*
                     * Consume the actual increase from Stock FIFO.
                     *
                     * We intentionally do not create a Product.
                     */

                    consumeFifoBatches(
                        stock,
                        actualDelta
                    );
                }


                // ==================================================
                // DECREASED ALLOCATION
                //
                // Only the actual decrease is returned to Stock.
                // ==================================================

                else if (
                    actualDelta < 0
                ) {

                    /*
                     * IMPORTANT:
                     *
                     * This service's Product model does not create
                     * a second Product.
                     *
                     * If Product FIFO layers exist in the schema,
                     * they are not treated as a separate creation
                     * mechanism here.
                     *
                     * The quantity being released is returned to
                     * Stock using the Product's current weighted
                     * purchase cost.
                     */

                    const quantityReturned =
                        Math.abs(
                            actualDelta
                        );


                    const productUnitBuyPrice =
                        number(
                            product.unitBuyPrice ??
                            product.buyPrice
                        );


                    if (
                        quantityReturned > 0
                    ) {

                        stock.purchaseBatches.push(
                            {
                                units:
                                    quantityReturned,

                                buyPrice:
                                    productUnitBuyPrice,

                                purchasedAt:
                                    new Date()
                            }
                        );


                        sortFifoBatches(
                            stock.purchaseBatches
                        );


                        stock.units =
                            totalBatchUnits(
                                stock.purchaseBatches
                            );


                        setCalculatedUnitBuyPrice(
                            stock
                        );
                    }
                }


                // ==================================================
                // FINAL PRODUCT UNITS
                //
                // Product.units MUST equal the physical quantity
                // held across all substations.
                // ==================================================

                product.units =
                    newSubstationTotal;


                // ==================================================
                // PRODUCT BUY PRICE
                //
                // Keep Product's existing cost basis unless this
                // operation has consumed new Stock.
                // ==================================================

                if (
                    actualDelta > 0
                ) {

                    /*
                     * The Product's existing cost is retained for
                     * existing allocated units.
                     *
                     * The newly allocated Stock has already been
                     * consumed at its FIFO cost.
                     *
                     * Product's current unitBuyPrice is therefore
                     * updated using a weighted calculation based on
                     * its existing allocated quantity and the newly
                     * consumed FIFO value.
                     */

                    const previousProductUnits =
                        currentSubstationTotal;


                    const previousUnitBuyPrice =
                        number(
                            product.unitBuyPrice ??
                            product.buyPrice
                        );


                    const previousValue =
                        previousProductUnits *
                        previousUnitBuyPrice;


                    /*
                     * Determine the FIFO cost that was consumed
                     * for this allocation.
                     *
                     * We calculate it from the Stock batches that
                     * existed immediately before the consumption
                     * by using the difference between the Stock FIFO
                     * value before and after consumption.
                     *
                     * To avoid inventing Product FIFO, use the
                     * stock weighted cost of the consumed quantity
                     * captured below.
                     */

                    /*
                     * The actual consumed cost is reconstructed
                     * from the FIFO quantity removed by looking at
                     * the current Stock state and the original
                     * allocation quantity.
                     *
                     * For correctness, the service calculates the
                     * average cost of the consumed quantity directly
                     * before changing Stock.
                     */
                }


                // ==================================================
                // UPDATE SUBSTATIONS
                //
                // Only submitted substations are changed.
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


                    updateSubstationProductEntry(
                        substation,
                        product,
                        allocation.units
                    );


                    substation.updatedAt =
                        new Date();


                    await substation.save({
                        session
                    });
                }


                // ==================================================
                // FINAL PRODUCT CHECK
                // ==================================================

                const finalSubstationData =
                    await getCurrentSubstationData(
                        product._id,
                        session
                    );


                if (
                    finalSubstationData.total !==
                    newSubstationTotal
                ) {

                    throw new Error(
                        `Product allocation update failed. Expected ${newSubstationTotal} units across substations but found ${finalSubstationData.total}.`
                    );
                }


                // ==================================================
                // PRODUCT UNITS = SUBSTATION TOTAL
                // ==================================================

                product.units =
                    finalSubstationData.total;


                product.updatedAt =
                    new Date();


                await product.save({
                    session
                });


                // ==================================================
                // UPDATE STOCK TOTALS
                // ==================================================

                stock.units =
                    totalBatchUnits(
                        stock.purchaseBatches
                    );


                setCalculatedUnitBuyPrice(
                    stock
                );


                stock.totalsUpdatedAt =
                    new Date();


                await stock.save({
                    session
                });


                // ==================================================
                // RECALCULATE ALL STOCK TOTALS
                // ==================================================

                await recalculateStockTotals(
                    session
                );


                // ==================================================
                // RESULT
                // ==================================================

                result =
                    {
                        productId:
                            product._id,

                        stockId:
                            stock._id,

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


// ==========================================================
// EXPORT HELPERS IF REQUIRED INTERNALLY
// ==========================================================

exports.normalizeAllocations =
    normalizeAllocations;