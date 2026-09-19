// ==========================================================
// services/stockService.js
//
// VERRAH COSMETICS
// STOCK SERVICE
//
// STOCK FIFO
// ----------------------------------------------------------
// Stock.purchaseBatches is the warehouse FIFO.
//
// Each Stock FIFO batch contains:
// - units
// - buyPrice      = PER-UNIT purchase cost
// - purchasedAt
//
// Product FIFO
// ----------------------------------------------------------
// Product.fifoBatches represents units that have been
// allocated from Stock into substations.
//
// Product FIFO is built from the actual Stock FIFO layers
// consumed during allocation.
//
// IMPORTANT INVARIANTS
// ----------------------------------------------------------
// Stock:
//   Stock.units === SUM(Stock.purchaseBatches.units)
//
// Product:
//   Product.units === SUM(Product.fifoBatches.units)
//
// Substations:
//   Product.units === SUM(all active substation inventory
//                         for that Product)
//
// ALLOCATION
// ----------------------------------------------------------
// Allocating units:
//
//   Stock FIFO      -> decreases
//   Product FIFO    -> increases
//   Product.units   -> increases
//   Substation      -> increases
//
// DE-ALLOCATION
// ----------------------------------------------------------
// Removing units:
//
//   Substation      -> decreases
//   Product FIFO    -> decreases
//   Product.units   -> decreases
//   Stock FIFO      -> increases
//
// STOCK FIFO IS NOT REPRICED.
// Existing Stock FIFO layers retain their original
// per-unit purchase price.
//
// Stock FIFO consumption is OLDEST FIRST.
//
// Product FIFO release is NEWEST FIRST.
// ==========================================================


const mongoose = require("mongoose");

const Stock = require("../models/stock");
const Product = require("../models/products");
const Category = require("../models/category");
const Substation = require("../models/substations");


// ==========================================================
// BASIC HELPERS
// ==========================================================

function text(value) {
    return String(value ?? "").trim();
}


function cleanSubcategory(value) {
    return text(value);
}


function displayLabel(value) {
    return text(value);
}


function productNameFromStock(stock) {
    return displayLabel(stock?.name);
}


function fifoDate(value) {
    const date = value ? new Date(value) : new Date();

    return Number.isNaN(date.getTime())
        ? new Date()
        : date;
}


function number(value, fallback = 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : fallback;
}


function wholeNumber(value, fallback = 0) {
    const parsed = Math.floor(Number(value));

    return Number.isFinite(parsed)
        ? Math.max(0, parsed)
        : fallback;
}


function batchUnits(batch) {
    return wholeNumber(batch?.units, 0);
}


function batchBuyPrice(batch) {
    return Math.max(
        0,
        number(batch?.buyPrice, 0)
    );
}


// ==========================================================
// STOCK FIFO HELPERS
// ==========================================================

function totalBatchUnits(batches = []) {

    return batches.reduce(
        (total, batch) => {
            return total + batchUnits(batch);
        },
        0
    );
}


function calculateFifoValue(batches = []) {

    return batches.reduce(
        (total, batch) => {

            const units = batchUnits(batch);
            const buyPrice = batchBuyPrice(batch);

            return total + (units * buyPrice);
        },
        0
    );
}


function calculateUnitBuyPrice(batches = []) {

    const units = totalBatchUnits(batches);

    if (units <= 0) {
        return 0;
    }

    return calculateFifoValue(batches) / units;
}


function setCalculatedUnitBuyPrice(stock) {

    const batches = Array.isArray(stock.purchaseBatches)
        ? stock.purchaseBatches
        : [];

    const units = totalBatchUnits(batches);

    const unitBuyPrice =
        calculateUnitBuyPrice(batches);

    stock.units = units;

    stock.unitBuyPrice = unitBuyPrice;
    stock.buyPrice = unitBuyPrice;

    return unitBuyPrice;
}


function sortFifoBatches(batches = []) {

    batches.sort((a, b) => {

        const dateA = fifoDate(
            a?.purchasedAt
        ).getTime();

        const dateB = fifoDate(
            b?.purchasedAt
        ).getTime();

        return dateA - dateB;
    });

    return batches;
}


// ==========================================================
// ENSURE STOCK FIFO
// ==========================================================

function ensurePurchaseBatches(stock) {

    if (!Array.isArray(stock.purchaseBatches)) {
        stock.purchaseBatches = [];
    }

    return stock.purchaseBatches;
}


// ==========================================================
// RECONCILE STOCK FIFO
//
// This does NOT invent new stock.
//
// It only makes the Stock document internally consistent
// with its existing purchaseBatches.
//
// Existing FIFO layers retain their original prices.
// ==========================================================

function reconcilePurchaseBatches(stock, session = null) {

    const batches =
        ensurePurchaseBatches(stock);

    sortFifoBatches(batches);

    const fifoUnits =
        totalBatchUnits(batches);

    stock.units = fifoUnits;

    setCalculatedUnitBuyPrice(stock);

    return stock;
}


