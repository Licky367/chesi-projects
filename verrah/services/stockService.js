// ==========================================================
// services/stockService.js
// STOCK SERVICE
//
// VERRAH COSMETICS
// FIFO STOCK MANAGEMENT
//
// ARCHITECTURE:
//
// STOCK
//   units
//   purchaseBatches[]
//        |
//        | FIFO consumption
//        v
// PRODUCT
//   units
//   fifoBatches[]
//   buyPrice / unitBuyPrice
//   unitSellPrice
//        |
//        | dispatch
//        v
// SUBSTATION
//   productInventory[]
//
// IMPORTANT:
//
// - Stock.purchaseBatches is the warehouse FIFO.
// - Product.fifoBatches is the allocated-product FIFO.
// - Product.units MUST equal SUM(Product.fifoBatches.units).
// - Product.units MUST equal SUM(all substation allocations).
// - Stock.units MUST equal SUM(Stock.purchaseBatches.units).
// - unitBuyPrice is ALWAYS calculated by the backend.
// - Client-supplied unitBuyPrice is ignored.
// - Stock creation does NOT touch substations.
// - Stock edit adds a NEW FIFO purchase batch.
// - During stock edit, body.units means ADDITIONAL units.
// - During stock edit, body.buyPrice is the TOTAL purchase
//   cost for those additional units.
// - Product.unitSellPrice belongs to Product.
// - Substation allocation values are ADDITIONAL units.
// - Multiple substations can be allocated in one operation.
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
// HELPERS
// ==========================================================

const text = (value) =>
    String(value ?? "").trim();


const cleanSubcategory = (value) =>
    text(value).replace(
        /\s+/g,
        " "
    );


const displayLabel = (value) =>
    text(value)
        .replace(
            /[-_]+/g,
            " "
        )
        .replace(
            /\b\w/g,
            (c) => c.toUpperCase()
        );


// ==========================================================
// PRODUCT NAME
// ==========================================================

function productNameFromStock(stock) {

    const stockName =
        text(stock?.name);

    if (stockName) {
        return stockName;
    }

    return cleanSubcategory(
        stock?.subcategory
    );
}


// ==========================================================
// FIFO DATE
// ==========================================================

function fifoDate(value) {

    const date =
        value instanceof Date
            ? value
            : new Date(
                value ||
                Date.now()
            );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return new Date();
    }

    return date;
}


// ==========================================================
// NUMBER
// ==========================================================

function number(
    value,
    label,
    required = false
) {

    if (
        value === "" ||
        value == null
    ) {

        if (!required) {
            return 0;
        }

        throw new Error(
            `${label} is required.`
        );
    }

    const result =
        Number(value);

    if (
        !Number.isFinite(result) ||
        result < 0
    ) {

        throw new Error(
            `${label} must be zero or greater.`
        );
    }

    return result;
}


// ==========================================================
// WHOLE NUMBER
// ==========================================================

function wholeNumber(
    value,
    label,
    required = false
) {

    const result =
        number(
            value,
            label,
            required
        );

    if (
        !Number.isInteger(result)
    ) {

        throw new Error(
            `${label} must be a whole number.`
        );
    }

    return result;
}


// ==========================================================
// FIFO BATCH UNITS
// ==========================================================

function batchUnits(batch) {

    return wholeNumber(
        batch?.units ?? 0,
        "FIFO batch units"
    );
}


// ==========================================================
// FIFO BATCH UNIT BUY PRICE
// ==========================================================
//
// purchaseBatches.buyPrice is a PER-UNIT purchase cost.
//
// body.buyPrice from create/edit forms is the TOTAL
// purchase cost for the quantity being added.
//
// The service converts:
//
// total purchase cost / units
//
// into the FIFO batch's per-unit buy price.
// ==========================================================

function batchBuyPrice(batch) {

    return number(
        batch?.buyPrice ?? 0,
        "FIFO batch buy price"
    );
}


// ==========================================================
// TOTAL FIFO UNITS
// ==========================================================

function totalBatchUnits(stock) {

    const batches =
        Array.isArray(
            stock?.purchaseBatches
        )
            ? stock.purchaseBatches
            : [];

    return batches.reduce(
        (total, batch) =>
            total +
            batchUnits(batch),
        0
    );
}


// ==========================================================
// FIFO STOCK VALUE
// ==========================================================

function calculateFifoValue(stock) {

    const batches =
        Array.isArray(
            stock?.purchaseBatches
        )
            ? stock.purchaseBatches
            : [];

    return batches.reduce(
        (total, batch) => {

            const units =
                batchUnits(batch);

            const buyPrice =
                batchBuyPrice(batch);

            return (
                total +
                units *
                buyPrice
            );

        },
        0
    );
}


// ==========================================================
// CALCULATE STOCK UNIT BUY PRICE
// ==========================================================

function calculateUnitBuyPrice(stock) {

    const units =
        totalBatchUnits(
            stock
        );

    if (
        units <= 0
    ) {
        return 0;
    }

    const value =
        calculateFifoValue(
            stock
        );

    const result =
        value /
        units;

    if (
        !Number.isFinite(result) ||
        result < 0
    ) {

        throw new Error(
            "Unable to calculate the unit buy price from FIFO stock."
        );
    }

    return result;
}


// ==========================================================
// SET STOCK UNIT BUY PRICE
// ==========================================================

