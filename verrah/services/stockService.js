// ==========================================================
// services/stockService.js
// STOCK SERVICE
//
// FIFO STOCK MANAGEMENT
//
// STOCK CREATION:
//
// 1. Create Stock.
// 2. Create Product from the Stock.
// 3. Product inherits the calculated unitBuyPrice.
// 4. Product.units starts at ZERO.
// 5. Product.unitSellPrice belongs to Product.
// 6. Substation inventory is NOT touched.
//
// STOCK CATEGORY:
//
// Category._id
//      ↓
// Stock.category = Category.name
//      ↓
// Product.category = Category._id
//
// PRICE OWNERSHIP:
//
// Stock.purchaseBatches
//      ↓
// FIFO purchase prices
//      ↓
// Stock.unitBuyPrice
//      ↓
// Product.unitBuyPrice
//
// Product.unitSellPrice
//      ↓
// SELLING PRICE
//
// IMPORTANT:
//
// - unitBuyPrice is ALWAYS calculated by the backend.
// - The client never supplies unitBuyPrice.
// - Existing FIFO batches are never repriced.
// - Editing stock adds a NEW FIFO batch.
// - During edit mode, body.units means ADDITIONAL units.
// - Stock does NOT store sell price.
//
// FIFO:
//
// Oldest purchase batch is consumed first.
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
//
// Total value of all remaining FIFO stock.
//
// Example:
//
// 10 units @ 100
// 20 units @ 120
//
// Value =
// 10 * 100 + 20 * 120
// = 3400
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
                (
                    units *
                    buyPrice
                )
            );

        },
        0
    );
}


// ==========================================================
// CALCULATE FIFO UNIT BUY PRICE
// ==========================================================
//
// This is the canonical backend calculation.
//
// unitBuyPrice =
// total remaining FIFO stock value
// --------------------------------
// total remaining FIFO units
//
// Example:
//
// 10 units @ 100
// 20 units @ 120
//
// total value = 3400
// total units = 30
//
// unitBuyPrice = 113.333333...
//
// The backend calculates this value.
// It is NEVER accepted from the form.
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

    const unitBuyPrice =
        value /
        units;

    if (
        !Number.isFinite(
            unitBuyPrice
        ) ||
        unitBuyPrice < 0
    ) {

        throw new Error(
            "Unable to calculate the unit buy price from FIFO stock."
        );
    }

    return unitBuyPrice;
}


// ==========================================================
// SET CALCULATED UNIT BUY PRICE
// ==========================================================
//
// Updates the in-memory Stock document with the calculated
// FIFO weighted-average unit buy price.
//
// IMPORTANT:
//
// This function never accepts a unitBuyPrice argument.
// ==========================================================

function setCalculatedUnitBuyPrice(stock) {

    const unitBuyPrice =
        calculateUnitBuyPrice(
            stock
        );

    stock.unitBuyPrice =
        unitBuyPrice;

    return unitBuyPrice;
}


// ==========================================================
// SORT FIFO BATCHES
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
// Legacy stock records may have units/buyPrice but no
// purchaseBatches.
//
// In that situation, create one FIFO batch from the existing
// warehouse stock.
//
// After reconstruction, unitBuyPrice is calculated from FIFO.
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
        units === 0
    ) {

        stock.purchaseBatches =
            [];

        stock.unitBuyPrice =
            0;

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

    setCalculatedUnitBuyPrice(
        stock
    );

    await stock.save({
        session
    });

    return stock.purchaseBatches;
}