// ==========================================================
// CATEGORY HELPERS
// ==========================================================

async function resolveCategory(value, session = null) {

    const raw = text(value);

    if (!raw) {
        throw new Error(
            "Category is required."
        );
    }

    let category = null;

    if (mongoose.Types.ObjectId.isValid(raw)) {

        category =
            await Category.findById(raw)
                .session(session);
    }

    if (!category) {

        category =
            await Category.findOne({
                name: raw
            })
            .session(session);
    }

    if (!category) {
        throw new Error(
            "Selected category was not found."
        );
    }

    return category;
}


async function getCategories() {

    return Category.find({
        isActive: true
    })
    .sort({
        name: 1
    })
    .lean();
}


// ==========================================================
// LIST STOCK
// ==========================================================

async function listStock() {

    return Stock.find({
        isActive: true
    })
    .populate(
        "category"
    )
    .sort({
        createdAt: -1
    })
    .lean();
}


// ==========================================================
// GET STOCK
// ==========================================================

async function getStock(stockId) {

    if (
        !stockId ||
        !mongoose.Types.ObjectId.isValid(stockId)
    ) {
        throw new Error(
            "Invalid stock ID."
        );
    }

    const stock =
        await Stock.findOne({
            _id: stockId,
            isActive: true
        })
        .populate("category")
        .lean();

    if (!stock) {
        throw new Error(
            "Stock not found."
        );
    }

    return stock;
}


// ==========================================================
// GET STOCK CATEGORIES
// ==========================================================

async function getStockCategories() {

    return Category.find({
        isActive: true
    })
    .sort({
        name: 1
    })
    .lean();
}


// ==========================================================
// GET SUBSTATIONS
// ==========================================================

async function getSubstations() {

    return Substation.find({
        isActive: true
    })
    .sort({
        name: 1
    })
    .lean();
}


// ==========================================================
// RECALCULATE STOCK TOTALS
//
// IMPORTANT:
// This uses Stock.purchaseBatches as the source of truth.
//
// It does NOT change FIFO prices.
// It only recalculates:
// - units
// - unitBuyPrice
// - buyPrice
// - cashOutflow
// - categoryOveral
// - overal
// ==========================================================

async function recalculateStockTotals(
    session = null
) {

    const query =
        Stock.find({
            isActive: true
        })
        .select(
            "_id category units buyPrice unitBuyPrice purchaseBatches createdAt"
        );

    if (session) {
        query.session(session);
    }

    const stocks =
        await query;

    const categoryTotals = {};
    let overal = 0;

    for (const stock of stocks) {

        reconcilePurchaseBatches(
            stock,
            session
        );

        const fifoValue =
            calculateFifoValue(
                stock.purchaseBatches
            );

        const categoryId =
            stock.category
                ? String(stock.category)
                : "";

        if (!categoryTotals[categoryId]) {
            categoryTotals[categoryId] = 0;
        }

        categoryTotals[categoryId] += fifoValue;

        overal += fifoValue;

        stock.cashOutflow =
            fifoValue;

        stock.categoryOveral =
            categoryTotals[categoryId];

        stock.overal =
            overal;

        stock.totalsUpdatedAt =
            new Date();

        await stock.save({
            session
        });
    }

    return {
        categoryTotals,
        overal
    };
}


// ==========================================================
// CREATE STOCK
//
// body.units
//      = INITIAL WAREHOUSE UNITS
//
// body.buyPrice
//      = TOTAL PURCHASE COST FOR THOSE UNITS
//
// Stock FIFO receives one initial layer.
// Product is created with ZERO allocated units.
// ==========================================================