function setCalculatedUnitBuyPrice(stock) {

    const unitBuyPrice =
        calculateUnitBuyPrice(
            stock
        );

    stock.unitBuyPrice =
        unitBuyPrice;

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


// ==========================================================
// SORT STOCK FIFO
// ==========================================================

function sortFifoBatches(
    batches
) {

    return [...batches].sort(
        (a, b) => {

            const aDate =
                fifoDate(
                    a?.purchasedAt ||
                    a?.createdAt
                ).getTime();

            const bDate =
                fifoDate(
                    b?.purchasedAt ||
                    b?.createdAt
                ).getTime();

            return (
                aDate -
                bDate
            );
        }
    );
}


// ==========================================================
// ENSURE FIFO PURCHASE BATCHES
// ==========================================================

async function ensurePurchaseBatches(
    stock,
    session = null
) {

    if (
        Array.isArray(
            stock.purchaseBatches
        ) &&
        stock.purchaseBatches.length > 0
    ) {

        setCalculatedUnitBuyPrice(
            stock
        );

        return stock.purchaseBatches;
    }

    const units =
        wholeNumber(
            stock.units || 0,
            "Warehouse units"
        );

    if (
        units <= 0
    ) {

        stock.purchaseBatches =
            [];

        stock.unitBuyPrice =
            0;

        if (
            Object.prototype.hasOwnProperty.call(
                stock.toObject
                    ? stock.toObject()
                    : stock,
                "buyPrice"
            )
        ) {

            stock.buyPrice =
                0;
        }

        await stock.save({
            session
        });

        return stock.purchaseBatches;
    }

    const legacyUnitBuyPrice =
        number(
            stock.buyPrice ??
            stock.unitBuyPrice ??
            0,
            "Buy price"
        );

    stock.purchaseBatches = [
        {
            units,

            buyPrice:
                legacyUnitBuyPrice,

            purchasedAt:
                fifoDate(
                    stock.createdAt
                )
        }
    ];

    setCalculatedUnitBuyPrice(
        stock
    );

    await stock.save({
        session
    });

    return stock.purchaseBatches;
}


// ==========================================================
// RECONCILE STOCK FIFO
// ==========================================================

async function reconcilePurchaseBatches(
    stock,
    session = null
) {

    await ensurePurchaseBatches(
        stock,
        session
    );

    const expectedUnits =
        wholeNumber(
            stock.units || 0,
            "Warehouse units"
        );

    let batches =
        Array.isArray(
            stock.purchaseBatches
        )
            ? stock.purchaseBatches
            : [];

    batches =
        sortFifoBatches(
            batches
        );

    let batchTotal =
        batches.reduce(
            (sum, batch) =>
                sum +
                batchUnits(batch),
            0
        );

    // ------------------------------------------------------
    // ZERO STOCK
    // ------------------------------------------------------

    if (
        expectedUnits === 0
    ) {

        stock.purchaseBatches =
            [];

        stock.unitBuyPrice =
            0;

        if (
            Object.prototype.hasOwnProperty.call(
                stock.toObject
                    ? stock.toObject()
                    : stock,
                "buyPrice"
            )
        ) {

            stock.buyPrice =
                0;
        }

        await stock.save({
            session
        });

        return stock.purchaseBatches;
    }

    // ------------------------------------------------------
    // BATCHES MATCH
    // ------------------------------------------------------

    if (
        batchTotal ===
        expectedUnits
    ) {

        stock.purchaseBatches =
            batches;

        setCalculatedUnitBuyPrice(
            stock
        );

        await stock.save({
            session
        });

        return stock.purchaseBatches;
    }

    // ------------------------------------------------------
    // FIFO HAS MORE UNITS THAN STOCK
    // ------------------------------------------------------

    if (
        batchTotal >
        expectedUnits
    ) {

        let excess =
            batchTotal -
            expectedUnits;

        for (
            const batch of batches
        ) {

            if (
                excess <= 0
            ) {
                break;
            }

            const available =
                batchUnits(
                    batch
                );

            if (
                available <= 0
            ) {
                continue;
            }

            const remove =
                Math.min(
                    available,
                    excess
                );

            batch.units =
                available -
                remove;

            excess -=
                remove;
        }

        stock.purchaseBatches =
            batches.filter(
                (batch) =>
                    batchUnits(batch) > 0
            );

        setCalculatedUnitBuyPrice(
            stock
        );

        await stock.save({
            session
        });

        return stock.purchaseBatches;
    }

    // ------------------------------------------------------
    // STOCK HAS MORE UNITS THAN FIFO
    // ------------------------------------------------------

    const missingUnits =
        expectedUnits -
        batchTotal;

    if (
        missingUnits > 0
    ) {

        const legacyUnitBuyPrice =
            number(
                stock.buyPrice ??
                stock.unitBuyPrice ??
                0,
                "Buy price"
            );

        batches.push({
            units:
                missingUnits,

            buyPrice:
                legacyUnitBuyPrice,

            purchasedAt:
                new Date()
        });
    }

    stock.purchaseBatches =
        sortFifoBatches(
            batches
        );

    setCalculatedUnitBuyPrice(
        stock
    );

    await stock.save({
        session
    });

    return stock.purchaseBatches;
}


// ==========================================================
// CATEGORY
// ==========================================================

async function getCategory(
    value,
    session = null
) {

    const raw =
        text(value);

    if (!raw) {

        throw new Error(
            "Select a valid stock category."
        );
    }

    let category;

    if (
        mongoose.isValidObjectId(
            raw
        )
    ) {

        const query =
            Category.findOne({
                _id:
                    raw,

                isActive:
                    true
            }).select(
                "_id name categoryIcon isActive"
            );

        if (session) {
            query.session(
                session
            );
        }

        category =
            await query.lean();

    } else {

        const query =
            Category.findOne({
                name:
                    raw.toLowerCase(),

                isActive:
                    true
            }).select(
                "_id name categoryIcon isActive"
            );

        if (session) {
            query.session(
                session
            );
        }

        category =
            await query.lean();
    }

    if (!category) {

        throw new Error(
            "The selected category was not found or is inactive."
        );
    }

    const categoryName =
        text(
            category.name
        ).toLowerCase();

    if (!categoryName) {

        throw new Error(
            "The selected category has no valid name."
        );
    }

    return category;
}


// ==========================================================
// VALIDATE CATEGORY
// ==========================================================

async function validateCategory(
    value,
    session = null
) {

    const category =
        await getCategory(
            value,
            session
        );

    return text(
        category.name
    ).toLowerCase();
}


// ==========================================================
// GET CATEGORY BY NAME
// ==========================================================

async function getCategoryByName(
    name,
    session = null
) {

    const query =
        Category.findOne({
            name:
                text(name)
                    .toLowerCase(),

            isActive:
                true
        }).select(
            "_id name categoryIcon isActive"
        );

    if (session) {
        query.session(
            session
        );
    }

    return query.lean();
}


// ==========================================================
// CONSUME STOCK FIFO
// ==========================================================

function consumeFifoBatches(
    stock,
    requestedUnits
) {

    const quantity =
        wholeNumber(
            requestedUnits,
            "FIFO allocation units",
            true
        );

    if (
        quantity <= 0
    ) {

        throw new Error(
            "FIFO allocation must be greater than zero."
        );
    }

    const batches =
        sortFifoBatches(
            Array.isArray(
                stock.purchaseBatches
            )
                ? stock.purchaseBatches
                : []
        );

    let remaining =
        quantity;

    let totalCost =
        0;

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
            batchUnits(
                batch
            );

        if (
            available <= 0
        ) {
            continue;
        }

        const buyPrice =
            batchBuyPrice(
                batch
            );

        const consume =
            Math.min(
                available,
                remaining
            );

        totalCost +=
            consume *
            buyPrice;

        consumed.push({
            units:
                consume,

            buyPrice,

            receivedAt:
                fifoDate(
                    batch.purchasedAt ||
                    batch.createdAt
                )
        });

        batch.units =
            available -
            consume;

        remaining -=
            consume;
    }

    if (
        remaining > 0
    ) {

        throw new Error(
            `Only ${quantity - remaining} FIFO units are available, but ${quantity} units were requested.`
        );
    }

    stock.purchaseBatches =
        batches.filter(
            (batch) =>
                batchUnits(batch) > 0
        );

    return {
        consumed,

        totalCost,

        weightedBuyPrice:
            totalCost /
            quantity
    };
}


