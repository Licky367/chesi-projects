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
// Submitted values represent the NEW / FINAL quantity
// for each submitted substation.
//
// Substations omitted from the request retain their
// existing Product inventory.
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
                entry.substationId
        );
}


// ==========================================================
// UPDATE EXISTING PRODUCT / ALLOCATION
// ==========================================================
//
// IMPORTANT:
//
// Despite the historical function name
// createProductFromStock(), this operation DOES NOT create
// a Product.
//
// The Product was already created when the Stock record was
// created.
//
// This function edits:
//
// PRODUCT.units
// PRODUCT.unitBuyPrice
// PRODUCT.buyPrice
// PRODUCT.unitSellPrice
//
// and the corresponding:
//
// SUBSTATION.productInventory[]
//
// Stock.purchaseBatches remains the ONLY FIFO system.
//
// Allocation behaviour:
//
// 1. Submitted substation quantities are treated as the
//    NEW / FINAL quantities for those substations.
//
// 2. Unsubmitted substations retain their existing
//    quantities.
//
// 3. The service calculates:
//
//       new total allocation
//       -
//       current total allocation
//       =
//       actual delta
//
// 4. Positive delta:
//       consume additional Stock FIFO.
//
// 5. Negative delta:
//       release Product units back to Stock.
//
// 6. Product.units is finally synchronized with the total
//    quantity held across all substations.
//
// 7. No Product is created here.
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
        //
        // Product selling price belongs to Product.
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
        //
        // These are FINAL quantities for the submitted
        // substations.
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
                    // EXISTING PRODUCT
                    // ======================================
                    //
                    // IMPORTANT:
                    //
                    // DO NOT CREATE A PRODUCT HERE.
                    //
                    // Stock creation already created the
                    // Product. This operation only edits it.
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
                    // CURRENT SUBSTATION TOTAL
                    // ======================================
                    //
                    // Read ALL active substations because
                    // unsubmitted substations must retain
                    // their current quantities.
                    // ======================================

                    const allSubstations =
                        await Substation.find({
                            isActive:
                                true
                        })
                            .session(
                                session
                            );

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
                                ? substation.productInventory
                                    .find(
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

                            const units =
                                wholeNumber(
                                    inventory.units || 0,
                                    `Current units for substation ${substation.name || substation._id}`
                                );

                            currentAllocationTotal +=
                                units;
                        }
                    }

                    // ======================================
                    // NEW SUBSTATION TOTAL
                    // ======================================
                    //
                    // Start from the current total.
                    //
                    // For each submitted substation:
                    //
                    // new total =
                    // current total
                    // - old submitted quantity
                    // + new submitted quantity
                    //
                    // Unsubmitted substations remain untouched.
                    // ======================================

                    let newAllocationTotal =
                        currentAllocationTotal;

                    for (
                        const allocation
                        of allocations
                    ) {

                        const substation =
                            substationMap.get(
                                allocation.substationId
                            );

                        const inventory =
                            Array.isArray(
                                substation.productInventory
                            )
                                ? substation.productInventory
                                    .find(
                                        (entry) =>
                                            String(
                                                entry.productId
                                            ) ===
                                            String(
                                                product._id
                                            )
                                    )
                                : null;

                        const currentUnits =
                            inventory
                                ? wholeNumber(
                                    inventory.units || 0,
                                    `Current units for substation ${substation.name || substation._id}`
                                )
                                : 0;

                        newAllocationTotal =
                            newAllocationTotal -
                            currentUnits +
                            allocation.units;
                    }

                    // ======================================
                    // ACTUAL PRODUCT DELTA
                    // ======================================

                    const actualDelta =
                        newAllocationTotal -
                        currentAllocationTotal;

                    // ======================================
                    // CURRENT PRODUCT UNITS
                    // ======================================

                    const currentProductUnits =
                        wholeNumber(
                            product.units || 0,
                            "Product units"
                        );

                    // ======================================
                    // CURRENT PRODUCT UNIT BUY PRICE
                    // ======================================
                    //
                    // Product has NO FIFO batches.
                    //
                    // Its current unit cost is therefore
                    // represented by its existing weighted
                    // unitBuyPrice / buyPrice.
                    // ======================================

                    const currentProductUnitBuyPrice =
                        number(
                            product.unitBuyPrice ??
                            product.buyPrice ??
                            0,
                            "Product unit buy price"
                        );

                    // ======================================
                    // POSITIVE DELTA
                    // ======================================
                    //
                    // More units are being allocated than
                    // currently exist in substations.
                    //
                    // Consume ONLY the additional quantity
                    // from Stock FIFO.
                    // ======================================

                    let additionalStockCost =
                        0;

                    if (
                        actualDelta > 0
                    ) {

                        const warehouseUnits =
                            wholeNumber(
                                stock.units || 0,
                                "Warehouse units"
                            );

                        if (
                            actualDelta >
                            warehouseUnits
                        ) {

                            throw new Error(
                                `Only ${warehouseUnits} units are available in this stock, but ${actualDelta} additional units are required.`
                            );
                        }

                        const fifoUnits =
                            totalBatchUnits(
                                stock
                            );

                        if (
                            actualDelta >
                            fifoUnits
                        ) {

                            throw new Error(
                                `Only ${fifoUnits} FIFO units are available in this stock, but ${actualDelta} additional units are required.`
                            );
                        }

                        const fifoResult =
                            consumeFifoBatches(
                                stock,
                                actualDelta
                            );

                        additionalStockCost =
                            Number(
                                fifoResult.totalCost
                            );

                        stock.units =
                            warehouseUnits -
                            actualDelta;
                    }

                    // ======================================
                    // NEGATIVE DELTA
                    // ======================================
                    //
                    // Units have been removed from the
                    // Product allocation.
                    //
                    // Return those units to Stock.
                    //
                    // Product has no FIFO, so the returned
                    // stock uses the Product's current
                    // weighted unit buy price.
                    // ======================================

                    if (
                        actualDelta < 0
                    ) {

                        const releasedUnits =
                            Math.abs(
                                actualDelta
                            );

                        if (
                            releasedUnits >
                            currentProductUnits
                        ) {

                            throw new Error(
                                `Cannot release ${releasedUnits} units because the Product currently contains only ${currentProductUnits} units.`
                            );
                        }

                        stock.units =
                            wholeNumber(
                                stock.units || 0,
                                "Warehouse units"
                            ) +
                            releasedUnits;

                        if (
                            releasedUnits > 0
                        ) {

                            stock.purchaseBatches.push({
                                units:
                                    releasedUnits,

                                buyPrice:
                                    currentProductUnitBuyPrice,

                                purchasedAt:
                                    new Date()
                            });
                        }
                    }

                    // ======================================
                    // NEW PRODUCT TOTAL
                    // ======================================

                    const newProductUnits =
                        newAllocationTotal;

                    // ======================================
                    // NEW PRODUCT VALUE
                    // ======================================
                    //
                    // Positive delta:
                    //
                    // existing Product value
                    // +
                    // actual FIFO cost consumed
                    //
                    // Negative delta:
                    //
                    // remove released units using the
                    // Product's current weighted unit cost.
                    // ======================================

                    const currentProductValue =
                        currentProductUnits *
                        currentProductUnitBuyPrice;

                    let newProductValue =
                        currentProductValue;

                    if (
                        actualDelta > 0
                    ) {

                        newProductValue +=
                            additionalStockCost;

                    } else if (
                        actualDelta < 0
                    ) {

                        newProductValue -=
                            Math.abs(
                                actualDelta
                            ) *
                            currentProductUnitBuyPrice;
                    }

                    if (
                        newProductValue < 0 &&
                        newProductUnits >= 0
                    ) {

                        newProductValue = 0;
                    }

                    const newProductUnitBuyPrice =
                        newProductUnits > 0
                            ? newProductValue /
                                newProductUnits
                            : 0;

                    // ======================================
                    // UPDATE PRODUCT
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

                    product.units =
                        newProductUnits;

                    product.unitBuyPrice =
                        newProductUnitBuyPrice;

                    // Compatibility with existing schema.
                    product.buyPrice =
                        newProductUnitBuyPrice;

                    product.unitSellPrice =
                        unitSellPrice;

                    // ======================================
                    // UPDATE SUBSTATION INVENTORY
                    // ======================================
                    //
                    // Submitted values REPLACE the existing
                    // values for those substations.
                    //
                    // Unsubmitted substations are untouched.
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
                        // ZERO
                        // ----------------------------------

                        if (
                            allocation.units === 0
                        ) {

                            if (
                                inventory
                            ) {

                                inventory.units =
                                    0;

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
                        // EXISTING INVENTORY
                        // ----------------------------------

                        } else if (
                            inventory
                        ) {

                            inventory.units =
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
                        // NEW INVENTORY
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
                    // SORT / RECALCULATE STOCK FIFO
                    // ======================================

                    stock.purchaseBatches =
                        sortFifoBatches(
                            stock.purchaseBatches
                        );

                    stock.purchaseBatches =
                        stock.purchaseBatches.filter(
                            (batch) =>
                                batchUnits(batch) > 0
                        );

                    stock.unitBuyPrice =
                        calculateUnitBuyPrice(
                            stock
                        );

                    // Compatibility with existing schema.
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
                    // FINAL PRODUCT / SUBSTATION CHECK
                    // ======================================
                    //
                    // Confirm that Product.units now matches
                    // the actual total across all substations.
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
                                ? substation.productInventory
                                    .find(
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

                    if (
                        finalAllocationTotal !==
                        newProductUnits
                    ) {

                        throw new Error(
                            `Product allocation could not be synchronized. Product contains ${newProductUnits} units, but all substations contain ${finalAllocationTotal} units for this Product.`
                        );
                    }

                    // ======================================
                    // FINAL PRODUCT VALUE CHECK
                    // ======================================

                    product.units =
                        finalAllocationTotal;

                    await product.save({
                        session
                    });

                    resultProduct =
                        product;

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