// ==========================================================
// RECONCILE FIFO BATCHES
// ==========================================================
//
// Makes sure:
//
// Stock.units === total FIFO units
//
// Existing FIFO purchase prices are preserved.
//
// IMPORTANT:
//
// This function does NOT invent a new buy price for an edit.
// It only repairs a mismatch when one exists.
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

        const legacyBuyPrice =
            number(
                stock.buyPrice || 0,
                "Buy price"
            );

        batches = [
            {
                units:
                    expectedUnits,

                buyPrice:
                    legacyBuyPrice,

                purchasedAt:
                    fifoDate(
                        stock.createdAt
                    )
            }
        ];

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
    // BATCHES MATCH STOCK
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
    // FIFO TOTAL IS GREATER THAN STOCK
    //
    // This normally occurs after warehouse stock has been
    // consumed but FIFO quantities were not synchronized.
    //
    // Remove units from the oldest batches first.
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
    //
    // Legacy repair only.
    //
    // Missing units are assigned the legacy Stock.buyPrice.
    // Normal create/edit operations do NOT use this path.
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
                _id: raw,

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
// CONSUME FIFO STOCK
// ==========================================================
//
// Oldest FIFO batch is consumed first.
//
// Returns:
//
// consumed
// totalCost
// weightedBuyPrice
//
// weightedBuyPrice represents the cost of the units that
// were actually consumed.
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
                _id: id,

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
//
// Recalculates:
//
// - FIFO batches
// - unitBuyPrice
// - cashOutflow
// - categoryOveral
// - overal
//
// unitBuyPrice is always derived from FIFO.
//
// No submitted/request value is used.
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

        // --------------------------------------------------
        // RECONCILE FIFO FIRST
        // --------------------------------------------------

        for (
            const stock of stocks
        ) {

            await reconcilePurchaseBatches(
                stock,
                session
            );
        }

        // --------------------------------------------------
        // CALCULATE VALUES
        // --------------------------------------------------

        for (
            const stock of stocks
        ) {

            const fifoValue =
                calculateFifoValue(
                    stock
                );

            const unitBuyPrice =
                calculateUnitBuyPrice(
                    stock
                );

            stock.unitBuyPrice =
                unitBuyPrice;

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
                fifoValue
            );

            overall +=
                fifoValue;
        }

        // --------------------------------------------------
        // SAVE TOTALS
        // --------------------------------------------------

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
//
// CREATE MODE:
//
// body.units
//      ↓
// initial FIFO batch quantity
//
// body.buyPrice
//      ↓
// initial FIFO batch buy price
//
// FIFO
//      ↓
// calculate unitBuyPrice
//
// Product.unitBuyPrice
//      ↓
// calculated backend value
//
// Product.units
//      ↓
// 0
//
// IMPORTANT:
//
// body.unitBuyPrice is ignored completely.
// ==========================================================