// ==========================================================
// PRODUCT FIFO HELPERS
// ==========================================================

function productFifoUnits(
    product
) {

    const batches =
        Array.isArray(
            product?.fifoBatches
        )
            ? product.fifoBatches
            : [];

    return batches.reduce(
        (total, batch) =>
            total +
            batchUnits(batch),
        0
    );
}


// ==========================================================
// PRODUCT FIFO VALUE
// ==========================================================

function productFifoValue(
    product
) {

    const batches =
        Array.isArray(
            product?.fifoBatches
        )
            ? product.fifoBatches
            : [];

    return batches.reduce(
        (total, batch) => {

            const units =
                batchUnits(
                    batch
                );

            const buyPrice =
                batchBuyPrice(
                    batch
                );

            return (
                total +
                units *
                buyPrice
            );

        },
        0
    );
}


// ==========================================================
// PRODUCT WEIGHTED BUY PRICE
// ==========================================================

function weightedProductBuyPrice(
    product
) {

    const units =
        productFifoUnits(
            product
        );

    if (
        units <= 0
    ) {
        return 0;
    }

    return (
        productFifoValue(
            product
        ) /
        units
    );
}


// ==========================================================
// SORT PRODUCT FIFO
// ==========================================================

function sortProductFifo(
    batches
) {

    return [...batches].sort(
        (a, b) => {

            const aDate =
                fifoDate(
                    a?.receivedAt ||
                    a?.createdAt
                ).getTime();

            const bDate =
                fifoDate(
                    b?.receivedAt ||
                    b?.createdAt
                ).getTime();

            return (
                aDate -
                bDate
            );
        }
    );
}


// ==========================================================
// RECONCILE PRODUCT FIFO
// ==========================================================

async function reconcileProductFifo(
    product,
    targetUnits,
    session = null
) {

    const target =
        wholeNumber(
            targetUnits,
            "Product allocated units"
        );

    let batches =
        Array.isArray(
            product.fifoBatches
        )
            ? product.fifoBatches
            : [];

    batches =
        sortProductFifo(
            batches
        );

    batches =
        batches.filter(
            (batch) =>
                batchUnits(batch) > 0
        );

    let currentUnits =
        batches.reduce(
            (sum, batch) =>
                sum +
                batchUnits(batch),
            0
        );

    // ------------------------------------------------------
    // FIFO HAS TOO MANY UNITS
    // ------------------------------------------------------

    if (
        currentUnits >
        target
    ) {

        let excess =
            currentUnits -
            target;

        for (
            let i =
                batches.length - 1;

            i >= 0 &&
            excess > 0;

            i--
        ) {

            const batch =
                batches[i];

            const available =
                batchUnits(
                    batch
                );

            const remove =
                Math.min(
                    available,
                    excess
                );

            batch.units =
                available -
                remove;

            excess -=
                remove;
        }

        batches =
            batches.filter(
                (batch) =>
                    batchUnits(batch) > 0
            );

        currentUnits =
            target;
    }

    // ------------------------------------------------------
    // FIFO HAS FEWER UNITS
    // ------------------------------------------------------

    if (
        currentUnits <
        target
    ) {

        const missingUnits =
            target -
            currentUnits;

        const existingUnitBuyPrice =
            number(
                product.unitBuyPrice ??
                product.buyPrice ??
                0,
                "Product unit buy price"
            );

        batches.push({
            units:
                missingUnits,

            buyPrice:
                existingUnitBuyPrice,

            receivedAt:
                fifoDate(
                    product.createdAt
                )
        });
    }

    batches =
        sortProductFifo(
            batches
        );

    product.fifoBatches =
        batches;

    product.units =
        target;

    const finalUnits =
        productFifoUnits(
            product
        );

    if (
        finalUnits !==
        target
    ) {

        throw new Error(
            `Product FIFO could not be reconciled. Product FIFO contains ${finalUnits} units, but Product requires ${target} units.`
        );
    }

    const unitBuyPrice =
        weightedProductBuyPrice(
            product
        );

    product.unitBuyPrice =
        unitBuyPrice;

    product.buyPrice =
        unitBuyPrice;

    return product.fifoBatches;
}


// ==========================================================
// ADD STOCK FIFO LAYERS TO PRODUCT FIFO
// ==========================================================

