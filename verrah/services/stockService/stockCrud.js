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
            { _id: stock._id },
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
// RECALCULATE PRODUCT FIFO TOTALS
//
// Used for staff inventory.
//
// Product.units
//     = total remaining units in Product.fifoBatches
//
// Product.unitBuyPrice
//     = FIFO/current calculated unit buy price
//
// Product.buyPrice
//     = same calculated unit buy price for compatibility
// ==========================================================

function recalculateProductFifo(product) {

    const fifoBatches =
        Array.isArray(product.fifoBatches)
            ? product.fifoBatches
            : [];


    let totalUnits = 0;


    for (const batch of fifoBatches) {

        const units =
            Number(batch.units || 0);

        if (units > 0) {
            totalUnits += units;
        }

    }


    product.units =
        totalUnits;


    if (totalUnits <= 0) {

        product.unitBuyPrice = 0;
        product.buyPrice = 0;

        return product;

    }


    // ------------------------------------------------------
    // FIFO/current unit buy price
    //
    // Oldest remaining batch determines the current
    // product unit buy price.
    // ------------------------------------------------------

    const sorted =
        [...fifoBatches]
            .filter(
                batch =>
                    Number(batch.units || 0) > 0
            )
            .sort(
                (a, b) =>
                    new Date(a.createdAt || a.purchasedAt || 0) -
                    new Date(b.createdAt || b.purchasedAt || 0)
            );


    const oldest =
        sorted[0];


    const unitBuyPrice =
        Number(
            oldest?.buyPrice || 0
        );


    product.unitBuyPrice =
        Number.isFinite(unitBuyPrice)
            ? unitBuyPrice
            : 0;


    product.buyPrice =
        product.unitBuyPrice;


    return product;
}


// ==========================================================
// ADD STAFF PRODUCT FIFO BATCH
// ==========================================================

function addStaffProductFifoBatch(
    product,
    units,
    unitBuyPrice
) {

    if (!Array.isArray(product.fifoBatches)) {
        product.fifoBatches = [];
    }


    product.fifoBatches.push({

        units,

        buyPrice:
            unitBuyPrice,

        purchasedAt:
            new Date()

    });


    // ------------------------------------------------------
    // Keep FIFO order.
    // ------------------------------------------------------

    product.fifoBatches =
        product.fifoBatches.sort(
            (a, b) =>
                new Date(
                    a.purchasedAt ||
                    a.createdAt ||
                    0
                ) -
                new Date(
                    b.purchasedAt ||
                    b.createdAt ||
                    0
                )
        );


    recalculateProductFifo(product);

}


// ==========================================================
// UPDATE STAFF SUBSTATION INVENTORY
// ==========================================================
//
// Staff inventory belongs to:
//
//     user.assignedSubstation
//
// The product inventory record is identified by productId.
//
// If the product is already present:
//     increase units.
//
// If it does not exist:
//     create the inventory entry.
//
// ==========================================================

async function updateStaffSubstationInventory(
    substationId,
    product,
    additionalUnits,
    session
) {

    if (!substationId) {

        throw new Error(
            "Staff member is not assigned to a substation."
        );

    }


    const substation =
        await Substation
            .findOne({
                _id: substationId,
                isActive: true
            })
            .session(session);


    if (!substation) {

        throw new Error(
            "Assigned substation was not found."
        );

    }


    if (
        !Array.isArray(
            substation.productInventory
        )
    ) {

        substation.productInventory = [];

    }


    const productId =
        product._id.toString();


    const inventory =
        substation.productInventory.find(
            item =>
                item.productId &&
                item.productId.toString() === productId
        );


    if (inventory) {

        inventory.units =
            Number(inventory.units || 0) +
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

            days:
                Number(product.days || 0),

            units:
                additionalUnits,

            updatedAt:
                new Date()

        });

    }


    await substation.save({
        session
    });

}


// ==========================================================
// CREATE STOCK
//
// ADMIN:
//
//     Stock.units = created units
//     Stock.purchaseBatches = created FIFO batch
//     Product.units = 0
//     Product.fifoBatches = []
//
// STAFF:
//
//     Stock.units = 0
//     Stock.purchaseBatches = []
//     Product.units = created units
//     Product.fifoBatches = created FIFO batch
//     Assigned substation inventory += created units
// ==========================================================