exports.createStock =
    async (body) => {

        // --------------------------------------------------
        // NAME
        // --------------------------------------------------

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

        // --------------------------------------------------
        // CATEGORY
        // --------------------------------------------------

        const categoryDocument =
            await getCategory(
                body.category
            );

        const category =
            text(
                categoryDocument.name
            ).toLowerCase();

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
        // INITIAL UNITS
        // --------------------------------------------------

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

        // --------------------------------------------------
        // INITIAL FIFO BUY PRICE
        // --------------------------------------------------

        const buyPrice =
            number(
                body.buyPrice,
                "Buy price",
                true
            );

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
        // DELIVERY DAYS
        // --------------------------------------------------

        const days =
            wholeNumber(
                body.days || 0,
                "Delivery days"
            );

        // --------------------------------------------------
        // IMAGE
        // --------------------------------------------------

        const image =
            text(
                body.image
            );

        // --------------------------------------------------
        // DESCRIPTION
        // --------------------------------------------------

        const description =
            text(
                body.description
            );

        // --------------------------------------------------
        // DUPLICATE STOCK CHECK
        // --------------------------------------------------

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

        // ==================================================
        // CREATE FIFO BATCH
        // ==================================================

        const purchaseBatches = [
            {
                units,

                buyPrice,

                purchasedAt:
                    new Date()
            }
        ];

        // ==================================================
        // CALCULATE UNIT BUY PRICE
        // ==================================================
        //
        // There is one batch only, therefore:
        //
        // unitBuyPrice = buyPrice
        //
        // But we still calculate it through the same FIFO
        // calculation used everywhere else.
        // ==================================================

        const fifoValue =
            units *
            buyPrice;

        const unitBuyPrice =
            fifoValue /
            units;

        // ==================================================
        // TRANSACTION
        // ==================================================

        const session =
            await mongoose.startSession();

        let createdStock;
        let createdProduct;

        try {

            await session.withTransaction(
                async () => {

                    // ======================================
                    // CREATE STOCK
                    // ======================================

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

                                    buyPrice,

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

                    // ======================================
                    // CREATE PRODUCT
                    // ======================================
                    //
                    // Product starts with ZERO units.
                    //
                    // Its unitBuyPrice is calculated from
                    // the Stock FIFO.
                    // ======================================

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

                                    unitBuyPrice,

                                    // ------------------------------------------------
                                    // Compatibility:
                                    //
                                    // If the Product model still uses `buyPrice`
                                    // instead of `unitBuyPrice`, this keeps the
                                    // existing field populated as well.
                                    // ------------------------------------------------

                                    buyPrice:
                                        unitBuyPrice,

                                    unitSellPrice
                                }
                            ],
                            {
                                session
                            }
                        );

                    createdProduct =
                        productResult[0];

                    // ======================================
                    // NO SUBSTATION ALLOCATION
                    // ======================================
                    //
                    // Stock creation never modifies
                    // Substation.productInventory.
                    // ======================================
                }
            );

            // ------------------------------------------------
            // RECALCULATE TOTALS
            // ------------------------------------------------

            await exports.recalculateStockTotals();

            // ------------------------------------------------
            // RETURN FRESH RECORDS
            // ------------------------------------------------

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
//
// EDIT MODE:
//
// body.units
//      ↓
// ADDITIONAL units
//
// NOT:
//
// body.units = new total
//
// Example:
//
// Current stock = 100
// Form units = 25
//
// New total = 125
//
// FIFO:
//
// Existing batches remain unchanged.
// New batch = 25 units @ supplied buyPrice.
//
// Then:
//
// Stock.unitBuyPrice
//      ↓
// recalculated from ALL remaining FIFO batches
//
// Product.unitBuyPrice
//      ↓
// synchronized with calculated Stock.unitBuyPrice
//
// IMPORTANT:
//
// Existing FIFO batches are NEVER repriced.
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
                "Invalid stock."
            );
        }

        // ==================================================
        // TRANSACTION
        // ==================================================

        const session =
            await mongoose.startSession();

        try {

            let updatedStock;

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
                            "Stock not found."
                        );
                    }

                    // ======================================
                    // ENSURE FIFO
                    // ======================================

                    await reconcilePurchaseBatches(
                        stock,
                        session
                    );

                    // ======================================
                    // CURRENT UNITS
                    // ======================================

                    const currentUnits =
                        wholeNumber(
                            stock.units || 0,
                            "Current warehouse units"
                        );

                    // ======================================
                    // ADDITIONAL UNITS
                    // ======================================
                    //
                    // IMPORTANT:
                    //
                    // body.units is NOT the new total.
                    //
                    // It is the quantity being added.
                    // ======================================

                    const additionalUnits =
                        wholeNumber(
                            body.units,
                            "Additional warehouse units",
                            true
                        );

                    // ======================================
                    // ADDITIONAL BUY PRICE
                    // ======================================
                    //
                    // Required only when actually adding
                    // units.
                    //
                    // Existing FIFO batches are not
                    // repriced.
                    // ======================================

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

                    // ======================================
                    // CATEGORY
                    // ======================================

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

                        if (!category) {

                            throw new Error(
                                "Stock category is missing."
                            );
                        }
                    }

                    // ======================================
                    // SUBCATEGORY
                    // ======================================

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

                    // ======================================
                    // NAME
                    // ======================================

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

                    // ======================================
                    // SELL PRICE
                    // ======================================

                    const unitSellPrice =
                        number(
                            body.unitSellPrice ??
                            body.sellPrice,
                            "Selling price",
                            true
                        );

                    // ======================================
                    // DELIVERY DAYS
                    // ======================================

                    const days =
                        wholeNumber(
                            body.days ??
                            stock.days ??
                            0,
                            "Delivery days"
                        );

                    // ======================================
                    // IMAGE
                    // ======================================

                    const image =
                        text(
                            body.image
                        );

                    // ======================================
                    // DESCRIPTION
                    // ======================================

                    const description =
                        text(
                            body.description
                        );

                    // ======================================
                    // DUPLICATE CHECK
                    // ======================================

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

                    // ======================================
                    // UPDATE BASIC STOCK INFORMATION
                    // ======================================

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

                    // ======================================
                    // ADD NEW FIFO BATCH
                    // ======================================
                    //
                    // Existing batches remain exactly as
                    // they are.
                    //
                    // The supplied buyPrice belongs ONLY to
                    // this new batch.
                    // ======================================

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
                    }

                    // ======================================
                    // CALCULATE NEW TOTAL
                    // ======================================
                    //
                    // This is the critical architectural
                    // change.
                    //
                    // Current units + additional units.
                    // ======================================

                    const newTotalUnits =
                        currentUnits +
                        additionalUnits;

                    stock.units =
                        newTotalUnits;

                    // ======================================
                    // SORT FIFO
                    // ======================================

                    stock.purchaseBatches =
                        sortFifoBatches(
                            stock.purchaseBatches
                        );

                    // ======================================
                    // CALCULATE UNIT BUY PRICE
                    // ======================================
                    //
                    // ALWAYS calculated from FIFO.
                    //
                    // Never from body.unitBuyPrice.
                    // ======================================

                    const calculatedUnitBuyPrice =
                        calculateUnitBuyPrice(
                            stock
                        );

                    stock.unitBuyPrice =
                        calculatedUnitBuyPrice;

                    // ======================================
                    // SAVE STOCK
                    // ======================================

                    await stock.save({
                        session
                    });

                    // ======================================
                    // GET CATEGORY
                    // ======================================

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

                    // ======================================
                    // FIND PRODUCT
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

                    if (product) {

                        // ==================================
                        // PRODUCT BASIC INFORMATION
                        // ==================================

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

                        // ==================================
                        // PRODUCT UNIT BUY PRICE
                        // ==================================
                        //
                        // Backend-calculated FIFO value.
                        //
                        // We do NOT use:
                        //
                        // body.unitBuyPrice
                        //
                        // and we do NOT simply copy the
                        // latest batch price.
                        // ==================================

                        product.unitBuyPrice =
                            calculatedUnitBuyPrice;

                        // ==================================
                        // COMPATIBILITY WITH EXISTING SCHEMA
                        // ==================================

                        product.buyPrice =
                            calculatedUnitBuyPrice;

                        // ==================================
                        // SELL PRICE
                        // ==================================

                        product.unitSellPrice =
                            unitSellPrice;

                        // ==================================
                        // IMPORTANT:
                        //
                        // product.units is NOT changed.
                        //
                        // Stock quantity and Product
                        // quantity represent different
                        // stages of the inventory workflow.
                        // ==================================

                        await product.save({
                            session
                        });
                    }

                    updatedStock =
                        stock;
                }
            );

            // =================================================
            // RECALCULATE ALL STOCK TOTALS
            // =================================================
            //
            // This performs the final backend calculation
            // again from FIFO data.
            // =================================================

            await exports.recalculateStockTotals();

            // =================================================
            // RETURN FRESH STOCK
            // =================================================

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
// Used only by the separate product/substation allocation
// workflow.
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
// CREATE PRODUCT FROM STOCK / ALLOCATION
// ==========================================================
//
// SEPARATE OPERATION:
//
// Stock
//      ↓
// FIFO consumption
//      ↓
// Product
//      ↓
// Substation inventory
//
// This operation is responsible for moving warehouse stock
// into Product/Substation inventory.
//
// Stock creation itself does NOT allocate anything.
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

        // ==================================================
        // TRANSACTION
        // ==================================================

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
                            "Stock not found."
                        );
                    }

                    // ======================================
                    // ENSURE FIFO
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
                    // STOCK BALANCE
                    // ======================================

                    if (
                        allocationTotal >
                        warehouseUnits
                    ) {

                        throw new Error(
                            `Only ${warehouseUnits} units are available in this stock.`
                        );
                    }

                    // ======================================
                    // FIFO BALANCE
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
                            `Only ${fifoUnits} FIFO units are available in this stock.`
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

                    const fifoTotalCost =
                        Number(
                            fifoResult.totalCost
                        );

                    // ======================================
                    // FIND PRODUCT
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

                    const resolvedProductName =
                        productNameFromStock(
                            stock
                        );

                    if (
                        !resolvedProductName
                    ) {

                        throw new Error(
                            "The stock has no valid product name."
                        );
                    }

                    // ======================================
                    // CREATE PRODUCT IF MISSING
                    // ======================================

                    if (
                        !existingProduct
                    ) {

                        const calculatedUnitBuyPrice =
                            calculateUnitBuyPrice(
                                stock
                            );

                        const created =
                            await Product.create(
                                [
                                    {
                                        stock:
                                            stock._id,

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

                                        units:
                                            0,

                                        unitBuyPrice:
                                            calculatedUnitBuyPrice,

                                        buyPrice:
                                            calculatedUnitBuyPrice,

                                        unitSellPrice
                                    }
                                ],
                                {
                                    session
                                }
                            );

                        existingProduct =
                            created[0];
                    }

                    // ======================================
                    // EXISTING PRODUCT QUANTITY
                    // ======================================

                    const existingUnits =
                        Number(
                            existingProduct.units ||
                            0
                        );

                    // ======================================
                    // EXISTING PRODUCT UNIT BUY PRICE
                    // ======================================

                    const existingUnitBuyPrice =
                        Number(
                            existingProduct.unitBuyPrice ??
                            existingProduct.buyPrice ??
                            0
                        );

                    // ======================================
                    // EXISTING PRODUCT VALUE
                    // ======================================

                    const existingCost =
                        existingUnits *
                        existingUnitBuyPrice;

                    // ======================================
                    // NEW PRODUCT QUANTITY
                    // ======================================

                    const finalUnits =
                        existingUnits +
                        allocationTotal;

                    // ======================================
                    // NEW PRODUCT UNIT BUY PRICE
                    // ======================================
                    //
                    // Weighted average of:
                    //
                    // existing Product stock value
                    // +
                    // FIFO cost of newly allocated units
                    //
                    // divided by final Product units.
                    // ======================================

                    const calculatedProductUnitBuyPrice =
                        finalUnits > 0
                            ? (
                                existingCost +
                                fifoTotalCost
                            ) /
                            finalUnits
                            : 0;

                    // ======================================
                    // UPDATE PRODUCT
                    // ======================================

                    existingProduct.name =
                        resolvedProductName;

                    existingProduct.category =
                        category._id;

                    existingProduct.subcategory =
                        stock.subcategory;

                    existingProduct.days =
                        Number(
                            stock.days ||
                            0
                        );

                    existingProduct.image =
                        stock.image ||
                        "";

                    existingProduct.description =
                        stock.description ||
                        "";

                    existingProduct.units =
                        finalUnits;

                    existingProduct.unitBuyPrice =
                        calculatedProductUnitBuyPrice;

                    // Compatibility with existing schema.
                    existingProduct.buyPrice =
                        calculatedProductUnitBuyPrice;

                    existingProduct.unitSellPrice =
                        unitSellPrice;

                    await existingProduct.save({
                        session
                    });

                    product =
                        existingProduct;

                    // ======================================
                    // DEDUCT WAREHOUSE STOCK
                    // ======================================

                    stock.units =
                        warehouseUnits -
                        allocationTotal;

                    // ======================================
                    // RECALCULATE REMAINING FIFO UNIT BUY
                    // PRICE AFTER CONSUMPTION
                    // ======================================

                    stock.purchaseBatches =
                        stock.purchaseBatches.filter(
                            (batch) =>
                                batchUnits(batch) > 0
                        );

                    stock.unitBuyPrice =
                        calculateUnitBuyPrice(
                            stock
                        );

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
                    // RECALCULATE STOCK TOTALS
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