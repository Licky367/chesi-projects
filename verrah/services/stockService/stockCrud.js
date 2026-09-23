const mongoose = require("mongoose");
const Stock = require("../../models/stock");
const Product = require("../../models/products");

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
// CREATE STOCK
//
// Form meaning:
//
// units     = initial warehouse quantity
// buyPrice  = total purchase cost of that initial batch
// sellPrice = selling price per unit
//
// A new stock record receives exactly ONE FIFO batch.
// ==========================================================

async function createStock(body) {

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
            "Warehouse units",
            true
        );

    if (units <= 0) {
        throw new Error(
            "Initial warehouse units must be greater than zero."
        );
    }


    // ------------------------------------------------------
    // INITIAL PURCHASE COST
    //
    // This remains exactly as the existing implementation:
    //
    // total purchase cost / units
    //
    // = unit buy price of the FIFO batch
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


    // ------------------------------------------------------
    // FIRST FIFO BATCH
    // ------------------------------------------------------

    const purchaseBatches = [

        {
            units,
            buyPrice: unitBuyPrice,
            purchasedAt: new Date()
        }

    ];


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
                                units,

                                // Existing behavior preserved.
                                buyPrice:
                                    unitBuyPrice,

                                unitBuyPrice,

                                purchaseBatches,

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

                                units: 0,

                                fifoBatches: [],

                                unitBuyPrice: 0,

                                buyPrice: 0,

                                unitSellPrice
                            }
                        ],
                        { session }
                    );


                createdProduct =
                    productResult[0];

            }
        );


        await recalculateStockTotals();


        const stock =
            await Stock
                .findById(createdStock._id)
                .lean();


        const product =
            await Product
                .findById(createdProduct._id)
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
// Existing FIFO batches are NEVER repriced.
// ==========================================================

async function updateStockEntry(
    stockId,
    body
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
                //
                // In edit mode the form submits:
                //
                // blank = 0 additional units
                // number = additional units
                // ==================================================

                const rawUnits =
                    text(body.units);


                const additionalUnits =
                    rawUnits === ""
                        ? 0
                        : wholeNumber(
                            rawUnits,
                            "Additional warehouse units",
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
                //
                // IMPORTANT:
                // The form always submits sellPrice.
                //
                // It must update whether additional stock
                // is being added or not.
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
                // ADDITIONAL FIFO STOCK
                //
                // ONLY create a new purchase batch when
                // additionalUnits > 0.
                //
                // Existing batches are untouched.
                // ==================================================

                if (additionalUnits > 0) {

                    // ------------------------------------------------
                    // Buy price is REQUIRED for a new batch.
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


                    // ------------------------------------------------
                    // Add NEW FIFO batch.
                    // Existing batches retain their prices.
                    // ------------------------------------------------

                    stock.purchaseBatches.push({

                        units:
                            additionalUnits,

                        buyPrice:
                            additionalUnitBuyPrice,

                        purchasedAt:
                            new Date()

                    });


                    // ------------------------------------------------
                    // Increase warehouse quantity.
                    // ------------------------------------------------

                    stock.units =
                        currentUnits +
                        additionalUnits;


                    // ------------------------------------------------
                    // Keep FIFO ordering.
                    // ------------------------------------------------

                    stock.purchaseBatches =
                        sortFifoBatches(
                            stock.purchaseBatches
                        );


                    // ------------------------------------------------
                    // Preserve existing unit-buy-price behavior.
                    // ------------------------------------------------

                    stock.unitBuyPrice =
                        calculateUnitBuyPrice(
                            stock
                        );

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
                    //
                    // This is the key edit-mode correction.
                    // It must not depend on whether new FIFO
                    // stock was added.
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