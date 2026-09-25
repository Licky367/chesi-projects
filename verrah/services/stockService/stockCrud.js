// ==========================================================
// services/stockService/stockCrude.js
//
// VERRAH COSMETICS
// STOCK SERVICE
//
// IMPORTANT FIFO RULES:
//
// ADMIN
// ------
// Stock.purchaseBatches = warehouse FIFO
// Product.fifoBatches   = product FIFO allocations
//
// STAFF
// ------
// Stock is NOT warehouse stock.
// Stock.units              = 0
// Stock.purchaseBatches    = []
// Stock.buyPrice           = 0
// Stock.unitBuyPrice       = 0
//
// Staff stock is represented through:
// Product.fifoBatches
//
// Every STAFF Product FIFO batch MUST contain:
// StaffFIFOsubstation = authenticated user's assignedSubstation
//
// Staff can only edit/view batches belonging to their
// assigned substation.
//
// ==========================================================

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
    calculateFifoValue
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
// STAFF CHECK
// ==========================================================

function isStaff(user) {
    return user && user.role === "staff";
}


// ==========================================================
// VALIDATE STAFF SUBSTATION
// ==========================================================

function getStaffSubstationId(user) {

    if (!isStaff(user)) {
        return null;
    }

    if (
        !user.assignedSubstation ||
        !mongoose.Types.ObjectId.isValid(user.assignedSubstation)
    ) {
        throw new Error(
            "Staff member has no valid assigned substation."
        );
    }

    return new mongoose.Types.ObjectId(
        user.assignedSubstation
    );
}


// ==========================================================
// RECALCULATE STOCK TOTALS
//
// ADMIN / WAREHOUSE ONLY
//
// Calculates:
//
// cashOutflow
// categoryOveral
// overal
// unitBuyPrice
// totalsUpdatedAt
//
// Staff Stock records have zero warehouse inventory.
// ==========================================================

async function recalculateStockTotals(session = null) {

    const query = Stock.find({
        active: { $ne: false }
    });

    if (session) {
        query.session(session);
    }

    const stocks = await query;

    let cashOutflow = 0;
    let overal = 0;

    const categoryTotals = {};

    for (const stock of stocks) {

        // --------------------------------------------------
        // STAFF STOCK SHOULD NEVER CONTRIBUTE TO WAREHOUSE
        // TOTALS.
        //
        // Staff Stock has no purchase batches.
        // --------------------------------------------------

        if (
            !stock.purchaseBatches ||
            !Array.isArray(stock.purchaseBatches)
        ) {

            stock.purchaseBatches = [];
        }

        // --------------------------------------------------
        // Reconcile warehouse FIFO
        // --------------------------------------------------

        reconcilePurchaseBatches(stock);

        // --------------------------------------------------
        // Calculate FIFO value
        // --------------------------------------------------

        const fifoValue = calculateFifoValue(
            stock.purchaseBatches
        );

        const stockUnits = stock.purchaseBatches.reduce(
            (total, batch) =>
                total + wholeNumber(batch.units),
            0
        );

        stock.units = stockUnits;

        // --------------------------------------------------
        // Calculate current unit buy price
        // --------------------------------------------------

        if (stockUnits > 0) {

            stock.unitBuyPrice =
                fifoValue / stockUnits;

            stock.buyPrice =
                stock.unitBuyPrice;

        } else {

            stock.unitBuyPrice = 0;
            stock.buyPrice = 0;
        }

        // --------------------------------------------------
        // Warehouse cash outflow
        // --------------------------------------------------

        cashOutflow += fifoValue;

        // --------------------------------------------------
        // Overall inventory value
        // --------------------------------------------------

        overal += fifoValue;

        // --------------------------------------------------
        // Category totals
        // --------------------------------------------------

        const categoryName = text(
            stock.category
        ).toLowerCase();

        if (categoryName) {

            if (!categoryTotals[categoryName]) {
                categoryTotals[categoryName] = 0;
            }

            categoryTotals[categoryName] += fifoValue;
        }

        // --------------------------------------------------
        // Existing schema uses categoryOveral
        // --------------------------------------------------

        stock.categoryOveral =
            categoryTotals[categoryName] || 0;

        stock.overal = overal;

        stock.totalsUpdatedAt = new Date();

        if (session) {
            await stock.save({ session });
        } else {
            await stock.save();
        }
    }

    // ------------------------------------------------------
    // Update every stock's categoryOveral with final totals
    // ------------------------------------------------------

    for (const stock of stocks) {

        const categoryName = text(
            stock.category
        ).toLowerCase();

        stock.categoryOveral =
            categoryTotals[categoryName] || 0;

        stock.overal = overal;

        stock.totalsUpdatedAt = new Date();

        if (session) {
            await stock.save({ session });
        } else {
            await stock.save();
        }
    }

    return {
        cashOutflow,
        overal,
        categoryTotals
    };
}