async function createStock(body = {}) {

    const session =
        await mongoose.startSession();

    try {

        let result;

        await session.withTransaction(
            async () => {

                const name =
                    text(body.name);

                const subcategory =
                    cleanSubcategory(
                        body.subcategory
                    );

                const days =
                    wholeNumber(
                        body.days,
                        0
                    );

                const units =
                    wholeNumber(
                        body.units,
                        0
                    );

                const totalBuyPrice =
                    Math.max(
                        0,
                        number(
                            body.buyPrice,
                            0
                        )
                    );

                const unitSellPrice =
                    Math.max(
                        0,
                        number(
                            body.unitSellPrice ??
                            body.sellPrice,
                            0
                        )
                    );

                const image =
                    text(body.image);

                const description =
                    text(body.description);

                if (!name) {
                    throw new Error(
                        "Product name is required."
                    );
                }

                if (!subcategory) {
                    throw new Error(
                        "Subcategory is required."
                    );
                }

                if (units <= 0) {
                    throw new Error(
                        "Units must be greater than zero."
                    );
                }

                if (totalBuyPrice < 0) {
                    throw new Error(
                        "Purchase cost cannot be negative."
                    );
                }

                const category =
                    await resolveCategory(
                        body.category,
                        session
                    );

                const duplicate =
                    await Stock.findOne({
                        name,
                        category: category._id,
                        subcategory,
                        isActive: true
                    })
                    .session(session);

                if (duplicate) {
                    throw new Error(
                        "Active stock for this product and category already exists."
                    );
                }

                const unitBuyPrice =
                    totalBuyPrice / units;

                const purchaseBatches = [
                    {
                        units,
                        buyPrice:
                            unitBuyPrice,
                        purchasedAt:
                            new Date()
                    }
                ];

                const createdStocks =
                    await Stock.create(
                        [
                            {
                                name,
                                category:
                                    category._id,
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

                const createdStock =
                    createdStocks[0];

                const createdProducts =
                    await Product.create(
                        [
                            {
                                stock:
                                    createdStock._id,

                                name,

                                category:
                                    category._id,

                                subcategory,

                                days,

                                image,

                                description,

                                units: 0,

                                unitBuyPrice,

                                buyPrice:
                                    unitBuyPrice,

                                unitSellPrice,

                                fifoBatches: []
                            }
                        ],
                        {
                            session
                        }
                    );

                const createdProduct =
                    createdProducts[0];

                result = {
                    stock:
                        createdStock.toObject(),

                    product:
                        createdProduct.toObject()
                };
            }
        );

        await exports.recalculateStockTotals();

        return result;

    } finally {

        await session.endSession();
    }
}


// ==========================================================
// UPDATE STOCK ENTRY
//
// IMPORTANT:
// body.units = ADDITIONAL STOCK UNITS
//
// body.buyPrice = TOTAL PURCHASE COST FOR THOSE
//                ADDITIONAL UNITS
//
// Existing FIFO batches are NEVER repriced.
//
// A new FIFO layer is appended for additional stock.
//
// This function does NOT allocate anything to substations.
// ==========================================================

async function updateStockEntry(
    stockId,
    body = {}
) {

    if (
        !stockId ||
        !mongoose.Types.ObjectId.isValid(stockId)
    ) {
        throw new Error(
            "Invalid stock ID."
        );
    }

    const session =
        await mongoose.startSession();

    try {

        let result;

        await session.withTransaction(
            async () => {

                const stock =
                    await Stock.findOne({
                        _id: stockId,
                        isActive: true
                    })
                    .session(session);

                if (!stock) {
                    throw new Error(
                        "Stock not found."
                    );
                }

                reconcilePurchaseBatches(
                    stock,
                    session
                );

                const additionalUnits =
                    wholeNumber(
                        body.units,
                        0
                    );

                const additionalTotalCost =
                    Math.max(
                        0,
                        number(
                            body.buyPrice,
                            0
                        )
                    );

                const submittedSellPrice =
                    Math.max(
                        0,
                        number(
                            body.unitSellPrice ??
                            body.sellPrice,
                            0
                        )
                    );

                const category =
                    await resolveCategory(
                        body.category ??
                        stock.category,
                        session
                    );

                const name =
                    text(
                        body.name ??
                        stock.name
                    );

                const subcategory =
                    cleanSubcategory(
                        body.subcategory ??
                        stock.subcategory
                    );

                const days =
                    wholeNumber(
                        body.days ??
                        stock.days,
                        0
                    );

                const image =
                    text(
                        body.image ??
                        stock.image
                    );

                const description =
                    text(
                        body.description ??
                        stock.description
                    );

                if (additionalUnits > 0) {

                    if (
                        additionalTotalCost < 0
                    ) {
                        throw new Error(
                            "Purchase cost cannot be negative."
                        );
                    }

                    const additionalUnitBuyPrice =
                        additionalTotalCost /
                        additionalUnits;

                    stock.purchaseBatches.push({
                        units:
                            additionalUnits,

                        buyPrice:
                            additionalUnitBuyPrice,

                        purchasedAt:
                            new Date()
                    });

                    stock.units =
                        wholeNumber(
                            stock.units,
                            0
                        ) +
                        additionalUnits;
                }

                stock.name =
                    name;

                stock.category =
                    category._id;

                stock.subcategory =
                    subcategory;

                stock.days =
                    days;

                stock.image =
                    image;

                stock.description =
                    description;

                sortFifoBatches(
                    stock.purchaseBatches
                );

                setCalculatedUnitBuyPrice(
                    stock
                );

                const product =
                    await Product.findOne({
                        stock: stock._id,
                        isActive: true
                    })
                    .session(session);

                if (!product) {
                    throw new Error(
                        "Product belonging to this stock was not found."
                    );
                }

                product.name =
                    name;

                product.category =
                    category._id;

                product.subcategory =
                    subcategory;

                product.days =
                    days;

                product.image =
                    image;

                product.description =
                    description;

                if (
                    additionalUnits === 0
                ) {
                    product.unitSellPrice =
                        submittedSellPrice;
                }

                await stock.save({
                    session
                });

                await product.save({
                    session
                });

                await exports.recalculateStockTotals(
                    session
                );

                result = {
                    stock:
                        stock.toObject(),

                    product:
                        product.toObject()
                };
            }
        );

        return result;

    } finally {

        await session.endSession();
    }
}


// ==========================================================
// NORMALIZE ALLOCATIONS
//
// The form sends:
//
// allocations[substationId] = unitsToAllocate
//
// IMPORTANT:
// These values are MOVEMENT QUANTITIES.
//
// If the user enters 2:
//     2 units are ADDED to that substation.
//
// They are NOT treated as the final inventory balance.
// ==========================================================

function normalizeAllocations(
    allocations
) {

    if (
        !allocations ||
        typeof allocations !== "object" ||
        Array.isArray(allocations)
    ) {
        return [];
    }

    return Object.entries(
        allocations
    )
    .map(
        ([substationId, rawUnits]) => {

            return {
                substationId:
                    text(substationId),

                units:
                    wholeNumber(
                        rawUnits,
                        0
                    )
            };
        }
    )
    .filter(
        item =>
            item.substationId &&
            item.units > 0
    );
}


// ==========================================================
// PRODUCT FIFO HELPERS
// ==========================================================

function productFifoUnits(product) {

    const batches =
        Array.isArray(product?.fifoBatches)
            ? product.fifoBatches
            : [];

    return batches.reduce(
        (total, batch) => {

            return total +
                wholeNumber(
                    batch?.units,
                    0
                );

        },
        0
    );
}


function productFifoValue(product) {

    const batches =
        Array.isArray(product?.fifoBatches)
            ? product.fifoBatches
            : [];

    return batches.reduce(
        (total, batch) => {

            const units =
                wholeNumber(
                    batch?.units,
                    0
                );

            const buyPrice =
                Math.max(
                    0,
                    number(
                        batch?.buyPrice,
                        0
                    )
                );

            return total +
                (units * buyPrice);

        },
        0
    );
}


function weightedProductBuyPrice(product) {

    const units =
        productFifoUnits(product);

    if (units <= 0) {
        return 0;
    }

    return productFifoValue(product) /
        units;
}


function sortProductFifoBatches(
    batches = []
) {

    batches.sort(
        (a, b) => {

            const dateA =
                fifoDate(
                    a?.receivedAt ??
                    a?.createdAt
                ).getTime();

            const dateB =
                fifoDate(
                    b?.receivedAt ??
                    b?.createdAt
                ).getTime();

            return dateA - dateB;
        }
    );

    return batches;
}


function setCalculatedProductUnitBuyPrice(
    product
) {

    const units =
        productFifoUnits(product);

    const unitBuyPrice =
        weightedProductBuyPrice(product);

    product.units =
        units;

    product.unitBuyPrice =
        unitBuyPrice;

    product.buyPrice =
        unitBuyPrice;

    return unitBuyPrice;
}


// ==========================================================
// RECONCILE PRODUCT FIFO
//
// This is ONLY used to bring legacy Product FIFO into
// agreement with the ACTUAL current substation allocation.
//
// It does not manufacture warehouse stock.
//
// If Product FIFO is short:
//     compatibility layer is created using the existing
//     Product unit buy price.
//
// If Product FIFO is excessive:
//     newest Product FIFO layers are trimmed first.
//
// Normal allocation/deallocation does not use this as a
// replacement for the real FIFO movement.
// ==========================================================

function reconcileProductFifo(
    product,
    targetUnits
) {

    const target =
        wholeNumber(
            targetUnits,
            0
        );

    if (!Array.isArray(product.fifoBatches)) {
        product.fifoBatches = [];
    }

    sortProductFifoBatches(
        product.fifoBatches
    );

    let currentUnits =
        productFifoUnits(product);

    // ------------------------------------------------------
    // NOTHING SHOULD EXIST
    // ------------------------------------------------------

    if (target === 0) {

        product.fifoBatches = [];

        product.units = 0;

        product.unitBuyPrice = 0;
        product.buyPrice = 0;

        return product.fifoBatches;
    }

    // ------------------------------------------------------
    // FIFO HAS TOO MANY UNITS
    //
    // Remove from newest layers first.
    // ------------------------------------------------------

    if (currentUnits > target) {

        let excess =
            currentUnits - target;

        for (
            let index =
                product.fifoBatches.length - 1;

            index >= 0 && excess > 0;

            index--
        ) {

            const batch =
                product.fifoBatches[index];

            const units =
                batchUnits(batch);

            if (units <= 0) {
                continue;
            }

            const remove =
                Math.min(
                    units,
                    excess
                );

            batch.units =
                units - remove;

            excess -= remove;
        }

        product.fifoBatches =
            product.fifoBatches.filter(
                batch =>
                    batchUnits(batch) > 0
            );
    }

    // ------------------------------------------------------
    // FIFO HAS FEWER UNITS
    //
    // Repair only the difference using the Product's
    // existing weighted buy price.
    // ------------------------------------------------------

    currentUnits =
        productFifoUnits(product);

    if (currentUnits < target) {

        const missing =
            target - currentUnits;

        const existingUnitBuyPrice =
            Math.max(
                0,
                number(
                    product.unitBuyPrice ??
                    product.buyPrice,
                    0
                )
            );

        product.fifoBatches.push({
            units:
                missing,

            buyPrice:
                existingUnitBuyPrice,

            receivedAt:
                fifoDate(
                    product.createdAt
                )
        });
    }

    sortProductFifoBatches(
        product.fifoBatches
    );

    setCalculatedProductUnitBuyPrice(
        product
    );

    return product.fifoBatches;
}


// ==========================================================
// CONSUME STOCK FIFO
//
// OLDEST STOCK PURCHASE BATCHES ARE CONSUMED FIRST.
//
// IMPORTANT:
// This function does NOT change Stock.units directly.
//
// It mutates the purchase batches and returns the exact
// layers consumed.
//
// Caller is responsible for setting Stock.units from the
// resulting FIFO.
// ==========================================================

function consumeFifoBatches(
    stock,
    quantity
) {

    const requested =
        wholeNumber(
            quantity,
            0
        );

    if (requested <= 0) {

        return {
            consumed: [],
            totalCost: 0,
            weightedBuyPrice: 0
        };
    }

    ensurePurchaseBatches(
        stock
    );

    sortFifoBatches(
        stock.purchaseBatches
    );

    const available =
        totalBatchUnits(
            stock.purchaseBatches
        );

    if (available < requested) {

        throw new Error(
            `Insufficient stock. Requested ${requested} units, but only ${available} units are available.`
        );
    }

    let remaining =
        requested;

    let totalCost = 0;

    const consumed = [];

    for (
        let index = 0;

        index <
            stock.purchaseBatches.length &&
            remaining > 0;

        index++
    ) {

        const batch =
            stock.purchaseBatches[index];

        const units =
            batchUnits(batch);

        if (units <= 0) {
            continue;
        }

        const take =
            Math.min(
                units,
                remaining
            );

        const buyPrice =
            batchBuyPrice(batch);

        consumed.push({
            units:
                take,

            buyPrice,

            purchasedAt:
                fifoDate(
                    batch.purchasedAt
                )
        });

        totalCost +=
            take * buyPrice;

        batch.units =
            units - take;

        remaining -= take;
    }

    stock.purchaseBatches =
        stock.purchaseBatches.filter(
            batch =>
                batchUnits(batch) > 0
        );

    if (remaining !== 0) {

        throw new Error(
            "Stock FIFO consumption failed."
        );
    }

    const weightedBuyPrice =
        requested > 0
            ? totalCost / requested
            : 0;

    return {
        consumed,
        totalCost,
        weightedBuyPrice
    };
}


// ==========================================================
// RELEASE PRODUCT FIFO
//
// Product FIFO is released NEWEST FIRST.
//
// This preserves the exact per-unit buy price of each
// Product FIFO layer.
//
// The released layer is returned with receivedAt so that
// Stock can receive it back using purchasedAt.
// ==========================================================

function releaseProductFifo(
    product,
    quantity
) {

    const requested =
        wholeNumber(
            quantity,
            0
        );

    if (requested <= 0) {

        return {
            released: [],
            totalCost: 0,
            weightedBuyPrice: 0
        };
    }

    if (!Array.isArray(product.fifoBatches)) {
        product.fifoBatches = [];
    }

    sortProductFifoBatches(
        product.fifoBatches
    );

    const available =
        productFifoUnits(product);

    if (available < requested) {

        throw new Error(
            `Insufficient Product allocation. Requested release of ${requested} units, but Product FIFO contains only ${available} units.`
        );
    }

    let remaining =
        requested;

    let totalCost = 0;

    const released = [];

    for (
        let index =
            product.fifoBatches.length - 1;

        index >= 0 &&
            remaining > 0;

        index--
    ) {

        const batch =
            product.fifoBatches[index];

        const units =
            batchUnits(batch);

        if (units <= 0) {
            continue;
        }

        const release =
            Math.min(
                units,
                remaining
            );

        const buyPrice =
            batchBuyPrice(batch);

        const receivedAt =
            fifoDate(
                batch.receivedAt ??
                batch.createdAt
            );

        released.push({
            units:
                release,

            buyPrice,

            receivedAt
        });

        totalCost +=
            release * buyPrice;

        batch.units =
            units - release;

        remaining -= release;
    }

    product.fifoBatches =
        product.fifoBatches.filter(
            batch =>
                batchUnits(batch) > 0
        );

    if (remaining !== 0) {

        throw new Error(
            "Product FIFO release failed."
        );
    }

    sortProductFifoBatches(
        product.fifoBatches
    );

    const weightedBuyPrice =
        requested > 0
            ? totalCost / requested
            : 0;

    return {
        released,
        totalCost,
        weightedBuyPrice
    };
}


// ==========================================================
// RETURN PRODUCT FIFO LAYERS TO STOCK
//
// Each Product FIFO layer retains its own original
// per-unit purchase price.
//
// Product.receivedAt becomes Stock.purchasedAt.
// ==========================================================

function returnLayersToStock(
    stock,
    releasedLayers = []
) {

    ensurePurchaseBatches(
        stock
    );

    for (
        const layer of releasedLayers
    ) {

        const units =
            wholeNumber(
                layer?.units,
                0
            );

        if (units <= 0) {
            continue;
        }

        stock.purchaseBatches.push({
            units,

            buyPrice:
                Math.max(
                    0,
                    number(
                        layer?.buyPrice,
                        0
                    )
                ),

            purchasedAt:
                fifoDate(
                    layer?.receivedAt
                )
        });
    }

    sortFifoBatches(
        stock.purchaseBatches
    );
}


// ==========================================================
// PRODUCT SUBSTATION HELPERS
// ==========================================================

function substationProductUnits(
    substation,
    productId
) {

    const id =
        String(productId);

    if (
        !Array.isArray(
            substation.productInventory
        )
    ) {
        return 0;
    }

    const entry =
        substation.productInventory.find(
            item =>
                String(
                    item?.productId
                ) === id
        );

    return wholeNumber(
        entry?.units,
        0
    );
}


function totalProductSubstationUnits(
    substations,
    productId
) {

    return substations.reduce(
        (total, substation) => {

            return total +
                substationProductUnits(
                    substation,
                    productId
                );

        },
        0
    );
}


// ==========================================================
// UPDATE SUBSTATION INVENTORY
//
// IMPORTANT:
// units is the NUMBER BEING ALLOCATED.
//
// Therefore:
//
// existing 5 + allocation 2 = 7
//
// It is NOT:
//
// existing 5 -> 2
// ==========================================================

function addProductToSubstation(
    substation,
    product,
    units
) {

    const quantity =
        wholeNumber(
            units,
            0
        );

    if (quantity <= 0) {
        return;
    }

    if (
        !Array.isArray(
            substation.productInventory
        )
    ) {
        substation.productInventory = [];
    }

    const productId =
        String(product._id);

    const existing =
        substation.productInventory.find(
            item =>
                String(
                    item?.productId
                ) === productId
        );

    const categoryId =
        product.category
            ? product.category._id ??
              product.category
            : null;

    if (existing) {

        existing.units =
            wholeNumber(
                existing.units,
                0
            ) + quantity;

        existing.productName =
            product.name;

        existing.category =
            categoryId;

        existing.subcategory =
            product.subcategory;

        existing.days =
            product.days;

        existing.updatedAt =
            new Date();

        return;
    }

    substation.productInventory.push({
        productId:
            product._id,

        productName:
            product.name,

        category:
            categoryId,

        subcategory:
            product.subcategory,

        days:
            product.days,

        units:
            quantity,

        updatedAt:
            new Date()
    });
}


// ==========================================================
// REMOVE PRODUCT FROM SUBSTATION
//
// Used only if this service is later called for a
// de-allocation movement.
//
// It removes the requested quantity from the actual
// substation inventory.
// ==========================================================

function removeProductFromSubstation(
    substation,
    productId,
    units
) {

    const quantity =
        wholeNumber(
            units,
            0
        );

    if (quantity <= 0) {
        return;
    }

    if (
        !Array.isArray(
            substation.productInventory
        )
    ) {
        throw new Error(
            "Substation has no product inventory."
        );
    }

    const productIdText =
        String(productId);

    const existing =
        substation.productInventory.find(
            item =>
                String(
                    item?.productId
                ) === productIdText
        );

    if (!existing) {

        throw new Error(
            "Product is not allocated to this substation."
        );
    }

    const current =
        wholeNumber(
            existing.units,
            0
        );

    if (current < quantity) {

        throw new Error(
            `Substation does not have enough units. Available ${current}, requested ${quantity}.`
        );
    }

    existing.units =
        current - quantity;

    existing.updatedAt =
        new Date();
}


// ==========================================================
// CREATE / ALLOCATE PRODUCT FROM STOCK
//
// IMPORTANT:
//
// This function DOES NOT create a new Product.
//
// Product was created when Stock was created.
//
// This function allocates units from existing Stock:
//
//     STOCK FIFO
//          |
//          |  - units
//          v
//     PRODUCT FIFO
//          |
//          |  + units
//          v
//     SUBSTATION INVENTORY
//
// Allocation quantities are ADDITIONS.
//
// Example:
//
// Stock = 10
// Product = 0
// Substation = 0
//
// Allocate 2:
//
// Stock = 8
// Product = 2
// Substation = 2
//
// Allocate another 3:
//
// Stock = 5
// Product = 5
// Substation = 5
//
// ==========================================================

async function createProductFromStock(
    stockId,
    body = {}
) {

    if (
        !stockId ||
        !mongoose.Types.ObjectId.isValid(stockId)
    ) {
        throw new Error(
            "Invalid stock ID."
        );
    }

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
                    await Stock.findOne({
                        _id: stockId,
                        isActive: true
                    })
                    .session(session);

                if (!stock) {
                    throw new Error(
                        "Stock not found."
                    );
                }

                // ==================================================
                // RECONCILE STOCK FIFO
                //
                // This preserves existing Stock FIFO logic.
                // ==================================================

                reconcilePurchaseBatches(
                    stock,
                    session
                );

                // ==================================================
                // LOAD EXISTING PRODUCT
                // ==================================================

                const product =
                    await Product.findOne({
                        stock: stock._id,
                        isActive: true
                    })
                    .session(session);

                if (!product) {
                    throw new Error(
                        "Product belonging to this stock was not found."
                    );
                }

                // ==================================================
                // LOAD ACTIVE SUBSTATIONS
                // ==================================================

                const substations =
                    await Substation.find({
                        isActive: true
                    })
                    .session(session);

                // ==================================================
                // NORMALIZE ALLOCATION MOVEMENT
                //
                // allocations[id] = units TO ADD
                // ==================================================

                const allocations =
                    normalizeAllocations(
                        body.allocations
                    );

                if (allocations.length === 0) {

                    throw new Error(
                        "At least one substation allocation is required."
                    );
                }

                // ==================================================
                // RESOLVE SUBSTATIONS
                // ==================================================

                const allocationMap =
                    new Map();

                for (
                    const allocation
                    of allocations
                ) {

                    if (
                        !mongoose.Types.ObjectId.isValid(
                            allocation.substationId
                        )
                    ) {
                        throw new Error(
                            "Invalid substation ID."
                        );
                    }

                    const substation =
                        substations.find(
                            item =>
                                String(
                                    item._id
                                ) ===
                                allocation.substationId
                        );

                    if (!substation) {

                        throw new Error(
                            "One of the selected substations was not found."
                        );
                    }

                    allocationMap.set(
                        allocation.substationId,
                        allocation.units
                    );
                }

                // ==================================================
                // CURRENT SUBSTATION TOTAL
                //
                // This is the REAL currently allocated Product
                // quantity.
                // ==================================================

                const currentSubstationUnits =
                    totalProductSubstationUnits(
                        substations,
                        product._id
                    );

                // ==================================================
                // RECONCILE PRODUCT FIFO WITH ACTUAL SUBSTATION
                //
                // This prevents stale Product.units from being
                // used as the allocation source of truth.
                // ==================================================

                reconcileProductFifo(
                    product,
                    currentSubstationUnits
                );

                setCalculatedProductUnitBuyPrice(
                    product
                );

                // ==================================================
                // TOTAL NEW ALLOCATION
                //
                // IMPORTANT:
                // We ADD the submitted quantities.
                //
                // We do NOT replace existing substation balances.
                // ==================================================

                const allocationQuantity =
                    allocations.reduce(
                        (total, allocation) => {

                            return total +
                                allocation.units;

                        },
                        0
                    );

                const newProductUnits =
                    currentSubstationUnits +
                    allocationQuantity;

                // ==================================================
                // STOCK AVAILABILITY
                // ==================================================

                const availableStockUnits =
                    totalBatchUnits(
                        stock.purchaseBatches
                    );

                if (
                    availableStockUnits <
                    allocationQuantity
                ) {

                    throw new Error(
                        `Insufficient stock. Requested ${allocationQuantity} units, but only ${availableStockUnits} units are available.`
                    );
                }

                // ==================================================
                // CONSUME STOCK FIFO
                //
                // OLDEST FIRST.
                //
                // THIS SUBTRACTS FROM STOCK.
                // ==================================================

                const consumed =
                    consumeFifoBatches(
                        stock,
                        allocationQuantity
                    );

                // ==================================================
                // ADD THE EXACT STOCK FIFO LAYERS TO PRODUCT FIFO
                //
                // Each consumed Stock layer becomes a Product
                // FIFO layer at the same per-unit buy price.
                // ==================================================

                if (
                    !Array.isArray(
                        product.fifoBatches
                    )
                ) {
                    product.fifoBatches = [];
                }

                for (
                    const layer
                    of consumed.consumed
                ) {

                    product.fifoBatches.push({
                        units:
                            layer.units,

                        buyPrice:
                            layer.buyPrice,

                        receivedAt:
                            fifoDate(
                                layer.purchasedAt
                            )
                    });
                }

                sortProductFifoBatches(
                    product.fifoBatches
                );

                // ==================================================
                // PRODUCT TOTAL
                // ==================================================

                setCalculatedProductUnitBuyPrice(
                    product
                );

                // ==================================================
                // HARD PRODUCT FIFO CHECK
                // ==================================================

                const fifoProductUnits =
                    productFifoUnits(
                        product
                    );

                if (
                    fifoProductUnits !==
                    newProductUnits
                ) {

                    throw new Error(
                        `Product FIFO allocation mismatch. Expected ${newProductUnits} units, but Product FIFO contains ${fifoProductUnits} units.`
                    );
                }

                // ==================================================
                // PRODUCT SELLING PRICE
                // ==================================================

                if (
                    body.unitSellPrice !==
                        undefined ||
                    body.sellPrice !==
                        undefined
                ) {

                    product.unitSellPrice =
                        Math.max(
                            0,
                            number(
                                body.unitSellPrice ??
                                body.sellPrice,
                                product.unitSellPrice ?? 0
                            )
                        );
                }

                // ==================================================
                // UPDATE PRODUCT METADATA FROM STOCK
                // ==================================================

                product.name =
                    stock.name;

                product.category =
                    stock.category;

                product.subcategory =
                    stock.subcategory;

                product.days =
                    stock.days;

                product.image =
                    stock.image;

                product.description =
                    stock.description;

                // ==================================================
                // UPDATE SUBSTATION INVENTORY
                //
                // IMPORTANT:
                //
                // Existing quantity is INCREASED.
                //
                // Example:
                //
                // existing = 5
                // allocate = 2
                // result   = 7
                // ==================================================

                for (
                    const allocation
                    of allocations
                ) {

                    const substation =
                        allocationMap.has(
                            allocation.substationId
                        )
                            ? substations.find(
                                item =>
                                    String(
                                        item._id
                                    ) ===
                                    allocation.substationId
                            )
                            : null;

                    if (!substation) {
                        throw new Error(
                            "Substation allocation target was not found."
                        );
                    }

                    addProductToSubstation(
                        substation,
                        product,
                        allocation.units
                    );

                    await substation.save({
                        session
                    });
                }

                // ==================================================
                // FINAL STOCK FIFO TOTAL
                //
                // Stock has been DECREASED by allocationQuantity.
                // ==================================================

                sortFifoBatches(
                    stock.purchaseBatches
                );

                setCalculatedUnitBuyPrice(
                    stock
                );

                // ==================================================
                // HARD STOCK FIFO CHECK
                // ==================================================

                const fifoStockUnits =
                    totalBatchUnits(
                        stock.purchaseBatches
                    );

                if (
                    fifoStockUnits !==
                    stock.units
                ) {

                    throw new Error(
                        `Stock FIFO mismatch. Stock contains ${stock.units} units but FIFO contains ${fifoStockUnits} units.`
                    );
                }

                // ==================================================
                // SAVE STOCK
                //
                // THIS IS WHERE STOCK DECREASES.
                // ==================================================

                await stock.save({
                    session
                });

                // ==================================================
                // SAVE PRODUCT
                //
                // Product increases by allocationQuantity.
                // ==================================================

                await product.save({
                    session
                });

                // ==================================================
                // RECALCULATE STOCK TOTALS INSIDE SAME TRANSACTION
                // ==================================================

                await exports.recalculateStockTotals(
                    session
                );

                // ==================================================
                // FINAL SUBSTATION TOTAL CHECK
                //
                // Re-read the active substations inside the
                // transaction so the final state is authoritative.
                // ==================================================

                const finalSubstations =
                    await Substation.find({
                        isActive: true
                    })
                    .session(session);

                const finalSubstationUnits =
                    totalProductSubstationUnits(
                        finalSubstations,
                        product._id
                    );

                if (
                    finalSubstationUnits !==
                    product.units
                ) {

                    throw new Error(
                        `Product allocation is inconsistent. Product contains ${product.units} units, but all substations contain ${finalSubstationUnits} units for this Product.`
                    );
                }

                // ==================================================
                // FINAL PRODUCT FIFO CHECK
                // ==================================================

                const finalProductFifoUnits =
                    productFifoUnits(
                        product
                    );

                if (
                    finalProductFifoUnits !==
                    product.units
                ) {

                    throw new Error(
                        `Product FIFO is inconsistent. Product contains ${product.units} units, but Product FIFO contains ${finalProductFifoUnits} units.`
                    );
                }

                // ==================================================
                // RESULT
                // ==================================================

                result =
                    product.toObject();
            }
        );

        return result;

    } finally {

        await session.endSession();
    }
}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getCategories,

    listStock,

    getStock,

    getStockCategories,

    getSubstations,

    recalculateStockTotals,

    createStock,

    updateStockEntry,

    createProductFromStock
};