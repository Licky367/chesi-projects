// ==========================================================
// services/stockService/stockCrud.js
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
//
// Stock.units           = 0
// Stock.purchaseBatches = []
// Stock.buyPrice        = 0
// Stock.unitBuyPrice    = 0
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
// IMPORTANT CATEGORY RULE:
//
// The controller resolves req.body.category into a
// Category._id before calling this service.
//
// Therefore this service accepts:
// - Category ObjectId
// - Category name
//
// Product.category = Category._id
// Stock.category   = Category.name
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
// USER ROLE CHECKS
// ==========================================================

function isStaff(user) {

    return Boolean(
        user &&
        user.role === "staff"
    );
}


function isAdmin(user) {

    return Boolean(
        user &&
        user.role === "admin"
    );
}


// ==========================================================
// VALIDATE AUTHENTICATED USER
//
// Only ADMIN and STAFF may use these stock operations.
//
// IMPORTANT:
// We do NOT treat every non-staff user as admin.
// ==========================================================

function validateStockUser(user) {

    if (!user) {

        throw new Error(
            "Authenticated user is required."
        );
    }

    if (
        !isAdmin(user) &&
        !isStaff(user)
    ) {

        throw new Error(
            "You are not authorized to manage stock."
        );
    }

    return user;
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
        !mongoose.Types.ObjectId.isValid(
            user.assignedSubstation
        )
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
// RESOLVE CATEGORY
//
// The controller currently does:
//
//     resolveCategoryId(req.body.category)
//
// and then sends:
//
//     body.category = Category._id
//
// Therefore the service MUST NOT assume that
// body.category is a category name.
//
// This helper supports both:
// - Category ObjectId
// - Category name
//
// Returns the actual Category document.
// ==========================================================

async function resolveStockCategory(
    categoryValue,
    session
) {

    const value =
        text(categoryValue);

    if (!value) {

        throw new Error(
            "Category is required."
        );
    }

    // ------------------------------------------------------
    // CATEGORY ID
    // ------------------------------------------------------

    if (
        mongoose.Types.ObjectId.isValid(value)
    ) {

        const category =
            await getCategory(
                value,
                session
            );

        if (!category) {

            throw new Error(
                "Category not found."
            );
        }

        validateCategory(category);

        return category;
    }

    // ------------------------------------------------------
    // CATEGORY NAME
    // ------------------------------------------------------

    const category =
        await getCategoryByName(
            value.toLowerCase(),
            session
        );

    if (!category) {

        throw new Error(
            "Category not found."
        );
    }

    validateCategory(category);

    return category;
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

async function recalculateStockTotals(
    session = null
) {

    const query =
        Stock.find({
            active: {
                $ne: false
            }
        });

    if (session) {
        query.session(session);
    }

    const stocks =
        await query;

    let cashOutflow = 0;
    let overal = 0;

    const categoryTotals = {};

    // ======================================================
    // FIRST PASS
    // ======================================================

    for (const stock of stocks) {

        // --------------------------------------------------
        // Ensure purchaseBatches exists
        // --------------------------------------------------

        if (
            !stock.purchaseBatches ||
            !Array.isArray(
                stock.purchaseBatches
            )
        ) {

            stock.purchaseBatches = [];
        }

        // --------------------------------------------------
        // Reconcile warehouse FIFO
        //
        // Staff stock has an empty purchaseBatches array,
        // so it remains zero.
        // --------------------------------------------------

        reconcilePurchaseBatches(
            stock
        );

        // --------------------------------------------------
        // Calculate FIFO value
        // --------------------------------------------------

        const fifoValue =
            calculateFifoValue(
                stock.purchaseBatches
            );

        // --------------------------------------------------
        // Calculate warehouse units
        // --------------------------------------------------

        const stockUnits =
            stock.purchaseBatches.reduce(
                (total, batch) =>
                    total +
                    wholeNumber(
                        batch.units
                    ),
                0
            );

        stock.units =
            stockUnits;

        // --------------------------------------------------
        // Calculate current unit buy price
        // --------------------------------------------------

        if (stockUnits > 0) {

            stock.unitBuyPrice =
                fifoValue /
                stockUnits;

            stock.buyPrice =
                stock.unitBuyPrice;

        } else {

            stock.unitBuyPrice = 0;
            stock.buyPrice = 0;
        }

        // --------------------------------------------------
        // Warehouse cash outflow
        // --------------------------------------------------

        cashOutflow +=
            fifoValue;

        // --------------------------------------------------
        // Overall inventory value
        // --------------------------------------------------

        overal +=
            fifoValue;

        // --------------------------------------------------
        // Category totals
        // --------------------------------------------------

        const categoryName =
            text(
                stock.category
            ).toLowerCase();

        if (categoryName) {

            if (
                !categoryTotals[
                    categoryName
                ]
            ) {

                categoryTotals[
                    categoryName
                ] = 0;
            }

            categoryTotals[
                categoryName
            ] += fifoValue;
        }

        // --------------------------------------------------
        // Temporarily set values.
        //
        // categoryOveral is corrected again during the
        // second pass once all category totals are known.
        // --------------------------------------------------

        stock.categoryOveral =
            categoryTotals[
                categoryName
            ] || 0;

        stock.overal =
            overal;

        stock.totalsUpdatedAt =
            new Date();

        if (session) {

            await stock.save({
                session
            });

        } else {

            await stock.save();
        }
    }

    // ======================================================
    // SECOND PASS
    //
    // Apply final category totals to every stock.
    // ======================================================

    for (const stock of stocks) {

        const categoryName =
            text(
                stock.category
            ).toLowerCase();

        stock.categoryOveral =
            categoryTotals[
                categoryName
            ] || 0;

        stock.overal =
            overal;

        stock.totalsUpdatedAt =
            new Date();

        if (session) {

            await stock.save({
                session
            });

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
        !Array.isArray(
            product.fifoBatches
        )
    ) {

        product.fifoBatches = [];
    }

    // ------------------------------------------------------
    // Remove invalid / zero batches
    // ------------------------------------------------------

    product.fifoBatches =
        product.fifoBatches.filter(
            batch =>
                wholeNumber(
                    batch.units
                ) > 0
        );

    // ------------------------------------------------------
    // No FIFO
    // ------------------------------------------------------

    if (
        product.fifoBatches.length === 0
    ) {

        product.units = 0;

        product.buyPrice = 0;

        product.unitBuyPrice = 0;

        return product;
    }

    // ------------------------------------------------------
    // Sort FIFO
    // ------------------------------------------------------

    sortFifoBatches(
        product.fifoBatches
    );

    // ------------------------------------------------------
    // Product total units
    // ------------------------------------------------------

    const totalUnits =
        product.fifoBatches.reduce(
            (total, batch) =>
                total +
                wholeNumber(
                    batch.units
                ),
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
        number(
            oldestBatch.buyPrice
        );

    product.units =
        totalUnits;

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

    units =
        wholeNumber(units);

    unitBuyPrice =
        number(unitBuyPrice);

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
        !Array.isArray(
            product.fifoBatches
        )
    ) {

        product.fifoBatches = [];
    }

    // ------------------------------------------------------
    // Ownership is permanently attached to the authenticated
    // staff member's assigned substation.
    // ------------------------------------------------------

    product.fifoBatches.push({

        units,

        buyPrice:
            unitBuyPrice,

        receivedAt:
            new Date(),

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

    recalculateProductFifo(
        product
    );

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
        !mongoose.Types.ObjectId.isValid(
            substationId
        )
    ) {

        throw new Error(
            "Invalid staff substation."
        );
    }

    additionalUnits =
        wholeNumber(
            additionalUnits
        );

    if (additionalUnits <= 0) {
        return;
    }

    const substationQuery =
        Substation.findOne({

            _id:
                substationId,

            active: {
                $ne: false
            }
        });

    if (session) {

        substationQuery.session(
            session
        );
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
                String(
                    item.productId
                ) ===
                String(
                    product._id
                )
        );

    if (inventory) {

        inventory.units =
            wholeNumber(
                inventory.units
            ) +
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

async function createStock(
    body,
    user
) {

    // ------------------------------------------------------
    // VALIDATE USER
    // ------------------------------------------------------

    validateStockUser(
        user
    );

    const staff =
        isStaff(user);

    const admin =
        isAdmin(user);

    const session =
        await mongoose.startSession();

    try {

        let result;

        await session.withTransaction(
            async () => {

                // ==================================================
                // STAFF SUBSTATION
                // ==================================================

                let staffSubstationId =
                    null;

                if (staff) {

                    staffSubstationId =
                        getStaffSubstationId(
                            user
                        );
                }

                // ==================================================
                // BASIC DATA
                // ==================================================

                const name =
                    text(
                        body.name
                    );

                const subcategory =
                    cleanSubcategory(
                        body.subcategory
                    );

                const units =
                    wholeNumber(
                        body.units
                    );

                // --------------------------------------------------
                // body.buyPrice = TOTAL PURCHASE COST
                // --------------------------------------------------

                const totalPurchaseCost =
                    number(
                        body.buyPrice
                    );

                const unitSellPrice =
                    number(
                        body.unitSellPrice
                    );

                const days =
                    wholeNumber(
                        body.days
                    );

                const image =
                    text(
                        body.image
                    );

                const description =
                    text(
                        body.description
                    );

                // ==================================================
                // VALIDATION
                // ==================================================

                if (units <= 0) {

                    throw new Error(
                        "Units must be greater than zero."
                    );
                }

                if (
                    totalPurchaseCost < 0
                ) {

                    throw new Error(
                        "Purchase cost cannot be negative."
                    );
                }

                if (
                    unitSellPrice < 0
                ) {

                    throw new Error(
                        "Selling price cannot be negative."
                    );
                }

                // ==================================================
                // CATEGORY
                //
                // IMPORTANT:
                //
                // body.category may already be Category._id
                // because controllers/stock/create-update.js
                // calls resolveCategoryId().
                // ==================================================

                const category =
                    await resolveStockCategory(
                        body.category,
                        session
                    );

                const categoryName =
                    text(
                        category.name
                    ).toLowerCase();

                // ==================================================
                // PRODUCT NAME
                // ==================================================

                const productName =
                    name ||
                    subcategory;

                if (!productName) {

                    throw new Error(
                        "Product name or subcategory is required."
                    );
                }

                // ==================================================
                // DUPLICATE STOCK CHECK
                // ==================================================

                const duplicateQuery =
                    Stock.findOne({

                        active: {
                            $ne: false
                        },

                        name:
                            productName,

                        category:
                            category.name,

                        subcategory
                    });

                duplicateQuery.session(
                    session
                );

                const duplicate =
                    await duplicateQuery;

                if (duplicate) {

                    throw new Error(
                        "A stock entry with the same product details already exists."
                    );
                }

                // ==================================================
                // UNIT BUY PRICE
                //
                // BACKEND COMPUTED.
                // ==================================================

                const unitBuyPrice =
                    calculateUnitBuyPrice(
                        totalPurchaseCost,
                        units
                    );

                // ==================================================
                // CREATE STOCK
                // ==================================================

                const stock =
                    new Stock({

                        name:
                            productName,

                        category:
                            categoryName,

                        subcategory,

                        days,

                        image,

                        description,

                        // ------------------------------------------
                        // ADMIN = warehouse stock
                        // STAFF = zero warehouse stock
                        // ------------------------------------------

                        units:
                            admin
                                ? units
                                : 0,

                        buyPrice:
                            admin
                                ? unitBuyPrice
                                : 0,

                        unitBuyPrice:
                            admin
                                ? unitBuyPrice
                                : 0,

                        // ------------------------------------------
                        // ADMIN = warehouse FIFO
                        // STAFF = no warehouse FIFO
                        // ------------------------------------------

                        purchaseBatches:
                            admin
                                ? [
                                    {
                                        units,

                                        buyPrice:
                                            unitBuyPrice,

                                        purchasedAt:
                                            new Date()
                                    }
                                ]
                                : []
                    });

                await stock.save({
                    session
                });

                // ==================================================
                // CREATE PRODUCT FIFO
                // ==================================================

                const productFifoBatches =
                    staff
                        ? [
                            {
                                units,

                                buyPrice:
                                    unitBuyPrice,

                                receivedAt:
                                    new Date(),

                                StaffFIFOsubstation:
                                    new mongoose.Types.ObjectId(
                                        staffSubstationId
                                    )
                            }
                        ]
                        : [];

                // ==================================================
                // CREATE PRODUCT
                // ==================================================

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

                // ==================================================
                // STAFF SUBSTATION INVENTORY
                // ==================================================

                if (staff) {

                    await updateStaffSubstationInventory(

                        staffSubstationId,

                        product,

                        units,

                        session
                    );
                }

                // ==================================================
                // ADMIN WAREHOUSE TOTALS
                // ==================================================

                if (admin) {

                    await recalculateStockTotals(
                        session
                    );
                }

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

    // ------------------------------------------------------
    // VALIDATE USER
    // ------------------------------------------------------

    validateStockUser(
        user
    );

    const staff =
        isStaff(user);

    const admin =
        isAdmin(user);

    // ------------------------------------------------------
    // VALIDATE STOCK ID
    // ------------------------------------------------------

    if (
        !stockId ||
        !mongoose.Types.ObjectId.isValid(
            stockId
        )
    ) {

        throw new Error(
            "Invalid stock ID."
        );
    }

    // ------------------------------------------------------
    // STAFF SUBSTATION
    // ------------------------------------------------------

    let staffSubstationId =
        null;

    if (staff) {

        staffSubstationId =
            getStaffSubstationId(
                user
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

                const stockQuery =
                    Stock.findById(
                        stockId
                    );

                stockQuery.session(
                    session
                );

                const stock =
                    await stockQuery;

                if (!stock) {

                    throw new Error(
                        "Stock not found."
                    );
                }

                // ==================================================
                // ADMIN RECONCILES WAREHOUSE FIFO
                // ==================================================

                if (admin) {

                    reconcilePurchaseBatches(
                        stock
                    );
                }

                // ==================================================
                // ADDITIONAL UNITS
                //
                // body.units means ADDITIONAL units.
                // It does NOT replace current units.
                // ==================================================

                const additionalUnits =
                    wholeNumber(
                        body.units
                    );

                if (
                    additionalUnits < 0
                ) {

                    throw new Error(
                        "Additional units cannot be negative."
                    );
                }

                // ==================================================
                // TOTAL PURCHASE COST
                //
                // body.buyPrice is TOTAL cost for the
                // additional units.
                // ==================================================

                const totalPurchaseCost =
                    number(
                        body.buyPrice
                    );

                if (
                    additionalUnits > 0 &&
                    totalPurchaseCost < 0
                ) {

                    throw new Error(
                        "Purchase cost cannot be negative."
                    );
                }

                // ==================================================
                // CATEGORY
                //
                // IMPORTANT:
                //
                // body.category normally contains Category._id
                // because the controller resolves it first.
                //
                // If category was omitted, use existing Stock
                // category.
                // ==================================================

                let categoryValue =
                    body.category;

                if (
                    categoryValue === undefined ||
                    categoryValue === null ||
                    text(categoryValue) === ""
                ) {

                    categoryValue =
                        stock.category;
                }

                const category =
                    await resolveStockCategory(
                        categoryValue,
                        session
                    );

                const categoryName =
                    text(
                        category.name
                    ).toLowerCase();

                // ==================================================
                // PRODUCT NAME
                // ==================================================

                const subcategory =
                    cleanSubcategory(

                        body.subcategory !==
                        undefined

                            ? body.subcategory

                            : stock.subcategory
                    );

                const requestedName =
                    text(
                        body.name
                    );

                const productName =
                    requestedName ||
                    text(stock.name) ||
                    subcategory;

                if (!productName) {

                    throw new Error(
                        "Product name or subcategory is required."
                    );
                }

                // ==================================================
                // SELL PRICE
                // ==================================================

                const unitSellPrice =
                    body.unitSellPrice !==
                    undefined

                        ? number(
                            body.unitSellPrice
                        )

                        : null;

                if (
                    unitSellPrice !== null &&
                    unitSellPrice < 0
                ) {

                    throw new Error(
                        "Selling price cannot be negative."
                    );
                }

                // ==================================================
                // OTHER FIELDS
                // ==================================================

                const days =
                    body.days !==
                    undefined

                        ? wholeNumber(
                            body.days
                        )

                        : stock.days;

                const image =
                    body.image !==
                    undefined

                        ? text(
                            body.image
                        )

                        : stock.image;

                const description =
                    body.description !==
                    undefined

                        ? text(
                            body.description
                        )

                        : stock.description;

                // ==================================================
                // DUPLICATE CHECK
                // ==================================================

                const duplicateQuery =
                    Stock.findOne({

                        _id: {
                            $ne:
                                stock._id
                        },

                        active: {
                            $ne:
                                false
                        },

                        name:
                            productName,

                        category:
                            category.name,

                        subcategory
                    });

                duplicateQuery.session(
                    session
                );

                const duplicate =
                    await duplicateQuery;

                if (duplicate) {

                    throw new Error(
                        "Another stock entry with the same product details already exists."
                    );
                }

                // ==================================================
                // UPDATE COMMON STOCK FIELDS
                // ==================================================

                stock.name =
                    productName;

                stock.category =
                    categoryName;

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
                //
                // Warehouse FIFO
                // ==================================================

                if (admin) {

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
                    // CREATE NEW FIFO BATCH
                    // ----------------------------------------------

                    if (
                        additionalUnits > 0
                    ) {

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
                    // Recalculate warehouse FIFO value
                    // ----------------------------------------------

                    const fifoValue =
                        calculateFifoValue(
                            stock.purchaseBatches
                        );

                    if (
                        stock.units > 0
                    ) {

                        stock.unitBuyPrice =
                            fifoValue /
                            stock.units;

                        stock.buyPrice =
                            stock.unitBuyPrice;

                    } else {

                        stock.unitBuyPrice =
                            0;

                        stock.buyPrice =
                            0;
                    }
                }

                // ==================================================
                // STAFF STOCK
                //
                // Staff NEVER owns warehouse stock.
                // ==================================================

                else if (staff) {

                    stock.units =
                        0;

                    stock.purchaseBatches =
                        [];

                    stock.buyPrice =
                        0;

                    stock.unitBuyPrice =
                        0;
                }

                await stock.save({
                    session
                });

                // ==================================================
                // LOAD PRODUCT
                // ==================================================

                const productQuery =
                    Product.findOne({
                        stock:
                            stock._id
                    });

                productQuery.session(
                    session
                );

                const product =
                    await productQuery;

                if (!product) {

                    throw new Error(
                        "Product linked to this stock was not found."
                    );
                }

                // ==================================================
                // UPDATE PRODUCT FIELDS
                // ==================================================

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

                    if (
                        additionalUnits > 0
                    ) {

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
                    // Ensure Product.units and current FIFO price
                    // match the Product FIFO.
                    // ------------------------------------------------

                    recalculateProductFifo(
                        product
                    );
                }

                // ==================================================
                // ADMIN PRODUCT
                //
                // Warehouse additions do NOT immediately allocate
                // Product inventory to substations.
                //
                // Product FIFO remains untouched.
                // ==================================================

                await product.save({
                    session
                });

                // ==================================================
                // RECALCULATE WAREHOUSE TOTALS
                //
                // Only necessary for admin warehouse changes.
                // ==================================================

                if (admin) {

                    await recalculateStockTotals(
                        session
                    );
                }

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

    recalculateProductFifo,

    addStaffProductFifoBatch,

    updateStaffSubstationInventory
};