// ==========================================================
// RECALCULATE PRODUCT FIFO
//
// Product.fifoBatches is the source of Product inventory.
//
// Product.units = SUM(Product.fifoBatches.units)
//
// Current Product buy price is derived from FIFO.
//
// ==========================================================

function recalculateProductFifo(product) {

    if (
        !product.fifoBatches ||
        !Array.isArray(product.fifoBatches)
    ) {
        product.fifoBatches = [];
    }

    // ------------------------------------------------------
    // Remove invalid / zero batches
    // ------------------------------------------------------

    product.fifoBatches =
        product.fifoBatches.filter(
            batch => wholeNumber(batch.units) > 0
        );

    // ------------------------------------------------------
    // No FIFO
    // ------------------------------------------------------

    if (product.fifoBatches.length === 0) {

        product.units = 0;
        product.buyPrice = 0;
        product.unitBuyPrice = 0;

        return product;
    }

    // ------------------------------------------------------
    // Sort FIFO
    // ------------------------------------------------------

    sortFifoBatches(product.fifoBatches);

    // ------------------------------------------------------
    // Product total units
    // ------------------------------------------------------

    const totalUnits =
        product.fifoBatches.reduce(
            (total, batch) =>
                total + wholeNumber(batch.units),
            0
        );

    // ------------------------------------------------------
    // Current FIFO buy price
    //
    // Oldest remaining FIFO batch determines the current
    // unit buy price.
    // ------------------------------------------------------

    const oldestBatch =
        product.fifoBatches[0];

    const currentUnitBuyPrice =
        number(oldestBatch.buyPrice);

    product.units = totalUnits;

    product.unitBuyPrice =
        currentUnitBuyPrice;

    product.buyPrice =
        currentUnitBuyPrice;

    return product;
}


// ==========================================================
// ADD STAFF PRODUCT FIFO BATCH
//
// STAFF INVENTORY
//
// IMPORTANT:
//
// StaffFIFOsubstation MUST come from authenticated user.
//
// It MUST NOT come from req.body.
//
// ==========================================================

function addStaffProductFifoBatch(
    product,
    units,
    unitBuyPrice,
    staffFIFOsubstation
) {

    units = wholeNumber(units);
    unitBuyPrice = number(unitBuyPrice);

    if (units <= 0) {
        throw new Error(
            "Staff FIFO units must be greater than zero."
        );
    }

    if (
        !staffFIFOsubstation ||
        !mongoose.Types.ObjectId.isValid(
            staffFIFOsubstation
        )
    ) {
        throw new Error(
            "Staff FIFO batch requires a valid assigned substation."
        );
    }

    if (
        !product.fifoBatches ||
        !Array.isArray(product.fifoBatches)
    ) {
        product.fifoBatches = [];
    }

    // ------------------------------------------------------
    // IMPORTANT:
    //
    // Ownership is permanently attached to the authenticated
    // staff member's assigned substation.
    // ------------------------------------------------------

    product.fifoBatches.push({

        units,

        buyPrice: unitBuyPrice,

        purchasedAt: new Date(),

        StaffFIFOsubstation:
            new mongoose.Types.ObjectId(
                staffFIFOsubstation
            )
    });

    // ------------------------------------------------------
    // Sort and recalculate
    // ------------------------------------------------------

    sortFifoBatches(
        product.fifoBatches
    );

    recalculateProductFifo(product);

    return product;
}


// ==========================================================
// UPDATE STAFF SUBSTATION INVENTORY
//
// Adds additional units to the authenticated staff member's
// assigned substation.
//
// ==========================================================

