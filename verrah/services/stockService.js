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
// Product.category still stores Category._id.
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
// The individual FIFO batch consumption is handled here.
// Product batch history will be handled when the Product
// model is updated.
// ==========================================================

const mongoose = require("mongoose");

const Stock = require("../models/stock");
const Product = require("../models/products");
const Category = require("../models/category");
const Substation = require("../models/substations");

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
        .replace(/\b\w/g, (c) => c.toUpperCase());

// ==========================================================
// FIFO DATE
// ==========================================================
//
// Used when creating a purchase batch.
//
// The batch purchase date is intentionally kept separate
// from the stock record's updatedAt.
// ==========================================================

function fifoDate(value) {
    const date =
        value instanceof Date
            ? value
            : new Date(value || Date.now());

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
            Number(
                batch?.units || 0
            ),
        0
    );
}

// ==========================================================
// SORT FIFO BATCHES
// ==========================================================
//
// Oldest purchase date first.
//
// If two batches have the same date, their original array
// position is preserved by the stable sort behavior.
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
// ENSURE FIFO BATCHES
// ==========================================================
//
// Existing Stock records created before FIFO was introduced
// may not have purchaseBatches.
//
// In that case, the existing warehouse balance is treated as
// one legacy FIFO batch using the current Stock.buyPrice.
//
// This allows old stock records to enter the FIFO system
// without losing their existing balance.
//
// IMPORTANT:
//
// This is only a migration bridge.
//
// New stock additions create separate batches.
// ==========================================================

