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
// Supports:
// - Category ObjectId
// - Category name
//
// Returns the Category document.
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
// IMPORTANT:
//
// This function DOES NOT call stock.save().
//
// It first calculates all values and then performs one
// sequential updateOne() for each Stock document.
//
// This prevents the same Mongoose document from being
// saved more than once concurrently.
// ==========================================================

async function recalculateStockTotals(
session = null
) {

// ======================================================
// LOAD ACTIVE STOCK
// ======================================================

const query =
    Stock.find({
        active: {
            $ne: false
        }
    });

if (session) {

    query.session(
        session
    );
}

const stocks =
    await query;

let cashOutflow = 0;
let overal = 0;

const categoryTotals = {};

const calculatedStocks = [];

// ======================================================
// FIRST PASS
//
// Calculate everything in memory.
//
// NO DATABASE SAVE HERE.
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
    // Staff stock normally has:
    //
    // units = 0
    // purchaseBatches = []
    //
    // Therefore there is nothing to reconcile.
    //
    // Legacy warehouse stock with units > 0 is still
    // reconciled.
    // --------------------------------------------------

    if (
        stock.purchaseBatches.length > 0 ||
        wholeNumber(stock.units) > 0
    ) {

        reconcilePurchaseBatches(
            stock
        );
    }

    // --------------------------------------------------
    // FIFO VALUE
    // --------------------------------------------------

    const fifoValue =
        calculateFifoValue(
            stock.purchaseBatches
        );

    // --------------------------------------------------
    // FIFO UNITS
    // --------------------------------------------------

    const stockUnits =
        stock.purchaseBatches.reduce(
            (
                total,
                batch
            ) =>
                total +
                wholeNumber(
                    batch.units
                ),
            0
        );

    // --------------------------------------------------
    // UNIT BUY PRICE
    //
    // Backend calculated from FIFO value.
    // --------------------------------------------------

    let unitBuyPrice = 0;

    if (
        stockUnits > 0
    ) {

        unitBuyPrice =
            fifoValue /
            stockUnits;
    }

    // --------------------------------------------------
    // GLOBAL TOTALS
    // --------------------------------------------------

    cashOutflow +=
        fifoValue;

    overal +=
        fifoValue;

    // --------------------------------------------------
    // CATEGORY TOTALS
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
    // Store calculated result.
    //
    // Nothing is written to MongoDB yet.
    // --------------------------------------------------

    calculatedStocks.push({

        id:
            stock._id,

        purchaseBatches:
            stock.purchaseBatches,

        units:
            stockUnits,

        buyPrice:
            unitBuyPrice,

        unitBuyPrice:
            unitBuyPrice,

        categoryName,

        fifoValue
    });
}

// ======================================================
// SECOND PASS
//
// Update each Stock exactly once.
//
// IMPORTANT:
//
// We use updateOne(), not save().
// ======================================================

for (
    const calculated
    of calculatedStocks
) {

    const update = {

        purchaseBatches:
            calculated.purchaseBatches,

        units:
            calculated.units,

        buyPrice:
            calculated.buyPrice,

        unitBuyPrice:
            calculated.unitBuyPrice,

        categoryOveral:
            categoryTotals[
                calculated.categoryName
            ] || 0,

        overal:
            overal,

        totalsUpdatedAt:
            new Date()
    };

    const updateQuery =
        Stock.updateOne(

            {
                _id:
                    calculated.id
            },

            {
                $set:
                    update
            }
        );

    if (session) {

        updateQuery.session(
            session
        );
    }

    await updateQuery;
}

// ======================================================
// RETURN TOTALS
// ======================================================

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
        (
            total,
            batch
        ) =>
            total +
            wholeNumber(
                batch.units
            ),
        0
    );

// ------------------------------------------------------
// Oldest remaining FIFO batch
// determines current unit buy price.
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
// StaffFIFOsubstation MUST come from authenticated user.
//
// It MUST NOT come from req.body.
// ==========================================================

function addStaffProductFifoBatch(
product,
units,
unitBuyPrice,
staffFIFOsubstation
) {

units =
    wholeNumber(
        units
    );

unitBuyPrice =
    number(
        unitBuyPrice
    );

if (
    units <= 0
) {

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
// STAFF FIFO OWNERSHIP
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
// SORT + RECALCULATE
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

if (
    additionalUnits <= 0
) {

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

// ------------------------------------------------------
// Substation is saved once.
// ------------------------------------------------------

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
// Staff Stock remains:
//
// units = 0
// purchaseBatches = []
// buyPrice = 0
// unitBuyPrice = 0
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

            if (
                units <= 0
            ) {

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
            // BACKEND UNIT BUY PRICE
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
            // PRODUCT FIFO
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
// STAFF
// ------
// body.units = ADDITIONAL STAFF PRODUCT UNITS
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
            // SUBCATEGORY
            // ==================================================

            const subcategory =
                cleanSubcategory(

                    body.subcategory !==
                    undefined

                        ? body.subcategory

                        : stock.subcategory
                );

            // ==================================================
            // PRODUCT NAME
            // ==================================================

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
                // NEW FIFO BATCH
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
                // WAREHOUSE UNITS
                // ----------------------------------------------

                stock.units =
                    stock.purchaseBatches.reduce(
                        (
                            total,
                            batch
                        ) =>
                            total +
                            wholeNumber(
                                batch.units
                            ),
                        0
                    );

                // ----------------------------------------------
                // WAREHOUSE FIFO VALUE
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
            // Staff never owns warehouse stock.
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

            // --------------------------------------------------
            // SAVE STOCK ONCE
            // --------------------------------------------------

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
                    // BACKEND UNIT BUY PRICE
                    // ------------------------------------------

                    const additionalUnitBuyPrice =
                        calculateUnitBuyPrice(
                            totalPurchaseCost,
                            additionalUnits
                        );

                    // ------------------------------------------
                    // ADD STAFF FIFO
                    // ------------------------------------------

                    addStaffProductFifoBatch(

                        product,

                        additionalUnits,

                        additionalUnitBuyPrice,

                        staffSubstationId
                    );

                    // ------------------------------------------
                    // ADD TO ASSIGNED SUBSTATION
                    // ------------------------------------------

                    await updateStaffSubstationInventory(

                        staffSubstationId,

                        product,

                        additionalUnits,

                        session
                    );
                }

                // ------------------------------------------------
                // Recalculate Product FIFO totals.
                // ------------------------------------------------

                recalculateProductFifo(
                    product
                );
            }

            // ==================================================
            // SAVE PRODUCT ONCE
            // ==================================================

            await product.save({
                session
            });

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