function addLayersToProductFifo(
    product,
    layers
) {

    const existing =
        Array.isArray(
            product.fifoBatches
        )
            ? product.fifoBatches
            : [];

    for (
        const layer of layers
    ) {

        const units =
            batchUnits(
                layer
            );

        if (
            units <= 0
        ) {
            continue;
        }

        existing.push({
            units,

            buyPrice:
                batchBuyPrice(
                    layer
                ),

            receivedAt:
                fifoDate(
                    layer.receivedAt ||
                    layer.purchasedAt
                )
        });
    }

    product.fifoBatches =
        sortProductFifo(
            existing
        );

    return product.fifoBatches;
}


// ==========================================================
// RELEASE PRODUCT FIFO
// ==========================================================

function releaseProductFifo(
    product,
    requestedUnits
) {

    const quantity =
        wholeNumber(
            requestedUnits,
            "Product FIFO release units",
            true
        );

    if (
        quantity <= 0
    ) {

        throw new Error(
            "Product FIFO release quantity must be greater than zero."
        );
    }

    let batches =
        Array.isArray(
            product.fifoBatches
        )
            ? product.fifoBatches
            : [];

    batches =
        sortProductFifo(
            batches
        );

    let availableUnits =
        batches.reduce(
            (total, batch) =>
                total +
                batchUnits(batch),
            0
        );

    if (
        quantity >
        availableUnits
    ) {

        throw new Error(
            `Cannot release ${quantity} Product FIFO units because only ${availableUnits} Product FIFO units exist.`
        );
    }

    let remaining =
        quantity;

    const released =
        [];

    for (
        let i =
            batches.length - 1;

        i >= 0 &&
        remaining > 0;

        i--
    ) {

        const batch =
            batches[i];

        const available =
            batchUnits(
                batch
            );

        if (
            available <= 0
        ) {
            continue;
        }

        const release =
            Math.min(
                available,
                remaining
            );

        released.push({
            units:
                release,

            buyPrice:
                batchBuyPrice(
                    batch
                ),

            receivedAt:
                fifoDate(
                    batch.receivedAt ||
                    batch.createdAt
                )
        });

        batch.units =
            available -
            release;

        remaining -=
            release;
    }

    product.fifoBatches =
        batches.filter(
            (batch) =>
                batchUnits(batch) > 0
        );

    product.fifoBatches =
        sortProductFifo(
            product.fifoBatches
        );

    if (
        remaining > 0
    ) {

        throw new Error(
            "Product FIFO release could not be completed."
        );
    }

    return released;
}


// ==========================================================
// RETURN PRODUCT FIFO LAYERS TO STOCK
// ==========================================================

function returnLayersToStock(
    stock,
    layers
) {

    if (
        !Array.isArray(
            stock.purchaseBatches
        )
    ) {

        stock.purchaseBatches =
            [];
    }

    for (
        const layer of layers
    ) {

        const units =
            batchUnits(
                layer
            );

        if (
            units <= 0
        ) {
            continue;
        }

        stock.purchaseBatches.push({
            units,

            buyPrice:
                batchBuyPrice(
                    layer
                ),

            purchasedAt:
                fifoDate(
                    layer.receivedAt ||
                    layer.purchasedAt
                )
        });
    }

    stock.purchaseBatches =
        sortFifoBatches(
            stock.purchaseBatches
        );

    return stock.purchaseBatches;
}


// ==========================================================
// ACTIVE CATEGORIES
// ==========================================================

exports.getCategories =
    async () => {

        return Category.find({
            isActive:
                true
        })
            .select(
                "_id name categoryIcon isActive"
            )
            .sort({
                name: 1
            })
            .lean();
    };


// ==========================================================
// LIST STOCK
// ==========================================================

