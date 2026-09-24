const mongoose = require("mongoose");
const Stock = require("../../models/stock");
const Product = require("../../models/products");
const Substation = require("../../models/substations");

const {
    text,
    cleanSubcategory,
    productNameFromStock,
    number,
    wholeNumber,
    calculateUnitBuyPrice,
    sortFifoBatches,
    calculateFifoValue,
    weightedProductBuyPrice,
    sortProductFifo
} = require("./helpers");

const {
    getCategory,
    validateCategory,
    getCategoryByName
} = require("./category");

const {
    reconcilePurchaseBatches
} = require("./stockFifo");

// ==========================================================
// RECALCULATE STOCK TOTALS
// ==========================================================

async function recalculateStockTotals(session = null) {

    const query = Stock
        .find({ isActive: true })
        .select(
            "_id category units buyPrice unitBuyPrice purchaseBatches createdAt"
        );

    if (session) {
        query.session(session);
    }

    const stocks = await query;

    const categoryTotals = new Map();

    let overall = 0;

    // ------------------------------------------------------
    // Reconcile FIFO batches first
    // ------------------------------------------------------

    for (const stock of stocks) {

        await reconcilePurchaseBatches(
            stock,
            session
        );

    }

    // ------------------------------------------------------
    // Calculate totals
    // ------------------------------------------------------

    for (const stock of stocks) {

        const value =
            calculateFifoValue(stock);

        const unitBuyPrice =
            calculateUnitBuyPrice(stock);

        const categoryName =
            text(stock.category).toLowerCase();

        categoryTotals.set(
            categoryName,
            (
                categoryTotals.get(categoryName) || 0
            ) + value
        );

        overall += value;

        stock.unitBuyPrice =
            unitBuyPrice;

    }

    // ------------------------------------------------------
    // Persist totals
    // ------------------------------------------------------

    const now = new Date();

    for (const stock of stocks) {

        const value =
            calculateFifoValue(stock);

        const categoryName =
            text(stock.category).toLowerCase();

        await Stock.updateOne(
            {
                _id: stock._id
            },
            {
                $set: {

                    unitBuyPrice:
                        calculateUnitBuyPrice(stock),

                    cashOutflow:
                        value,

                    categoryOveral:
                        categoryTotals.get(categoryName) || 0,

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
        overal: overall
    };
}

// ==========================================================
// CREATE STOCK
//
// Form meaning:
//
// units     = initial quantity
// buyPrice  = total purchase cost of that initial batch
// sellPrice = selling price per unit
//
// ADMIN:
//     Creates one warehouse FIFO batch.
//
// STAFF:
//     Stock warehouse units remain ZERO.
//     Product receives the submitted units as FIFO.
//     Assigned substation inventory receives the units.
// ==========================================================

async function createStock(body, user) {

    // ------------------------------------------------------
    // STOCK NAME
    // ------------------------------------------------------

    const name =
        cleanSubcategory(
            body.name || body.subcategory
        );

    if (!name) {

        throw new Error(
            "Stock name is required."
        );

    }

    // ------------------------------------------------------
    // CATEGORY
    // ------------------------------------------------------

    const categoryDocument =
        await getCategory(
            body.category
        );

    const category =
        text(
            categoryDocument.name
        ).toLowerCase();

    // ------------------------------------------------------
    // SUBCATEGORY
    // ------------------------------------------------------

    const subcategory =
        cleanSubcategory(
            body.subcategory
        );

    if (!subcategory) {

        throw new Error(
            "Subcategory is required."
        );

    }

    // ------------------------------------------------------
    // INITIAL UNITS
    // ------------------------------------------------------

    const units =
        wholeNumber(
            body.units,
            "Units",
            true
        );

    if (units <= 0) {

        throw new Error(
            "Initial units must be greater than zero."
        );

    }

    // ------------------------------------------------------
    // INITIAL PURCHASE COST
    //
    // buyPrice is the TOTAL purchase cost.
    // The FIFO batch stores the calculated PER-UNIT
    // buyPrice.
    // ------------------------------------------------------

    const totalPurchaseCost =
        number(
            body.buyPrice,
            "Total purchase cost",
            true
        );

    const unitBuyPrice =
        totalPurchaseCost / units;

    if (!Number.isFinite(unitBuyPrice)) {

        throw new Error(
            "Unable to calculate the unit buy price."
        );

    }

    // ------------------------------------------------------
    // SELL PRICE
    //
    // sellPrice is the PER-UNIT selling price.
    // ------------------------------------------------------

    const unitSellPrice =
        number(
            body.unitSellPrice ??
            body.sellPrice,
            "Selling price",
            true
        );

    // ------------------------------------------------------
    // OTHER STOCK DETAILS
    // ------------------------------------------------------

    const days =
        wholeNumber(
            body.days || 0,
            "Delivery days"
        );

    const image =
        text(body.image);

    const description =
        text(body.description);

    // ------------------------------------------------------
    // DUPLICATE STOCK CHECK
    // ------------------------------------------------------

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

    // ======================================================
    // STAFF VALIDATION
    // ======================================================

    if (
        user &&
        user.role === "staff"
    ) {

        if (
            !user.assignedSubstation ||
            !mongoose.isValidObjectId(
                user.assignedSubstation
            )
        ) {

            throw new Error(
                "Staff member has no valid assigned substation."
            );

        }

    }

    // ------------------------------------------------------
    // SESSION
    // ------------------------------------------------------

    const session =
        await mongoose.startSession();

    let createdStock;
    let createdProduct;

    try {

        await session.withTransaction(
            async () => {

                const isStaff =
                    user &&
                    user.role === "staff";

                // ==================================================
                // CREATE STOCK
                // ==================================================

                const stockResult =
                    await Stock.create(
                        [
                            {
                                name,
                                category,
                                subcategory,
                                days,
                                image,

                                units:
                                    isStaff
                                        ? 0
                                        : units,

                                buyPrice:
                                    isStaff
                                        ? 0
                                        : unitBuyPrice,

                                unitBuyPrice:
                                    isStaff
                                        ? 0
                                        : unitBuyPrice,

                                purchaseBatches:
                                    isStaff
                                        ? []
                                        : [
                                            {
                                                units,
                                                buyPrice:
                                                    unitBuyPrice,
                                                purchasedAt:
                                                    new Date()
                                            }
                                        ],

                                description
                            }
                        ],
                        {
                            session
                        }
                    );

                createdStock =
                    stockResult[0];

                // ==================================================
                // CREATE PRODUCT
                // ==================================================

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
                                    isStaff
                                        ? units
                                        : 0,

                                fifoBatches:
                                    isStaff
                                        ? [
                                            {
                                                units,
                                                buyPrice:
                                                    unitBuyPrice,
                                                receivedAt:
                                                    new Date()
                                            }
                                        ]
                                        : [],

                                unitBuyPrice:
                                    isStaff
                                        ? unitBuyPrice
                                        : 0,

                                buyPrice:
                                    isStaff
                                        ? unitBuyPrice
                                        : 0,

                                unitSellPrice
                            }
                        ],
                        {
                            session
                        }
                    );

                createdProduct =
                    productResult[0];

                // ==================================================
                // STAFF SUBSTATION INVENTORY
                // ==================================================

                if (isStaff) {

                    const substation =
                        await Substation.findById(
                            user.assignedSubstation
                        ).session(session);

                    if (!substation) {

                        throw new Error(
                            "Assigned substation not found."
                        );

                    }

                    if (
                        !Array.isArray(
                            substation.productInventory
                        )
                    ) {

                        substation.productInventory = [];

                    }

                    const inventory =
                        substation.productInventory.find(
                            item =>
                                String(
                                    item.productId
                                ) ===
                                String(
                                    createdProduct._id
                                )
                        );

                    if (inventory) {

                        inventory.units =
                            Number(
                                inventory.units || 0
                            ) + units;

                        inventory.productName =
                            createdProduct.name;

                        inventory.category =
                            createdProduct.category;

                        inventory.subcategory =
                            createdProduct.subcategory;

                        inventory.updatedAt =
                            new Date();

                    } else {

                        substation.productInventory.push({

                            productId:
                                createdProduct._id,

                            productName:
                                createdProduct.name,

                            category:
                                createdProduct.category,

                            subcategory:
                                createdProduct.subcategory,

                            units,

                            updatedAt:
                                new Date()

                        });

                    }

                    await substation.save({
                        session
                    });

                }

            }
        );

        // ======================================================
        // RECALCULATE GLOBAL STOCK TOTALS
        // ======================================================

        await recalculateStockTotals();

        // ======================================================
        // RETURN CREATED RECORDS
        // ======================================================

        const stock =
            await Stock
                .findById(
                    createdStock._id
                )
                .lean();

        const product =
            await Product
                .findById(
                    createdProduct._id
                )
                .lean();

        return {
            stock,
            product
        };

    } finally {

        await session.endSession();

    }
}