async function updateStaffSubstationInventory(
    substationId,
    product,
    additionalUnits,
    session
) {

    if (
        !substationId ||
        !mongoose.Types.ObjectId.isValid(substationId)
    ) {
        throw new Error(
            "Invalid staff substation."
        );
    }

    additionalUnits =
        wholeNumber(additionalUnits);

    if (additionalUnits <= 0) {
        return;
    }

    const substationQuery =
        Substation.findOne({
            _id: substationId,
            active: { $ne: false }
        });

    if (session) {
        substationQuery.session(session);
    }

    const substation =
        await substationQuery;

    if (!substation) {
        throw new Error(
            "Assigned substation not found."
        );
    }

    if (
        !substation.productInventory ||
        !Array.isArray(
            substation.productInventory
        )
    ) {
        substation.productInventory = [];
    }

    let inventory =
        substation.productInventory.find(
            item =>
                String(item.productId) ===
                String(product._id)
        );

    if (inventory) {

        inventory.units =
            wholeNumber(inventory.units) +
            additionalUnits;

        inventory.updatedAt =
            new Date();

    } else {

        substation.productInventory.push({

            productId:
                product._id,

            name:
                product.name,

            category:
                product.category,

            subcategory:
                product.subcategory,

            days:
                product.days,

            units:
                additionalUnits,

            updatedAt:
                new Date()
        });
    }

    if (session) {
        await substation.save({
            session
        });
    } else {
        await substation.save();
    }

    return substation;
}


// ==========================================================
// CREATE STOCK
//
// ADMIN
// ------
// Creates warehouse Stock + Product.
//
// STAFF
// ------
// Creates Product FIFO directly for assigned substation.
//
// Staff Stock itself remains empty:
//
// units = 0
// purchaseBatches = []
// buyPrice = 0
// unitBuyPrice = 0
//
// ==========================================================