async function createStock(
    body,
    user
) {

    const isStaff =
        user?.role === "staff";


    // ------------------------------------------------------
    // STAFF VALIDATION
    // ------------------------------------------------------

    if (
        isStaff &&
        !user.assignedSubstation
    ) {

        throw new Error(
            "Staff member is not assigned to a substation."
        );

    }


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
    // UNITS
    // ------------------------------------------------------

    const units =
        wholeNumber(
            body.units,
            isStaff
                ? "Product units"
                : "Warehouse units",
            true
        );

    if (units <= 0) {

        throw new Error(
            isStaff
                ? "Product units must be greater than zero."
                : "Initial warehouse units must be greater than zero."
        );

    }


    // ------------------------------------------------------
    // PURCHASE COST
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
    // ------------------------------------------------------

    const unitSellPrice =
        number(
            body.unitSellPrice ?? body.sellPrice,
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


    const session =
        await mongoose.startSession();

    let createdStock;
    let createdProduct;


    try {

        await session.withTransaction(
            async () => {

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

                                // ----------------------------------
                                // ADMIN:
                                //     warehouse units
                                //
                                // STAFF:
                                //     warehouse remains zero
                                // ----------------------------------

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
                        { session }
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

                                // ----------------------------------
                                // ADMIN:
                                //     product starts at zero
                                //
                                // STAFF:
                                //     product receives the units
                                // ----------------------------------

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
                                                purchasedAt:
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
                        { session }
                    );


                createdProduct =
                    productResult[0];


                // ==================================================
                // STAFF SUBSTATION INVENTORY
                // ==================================================

                if (isStaff) {

                    await updateStaffSubstationInventory(

                        user.assignedSubstation,

                        createdProduct,

                        units,

                        session

                    );

                }

            }
        );


        // ------------------------------------------------------
        // Recalculate ONLY warehouse stock totals.
        // ------------------------------------------------------

        await recalculateStockTotals();


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
// ADMIN:
//
//     additional units -> Stock
//     new FIFO batch -> Stock.purchaseBatches
//
// STAFF:
//
//     additional units -> Product
//     new FIFO batch -> Product.fifoBatches
//     Stock.units remains 0
//     assigned substation inventory increases
//
// Existing FIFO batches are never repriced.
// ==========================================================

async function updateStockEntry(
    stockId,
    body,
    user
) {

    if (
        !mongoose.isValidObjectId(stockId)
    ) {

        throw new Error(
            "Invalid stock."
        );

    }


    const isStaff =
        user?.role === "staff";


    if (
        isStaff &&
        !user.assignedSubstation
    ) {

        throw new Error(
            "Staff member is not assigned to a substation."
        );

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
                // RECONCILE WAREHOUSE FIFO
                //
                // Only relevant to ADMIN.
                //
                // Staff inventory lives in Product FIFO.
                // ==================================================

                if (!isStaff) {

                    await reconcilePurchaseBatches(
                        stock,
                        session
                    );

                }


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
                            isStaff
                                ? "Additional product units"
                                : "Additional warehouse units",
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
                // ADMIN FIFO UPDATE
                // ==================================================

                if (
                    !isStaff &&
                    additionalUnits > 0
                ) {

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


                // ==================================================
                // STAFF STOCK BEHAVIOR
                //
                // Staff does NOT add warehouse stock.
                //
                // Keep Stock.units at zero.
                // Keep warehouse purchaseBatches empty.
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


                if (!product) {

                    throw new Error(
                        "Product associated with this stock was not found."
                    );

                }


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


                // ==================================================
                // STAFF PRODUCT FIFO UPDATE
                // ==================================================

                if (
                    isStaff &&
                    additionalUnits > 0
                ) {

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
                            "Unable to calculate the unit buy price for the additional product stock."
                        );

                    }


                    // ------------------------------------------------
                    // Add FIFO batch to Product.
                    // ------------------------------------------------

                    addStaffProductFifoBatch(

                        product,

                        additionalUnits,

                        additionalUnitBuyPrice

                    );


                    // ------------------------------------------------
                    // Update assigned substation inventory.
                    // ------------------------------------------------

                    await updateStaffSubstationInventory(

                        user.assignedSubstation,

                        product,

                        additionalUnits,

                        session

                    );

                }


                // ==================================================
                // SAVE PRODUCT
                // ==================================================

                await product.save({
                    session
                });


                updatedStock =
                    stock;

            }
        );


        // ======================================================
        // RECALCULATE GLOBAL STOCK TOTALS
        //
        // This affects ADMIN warehouse stock only.
        // Staff Stock.units is zero.
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