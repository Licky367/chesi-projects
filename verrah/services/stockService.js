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
// - FIFO exists ONLY on Stock.purchaseBatches.
// - Product does NOT have FIFO batches.
// - Product.units does NOT have to equal any Product FIFO
//   batch quantity because Product has no FIFO batches.
// - unitBuyPrice is ALWAYS calculated by the backend.
// - Client-supplied unitBuyPrice is ignored.
// - Stock creation does NOT touch substations.
// - Stock edit adds a NEW FIFO purchase batch.
// - During stock edit, body.units means ADDITIONAL units.
// - During stock edit, body.buyPrice is the TOTAL purchase
//   cost for those additional units.
// - Product.unitSellPrice belongs to Product.
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
// IMPORTANT:
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
//
// Calculates the total cost of the remaining warehouse
// stock using the actual FIFO purchase batches.
//
// Example:
//
// 10 @ 100
// 20 @ 120
//
// Value = 3400
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
//
// unitBuyPrice =
// remaining FIFO stock value
// --------------------------
// remaining FIFO units
//
// This is always calculated by the backend.
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

    // Compatibility with the existing Stock schema.
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
// SORT FIFO
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
// This only handles legacy Stock records that predate
// purchaseBatches.
//
// It does NOT create Product FIFO batches.
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
            stock.buyPrice = 0;
        }

        await stock.save({
            session
        });

        return stock.purchaseBatches;
    }

    // ------------------------------------------------------
    // Legacy Stock.buyPrice was historically treated as a
    // unit cost when reconstructing a missing FIFO batch.
    // ------------------------------------------------------

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
// RECONCILE FIFO
// ==========================================================
//
// Ensures:
//
// Stock.units === total FIFO units
//
// This is only for repairing existing Stock records.
//
// It does NOT create Product FIFO data.
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
            stock.buyPrice = 0;
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
    //
    // Remove the excess from the oldest FIFO batches.
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
    //
    // Legacy repair only.
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
// CONSUME FIFO STOCK
// ==========================================================
//
// ONLY Stock.purchaseBatches are consumed here.
//
// There is NO Product FIFO system.
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

    return {
        consumed,

        totalCost,

        weightedBuyPrice:
            totalCost /
            quantity
    };
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
//
// All calculations come from Stock.purchaseBatches.
//
// No Product FIFO data is created or checked.
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
        // RECONCILE STOCK FIFO
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
// body.units
//      = initial warehouse quantity
//
// body.buyPrice
//      = TOTAL purchase cost
//
// backend:
//
// unitBuyPrice =
// total purchase cost / units
//
// Product.units = 0
//
// No substation is touched.
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
        // TOTAL PURCHASE COST
        // --------------------------------------------------

        const totalPurchaseCost =
            number(
                body.buyPrice,
                "Total purchase cost",
                true
            );

        // --------------------------------------------------
        // CALCULATE PER-UNIT COST
        // --------------------------------------------------

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
        // DAYS
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
        // DUPLICATE
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

        // --------------------------------------------------
        // INITIAL FIFO BATCH
        //
        // FIFO stores PER-UNIT cost.
        // --------------------------------------------------

        const purchaseBatches = [
            {
                units,

                buyPrice:
                    unitBuyPrice,

                purchasedAt:
                    new Date()
            }
        ];

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
                    // STOCK
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

                                    // Compatibility field:
                                    // calculated per-unit cost.
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

                    // ======================================
                    // PRODUCT
                    // ======================================
                    //
                    // Product starts at ZERO units.
                    //
                    // Product does NOT receive FIFO batches.
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

                    // ------------------------------------------------
                    // NO SUBSTATION MODIFICATION.
                    // ------------------------------------------------
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
//
// EDIT MODE:
//
// body.units
//      = ADDITIONAL units
//
// body.buyPrice
//      = TOTAL purchase cost for those additional units
//
// Example:
//
// Existing:
// 100 units
//
// Edit:
// 25 units
// KSh 5,000 total purchase cost
//
// New FIFO batch:
// 25 @ 200
//
// New Stock:
// 125 units
//
// Existing FIFO batches are NOT repriced.
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

                    const additionalUnits =
                        wholeNumber(
                            body.units,
                            "Additional warehouse units",
                            true
                        );

                    // ======================================
                    // ADDITIONAL TOTAL PURCHASE COST
                    // ======================================

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
                    }

                    if (!category) {

                        throw new Error(
                            "Stock category is missing."
                        );
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
                            body.sellPrice ??
                            0,
                            "Selling price"
                        );

                    // ======================================
                    // DAYS
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
                    // DUPLICATE
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
                    // BASIC STOCK DATA
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
                    // Existing FIFO batches remain untouched.
                    // ======================================

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

                    // ======================================
                    // NEW STOCK TOTAL
                    // ======================================

                    stock.units =
                        currentUnits +
                        additionalUnits;

                    // ======================================
                    // SORT FIFO
                    // ======================================

                    stock.purchaseBatches =
                        sortFifoBatches(
                            stock.purchaseBatches
                        );

                    // ======================================
                    // CALCULATE STOCK UNIT BUY PRICE
                    // ======================================

                    const calculatedUnitBuyPrice =
                        calculateUnitBuyPrice(
                            stock
                        );

                    stock.unitBuyPrice =
                        calculatedUnitBuyPrice;

                    // Compatibility with existing schema.
                    stock.buyPrice =
                        calculatedUnitBuyPrice;

                    // ======================================
                    // SAVE STOCK
                    // ======================================

                    await stock.save({
                        session
                    });

                    // ======================================
                    // CATEGORY DOCUMENT
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
                    // PRODUCT
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

                        // ------------------------------------------------
                        // IMPORTANT:
                        //
                        // Product.buyPrice represents the cost of Product
                        // inventory already allocated to Product.
                        //
                        // Adding warehouse stock does NOT add units to
                        // Product, so Product.units and Product.buyPrice
                        // are NOT changed here.
                        //
                        // This prevents warehouse stock from being
                        // incorrectly counted as allocated Product stock.
                        // ------------------------------------------------

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
// STOCK
//   ↓
// consume Stock.purchaseBatches FIFO
//   ↓
// PRODUCT
//   ↓
// SUBSTATION PRODUCT INVENTORY
//
// IMPORTANT:
//
// Product has NO FIFO batches.
//
// The FIFO cost consumed from Stock is used to calculate
// Product's weighted unit buy price.
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
                    // ENSURE STOCK FIFO
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

                    if (
                        allocationTotal >
                        warehouseUnits
                    ) {

                        throw new Error(
                            `Only ${warehouseUnits} units are available in this stock.`
                        );
                    }

                    // ======================================
                    // FIFO UNITS
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
                    // SUBSTATIONS
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
                    // CONSUME STOCK FIFO
                    // ======================================
                    //
                    // This is the ONLY FIFO consumption.
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
                    // PRODUCT
                    // ======================================

                    let product =
                        await Product.findOne({
                            stock:
                                stock._id,

                            isActive:
                                true
                        })
                            .session(
                                session
                            );

                    const productName =
                        productNameFromStock(
                            stock
                        );

                    if (!productName) {

                        throw new Error(
                            "The stock has no valid product name."
                        );
                    }

                    // ======================================
                    // CREATE PRODUCT IF MISSING
                    // ======================================
                    //
                    // No FIFO batches are created for Product.
                    // ======================================

                    if (!product) {

                        const created =
                            await Product.create(
                                [
                                    {
                                        stock:
                                            stock._id,

                                        name:
                                            productName,

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

                        product =
                            created[0];
                    }

                    // ======================================
                    // EXISTING PRODUCT UNITS
                    // ======================================

                    const existingProductUnits =
                        wholeNumber(
                            product.units || 0,
                            "Product units"
                        );

                    // ======================================
                    // EXISTING PRODUCT UNIT COST
                    // ======================================

                    const existingProductUnitBuyPrice =
                        number(
                            product.unitBuyPrice ??
                            product.buyPrice ??
                            0,
                            "Product unit buy price"
                        );

                    // ======================================
                    // EXISTING PRODUCT VALUE
                    // ======================================

                    const existingProductValue =
                        existingProductUnits *
                        existingProductUnitBuyPrice;

                    // ======================================
                    // NEW PRODUCT UNITS
                    // ======================================

                    const newProductUnits =
                        existingProductUnits +
                        allocationTotal;

                    // ======================================
                    // NEW PRODUCT TOTAL VALUE
                    // ======================================

                    const newProductValue =
                        existingProductValue +
                        fifoTotalCost;

                    // ======================================
                    // NEW PRODUCT UNIT COST
                    // ======================================

                    const newProductUnitBuyPrice =
                        newProductUnits > 0
                            ? newProductValue /
                                newProductUnits
                            : 0;

                    // ======================================
                    // UPDATE PRODUCT
                    // ======================================

                    product.name =
                        productName;

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

                    product.units =
                        newProductUnits;

                    product.unitBuyPrice =
                        newProductUnitBuyPrice;

                    // Compatibility with existing schema.
                    product.buyPrice =
                        newProductUnitBuyPrice;

                    product.unitSellPrice =
                        unitSellPrice;

                    await product.save({
                        session
                    });

                    resultProduct =
                        product;

                    // ======================================
                    // DEDUCT STOCK
                    // ======================================

                    stock.units =
                        warehouseUnits -
                        allocationTotal;

                    // ======================================
                    // RECALCULATE REMAINING STOCK FIFO COST
                    // ======================================

                    stock.purchaseBatches =
                        stock.purchaseBatches.filter(
                            (batch) =>
                                batchUnits(batch) > 0
                        );

                    const remainingUnitBuyPrice =
                        calculateUnitBuyPrice(
                            stock
                        );

                    stock.unitBuyPrice =
                        remainingUnitBuyPrice;

                    // Compatibility with existing schema.
                    stock.buyPrice =
                        remainingUnitBuyPrice;

                    // ======================================
                    // SAVE STOCK
                    // ======================================

                    await stock.save({
                        session
                    });

                    // ======================================
                    // UPDATE SUBSTATION INVENTORY
                    // ======================================
                    //
                    // Each allocation adds exactly the
                    // requested quantity to that substation.
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
                    // FINAL STOCK TOTALS
                    // ======================================

                    await exports.recalculateStockTotals(
                        session
                    );
                }
            );

            return resultProduct;

        } finally {

            await session.endSession();
        }
    };