async function ensurePurchaseBatches(
    stock,
    session = null
) {
    if (
        Array.isArray(
            stock.purchaseBatches
        ) &&
        stock.purchaseBatches.length
    ) {
        return stock.purchaseBatches;
    }

    const units =
        wholeNumber(
            stock.units || 0,
            "Warehouse units"
        );

    if (units <= 0) {
        stock.purchaseBatches = [];

        await stock.save({
            session
        });

        return stock.purchaseBatches;
    }

    const buyPrice =
        number(
            stock.buyPrice || 0,
            "Buy price"
        );

    const purchasedAt =
        fifoDate(
            stock.createdAt
        );

    stock.purchaseBatches = [
        {
            units,
            buyPrice,
            purchasedAt
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
// Normally:
//
//     sum(purchaseBatches.units) === stock.units
//
// If an older database record has a mismatch, this function
// repairs the FIFO queue without inventing additional stock.
//
// The repair preserves the existing batch order and adjusts
// the newest batch when necessary.
//
// If there are no batches, a legacy batch is created.
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
    // NO STOCK
    // ------------------------------------------------------

    if (
        expectedUnits === 0
    ) {
        stock.purchaseBatches = [];

        await stock.save({
            session
        });

        return stock.purchaseBatches;
    }

    // ------------------------------------------------------
    // NO VALID BATCHES
    // ------------------------------------------------------

    if (!batches.length) {
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
    // BATCH TOTAL ALREADY MATCHES
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
    // BATCH TOTAL IS GREATER THAN STOCK BALANCE
    // ------------------------------------------------------
    //
    // This can happen when stock was historically deducted
    // before FIFO batches existed.
    //
    // Remove units from the OLDEST batches first so that the
    // remaining queue represents the current warehouse stock.
    //
    // This preserves FIFO semantics for what remains.
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
                Number(
                    batch.units || 0
                );

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
                    Number(
                        batch.units || 0
                    ) > 0
            );

        await stock.save({
            session
        });

        return stock.purchaseBatches;
    }

    // ------------------------------------------------------
    // BATCH TOTAL IS LESS THAN STOCK BALANCE
    // ------------------------------------------------------
    //
    // Additional units exist that are not represented by a
    // batch. Treat the missing units as a legacy purchase at
    // the current stock.buyPrice.
    //
    // This is only a compatibility repair.
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
//
// Accepts Category._id OR Category.name.
//
// Returns the complete Category document.
//
// Category.name is what gets stored in Stock.category.
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

    // ------------------------------------------------------
    // CATEGORY OBJECT ID
    // ------------------------------------------------------

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

    // ------------------------------------------------------
    // CATEGORY NAME
    // ------------------------------------------------------

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
//
// Returns Category.name.
//
// This is the value stored in Stock.category.
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
                text(name).toLowerCase(),

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
//
// Unlike the previous implementation:
//
//     units × current buyPrice
//
// FIFO valuation uses:
//
//     batch.units × batch.buyPrice
//
// This prevents newly purchased stock from retroactively
// repricing older stock.
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
                Number(
                    batch?.units || 0
                );

            const buyPrice =
                Number(
                    batch?.buyPrice || 0
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
// RECALCULATE STOCK TOTALS
// ==========================================================

async function recalculateStockTotals(
    session = null
) {
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

    // ------------------------------------------------------
    // ENSURE FIFO DATA
    // ------------------------------------------------------

    for (
        const stock of stocks
    ) {
        await reconcilePurchaseBatches(
            stock,
            session
        );
    }

    // ------------------------------------------------------
    // CALCULATE VALUES
    // ------------------------------------------------------

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

    // ------------------------------------------------------
    // UPDATE TOTALS
    // ------------------------------------------------------

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
}

// ==========================================================
// CONSUME FIFO STOCK
// ==========================================================
//
// Consumes stock from the oldest purchase batches first.
//
// Example:
//
// Batch 1 → 100 @ 100
// Batch 2 →  50 @ 120
//
// Consume 130:
//
// Batch 1 → consume 100 @ 100
// Batch 2 → consume  30 @ 120
//
// Returns:
//
// {
//     consumed: [...],
//     totalCost,
//     weightedBuyPrice
// }
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

    // ------------------------------------------------------
    // FIFO CONSUMPTION
    // ------------------------------------------------------

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

        const buyPrice =
            Number(
                batch.buyPrice || 0
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

    // ------------------------------------------------------
    // INSUFFICIENT FIFO STOCK
    // ------------------------------------------------------

    if (
        remaining > 0
    ) {
        throw new Error(
            `Only ${quantity - remaining} FIFO units are available, but ${quantity} units were requested.`
        );
    }

    // ------------------------------------------------------
    // REMOVE EMPTY BATCHES
    // ------------------------------------------------------

    stock.purchaseBatches =
        batches.filter(
            (batch) =>
                Number(
                    batch.units || 0
                ) > 0
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
//
// Stock.category contains Category.name.
//
// Categories are loaded separately so the UI still receives
// the Category document for icon/name information.
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
// EXPORT RECALCULATION
// ==========================================================

exports.recalculateStockTotals =
    recalculateStockTotals;

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
            text(body.description);

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
        // CREATE STOCK
        // --------------------------------------------------
        //
        // The initial stock quantity is the first FIFO batch.
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

                purchaseBatches:
                    units > 0
                        ? [
                            {
                                units,

                                buyPrice,

                                purchasedAt:
                                    new Date()
                            }
                        ]
                        : [],

                description,

                directionsOfUse:
                    directionsOfUse ||
                    undefined
            });

        await recalculateStockTotals();

        return Stock.findById(
            stock._id
        ).lean();
    };

// ==========================================================
// UPDATE STOCK ENTRY
// ==========================================================
//
// EDITING RULES:
//
// 1. body.units represents the NEW TOTAL warehouse units.
//
// 2. The new total MUST NOT be less than the current units.
//
// 3. If the new total is greater than the current units,
//    a buy price for the ADDITIONAL units is mandatory.
//
// 4. If the new total equals the current units,
//    no additional buy price is required.
//
// 5. additionalUnits is calculated internally:
//
//      additionalUnits = newTotalUnits - currentUnits
//
// 6. Existing stock units are never reduced through this
//    editing operation.
//
// 7. The supplied buy price applies ONLY to the newly added
//    FIFO batch.
//
// 8. Existing FIFO batches retain their original prices.
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
                _id: stockId,
                isActive: true
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
        // CURRENT WAREHOUSE UNITS
        // --------------------------------------------------

        const currentUnits =
            wholeNumber(
                stock.units || 0,
                "Current warehouse units"
            );

        // --------------------------------------------------
        // NEW TOTAL UNITS
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
        // PREVENT STOCK REDUCTION
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

                isActive: true
            });

        if (duplicate) {
            throw new Error(
                `The subcategory "${subcategory}" already belongs to another stock record under the selected category.`
            );
        }

        // ==================================================
        // UPDATE BASIC STOCK INFORMATION
        // ==================================================

        stock.name =
            subcategory;

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
        // ADD FIFO PURCHASE BATCH
        // ==================================================
        //
        // IMPORTANT:
        //
        // We DO NOT change the price of existing batches.
        //
        // Example:
        //
        // Existing:
        // 100 @ 100
        //
        // Add:
        // 50 @ 120
        //
        // Result:
        // 100 @ 100
        //  50 @ 120
        //
        // The old 100 units remain at 100.
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

            // ------------------------------------------------
            // Keep legacy Stock.buyPrice synchronized with
            // the newest purchase price.
            //
            // FIFO valuation does NOT use this field.
            // ------------------------------------------------

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
        // SYNCHRONIZE PRODUCTS
        // ==================================================
        //
        // Do NOT change Product.units here.
        //
        // Product.units represents units already allocated
        // to products/substations.
        //
        // Stock.units represents warehouse balance.
        //
        // Product.buyPrice is also NOT changed here merely
        // because warehouse stock received a new batch.
        //
        // This is important for FIFO accounting.
        // ==================================================

        const productSync = {
            $set: {
                name:
                    stock.name,

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
        //
        // Notice:
        //
        // Product.buyPrice is intentionally NOT changed here.
        //
        // A product already allocated from warehouse stock
        // retains the cost assigned when its units were created.
        //
        // FIFO is applied when units are actually allocated
        // from warehouse stock.
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
        // SYNCHRONIZE SUBSTATION INVENTORY
        // ==================================================

        const productIds =
            await Product.find({
                stock:
                    stock._id
            }).distinct(
                "_id"
            );

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
                            stock.name,

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
        // RECALCULATE STOCK TOTALS
        // ==================================================

        await recalculateStockTotals();

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
// The requested product quantity is taken from the oldest
// available purchase batch first.
//
// Example:
//
// Warehouse:
//
// 100 units @ 100
//  50 units @ 120
//
// Create product with 130 units:
//
// 100 units @ 100
//  30 units @ 120
//
// Total FIFO cost:
//
// (100 × 100) + (30 × 120)
// = 13,600
//
// Weighted Product.buyPrice:
//
// 13,600 / 130
// = 104.615384...
//
// Product.buyPrice is therefore the weighted FIFO cost of
// the units actually allocated to that product.
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

        const unitSellPrice =
            number(
                body.unitSellPrice,
                "Selling price",
                true
            );

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
                    // ENSURE FIFO BATCHES
                    // ======================================

                    await reconcilePurchaseBatches(
                        stock,
                        session
                    );

                    // ======================================
                    // RESOLVE CATEGORY
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

                    const warehouseUnits =
                        Number(
                            stock.units ||
                            0
                        );

                    // ======================================
                    // STOCK CHECK
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
                    // FIFO CHECK
                    // ======================================
                    //
                    // Confirm that the FIFO queue has enough
                    // actual batch units.
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
                                (s) => [
                                    String(
                                        s._id
                                    ),
                                    s
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
                    //
                    // This happens BEFORE the stock quantity
                    // is deducted.
                    //
                    // If FIFO consumption fails, the transaction
                    // is aborted.
                    // ======================================

                    const fifoResult =
                        consumeFifoBatches(
                            stock,
                            allocationTotal
                        );

                    const fifoBuyPrice =
                        Number(
                            fifoResult.weightedBuyPrice
                        );

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
                    // PRODUCT DATA
                    // ======================================

                    const inherited = {
                        name:
                            stock.name,

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

                        const existingCost =
                            existingUnits *
                            existingBuyPrice;

                        const addedCost =
                            allocationTotal *
                            fifoBuyPrice;

                        const finalUnits =
                            existingUnits +
                            allocationTotal;

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
                    // DEDUCT STOCK
                    // ======================================
                    //
                    // stock.units is the warehouse balance.
                    //
                    // purchaseBatches has already been reduced
                    // according to FIFO.
                    // ======================================

                    stock.units =
                        warehouseUnits -
                        allocationTotal;

                    // ------------------------------------------------
                    // If warehouse is empty, all FIFO batches must
                    // also be empty.
                    // ------------------------------------------------

                    if (
                        stock.units ===
                        0
                    ) {
                        stock.purchaseBatches =
                            [];
                    }

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
                    // RECALCULATE TOTALS
                    // ======================================

                    await recalculateStockTotals(
                        session
                    );
                }
            );

            return product;

        } finally {
            await session.endSession();
        }
    };