// ==========================================================
// UPDATE / EDIT STOCK
//
// Form meaning:
//
// units:
//     additional units only
//
// buyPrice:
//     total purchase cost of the NEW additional FIFO batch
//
// sellPrice:
//     updated selling price
//
// ADMIN:
//     Additional units go into Stock.purchaseBatches.
//
// STAFF:
//     Stock remains at ZERO.
//     Additional units go into Product.fifoBatches.
//     Assigned substation inventory is increased.
// ==========================================================

async function updateStockEntry(
    stockId,
    body,
    user
) {

    // ------------------------------------------------------
    // VALIDATE STOCK ID
    // ------------------------------------------------------

    if (
        !mongoose.isValidObjectId(stockId)
    ) {

        throw new Error(
            "Invalid stock."
        );

    }

    // ======================================================
    // STAFF VALIDATION
    // ======================================================

    const isStaff =
        user &&
        user.role === "staff";

    if (isStaff) {

        if (
            !user.assignedSubstation ||
            !mongoose.isValidObjectId(
                user.assignedSubstation
            )
        ) {

            throw new Error(
                "Staff member has no valid assigned substation."
            );

        }

    }

    const session =
        await mongoose.startSession();

    try {

        let updatedStock;

        await session.withTransaction(
            async () => {

                // ==================================================
                // LOAD STOCK
                // ==================================================

                const stock =
                    await Stock
                        .findOne({
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
                // RECONCILE CURRENT FIFO STATE
                // ==================================================

                await reconcilePurchaseBatches(
                    stock,
                    session
                );

                // ==================================================
                // CURRENT WAREHOUSE UNITS
                // ==================================================

                const currentUnits =
                    wholeNumber(
                        stock.units || 0,
                        "Current warehouse units"
                    );

                // ==================================================
                // ADDITIONAL UNITS
                // ==================================================

                const rawUnits =
                    text(body.units);

                const additionalUnits =
                    rawUnits === ""
                        ? 0
                        : wholeNumber(
                            rawUnits,
                            "Additional units",
                            true
                        );

                // ==================================================
                // CATEGORY
                // ==================================================

                let category;

                if (text(body.category)) {

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

                // ==================================================
                // SUBCATEGORY
                // ==================================================

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

                // ==================================================
                // STOCK NAME
                // ==================================================

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

                // ==================================================
                // SELL PRICE
                // ==================================================

                const unitSellPrice =
                    number(
                        body.unitSellPrice ??
                        body.sellPrice ??
                        0,
                        "Selling price"
                    );

                // ==================================================
                // OTHER DETAILS
                // ==================================================

                const days =
                    wholeNumber(
                        body.days ??
                        stock.days ??
                        0,
                        "Delivery days"
                    );

                const image =
                    text(body.image);

                const description =
                    text(body.description);

                // ==================================================
                // DUPLICATE STOCK CHECK
                // ==================================================

                const duplicate =
                    await Stock.findOne({

                        _id: {
                            $ne: stock._id
                        },

                        category,

                        subcategory,

                        isActive: true

                    }).session(session);

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
                    description;

                stock.image =
                    image;

                // ==================================================
                // ADDITIONAL STOCK
                // ==================================================

                if (additionalUnits > 0) {

                    // ------------------------------------------------
                    // buyPrice is TOTAL purchase cost for this
                    // additional FIFO batch.
                    // ------------------------------------------------

                    const totalPurchaseCost =
                        number(
                            body.buyPrice,
                            "Total purchase cost for additional units",
                            true
                        );

                    const additionalUnitBuyPrice =
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

                    // ==================================================
                    // STAFF
                    // ==================================================

                    if (isStaff) {

                        const product =
                            await Product
                                .findOne({
                                    stock: stock._id,
                                    isActive: true
                                })
                                .session(session);

                        if (!product) {

                            throw new Error(
                                "Product linked to this stock was not found."
                            );

                        }

                        if (
                            !Array.isArray(
                                product.fifoBatches
                            )
                        ) {

                            product.fifoBatches = [];

                        }

                        product.fifoBatches.push({

                            units:
                                additionalUnits,

                            buyPrice:
                                additionalUnitBuyPrice,

                            receivedAt:
                                new Date()

                        });

                        product.fifoBatches =
                            sortProductFifo(
                                product.fifoBatches
                            );

                        let productUnits = 0;

                        for (
                            const batch
                            of product.fifoBatches
                        ) {

                            const batchUnits =
                                Number(
                                    batch.units
                                );

                            if (
                                Number.isFinite(
                                    batchUnits
                                ) &&
                                batchUnits > 0
                            ) {

                                productUnits +=
                                    batchUnits;

                            }

                        }

                        product.units =
                            productUnits;

                        const weightedBuyPrice =
                            weightedProductBuyPrice(
                                product
                            );

                        product.unitBuyPrice =
                            weightedBuyPrice;

                        product.buyPrice =
                            weightedBuyPrice;

                        await product.save({
                            session
                        });

                        // ------------------------------------------------
                        // Staff Stock remains ZERO.
                        // ------------------------------------------------

                        stock.units = 0;

                        stock.purchaseBatches = [];

                        stock.buyPrice = 0;

                        stock.unitBuyPrice = 0;

                        // ==================================================
                        // UPDATE ASSIGNED SUBSTATION INVENTORY
                        // ==================================================

                        const substation =
                            await Substation.findById(
                                user.assignedSubstation
                            ).session(session);

                        if (!substation) {

                            throw new Error(
                                "Assigned substation not found."
                            );

                        }

                        if (
                            !Array.isArray(
                                substation.productInventory
                            )
                        ) {

                            substation.productInventory = [];

                        }

                        const inventory =
                            substation.productInventory.find(
                                item =>
                                    String(
                                        item.productId
                                    ) ===
                                    String(
                                        product._id
                                    )
                            );

                        if (inventory) {

                            inventory.units =
                                Number(
                                    inventory.units || 0
                                ) +
                                additionalUnits;

                            inventory.productName =
                                product.name;

                            inventory.category =
                                product.category;

                            inventory.subcategory =
                                product.subcategory;

                            inventory.updatedAt =
                                new Date();

                        } else {

                            substation.productInventory.push({

                                productId:
                                    product._id,

                                productName:
                                    product.name,

                                category:
                                    product.category,

                                subcategory:
                                    product.subcategory,

                                units:
                                    additionalUnits,

                                updatedAt:
                                    new Date()

                            });

                        }

                        await substation.save({
                            session
                        });

                    } else {

                        // ==================================================
                        // ADMIN / NON-STAFF
                        // ==================================================

                        stock.purchaseBatches.push({

                            units:
                                additionalUnits,

                            buyPrice:
                                additionalUnitBuyPrice,

                            purchasedAt:
                                new Date()

                        });

                        stock.units =
                            currentUnits +
                            additionalUnits;

                        stock.purchaseBatches =
                            sortFifoBatches(
                                stock.purchaseBatches
                            );

                        stock.unitBuyPrice =
                            calculateUnitBuyPrice(
                                stock
                            );

                    }

                }

                // ==================================================
                // STAFF STOCK MUST REMAIN ZERO
                // ==================================================

                if (isStaff) {

                    stock.units = 0;

                    stock.purchaseBatches = [];

                    stock.buyPrice = 0;

                    stock.unitBuyPrice = 0;

                }

                // ==================================================
                // SAVE STOCK
                // ==================================================

                await stock.save({
                    session
                });

                // ==================================================
                // CATEGORY DOCUMENT
                // ==================================================

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

                // ==================================================
                // UPDATE PRODUCT
                // ==================================================

                const product =
                    await Product
                        .findOne({
                            stock: stock._id,
                            isActive: true
                        })
                        .session(session);

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
                            stock.days || 0
                        );

                    product.image =
                        stock.image || "";

                    product.description =
                        stock.description || "";

                    // ------------------------------------------------
                    // SELL PRICE ALWAYS UPDATES.
                    // ------------------------------------------------

                    product.unitSellPrice =
                        unitSellPrice;

                    await product.save({
                        session
                    });

                }

                updatedStock =
                    stock;

            }
        );

        // ======================================================
        // RECALCULATE GLOBAL STOCK TOTALS
        // ======================================================

        await recalculateStockTotals();

        // ======================================================
        // RETURN UPDATED STOCK
        // ======================================================

        return Stock
            .findById(
                updatedStock._id
            )
            .lean();

    } finally {

        await session.endSession();

    }
}

// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    recalculateStockTotals,

    createStock,

    updateStockEntry

};