exports.listStock =
    async () => {

        const [
            stocks,
            categories
        ] = await Promise.all([
            Stock.find({
                isActive:
                    true
            })
                .sort({
                    category: 1,
                    subcategory: 1,
                    name: 1,
                    createdAt: 1
                })
                .lean(),

            Category.find({
                isActive:
                    true
            })
                .select(
                    "_id name categoryIcon isActive"
                )
                .sort({
                    name: 1
                })
                .lean()
        ]);

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

        const groups =
            new Map();

        for (
            const stock
            of stocks
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

        return Array.from(
            groups.values()
        ).map(
            (group) => {

                const rows = [];

                for (
                    let i = 0;
                    i <
                    group.stocks.length;
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
    };


// ==========================================================
// GET SINGLE STOCK
// ==========================================================

exports.getStock =
    async (id) => {

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
            }).lean();

        if (!stock) {
            return null;
        }

        const category =
            await getCategoryByName(
                stock.category
            );

        return {
            ...stock,

            categoryDocument:
                category || null
        };
    };


// ==========================================================
// GET STOCK RECORDS
// ==========================================================

exports.getStockCategories =
    async () => {

        return Stock.find({
            isActive:
                true
        })
            .select(
                "name category subcategory days image units buyPrice unitBuyPrice description purchaseBatches"
            )
            .sort({
                category: 1,
                subcategory: 1,
                name: 1
            })
            .lean();
    };


// ==========================================================
// GET SUBSTATIONS
// ==========================================================

exports.getSubstations =
    () => {

        return Substation.find({
            isActive:
                true
        })
            .select(
                "name location description productInventory"
            )
            .sort({
                name: 1
            })
            .lean();
    };


// ==========================================================
// RECALCULATE STOCK TOTALS
// ==========================================================

exports.recalculateStockTotals =
    async (
        session = null
    ) => {

        const query =
            Stock.find({
                isActive:
                    true
            }).select(
                "_id category units buyPrice unitBuyPrice purchaseBatches createdAt"
            );

        if (session) {
            query.session(
                session
            );
        }

        const stocks =
            await query;

        const categoryTotals =
            new Map();

        let overall =
            0;

        for (
            const stock of stocks
        ) {

            await reconcilePurchaseBatches(
                stock,
                session
            );
        }

        for (
            const stock of stocks
        ) {

            const value =
                calculateFifoValue(
                    stock
                );

            const unitBuyPrice =
                calculateUnitBuyPrice(
                    stock
                );

            const categoryName =
                text(
                    stock.category
                ).toLowerCase();

            categoryTotals.set(
                categoryName,
                (
                    categoryTotals.get(
                        categoryName
                    ) || 0
                ) +
                value
            );

            overall +=
                value;

            stock.unitBuyPrice =
                unitBuyPrice;
        }

        const now =
            new Date();

        for (
            const stock of stocks
        ) {

            const value =
                calculateFifoValue(
                    stock
                );

            const categoryName =
                text(
                    stock.category
                ).toLowerCase();

            await Stock.updateOne(
                {
                    _id:
                        stock._id
                },
                {
                    $set: {

                        unitBuyPrice:
                            calculateUnitBuyPrice(
                                stock
                            ),

                        cashOutflow:
                            value,

                        categoryOveral:
                            categoryTotals.get(
                                categoryName
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

        return {
            categoryTotals,

            overal:
                overall
        };
    };


// ==========================================================
// CREATE STOCK
// ==========================================================

exports.createStock =
    async (body) => {

        const name =
            cleanSubcategory(
                body.name ||
                body.subcategory
            );

        if (!name) {

            throw new Error(
                "Stock name is required."
            );
        }

        const categoryDocument =
            await getCategory(
                body.category
            );

        const category =
            text(
                categoryDocument.name
            ).toLowerCase();

        const subcategory =
            cleanSubcategory(
                body.subcategory
            );

        if (!subcategory) {

            throw new Error(
                "Subcategory is required."
            );
        }

        const units =
            wholeNumber(
                body.units,
                "Warehouse units",
                true
            );

        if (
            units <= 0
        ) {

            throw new Error(
                "Initial warehouse units must be greater than zero."
            );
        }

        const totalPurchaseCost =
            number(
                body.buyPrice,
                "Total purchase cost",
                true
            );

        const unitBuyPrice =
            totalPurchaseCost /
            units;

        if (
            !Number.isFinite(
                unitBuyPrice
            )
        ) {

            throw new Error(
                "Unable to calculate the unit buy price."
            );
        }

        const unitSellPrice =
            number(
                body.unitSellPrice ??
                body.sellPrice,
                "Selling price",
                true
            );

        const days =
            wholeNumber(
                body.days || 0,
                "Delivery days"
            );

        const image =
            text(
                body.image
            );

        const description =
            text(
                body.description
            );

        const existing =
            await Stock.findOne({
                category,

                subcategory,

                isActive:
                    true
            });

        if (existing) {

            throw new Error(
                `The subcategory "${subcategory}" already exists under the selected category. Select the existing stock record to update it.`
            );
        }

        const purchaseBatches = [
            {
                units,

                buyPrice:
                    unitBuyPrice,

                purchasedAt:
                    new Date()
            }
        ];

        const session =
            await mongoose.startSession();

        let createdStock;
        let createdProduct;

        try {

            await session.withTransaction(
                async () => {

                    const stockResult =
                        await Stock.create(
                            [
                                {
                                    name,

                                    category,

                                    subcategory,

                                    days,

                                    image,

                                    units,

                                    buyPrice:
                                        unitBuyPrice,

                                    unitBuyPrice,

                                    purchaseBatches,

                                    description
                                }
                            ],
                            {
                                session
                            }
                        );

                    createdStock =
                        stockResult[0];

                    const productResult =
                        await Product.create(
                            [
                                {
                                    stock:
                                        createdStock._id,

                                    name,

                                    category:
                                        categoryDocument._id,

                                    subcategory,

                                    days,

                                    image,

                                    description,

                                    units:
                                        0,

                                    fifoBatches:
                                        [],

                                    unitBuyPrice:
                                        0,

                                    buyPrice:
                                        0,

                                    unitSellPrice
                                }
                            ],
                            {
                                session
                            }
                        );

                    createdProduct =
                        productResult[0];
                }
            );

            await exports.recalculateStockTotals();

            const stock =
                await Stock.findById(
                    createdStock._id
                ).lean();

            const product =
                await Product.findById(
                    createdProduct._id
                ).lean();

            return {
                stock,

                product
            };

        } finally {

            await session.endSession();
        }
    };


// ==========================================================
// UPDATE STOCK ENTRY
// ==========================================================

exports.updateStockEntry =
    async (
        stockId,
        body
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

        const session =
            await mongoose.startSession();

        try {

            let updatedStock;

            await session.withTransaction(
                async () => {

                    const stock =
                        await Stock.findOne({
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

                    await reconcilePurchaseBatches(
                        stock,
                        session
                    );

                    const currentUnits =
                        wholeNumber(
                            stock.units || 0,
                            "Current warehouse units"
                        );

                    const additionalUnits =
                        wholeNumber(
                            body.units,
                            "Additional warehouse units",
                            true
                        );

                    let additionalUnitBuyPrice =
                        0;

                    if (
                        additionalUnits > 0
                    ) {

                        const totalPurchaseCost =
                            number(
                                body.buyPrice,
                                "Total purchase cost for additional units",
                                true
                            );

                        additionalUnitBuyPrice =
                            totalPurchaseCost /
                            additionalUnits;

                        if (
                            !Number.isFinite(
                                additionalUnitBuyPrice
                            )
                        ) {

                            throw new Error(
                                "Unable to calculate the unit buy price for the additional stock."
                            );
                        }
                    }

                    let category;

                    if (
                        text(
                            body.category
                        )
                    ) {

                        category =
                            await validateCategory(
                                body.category,
                                session
                            );

                    } else {

                        category =
                            text(
                                stock.category
                            ).toLowerCase();
                    }

                    if (!category) {

                        throw new Error(
                            "Stock category is missing."
                        );
                    }

                    const subcategory =
                        cleanSubcategory(
                            body.subcategory ||
                            stock.subcategory
                        );

                    if (!subcategory) {

                        throw new Error(
                            "Subcategory is required."
                        );
                    }

                    const stockName =
                        cleanSubcategory(
                            body.name ||
                            stock.name ||
                            subcategory
                        );

                    if (!stockName) {

                        throw new Error(
                            "Stock name is required."
                        );
                    }

                    const unitSellPrice =
                        number(
                            body.unitSellPrice ??
                            body.sellPrice ??
                            0,
                            "Selling price"
                        );

                    const days =
                        wholeNumber(
                            body.days ??
                            stock.days ??
                            0,
                            "Delivery days"
                        );

                    const image =
                        text(
                            body.image
                        );

                    const description =
                        text(
                            body.description
                        );

                    const duplicate =
                        await Stock.findOne({
                            _id: {
                                $ne:
                                    stock._id
                            },

                            category,

                            subcategory,

                            isActive:
                                true
                        })
                            .session(
                                session
                            );

                    if (duplicate) {

                        throw new Error(
                            `The subcategory "${subcategory}" already belongs to another stock record under the selected category.`
                        );
                    }

                    stock.name =
                        stockName;

                    stock.category =
                        category;

                    stock.subcategory =
                        subcategory;

                    stock.days =
                        days;

                    stock.description =
                        description;

                    if (image) {

                        stock.image =
                            image;
                    }

                    if (
                        additionalUnits > 0
                    ) {

                        stock.purchaseBatches.push({
                            units:
                                additionalUnits,

                            buyPrice:
                                additionalUnitBuyPrice,

                            purchasedAt:
                                new Date()
                        });
                    }

                    stock.units =
                        currentUnits +
                        additionalUnits;

                    stock.purchaseBatches =
                        sortFifoBatches(
                            stock.purchaseBatches
                        );

                    const calculatedUnitBuyPrice =
                        calculateUnitBuyPrice(
                            stock
                        );

                    stock.unitBuyPrice =
                        calculatedUnitBuyPrice;

                    stock.buyPrice =
                        calculatedUnitBuyPrice;

                    await stock.save({
                        session
                    });

                    const categoryDocument =
                        await getCategoryByName(
                            stock.category,
                            session
                        );

                    if (!categoryDocument) {

                        throw new Error(
                            "The selected category no longer exists or is inactive."
                        );
                    }

                    const product =
                        await Product.findOne({
                            stock:
                                stock._id,

                            isActive:
                                true
                        })
                            .session(
                                session
                            );

                    if (product) {

                        product.name =
                            productNameFromStock(
                                stock
                            );

                        product.category =
                            categoryDocument._id;

                        product.subcategory =
                            stock.subcategory;

                        product.days =
                            Number(
                                stock.days ||
                                0
                            );

                        product.image =
                            stock.image ||
                            "";

                        product.description =
                            stock.description ||
                            "";

                        if (
                            additionalUnits === 0
                        ) {

                            product.unitSellPrice =
                                unitSellPrice;
                        }

                        await product.save({
                            session
                        });
                    }

                    updatedStock =
                        stock;
                }
            );

            await exports.recalculateStockTotals();

            return Stock.findById(
                updatedStock._id
            ).lean();

        } finally {

            await session.endSession();
        }
    };


// ==========================================================
// NORMALIZE ALLOCATIONS
// ==========================================================
//
// Every submitted value represents ADDITIONAL units.
//
// Example:
//
// allocations[substationA] = 2
// allocations[substationB] = 3
//
// If current balances are:
//
// A = 5
// B = 10
//
// final balances become:
//
// A = 7
// B = 13
//
// Total Product addition = 5 units.
// Total Stock deduction = 5 units.
//
// Multiple substations are supported in one submission.
// ==========================================================

function normalizeAllocations(
    input
) {

    if (
        !input ||
        typeof input !== "object" ||
        Array.isArray(input)
    ) {

        return [];
    }

    return Object.entries(
        input
    )
        .map(
            ([
                substationId,
                rawValue
            ]) => ({

                substationId:
                    text(
                        substationId
                    ),

                units:
                    wholeNumber(
                        rawValue,

                        `Units for substation ${substationId}`
                    )
            })
        )
        .filter(
            (entry) =>
                entry.substationId &&
                entry.units > 0
        );
}


// ==========================================================
// UPDATE EXISTING PRODUCT / ALLOCATION
// ==========================================================
//
// IMPORTANT:
//
// createProductFromStock() DOES NOT create a Product.
//
// The Product already exists from Stock creation.
//
// Every allocation is ADDITIVE.
//
// Example:
//
// Product.units = 10
//
// Substation A = 5
// Substation B = 5
//
// Submitted:
//
// A = 2
// B = 3
//
// Result:
//
// Product.units = 15
//
// Substation A = 7
// Substation B = 8
//
// Stock.units decreases by 5.
//
// Product FIFO receives the exact 5 FIFO units consumed
// from Stock.
//
// Multiple substations can be updated in one operation.
// ==========================================================

exports.createProductFromStock =
    async (
        stockId,
        body
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

        // --------------------------------------------------
        // SELL PRICE
        // --------------------------------------------------

        const unitSellPrice =
            number(
                body.unitSellPrice ??
                body.sellPrice,
                "Selling price",
                true
            );

        // --------------------------------------------------
        // ADDITIONAL ALLOCATIONS
        // --------------------------------------------------

        const allocations =
            normalizeAllocations(
                body.allocations
            );

        if (
            !allocations.length
        ) {

            throw new Error(
                "Enter at least one substation allocation."
            );
        }

        // --------------------------------------------------
        // IDS
        // --------------------------------------------------

        const ids =
            allocations.map(
                (item) =>
                    item.substationId
            );

        if (
            ids.some(
                (id) =>
                    !mongoose.isValidObjectId(
                        id
                    )
            )
        ) {

            throw new Error(
                "One or more selected substations are invalid."
            );
        }

        if (
            new Set(ids).size !==
            ids.length
        ) {

            throw new Error(
                "Each substation can appear only once in the allocation."
            );
        }

        // ==================================================
        // TRANSACTION
        // ==================================================

        const session =
            await mongoose.startSession();

        let resultProduct;

        try {

            await session.withTransaction(
                async () => {

                    // ======================================
                    // STOCK
                    // ======================================

                    const stock =
                        await Stock.findOne({
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

                    // ======================================
                    // RECONCILE STOCK FIFO
                    // ======================================

                    await reconcilePurchaseBatches(
                        stock,
                        session
                    );

                    // ======================================
                    // CATEGORY
                    // ======================================

                    const category =
                        await getCategoryByName(
                            stock.category,
                            session
                        );

                    if (!category) {

                        throw new Error(
                            "The category assigned to this stock record no longer exists or is inactive."
                        );
                    }

                    // ======================================
                    // EXISTING PRODUCT
                    // ======================================

                    const product =
                        await Product.findOne({
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
                            "The Product linked to this stock record was not found."
                        );
                    }

                    // ======================================
                    // SUBMITTED SUBSTATIONS
                    // ======================================

                    const substations =
                        await Substation.find({
                            _id: {
                                $in:
                                    ids
                            },

                            isActive:
                                true
                        })
                            .session(
                                session
                            );

                    const substationMap =
                        new Map(
                            substations.map(
                                (substation) => [
                                    String(
                                        substation._id
                                    ),
                                    substation
                                ]
                            )
                        );

                    // ======================================
                    // VALIDATE ALL SUBSTATIONS
                    // ======================================

                    for (
                        const allocation
                        of allocations
                    ) {

                        if (
                            !substationMap.has(
                                allocation.substationId
                            )
                        ) {

                            throw new Error(
                                "One or more selected substations were not found or are inactive."
                            );
                        }
                    }

                    // ======================================
                    // ALL ACTIVE SUBSTATIONS
                    //
                    // Used to calculate the Product's
                    // CURRENT total before this allocation.
                    // ======================================

                    const allSubstations =
                        await Substation.find({
                            isActive:
                                true
                        })
                            .session(
                                session
                            );

                    // ======================================
                    // CURRENT PRODUCT UNITS IN SUBSTATIONS
                    // ======================================

                    let currentAllocationTotal =
                        0;

                    for (
                        const substation
                        of allSubstations
                    ) {

                        const inventory =
                            Array.isArray(
                                substation.productInventory
                            )
                                ? substation.productInventory.find(
                                    (entry) =>
                                        String(
                                            entry.productId
                                        ) ===
                                        String(
                                            product._id
                                        )
                                )
                                : null;

                        if (
                            inventory
                        ) {

                            currentAllocationTotal +=
                                wholeNumber(
                                    inventory.units || 0,

                                    `Current units for substation ${substation.name || substation._id}`
                                );
                        }
                    }

                    // ======================================
                    // RECONCILE PRODUCT FIFO
                    //
                    // This establishes the existing Product
                    // FIFO before adding the new allocation.
                    // ======================================

                    await reconcileProductFifo(
                        product,
                        currentAllocationTotal,
                        session
                    );

                    // ======================================
                    // TOTAL ADDITIONAL UNITS
                    //
                    // ALL SELECTED SUBSTATIONS ARE INCLUDED.
                    //
                    // Example:
                    //
                    // A = 2
                    // B = 3
                    // C = 4
                    //
                    // allocationUnits = 9
                    // ======================================

                    const allocationUnits =
                        allocations.reduce(
                            (
                                total,
                                allocation
                            ) =>
                                total +
                                allocation.units,
                            0
                        );

                    if (
                        allocationUnits <= 0
                    ) {

                        throw new Error(
                            "Allocation units must be greater than zero."
                        );
                    }

                    // ======================================
                    // NEW PRODUCT TOTAL
                    //
                    // Product's previous units
                    // PLUS all newly allocated units.
                    // ======================================

                    const newProductUnits =
                        currentAllocationTotal +
                        allocationUnits;

                    // ======================================
                    // STOCK AVAILABILITY
                    // ======================================

                    const warehouseUnits =
                        wholeNumber(
                            stock.units || 0,
                            "Warehouse units"
                        );

                    const stockFifoUnits =
                        totalBatchUnits(
                            stock
                        );

                    if (
                        warehouseUnits <
                        allocationUnits
                    ) {

                        throw new Error(
                            `Only ${warehouseUnits} units are available in this stock, but ${allocationUnits} units are being allocated.`
                        );
                    }

                    if (
                        stockFifoUnits <
                        allocationUnits
                    ) {

                        throw new Error(
                            `Only ${stockFifoUnits} FIFO units are available in this stock, but ${allocationUnits} units are being allocated.`
                        );
                    }

                    // ======================================
                    // CONSUME STOCK FIFO
                    //
                    // ALL ALLOCATIONS ARE COMBINED INTO
                    // ONE FIFO CONSUMPTION.
                    //
                    // OLDEST STOCK LAYERS FIRST.
                    // ======================================

                    const fifoResult =
                        consumeFifoBatches(
                            stock,
                            allocationUnits
                        );

                    // ======================================
                    // ADD CONSUMED FIFO LAYERS TO PRODUCT
                    // ======================================

                    addLayersToProductFifo(
                        product,
                        fifoResult.consumed
                    );

                    // ======================================
                    // DECREASE STOCK
                    //
                    // Stock loses exactly the number of
                    // additional units allocated.
                    // ======================================

                    stock.units =
                        warehouseUnits -
                        allocationUnits;

                    // ======================================
                    // SET PRODUCT UNITS
                    //
                    // Previous Product units
                    // PLUS additional allocation.
                    // ======================================

                    product.units =
                        newProductUnits;

                    // ======================================
                    // PRODUCT FIFO FINAL ORDER
                    // ======================================

                    product.fifoBatches =
                        sortProductFifo(
                            Array.isArray(
                                product.fifoBatches
                            )
                                ? product.fifoBatches
                                : []
                        );

                    product.fifoBatches =
                        product.fifoBatches.filter(
                            (batch) =>
                                batchUnits(batch) > 0
                        );

                    // ======================================
                    // HARD PRODUCT FIFO INVARIANT
                    // ======================================

                    const finalProductFifoUnits =
                        productFifoUnits(
                            product
                        );

                    if (
                        finalProductFifoUnits !==
                        newProductUnits
                    ) {

                        throw new Error(
                            `Product FIFO allocation is inconsistent. Product contains ${newProductUnits} units, but Product FIFO contains ${finalProductFifoUnits} units.`
                        );
                    }

                    // ======================================
                    // PRODUCT WEIGHTED BUY PRICE
                    // ======================================

                    const finalProductUnitBuyPrice =
                        weightedProductBuyPrice(
                            product
                        );

                    product.unitBuyPrice =
                        finalProductUnitBuyPrice;

                    product.buyPrice =
                        finalProductUnitBuyPrice;

                    // ======================================
                    // PRODUCT DETAILS
                    // ======================================

                    product.name =
                        productNameFromStock(
                            stock
                        );

                    product.category =
                        category._id;

                    product.subcategory =
                        stock.subcategory;

                    product.days =
                        Number(
                            stock.days ||
                            0
                        );

                    product.image =
                        stock.image ||
                        "";

                    product.description =
                        stock.description ||
                        "";

                    product.unitSellPrice =
                        unitSellPrice;

                    // ======================================
                    // UPDATE EVERY SUBMITTED SUBSTATION
                    //
                    // IMPORTANT:
                    //
                    // allocation.units is ADDED to the
                    // current inventory.
                    //
                    // This loop supports MULTIPLE substations
                    // in the same request.
                    // ======================================

                    for (
                        const allocation
                        of allocations
                    ) {

                        const substation =
                            substationMap.get(
                                allocation.substationId
                            );

                        if (
                            !Array.isArray(
                                substation.productInventory
                            )
                        ) {

                            substation.productInventory =
                                [];
                        }

                        const inventory =
                            substation.productInventory.find(
                                (entry) =>
                                    String(
                                        entry.productId
                                    ) ===
                                    String(
                                        product._id
                                    )
                            );

                        // ----------------------------------
                        // EXISTING INVENTORY
                        // ----------------------------------

                        if (
                            inventory
                        ) {

                            const currentUnits =
                                wholeNumber(
                                    inventory.units || 0,

                                    `Current units for substation ${substation.name || substation._id}`
                                );

                            inventory.units =
                                currentUnits +
                                allocation.units;

                            inventory.productName =
                                product.name;

                            inventory.category =
                                product.category;

                            inventory.subcategory =
                                product.subcategory;

                            inventory.days =
                                Number(
                                    product.days ||
                                    0
                                );

                            inventory.updatedAt =
                                new Date();

                        // ----------------------------------
                        // NEW INVENTORY ENTRY
                        // ----------------------------------

                        } else {

                            substation.productInventory.push(
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
                                        Number(
                                            product.days ||
                                            0
                                        ),

                                    units:
                                        allocation.units,

                                    updatedAt:
                                        new Date()
                                }
                            );
                        }

                        await substation.save({
                            session
                        });
                    }

                    // ======================================
                    // STOCK FIFO FINAL NORMALIZATION
                    // ======================================

                    stock.purchaseBatches =
                        sortFifoBatches(
                            Array.isArray(
                                stock.purchaseBatches
                            )
                                ? stock.purchaseBatches
                                : []
                        );

                    stock.purchaseBatches =
                        stock.purchaseBatches.filter(
                            (batch) =>
                                batchUnits(batch) > 0
                        );

                    // ======================================
                    // HARD STOCK FIFO INVARIANT
                    // ======================================

                    const finalStockFifoUnits =
                        totalBatchUnits(
                            stock
                        );

                    if (
                        finalStockFifoUnits !==
                        stock.units
                    ) {

                        throw new Error(
                            `Stock FIFO allocation is inconsistent. Stock contains ${stock.units} units, but Stock FIFO contains ${finalStockFifoUnits} units.`
                        );
                    }

                    // ======================================
                    // STOCK WEIGHTED UNIT BUY PRICE
                    // ======================================

                    stock.unitBuyPrice =
                        calculateUnitBuyPrice(
                            stock
                        );

                    stock.buyPrice =
                        stock.unitBuyPrice;

                    // ======================================
                    // SAVE STOCK
                    // ======================================

                    await stock.save({
                        session
                    });

                    // ======================================
                    // SAVE PRODUCT
                    // ======================================

                    await product.save({
                        session
                    });

                    // ======================================
                    // FINAL SUBSTATION CHECK
                    //
                    // Recalculate from ALL active
                    // substations, not only the submitted ones.
                    // ======================================

                    let finalAllocationTotal =
                        0;

                    const finalSubstations =
                        await Substation.find({
                            isActive:
                                true
                        })
                            .session(
                                session
                            );

                    for (
                        const substation
                        of finalSubstations
                    ) {

                        const inventory =
                            Array.isArray(
                                substation.productInventory
                            )
                                ? substation.productInventory.find(
                                    (entry) =>
                                        String(
                                            entry.productId
                                        ) ===
                                        String(
                                            product._id
                                        )
                                )
                                : null;

                        if (
                            inventory
                        ) {

                            finalAllocationTotal +=
                                wholeNumber(
                                    inventory.units || 0,
                                    "Final substation product units"
                                );
                        }
                    }

                    // ======================================
                    // SUBSTATION / PRODUCT INVARIANT
                    // ======================================

                    if (
                        finalAllocationTotal !==
                        product.units
                    ) {

                        throw new Error(
                            `Product allocation is inconsistent. Product contains ${product.units} units, but all substations contain ${finalAllocationTotal} units for this Product.`
                        );
                    }

                    // ======================================
                    // PRODUCT FIFO / PRODUCT INVARIANT
                    // ======================================

                    const savedProductFifoUnits =
                        productFifoUnits(
                            product
                        );

                    if (
                        savedProductFifoUnits !==
                        product.units
                    ) {

                        throw new Error(
                            `Product FIFO is inconsistent. Product contains ${product.units} units, but Product FIFO contains ${savedProductFifoUnits} units.`
                        );
                    }

                    // ======================================
                    // STOCK FIFO / STOCK INVARIANT
                    // ======================================

                    const savedStockFifoUnits =
                        totalBatchUnits(
                            stock
                        );

                    if (
                        savedStockFifoUnits !==
                        stock.units
                    ) {

                        throw new Error(
                            `Stock FIFO is inconsistent. Stock contains ${stock.units} units, but Stock FIFO contains ${savedStockFifoUnits} units.`
                        );
                    }

                    // ======================================
                    // RECALCULATE STOCK TOTALS
                    // ======================================

                    await exports.recalculateStockTotals(
                        session
                    );

                    resultProduct =
                        product;
                }
            );

            return Product.findById(
                resultProduct._id
            ).lean();

        } finally {

            await session.endSession();
        }
    };