async function createStock(body, user) {

    const staff = isStaff(user);

    const session =
        await mongoose.startSession();

    try {

        let result;

        await session.withTransaction(
            async () => {

                // --------------------------------------------------
                // STAFF SUBSTATION
                // --------------------------------------------------

                let staffSubstationId = null;

                if (staff) {

                    staffSubstationId =
                        getStaffSubstationId(user);
                }

                // --------------------------------------------------
                // BASIC DATA
                // --------------------------------------------------

                const name =
                    text(body.name);

                const categoryName =
                    text(body.category).toLowerCase();

                const subcategory =
                    cleanSubcategory(
                        body.subcategory
                    );

                const units =
                    wholeNumber(body.units);

                // --------------------------------------------------
                // IMPORTANT:
                //
                // body.buyPrice = TOTAL PURCHASE COST
                //
                // It is NOT the unit buy price.
                // --------------------------------------------------

                const totalPurchaseCost =
                    number(body.buyPrice);

                const unitSellPrice =
                    number(body.unitSellPrice);

                const days =
                    wholeNumber(body.days);

                const image =
                    text(body.image);

                const description =
                    text(body.description);

                // --------------------------------------------------
                // VALIDATION
                // --------------------------------------------------

                if (!categoryName) {
                    throw new Error(
                        "Category is required."
                    );
                }

                if (units <= 0) {
                    throw new Error(
                        "Units must be greater than zero."
                    );
                }

                if (totalPurchaseCost < 0) {
                    throw new Error(
                        "Purchase cost cannot be negative."
                    );
                }

                if (unitSellPrice < 0) {
                    throw new Error(
                        "Selling price cannot be negative."
                    );
                }

                // --------------------------------------------------
                // CATEGORY
                // --------------------------------------------------

                const category =
                    await getCategoryByName(
                        categoryName,
                        session
                    );

                if (!category) {
                    throw new Error(
                        "Category not found."
                    );
                }

                validateCategory(category);

                // --------------------------------------------------
                // PRODUCT NAME
                // --------------------------------------------------

                const productName =
                    name ||
                    subcategory;

                if (!productName) {
                    throw new Error(
                        "Product name or subcategory is required."
                    );
                }

                // --------------------------------------------------
                // DUPLICATE STOCK CHECK
                // --------------------------------------------------

                const duplicateQuery =
                    Stock.findOne({
                        active: { $ne: false },
                        name: productName,
                        category: category.name,
                        subcategory
                    });

                duplicateQuery.session(session);

                const duplicate =
                    await duplicateQuery;

                if (duplicate) {
                    throw new Error(
                        "A stock entry with the same product details already exists."
                    );
                }

                // --------------------------------------------------
                // UNIT BUY PRICE
                //
                // BACKEND COMPUTED.
                // --------------------------------------------------

                const unitBuyPrice =
                    calculateUnitBuyPrice(
                        totalPurchaseCost,
                        units
                    );

                // --------------------------------------------------
                // CREATE STOCK
                // --------------------------------------------------

                const stock =
                    new Stock({

                        name:
                            productName,

                        category:
                            category.name,

                        subcategory,

                        days,

                        image,

                        description,

                        // ------------------------------------------
                        // STAFF STOCK IS NEVER WAREHOUSE STOCK
                        // ------------------------------------------

                        units:
                            staff ? 0 : units,

                        buyPrice:
                            staff
                                ? 0
                                : unitBuyPrice,

                        unitBuyPrice:
                            staff
                                ? 0
                                : unitBuyPrice,

                        // ------------------------------------------
                        // ADMIN = warehouse FIFO
                        // STAFF = no warehouse FIFO
                        // ------------------------------------------

                        purchaseBatches:
                            staff
                                ? []
                                : [
                                    {
                                        units,

                                        buyPrice:
                                            unitBuyPrice,

                                        purchasedAt:
                                            new Date()
                                    }
                                ]
                    });

                await stock.save({
                    session
                });

                // --------------------------------------------------
                // CREATE PRODUCT
                // --------------------------------------------------

                const productFifoBatches =
                    staff
                        ? [
                            {
                                units,

                                buyPrice:
                                    unitBuyPrice,

                                purchasedAt:
                                    new Date(),

                                // ----------------------------------
                                // CRITICAL STAFF OWNERSHIP
                                // ----------------------------------

                                StaffFIFOsubstation:
                                    new mongoose.Types.ObjectId(
                                        staffSubstationId
                                    )
                            }
                        ]
                        : [];

                const product =
                    new Product({

                        stock:
                            stock._id,

                        name:
                            productName,

                        category:
                            category._id,

                        subcategory,

                        days,

                        image,

                        description,

                        unitSellPrice,

                        // ------------------------------------------
                        // STAFF PRODUCT INVENTORY
                        // ------------------------------------------

                        units:
                            staff
                                ? units
                                : 0,

                        fifoBatches:
                            productFifoBatches,

                        buyPrice:
                            staff
                                ? unitBuyPrice
                                : 0,

                        unitBuyPrice:
                            staff
                                ? unitBuyPrice
                                : 0
                    });

                await product.save({
                    session
                });

                // --------------------------------------------------
                // STAFF SUBSTATION INVENTORY
                // --------------------------------------------------

                if (staff) {

                    await updateStaffSubstationInventory(
                        staffSubstationId,
                        product,
                        units,
                        session
                    );
                }

                // --------------------------------------------------
                // ADMIN WAREHOUSE TOTALS
                // --------------------------------------------------

                await recalculateStockTotals(
                    session
                );

                result = {
                    stock,
                    product
                };
            }
        );

        return {
            stock:
                result.stock.toObject
                    ? result.stock.toObject()
                    : result.stock,

            product:
                result.product.toObject
                    ? result.product.toObject()
                    : result.product
        };

    } finally {

        await session.endSession();
    }
}


// ==========================================================
// UPDATE STOCK ENTRY
//
// ADMIN
// ------
// body.units = ADDITIONAL WAREHOUSE UNITS
//
// Creates NEW Stock.purchaseBatches FIFO batch.
//
// STAFF
// ------
// body.units = ADDITIONAL STAFF PRODUCT UNITS
//
// Creates NEW Product.fifoBatches FIFO batch.
//
// Staff batch receives:
// StaffFIFOsubstation = user.assignedSubstation
//
// Staff Stock warehouse quantities remain ZERO.
//
// ==========================================================

