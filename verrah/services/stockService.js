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
// 3. Product inherits Stock.buyPrice.
// 4. Product.units starts at ZERO.
// 5. Product.unitSellPrice belongs to Product.
// 6. Substation inventory is NOT touched.
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
// PRICE OWNERSHIP:
//
// Stock.buyPrice
//      ↓
// Product.buyPrice
//
// Product.unitSellPrice
//      ↓
// SELLING PRICE
//
// Stock does NOT store sell price.
//
// FIFO:
//
// Stock.purchaseBatches stores individual purchases.
//
// Oldest purchase is consumed first.
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

    if (units === 0) {

        stock.purchaseBatches =
            [];

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

    await stock.save({
        session
    });

    return stock.purchaseBatches;
}

// ==========================================================
// RECONCILE FIFO BATCHES
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

    if (
        batchTotal ===
        expectedUnits
    ) {

        stock.purchaseBatches =
            batches;

        return stock.purchaseBatches;
    }

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

    } else {

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
            batchUnits(batch);

        if (
            available <= 0
        ) {
            continue;
        }

        const buyPrice =
            batchBuyPrice(batch);

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
                "name category subcategory days image units buyPrice description purchaseBatches"
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
//
// Kept because other parts of the stock service may still
// use this method.
//
// IMPORTANT:
//
// Stock creation does NOT use this.
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
// RECALCULATE STOCK TOTALS
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
// CREATION FLOW:
//
//                  STOCK FORM
//                      │
//                      ↓
//                   STOCK
//                      │
//             ┌────────┴────────┐
//             ↓                 ↓
//        warehouse units    buyPrice
//        FIFO batches          │
//                               ↓
//                            PRODUCT
//                               │
//                    ┌──────────┴──────────┐
//                    ↓                     ↓
//                 units = 0          buyPrice = Stock.buyPrice
//                                          │
//                                          ↓
//                                  unitSellPrice
//
// IMPORTANT:
//
// - Sell price belongs ONLY to Product.
// - Stock does NOT receive a sell-price field.
// - Product is created immediately.
// - Product.units starts at ZERO.
// - No stock is allocated to substations.
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
        // WAREHOUSE UNITS
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
        // PRODUCT SELL PRICE
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
            text(body.image);

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
                isActive: true
            });

        if (existing) {

            throw new Error(
                `The subcategory "${subcategory}" already exists under the selected category. Select the existing stock record to update it.`
            );
        }

        // --------------------------------------------------
        // FIFO BATCH
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
                    //
                    // ONLY STOCK FIELDS ARE STORED HERE.
                    //
                    // NOTICE:
                    //
                    // There is NO sell price on Stock.
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
                    // Product inherits:
                    //
                    // - name
                    // - category
                    // - subcategory
                    // - days
                    // - image
                    // - description
                    // - buyPrice
                    //
                    // Product.units starts at ZERO.
                    //
                    // Product.unitSellPrice comes from
                    // the stock creation form.
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

                                    buyPrice:
                                        buyPrice,

                                    unitSellPrice:
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
                    // SUBSTATIONS
                    // ======================================
                    //
                    // NOTHING IS ALLOCATED HERE.
                    //
                    // Product.units remains ZERO.
                    // Substation inventory is untouched.
                    //
                    // Allocation happens later through
                    // createProductFromStock().
                    // ======================================
                }
            );

            // ------------------------------------------------
            // RECALCULATE STOCK TOTALS
            // ------------------------------------------------

            await exports.recalculateStockTotals();

            // ------------------------------------------------
            // RETURN STOCK + PRODUCT
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
// Editing Stock:
//
// - Warehouse units cannot decrease.
// - Additional units create a new FIFO batch.
// - Existing FIFO batches are never repriced.
// - Product sell price may be updated.
// - Product quantity is NOT changed here.
// - Substation quantities are NOT changed here.
//
// IMPORTANT:
//
// Sell price belongs to Product.
// It is therefore NOT written to Stock.
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

        // --------------------------------------------------
        // GET STOCK
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
                "Stock not found."
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
        // ADDITIONAL UNITS
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
        // NAME
        // --------------------------------------------------

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

        // --------------------------------------------------
        // PRODUCT SELL PRICE
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
                body.days ??
                stock.days ??
                0,
                "Delivery days"
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
        // UPDATE STOCK DETAILS
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

        const image =
            text(body.image);

        if (image) {

            stock.image =
                image;
        }

        // ==================================================
        // ADD FIFO BATCH
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
        // SET TOTAL STOCK UNITS
        // ==================================================

        stock.units =
            newTotalUnits;

        // ==================================================
        // SAVE STOCK
        // ==================================================
        //
        // No sell price is saved here.
        // ==================================================

        await stock.save();

        // ==================================================
        // GET CATEGORY DOCUMENT
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
        // PRODUCT NAME
        // ==================================================

        const resolvedProductName =
            productNameFromStock(
                stock
            );

        // ==================================================
        // UPDATE PRODUCT
        // ==================================================
        //
        // Product.units is deliberately NOT changed.
        //
        // Product.buyPrice is also NOT overwritten here.
        //
        // Product.buyPrice is controlled by FIFO when
        // warehouse stock is actually dispatched.
        //
        // Only the Product's sell price is updated from
        // the stock edit form.
        // ==================================================

        const product =
            await Product.findOne({
                stock:
                    stock._id,

                isActive:
                    true
            });

        if (product) {

            product.name =
                resolvedProductName;

            product.category =
                categoryDocument._id;

            product.subcategory =
                stock.subcategory;

            product.days =
                Number(
                    stock.days || 0
                );

            product.image =
                stock.image || "";

            product.description =
                stock.description || "";

            product.unitSellPrice =
                unitSellPrice;

            await product.save();
        }

        // ==================================================
        // RECALCULATE FIFO TOTALS
        // ==================================================

        await exports.recalculateStockTotals();

        // ==================================================
        // RETURN STOCK
        // ==================================================

        return Stock.findById(
            stock._id
        ).lean();
    };

// ==========================================================
// NORMALIZE ALLOCATIONS
// ==========================================================
//
// Kept for the separate product/substation allocation flow.
//
// It is NOT used during stock creation.
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
// THIS IS A SEPARATE OPERATION FROM STOCK CREATION.
//
// It consumes warehouse FIFO stock and allocates product
// units to substations.
//
// Therefore this function is the place where:
//
// Stock.units
// Product.units
// Substation.productInventory.units
//
// are changed together.
//
// Stock creation itself does NONE of this.
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
                    //
                    // Normally the product already exists
                    // because stock creation creates it.
                    //
                    // This fallback supports older Stock
                    // records that do not yet have a Product.
                    //
                    // The product inherits Stock.buyPrice
                    // when initially created.
                    // ======================================

                    if (
                        !existingProduct
                    ) {

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

                                        buyPrice:
                                            Number(
                                                stock.buyPrice ||
                                                0
                                            ),

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

                    const existingBuyPrice =
                        Number(
                            existingProduct.buyPrice ||
                            0
                        );

                    const existingCost =
                        existingUnits *
                        existingBuyPrice;

                    const finalUnits =
                        existingUnits +
                        allocationTotal;

                    const weightedProductBuyPrice =
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

                    existingProduct.buyPrice =
                        weightedProductBuyPrice;

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
                    // RECALCULATE TOTALS
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