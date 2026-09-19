// ==========================================================
// services/stockService.js
// STOCK SERVICE
//
// FIFO STOCK MANAGEMENT
//
// IMPORTANT:
//
// Stock.category stores Category.name.
//
// Product.category stores Category._id.
//
// Therefore:
//
// Category._id
//      ↓
// Stock.category = Category.name
//      ↓
// Product.category = Category._id
//
// FIFO:
//
// Stock.purchaseBatches stores individual purchases.
//
// Oldest purchase is consumed first.
//
// Example:
//
// Batch 1 → 100 units @ 100
// Batch 2 →  50 units @ 120
// Batch 3 →  80 units @ 130
//
// Product request = 130 units
//
// FIFO consumption:
//
// 100 units @ 100
//  30 units @ 120
//
// Product.buyPrice becomes the weighted average cost
// of the 130 units consumed.
//
// Product batch history will be handled later in the
// Product model.
// ==========================================================

const mongoose = require("mongoose");

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
    text(value).replace(/\s+/g, " ");

const displayLabel = (value) =>
    text(value)
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) =>
            c.toUpperCase()
        );

// ==========================================================
// PRODUCT NAME
// ==========================================================
//
// Product name comes from:
//
// 1. Stock.name
// 2. Stock.subcategory if Stock.name is empty/missing
//
// This keeps product naming independent from the stock
// subcategory whenever a stock name has actually been set.
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
        !Number.isInteger(
            result
        )
    ) {
        throw new Error(
            `${label} must be a whole number.`
        );
    }

    return result;
}

// ==========================================================
// FIFO BATCH QUANTITY
// ==========================================================

function batchUnits(batch) {
    return wholeNumber(
        batch?.units ?? 0,
        "FIFO batch units"
    );
}

// ==========================================================
// FIFO BATCH PRICE
// ==========================================================

function batchBuyPrice(batch) {
    return number(
        batch?.buyPrice ?? 0,
        "FIFO batch buy price"
    );
}

// ==========================================================
// GET TOTAL FIFO UNITS
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
// SORT FIFO BATCHES
// ==========================================================
//
// Oldest purchase first.
//
// purchasedAt is the primary FIFO date.
//
// createdAt is used only as a fallback for older records.
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
//
// Older Stock records may not have purchaseBatches.
//
// Such records are converted into one legacy FIFO batch:
//
// existing stock.units
//        +
// existing stock.buyPrice
//
// New purchases are always stored as separate batches.
//
// This function does NOT invent additional stock.
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
        return stock.purchaseBatches;
    }

    const units =
        wholeNumber(
            stock.units || 0,
            "Warehouse units"
        );

    // ------------------------------------------------------
    // NO STOCK
    // ------------------------------------------------------

    if (units === 0) {
        stock.purchaseBatches = [];

        await stock.save({
            session
        });

        return stock.purchaseBatches;
    }

    // ------------------------------------------------------
    // LEGACY STOCK
    // ------------------------------------------------------

    const buyPrice =
        number(
            stock.buyPrice || 0,
            "Buy price"
        );

    stock.purchaseBatches = [
        {
            units,
            buyPrice,
            purchasedAt:
                fifoDate(
                    stock.createdAt
                )
        }
    ];

    await stock.save({
        session
    });

    return stock.purchaseBatches;
}