async function updateStockEntry(
    stockId,
    body,
    user
) {

    if (
        !stockId ||
        !mongoose.Types.ObjectId.isValid(stockId)
    ) {
        throw new Error(
            "Invalid stock ID."
        );
    }

    const staff =
        isStaff(user);

    let staffSubstationId = null;

    if (staff) {

        staffSubstationId =
            getStaffSubstationId(user);
    }

    const session =
        await mongoose.startSession();

    try {

        let result;

        await session.withTransaction(
            async () => {

                // --------------------------------------------------
                // LOAD STOCK
                // --------------------------------------------------

                const stockQuery =
                    Stock.findById(stockId);

                stockQuery.session(session);

                const stock =
                    await stockQuery;

                if (!stock) {
                    throw new Error(
                        "Stock not found."
                    );
                }

                // --------------------------------------------------
                // ADMIN RECONCILES WAREHOUSE FIFO
                // --------------------------------------------------

                if (!staff) {

                    reconcilePurchaseBatches(
                        stock
                    );
                }

                // --------------------------------------------------
                // ADDITIONAL UNITS
                //
                // IMPORTANT:
                //
                // body.units means ADDITIONAL units.
                // It does NOT replace current units.
                // --------------------------------------------------

                const additionalUnits =
                    wholeNumber(
                        body.units
                    );

                if (additionalUnits < 0) {
                    throw new Error(
                        "Additional units cannot be negative."
                    );
                }

                // --------------------------------------------------
                // TOTAL PURCHASE COST
                //
                // body.buyPrice is TOTAL cost for the
                // additional units.
                // --------------------------------------------------

                const totalPurchaseCost =
                    number(body.buyPrice);

                if (
                    additionalUnits > 0 &&
                    totalPurchaseCost < 0
                ) {
                    throw new Error(
                        "Purchase cost cannot be negative."
                    );
                }

                // --------------------------------------------------
                // CATEGORY
                // --------------------------------------------------

                let categoryName =
                    text(body.category);

                if (categoryName) {
                    categoryName =
                        categoryName.toLowerCase();
                }

                if (!categoryName) {

                    categoryName =
                        text(stock.category)
                            .toLowerCase();
                }

                const category =
                    await getCategoryByName(
                        categoryName,
                        session
                    );

                if (!category) {
                    throw new Error(
                        "Category not found."
                    );
                }

                validateCategory(category);

                // --------------------------------------------------
                // PRODUCT NAME
                // --------------------------------------------------

                const subcategory =
                    cleanSubcategory(
                        body.subcategory !== undefined
                            ? body.subcategory
                            : stock.subcategory
                    );

                const requestedName =
                    text(body.name);

                const productName =
                    requestedName ||
                    text(stock.name) ||
                    subcategory;

                if (!productName) {
                    throw new Error(
                        "Product name or subcategory is required."
                    );
                }

                // --------------------------------------------------
                // SELL PRICE
                // --------------------------------------------------

                const unitSellPrice =
                    body.unitSellPrice !== undefined
                        ? number(body.unitSellPrice)
                        : null;

                if (
                    unitSellPrice !== null &&
                    unitSellPrice < 0
                ) {
                    throw new Error(
                        "Selling price cannot be negative."
                    );
                }

                // --------------------------------------------------
                // OTHER FIELDS
                // --------------------------------------------------

                const days =
                    body.days !== undefined
                        ? wholeNumber(body.days)
                        : stock.days;

                const image =
                    body.image !== undefined
                        ? text(body.image)
                        : stock.image;

                const description =
                    body.description !== undefined
                        ? text(body.description)
                        : stock.description;

                // --------------------------------------------------
                // DUPLICATE CHECK
                // --------------------------------------------------

                const duplicateQuery =
                    Stock.findOne({

                        _id: {
                            $ne: stock._id
                        },

                        active: {
                            $ne: false
                        },

                        name:
                            productName,

                        category:
                            category.name,

                        subcategory
                    });

                duplicateQuery.session(session);

                const duplicate =
                    await duplicateQuery;

                if (duplicate) {
                    throw new Error(
                        "Another stock entry with the same product details already exists."
                    );
                }

                // ==================================================
                // UPDATE STOCK
                // ==================================================

                stock.name =
                    productName;

                stock.category =
                    category.name;

                stock.subcategory =
                    subcategory;

                stock.days =
                    days;

                stock.image =
                    image;

                stock.description =
                    description;

                // ==================================================
                // ADMIN STOCK
                // ==================================================

                if (!staff) {

                    if (
                        !stock.purchaseBatches ||
                        !Array.isArray(
                            stock.purchaseBatches
                        )
                    ) {
                        stock.purchaseBatches =
                            [];
                    }

                    // ----------------------------------------------
                    // NEW FIFO BATCH
                    // ----------------------------------------------

                    if (additionalUnits > 0) {

                        const additionalUnitBuyPrice =
                            calculateUnitBuyPrice(
                                totalPurchaseCost,
                                additionalUnits
                            );

                        stock.purchaseBatches.push({

                            units:
                                additionalUnits,

                            buyPrice:
                                additionalUnitBuyPrice,

                            purchasedAt:
                                new Date()
                        });

                        sortFifoBatches(
                            stock.purchaseBatches
                        );
                    }

                    // ----------------------------------------------
                    // Recalculate warehouse units
                    // ----------------------------------------------

                    stock.units =
                        stock.purchaseBatches.reduce(
                            (total, batch) =>
                                total +
                                wholeNumber(
                                    batch.units
                                ),
                            0
                        );

                    // ----------------------------------------------
                    // Recalculate unit buy price
                    // ----------------------------------------------

                    const fifoValue =
                        calculateFifoValue(
                            stock.purchaseBatches
                        );

                    if (stock.units > 0) {

                        stock.unitBuyPrice =
                            fifoValue /
                            stock.units;

                        stock.buyPrice =
                            stock.unitBuyPrice;

                    } else {

                        stock.unitBuyPrice = 0;
                        stock.buyPrice = 0;
                    }
                }

                // ==================================================
                // STAFF STOCK
                //
                // Staff never owns warehouse stock.
                // ==================================================

                else {

                    stock.units = 0;

                    stock.purchaseBatches = [];

                    stock.buyPrice = 0;

                    stock.unitBuyPrice = 0;
                }

                await stock.save({
                    session
                });

                // ==================================================
                // LOAD PRODUCT
                // ==================================================

                const productQuery =
                    Product.findOne({
                        stock: stock._id
                    });

                productQuery.session(session);

                const product =
                    await productQuery;

                if (!product) {
                    throw new Error(
                        "Product linked to this stock was not found."
                    );
                }

                // --------------------------------------------------
                // PRODUCT FIELDS
                // --------------------------------------------------

                product.name =
                    productName;

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
                    unitSellPrice !== null
                ) {

                    product.unitSellPrice =
                        unitSellPrice;
                }

                // ==================================================
                // STAFF PRODUCT FIFO
                // ==================================================

                if (staff) {

                    if (additionalUnits > 0) {

                        // ------------------------------------------
                        // BACKEND COMPUTED UNIT BUY PRICE
                        // ------------------------------------------

                        const additionalUnitBuyPrice =
                            calculateUnitBuyPrice(
                                totalPurchaseCost,
                                additionalUnits
                            );

                        // ------------------------------------------
                        // CREATE NEW STAFF FIFO BATCH
                        //
                        // IMPORTANT:
                        //
                        // StaffFIFOsubstation comes ONLY from
                        // authenticated user.
                        // ------------------------------------------

                        addStaffProductFifoBatch(
                            product,

                            additionalUnits,

                            additionalUnitBuyPrice,

                            staffSubstationId
                        );

                        // ------------------------------------------
                        // ADD SAME UNITS TO ASSIGNED SUBSTATION
                        // ------------------------------------------

                        await updateStaffSubstationInventory(
                            staffSubstationId,

                            product,

                            additionalUnits,

                            session
                        );
                    }

                    // ------------------------------------------------
                    // Product FIFO recalculation is handled by
                    // addStaffProductFifoBatch when new units are
                    // added.
                    //
                    // If no additional units were added, preserve
                    // existing Product FIFO.
                    // ------------------------------------------------

                    recalculateProductFifo(
                        product
                    );
                }

                // ==================================================
                // ADMIN PRODUCT
                //
                // Warehouse additions DO NOT immediately allocate
                // Product inventory to substations.
                //
                // Product FIFO remains untouched here.
                // ==================================================

                await product.save({
                    session
                });

                // ==================================================
                // RECALCULATE STOCK TOTALS
                // ==================================================

                await recalculateStockTotals(
                    session
                );

                result = {
                    stock,
                    product
                };
            }
        );

        return {
            stock:
                result.stock.toObject
                    ? result.stock.toObject()
                    : result.stock,

            product:
                result.product.toObject
                    ? result.product.toObject()
                    : result.product
        };

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

    updateStockEntry,

    // Exported because other stock-service modules may use
    // the same Product FIFO logic.
    recalculateProductFifo,

    addStaffProductFifoBatch,

    updateStaffSubstationInventory
};