// ==========================================================
// RECONCILE FIFO BATCHES WITH STOCK UNITS
// ==========================================================
//
// Expected:
//
// sum(purchaseBatches.units)
//             ===
// stock.units
//
// If an old record is inconsistent, this function repairs
// the FIFO queue so that the queue represents the current
// warehouse balance.
//
// IMPORTANT:
//
// This is a compatibility/migration mechanism.
//
// Normal new FIFO records should always remain synchronized.
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
                Number(
                    batch?.units || 0
                ),
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

        await stock.save({
            session
        });

        return stock.purchaseBatches;
    }

    // ------------------------------------------------------
    // NO BATCHES
    // ------------------------------------------------------

    if (
        batches.length === 0
    ) {
        stock.purchaseBatches = [
            {
                units:
                    expectedUnits,

                buyPrice:
                    number(
                        stock.buyPrice || 0,
                        "Buy price"
                    ),

                purchasedAt:
                    fifoDate(
                        stock.createdAt
                    )
            }
        ];

        await stock.save({
            session
        });

        return stock.purchaseBatches;
    }

    // ------------------------------------------------------
    // ALREADY SYNCHRONIZED
    // ------------------------------------------------------

    if (
        batchTotal ===
        expectedUnits
    ) {
        stock.purchaseBatches =
            batches;

        return stock.purchaseBatches;
    }

    // ------------------------------------------------------
    // BATCH TOTAL GREATER THAN STOCK BALANCE
    // ------------------------------------------------------

    if (
        batchTotal >
        expectedUnits
    ) {
        let unitsToRemove =
            batchTotal -
            expectedUnits;

        for (
            let i = 0;
            i < batches.length &&
            unitsToRemove > 0;
            i++
        ) {
            const batch =
                batches[i];

            const available =
                batchUnits(batch);

            if (
                available <= 0
            ) {
                continue;
            }

            const remove =
                Math.min(
                    available,
                    unitsToRemove
                );

            batch.units =
                available -
                remove;

            unitsToRemove -=
                remove;
        }

        stock.purchaseBatches =
            batches.filter(
                (batch) =>
                    batchUnits(batch) > 0
            );

        await stock.save({
            session
        });

        return stock.purchaseBatches;
    }

    // ------------------------------------------------------
    // BATCH TOTAL LESS THAN STOCK BALANCE
    // ------------------------------------------------------

    const missingUnits =
        expectedUnits -
        batchTotal;

    if (
        missingUnits > 0
    ) {
        batches.push({
            units:
                missingUnits,

            buyPrice:
                number(
                    stock.buyPrice || 0,
                    "Buy price"
                ),

            purchasedAt:
                new Date()
        });

        batches =
            sortFifoBatches(
                batches
            );
    }

    stock.purchaseBatches =
        batches;

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
                _id: raw,
                isActive: true
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

    else {
        const query =
            Category.findOne({
                name:
                    raw.toLowerCase(),

                isActive: true
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

            isActive: true
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
// DIRECTIONS OF USE
// ==========================================================

function cleanDirectionsOfUse(
    input
) {
    if (input == null) {
        return undefined;
    }

    if (
        typeof input !== "object" ||
        Array.isArray(input)
    ) {
        return undefined;
    }

    if (
        text(input.clear) ===
        "1"
    ) {
        return null;
    }

    const title =
        text(input.title);

    let items =
        input.items || [];

    if (
        !Array.isArray(items)
    ) {
        items =
            Object.values(items);
    }

    const cleanedItems =
        items
            .map(
                (item) => ({
                    subtitle:
                        text(
                            item?.subtitle
                        ),

                    content:
                        text(
                            item?.content
                        )
                })
            )
            .filter(
                (item) =>
                    item.subtitle &&
                    item.content
            );

    if (
        !title &&
        !cleanedItems.length
    ) {
        return null;
    }

    return {
        title,
        items:
            cleanedItems
    };
}

// ==========================================================
// DIRECTIONS FOR PRODUCT
// ==========================================================

function directionsForProduct(
    stock
) {
    const directions =
        stock?.directionsOfUse;

    if (!directions) {
        return undefined;
    }

    if (
        !directions.title &&
        !directions.items?.length
    ) {
        return undefined;
    }

    return {
        title:
            text(
                directions.title
            ),

        items:
            Array.isArray(
                directions.items
            )
                ? directions.items.map(
                    (item) => ({
                        subtitle:
                            text(
                                item.subtitle
                            ),

                        content:
                            text(
                                item.content
                            )
                    })
                )
                : []
    };
}

// ==========================================================
// CALCULATE FIFO STOCK VALUE
// ==========================================================

function calculateFifoValue(
    stock
) {
    const batches =
        Array.isArray(
            stock?.purchaseBatches
        )
            ? stock.purchaseBatches
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
// CONSUME FIFO STOCK
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
            batchId:
                batch._id || null,

            units:
                consume,

            buyPrice,

            purchasedAt:
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

    const weightedBuyPrice =
        totalCost /
        quantity;

    return {
        consumed,

        totalCost,

        weightedBuyPrice
    };
}

// ==========================================================
// GET ACTIVE CATEGORIES
// ==========================================================

exports.getCategories =
    async () => {
        return Category.find({
            isActive: true
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
                _id: id,
                isActive: true
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
            isActive: true
        })
            .select(
                "name category subcategory days image units buyPrice description directionsOfUse purchaseBatches"
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
            isActive: true
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
// EXPORT STOCK TOTAL RECALCULATION
// ==========================================================

exports.recalculateStockTotals =
    async (
        session = null
    ) => {
        const query =
            Stock.find({
                isActive: true
            }).select(
                "_id category units buyPrice purchaseBatches createdAt"
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

        let overall = 0;

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
                ) + value
            );

            overall +=
                value;
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
                    timestamps: true
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
//
// The initial warehouse quantity becomes the first FIFO
// purchase batch.
// ==========================================================

exports.createStock =
    async (body) => {

        // --------------------------------------------------
        // NAME
        // --------------------------------------------------
        //
        // Stock name is taken from body.name when supplied.
        // If no name is supplied, subcategory is used.
        // --------------------------------------------------

        const name =
            cleanSubcategory(
                body.name ||
                body.subcategory
            );

        // --------------------------------------------------
        // CATEGORY
        // --------------------------------------------------

        const category =
            await validateCategory(
                body.category
            );

        // --------------------------------------------------
        // SUBCATEGORY
        // --------------------------------------------------

        const subcategory =
            cleanSubcategory(
                body.subcategory
            );

        if (!subcategory) {
            throw new Error(
                "Subcategory is required."
            );
        }

        // --------------------------------------------------
        // UNITS
        // --------------------------------------------------

        const units =
            wholeNumber(
                body.units,
                "Warehouse units",
                true
            );

        // --------------------------------------------------
        // BUY PRICE
        // --------------------------------------------------

        const buyPrice =
            number(
                body.buyPrice,
                "Buy price",
                true
            );

        // --------------------------------------------------
        // DELIVERY DAYS
        // --------------------------------------------------

        const days =
            wholeNumber(
                body.days || 0,
                "Delivery days"
            );

        // --------------------------------------------------
        // OTHER DATA
        // --------------------------------------------------

        const image =
            text(body.image);

        const description =
            text(
                body.description
            );

        const directionsOfUse =
            cleanDirectionsOfUse(
                body.directionsOfUse
            );

        // --------------------------------------------------
        // DUPLICATE CHECK
        // --------------------------------------------------

        const existing =
            await Stock.findOne({
                category,
                subcategory,
                isActive: true
            });

        if (existing) {
            throw new Error(
                `The subcategory "${subcategory}" already exists under the selected category. Select the existing stock record to update it.`
            );
        }

        // --------------------------------------------------
        // CREATE FIRST FIFO BATCH
        // --------------------------------------------------

        const purchaseBatches =
            units > 0
                ? [
                    {
                        units,

                        buyPrice,

                        purchasedAt:
                            new Date()
                    }
                ]
                : [];

        // --------------------------------------------------
        // CREATE STOCK
        // --------------------------------------------------

        const stock =
            await Stock.create({
                name:
                    name ||
                    subcategory,

                category,

                subcategory,

                days,

                image,

                units,

                buyPrice,

                purchaseBatches,

                description,

                directionsOfUse:
                    directionsOfUse ||
                    undefined
            });

        // --------------------------------------------------
        // RECALCULATE FIFO TOTALS
        // --------------------------------------------------

        await exports.recalculateStockTotals();

        return Stock.findById(
            stock._id
        ).lean();
    };

// ==========================================================
// UPDATE STOCK ENTRY
// ==========================================================

exports.updateStockEntry =
    async (
        stockId,
        body
    ) => {

        // --------------------------------------------------
        // VALIDATE STOCK ID
        // --------------------------------------------------

        if (
            !mongoose.isValidObjectId(
                stockId
            )
        ) {
            throw new Error(
                "Invalid stock subcategory."
            );
        }

        // --------------------------------------------------
        // GET EXISTING STOCK
        // --------------------------------------------------

        const stock =
            await Stock.findOne({
                _id:
                    stockId,

                isActive:
                    true
            });

        if (!stock) {
            throw new Error(
                "Stock subcategory not found."
            );
        }

        // --------------------------------------------------
        // ENSURE FIFO DATA
        // --------------------------------------------------

        await reconcilePurchaseBatches(
            stock
        );

        // --------------------------------------------------
        // CURRENT UNITS
        // --------------------------------------------------

        const currentUnits =
            wholeNumber(
                stock.units || 0,
                "Current warehouse units"
            );

        // --------------------------------------------------
        // NEW TOTAL
        // --------------------------------------------------

        if (
            body.units === "" ||
            body.units == null
        ) {
            throw new Error(
                "Warehouse units are required."
            );
        }

        const newTotalUnits =
            wholeNumber(
                body.units,
                "New warehouse units",
                true
            );

        // --------------------------------------------------
        // PREVENT REDUCTION
        // --------------------------------------------------

        if (
            newTotalUnits <
            currentUnits
        ) {
            throw new Error(
                `Warehouse units cannot be reduced. The current warehouse balance is ${currentUnits} units.`
            );
        }

        // --------------------------------------------------
        // CALCULATE ADDITIONAL UNITS
        // --------------------------------------------------

        const additionalUnits =
            newTotalUnits -
            currentUnits;

        // --------------------------------------------------
        // ADDITIONAL BUY PRICE
        // --------------------------------------------------

        let additionalBuyPrice =
            null;

        if (
            additionalUnits > 0
        ) {
            if (
                body.buyPrice === "" ||
                body.buyPrice == null
            ) {
                throw new Error(
                    `A buy price for the ${additionalUnits} additional unit${additionalUnits === 1 ? "" : "s"} is required.`
                );
            }

            additionalBuyPrice =
                number(
                    body.buyPrice,
                    "Buy price for additional units",
                    true
                );
        }

        // --------------------------------------------------
        // CATEGORY
        // --------------------------------------------------

        let category;

        if (
            text(body.category)
        ) {
            category =
                await validateCategory(
                    body.category
                );
        } else {
            category =
                text(
                    stock.category
                ).toLowerCase();

            if (!category) {
                throw new Error(
                    "Stock category is missing."
                );
            }
        }

        // --------------------------------------------------
        // SUBCATEGORY
        // --------------------------------------------------

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

        // --------------------------------------------------
        // STOCK NAME
        // --------------------------------------------------
        //
        // Preserve the supplied stock name.
        // If no name is supplied, use the subcategory.
        // --------------------------------------------------

        const stockName =
            cleanSubcategory(
                body.name ||
                stock.name ||
                subcategory
            );

        // --------------------------------------------------
        // DELIVERY DAYS
        // --------------------------------------------------

        const days =
            wholeNumber(
                body.days ??
                stock.days ??
                0,
                "Delivery days"
            );

        // --------------------------------------------------
        // DIRECTIONS
        // --------------------------------------------------

        const directionsOfUse =
            cleanDirectionsOfUse(
                body.directionsOfUse
            );

        // --------------------------------------------------
        // DUPLICATE CHECK
        // --------------------------------------------------

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
            });

        if (duplicate) {
            throw new Error(
                `The subcategory "${subcategory}" already belongs to another stock record under the selected category.`
            );
        }

        // ==================================================
        // BASIC INFORMATION
        // ==================================================

        stock.name =
            stockName;

        stock.category =
            category;

        stock.subcategory =
            subcategory;

        stock.days =
            days;

        stock.description =
            text(
                body.description
            );

        // ==================================================
        // IMAGE
        // ==================================================

        const image =
            text(body.image);

        if (image) {
            stock.image =
                image;
        }

        // ==================================================
        // ADD NEW FIFO BATCH
        // ==================================================

        if (
            additionalUnits > 0
        ) {
            stock.purchaseBatches.push(
                {
                    units:
                        additionalUnits,

                    buyPrice:
                        additionalBuyPrice,

                    purchasedAt:
                        new Date()
                }
            );

            stock.buyPrice =
                additionalBuyPrice;
        }

        // ==================================================
        // SET NEW TOTAL
        // ==================================================

        stock.units =
            newTotalUnits;

        // ==================================================
        // DIRECTIONS OF USE
        // ==================================================

        if (
            directionsOfUse !==
            undefined
        ) {
            stock.directionsOfUse =
                directionsOfUse ||
                undefined;
        }

        // ==================================================
        // SAVE STOCK
        // ==================================================

        await stock.save();

        // ==================================================
        // RESOLVE CATEGORY DOCUMENT
        // ==================================================

        const categoryDocument =
            await getCategoryByName(
                stock.category
            );

        if (!categoryDocument) {
            throw new Error(
                "The selected category no longer exists or is inactive."
            );
        }

        // ==================================================
        // RESOLVE PRODUCT NAME
        // ==================================================
        //
        // Stock.name first.
        // Stock.subcategory only as fallback.
        // ==================================================

        const resolvedProductName =
            productNameFromStock(
                stock
            );

        // ==================================================
        // SYNCHRONIZE PRODUCTS
        // ==================================================

        const productSync = {
            $set: {
                name:
                    resolvedProductName,

                category:
                    categoryDocument._id,

                subcategory:
                    stock.subcategory,

                days:
                    Number(
                        stock.days || 0
                    ),

                image:
                    stock.image || "",

                description:
                    stock.description || ""
            }
        };

        // ==================================================
        // PRODUCT DIRECTIONS
        // ==================================================

        const productDirections =
            directionsForProduct(
                stock
            );

        if (
            productDirections
        ) {
            productSync.$set
                .directionsOfUse =
                productDirections;
        } else {
            productSync.$unset = {
                directionsOfUse: 1
            };
        }

        // ==================================================
        // UPDATE PRODUCTS
        // ==================================================

        await Product.updateMany(
            {
                stock:
                    stock._id,

                isActive:
                    true
            },
            productSync
        );

        // ==================================================
        // GET PRODUCTS
        // ==================================================

        const productIds =
            await Product.find({
                stock:
                    stock._id
            }).distinct(
                "_id"
            );

        // ==================================================
        // SYNCHRONIZE SUBSTATION INVENTORY
        // ==================================================

        if (
            productIds.length
        ) {
            await Substation.updateMany(
                {
                    "productInventory.productId":
                        {
                            $in:
                                productIds
                        }
                },
                {
                    $set: {
                        "productInventory.$[item].productName":
                            resolvedProductName,

                        "productInventory.$[item].category":
                            categoryDocument._id,

                        "productInventory.$[item].subcategory":
                            stock.subcategory,

                        "productInventory.$[item].days":
                            Number(
                                stock.days ||
                                0
                            ),

                        "productInventory.$[item].updatedAt":
                            new Date()
                    }
                },
                {
                    arrayFilters: [
                        {
                            "item.productId":
                                {
                                    $in:
                                        productIds
                                }
                        }
                    ]
                }
            );
        }

        // ==================================================
        // RECALCULATE FIFO TOTALS
        // ==================================================

        await exports.recalculateStockTotals();

        // ==================================================
        // RETURN UPDATED STOCK
        // ==================================================

        return Stock.findById(
            stock._id
        ).lean();
    };

// ==========================================================
// NORMALIZE ALLOCATIONS
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
// CREATE PRODUCT FROM STOCK
// ==========================================================
//
// FIFO IS APPLIED HERE.
//
// Warehouse:
//
// 100 @ 100
//  50 @ 120
//
// Request:
//
// 130
//
// FIFO:
//
// 100 @ 100
//  30 @ 120
//
// Total cost:
//
// 13,600
//
// Weighted product cost:
//
// 13,600 / 130
// = 104.615384...
//
// PRODUCT NAME:
//
// Stock.name
//      ↓
// if empty/missing
//      ↓
// Stock.subcategory
//
// The Product model currently receives the weighted cost.
// Detailed batch history will be added later when the Product
// model is updated.
// ==========================================================

exports.createProductFromStock =
    async (
        stockId,
        body
    ) => {

        // --------------------------------------------------
        // VALIDATE STOCK ID
        // --------------------------------------------------

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
        // SELLING PRICE
        // --------------------------------------------------

        const unitSellPrice =
            number(
                body.unitSellPrice,
                "Selling price",
                true
            );

        // --------------------------------------------------
        // ALLOCATIONS
        // --------------------------------------------------

        const allocations =
            normalizeAllocations(
                body.allocations
            );

        if (
            !allocations.length
        ) {
            throw new Error(
                "Allocate at least one unit to at least one substation."
            );
        }

        const allocationTotal =
            allocations.reduce(
                (sum, item) =>
                    sum +
                    item.units,
                0
            );

        // --------------------------------------------------
        // SUBSTATION IDS
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

        // --------------------------------------------------
        // TRANSACTION
        // --------------------------------------------------

        const session =
            await mongoose.startSession();

        let product;

        try {
            await session.withTransaction(
                async () => {

                    // ======================================
                    // GET STOCK
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
                            "Stock subcategory not found."
                        );
                    }

                    // ======================================
                    // ENSURE FIFO DATA
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
                    // WAREHOUSE UNITS
                    // ======================================

                    const warehouseUnits =
                        wholeNumber(
                            stock.units || 0,
                            "Warehouse units"
                        );

                    // ======================================
                    // STOCK BALANCE CHECK
                    // ======================================

                    if (
                        allocationTotal >
                        warehouseUnits
                    ) {
                        throw new Error(
                            `Only ${warehouseUnits} units are available in this stock subcategory.`
                        );
                    }

                    // ======================================
                    // FIFO BALANCE CHECK
                    // ======================================

                    const fifoUnits =
                        totalBatchUnits(
                            stock
                        );

                    if (
                        allocationTotal >
                        fifoUnits
                    ) {
                        throw new Error(
                            `Only ${fifoUnits} FIFO units are available in this stock subcategory.`
                        );
                    }

                    // ======================================
                    // GET SUBSTATIONS
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
                    // VALIDATE SUBSTATIONS
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
                    // CONSUME FIFO
                    // ======================================

                    const fifoResult =
                        consumeFifoBatches(
                            stock,
                            allocationTotal
                        );

                    // ======================================
                    // FIFO COST
                    // ======================================

                    const fifoTotalCost =
                        Number(
                            fifoResult.totalCost
                        );

                    const fifoBuyPrice =
                        allocationTotal > 0
                            ? fifoTotalCost /
                            allocationTotal
                            : 0;

                    // ======================================
                    // FIND EXISTING PRODUCT
                    // ======================================

                    let existingProduct =
                        await Product.findOne({
                            stock:
                                stock._id,

                            isActive:
                                true
                        })
                            .session(
                                session
                            );

                    // ======================================
                    // PRODUCT NAME
                    // ======================================
                    //
                    // IMPORTANT:
                    //
                    // Use Stock.name when it exists.
                    //
                    // If Stock.name is empty/missing,
                    // use Stock.subcategory.
                    // ======================================

                    const resolvedProductName =
                        productNameFromStock(
                            stock
                        );

                    if (!resolvedProductName) {
                        throw new Error(
                            "The stock has no valid name or subcategory to use as the product name."
                        );
                    }

                    // ======================================
                    // PRODUCT DATA INHERITED FROM STOCK
                    // ======================================

                    const inherited = {
                        name:
                            resolvedProductName,

                        category:
                            category._id,

                        subcategory:
                            stock.subcategory,

                        days:
                            Number(
                                stock.days ||
                                0
                            ),

                        image:
                            stock.image ||
                            "",

                        description:
                            stock.description ||
                            "",

                        directionsOfUse:
                            directionsForProduct(
                                stock
                            )
                    };

                    // ======================================
                    // UPDATE EXISTING PRODUCT
                    // ======================================

                    if (
                        existingProduct
                    ) {
                        const existingUnits =
                            Number(
                                existingProduct.units ||
                                0
                            );

                        const existingBuyPrice =
                            Number(
                                existingProduct.buyPrice ||
                                0
                            );

                        // ----------------------------------
                        // EXISTING PRODUCT COST
                        // ----------------------------------

                        const existingCost =
                            existingUnits *
                            existingBuyPrice;

                        // ----------------------------------
                        // NEW FIFO COST
                        // ----------------------------------

                        const addedCost =
                            fifoTotalCost;

                        // ----------------------------------
                        // FINAL PRODUCT QUANTITY
                        // ----------------------------------

                        const finalUnits =
                            existingUnits +
                            allocationTotal;

                        // ----------------------------------
                        // WEIGHTED PRODUCT COST
                        // ----------------------------------

                        const weightedProductBuyPrice =
                            finalUnits > 0
                                ? (
                                    existingCost +
                                    addedCost
                                ) /
                                finalUnits
                                : 0;

                        existingProduct.units =
                            finalUnits;

                        existingProduct.unitSellPrice =
                            unitSellPrice;

                        existingProduct.buyPrice =
                            weightedProductBuyPrice;

                        Object.assign(
                            existingProduct,
                            inherited
                        );

                        await existingProduct.save({
                            session
                        });

                        product =
                            existingProduct;
                    }

                    // ======================================
                    // CREATE NEW PRODUCT
                    // ======================================

                    else {
                        const created =
                            await Product.create(
                                [
                                    {
                                        stock:
                                            stock._id,

                                        ...inherited,

                                        units:
                                            allocationTotal,

                                        buyPrice:
                                            fifoBuyPrice,

                                        unitSellPrice
                                    }
                                ],
                                {
                                    session
                                }
                            );

                        product =
                            created[0];
                    }

                    // ======================================
                    // DEDUCT WAREHOUSE STOCK
                    // ======================================

                    stock.units =
                        warehouseUnits -
                        allocationTotal;

                    // ======================================
                    // EMPTY WAREHOUSE
                    // ======================================

                    if (
                        stock.units ===
                        0
                    ) {
                        stock.purchaseBatches =
                            [];
                    }

                    // ======================================
                    // SAVE STOCK
                    // ======================================

                    await stock.save({
                        session
                    });

                    // ======================================
                    // UPDATE SUBSTATION INVENTORY
                    // ======================================

                    for (
                        const allocation
                        of allocations
                    ) {
                        const substation =
                            substationMap.get(
                                allocation.substationId
                            );

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
                            inventory.units =
                                Number(
                                    inventory.units ||
                                    0
                                ) +
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
                        }

                        // ----------------------------------
                        // NEW INVENTORY
                        // ----------------------------------

                        else {
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
                    // RECALCULATE FIFO TOTALS
                    // ======================================

                    await exports.recalculateStockTotals(
                        session
                    );
                }
            );

            return product;

        } finally {
            await session.endSession();
        }
    };