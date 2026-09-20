const mongoose = require("mongoose");
const Stock = require("../models/stock");
const Product = require("../models/products");
const {
    text, cleanSubcategory, productNameFromStock, number, wholeNumber,
    calculateUnitBuyPrice, sortFifoBatches, calculateFifoValue
} = require("./helpers");
const { getCategory, validateCategory, getCategoryByName } = require("./category");
const { reconcilePurchaseBatches } = require("./stockFifo");

async function recalculateStockTotals(session = null) {
    const query = Stock.find({ isActive: true }).select("_id category units buyPrice unitBuyPrice purchaseBatches createdAt");
    if (session) query.session(session);
    const stocks = await query;

    const categoryTotals = new Map();
    let overall = 0;

    for (const stock of stocks) await reconcilePurchaseBatches(stock, session);

    for (const stock of stocks) {
        const value = calculateFifoValue(stock);
        const unitBuyPrice = calculateUnitBuyPrice(stock);
        const categoryName = text(stock.category).toLowerCase();
        categoryTotals.set(categoryName, (categoryTotals.get(categoryName) || 0) + value);
        overall += value;
        stock.unitBuyPrice = unitBuyPrice;
    }

    const now = new Date();
    for (const stock of stocks) {
        const value = calculateFifoValue(stock);
        const categoryName = text(stock.category).toLowerCase();
        await Stock.updateOne(
            { _id: stock._id },
            {
                $set: {
                    unitBuyPrice: calculateUnitBuyPrice(stock),
                    cashOutflow: value,
                    categoryOveral: categoryTotals.get(categoryName) || 0,
                    overal: overall,
                    totalsUpdatedAt: now
                }
            },
            { session, timestamps: true }
        );
    }
    return { categoryTotals, overal: overall };
}

async function createStock(body) {
    const name = cleanSubcategory(body.name || body.subcategory);
    if (!name) throw new Error("Stock name is required.");

    const categoryDocument = await getCategory(body.category);
    const category = text(categoryDocument.name).toLowerCase();
    const subcategory = cleanSubcategory(body.subcategory);
    if (!subcategory) throw new Error("Subcategory is required.");

    const units = wholeNumber(body.units, "Warehouse units", true);
    if (units <= 0) throw new Error("Initial warehouse units must be greater than zero.");

    const totalPurchaseCost = number(body.buyPrice, "Total purchase cost", true);
    const unitBuyPrice = totalPurchaseCost / units;
    if (!Number.isFinite(unitBuyPrice)) throw new Error("Unable to calculate the unit buy price.");

    const unitSellPrice = number(body.unitSellPrice ?? body.sellPrice, "Selling price", true);
    const days = wholeNumber(body.days || 0, "Delivery days");
    const image = text(body.image);
    const description = text(body.description);

    const existing = await Stock.findOne({ category, subcategory, isActive: true });
    if (existing) {
        throw new Error(`The subcategory "${subcategory}" already exists under the selected category. Select the existing stock record to update it.`);
    }

    const purchaseBatches = [{ units, buyPrice: unitBuyPrice, purchasedAt: new Date() }];
    const session = await mongoose.startSession();
    let createdStock;
    let createdProduct;

    try {
        await session.withTransaction(async () => {
            const stockResult = await Stock.create([{
                name, category, subcategory, days, image, units,
                buyPrice: unitBuyPrice, unitBuyPrice, purchaseBatches, description
            }], { session });
            createdStock = stockResult[0];

            const productResult = await Product.create([{
                stock: createdStock._id,
                name,
                category: categoryDocument._id,
                subcategory,
                days,
                image,
                description,
                units: 0,
                fifoBatches: [],
                unitBuyPrice: 0,
                buyPrice: 0,
                unitSellPrice
            }], { session });
            createdProduct = productResult[0];
        });

        await recalculateStockTotals();

        const stock = await Stock.findById(createdStock._id).lean();
        const product = await Product.findById(createdProduct._id).lean();
        return { stock, product };
    } finally {
        await session.endSession();
    }
}

async function updateStockEntry(stockId, body) {
    if (!mongoose.isValidObjectId(stockId)) throw new Error("Invalid stock.");

    const session = await mongoose.startSession();
    try {
        let updatedStock;
        await session.withTransaction(async () => {
            const stock = await Stock.findOne({ _id: stockId, isActive: true }).session(session);
            if (!stock) throw new Error("Stock not found.");

            await reconcilePurchaseBatches(stock, session);

            const currentUnits = wholeNumber(stock.units || 0, "Current warehouse units");
            const additionalUnits = wholeNumber(body.units, "Additional warehouse units", true);

            let additionalUnitBuyPrice = 0;
            if (additionalUnits > 0) {
                const totalPurchaseCost = number(body.buyPrice, "Total purchase cost for additional units", true);
                additionalUnitBuyPrice = totalPurchaseCost / additionalUnits;
                if (!Number.isFinite(additionalUnitBuyPrice)) {
                    throw new Error("Unable to calculate the unit buy price for the additional stock.");
                }
            }

            let category;
            if (text(body.category)) category = await validateCategory(body.category, session);
            else category = text(stock.category).toLowerCase();
            if (!category) throw new Error("Stock category is missing.");

            const subcategory = cleanSubcategory(body.subcategory || stock.subcategory);
            if (!subcategory) throw new Error("Subcategory is required.");

            const stockName = cleanSubcategory(body.name || stock.name || subcategory);
            if (!stockName) throw new Error("Stock name is required.");

            const unitSellPrice = number(body.unitSellPrice ?? body.sellPrice ?? 0, "Selling price");
            const days = wholeNumber(body.days ?? stock.days ?? 0, "Delivery days");
            const image = text(body.image);
            const description = text(body.description);

            const duplicate = await Stock.findOne({
                _id: { $ne: stock._id }, category, subcategory, isActive: true
            }).session(session);
            if (duplicate) {
                throw new Error(`The subcategory "${subcategory}" already belongs to another stock record under the selected category.`);
            }

            stock.name = stockName;
            stock.category = category;
            stock.subcategory = subcategory;
            stock.days = days;
            stock.description = description;
            if (image) stock.image = image;

            if (additionalUnits > 0) {
                stock.purchaseBatches.push({
                    units: additionalUnits,
                    buyPrice: additionalUnitBuyPrice,
                    purchasedAt: new Date()
                });
            }

            stock.units = currentUnits + additionalUnits;
            stock.purchaseBatches = sortFifoBatches(stock.purchaseBatches);

            const calculatedUnitBuyPrice = calculateUnitBuyPrice(stock);
            stock.unitBuyPrice = calculatedUnitBuyPrice;
            stock.buyPrice = calculatedUnitBuyPrice;
            await stock.save({ session });

            const categoryDocument = await getCategoryByName(stock.category, session);
            if (!categoryDocument) throw new Error("The selected category no longer exists or is inactive.");

            const product = await Product.findOne({ stock: stock._id, isActive: true }).session(session);
            if (product) {
                product.name = productNameFromStock(stock);
                product.category = categoryDocument._id;
                product.subcategory = stock.subcategory;
                product.days = Number(stock.days || 0);
                product.image = stock.image || "";
                product.description = stock.description || "";
                if (additionalUnits === 0) product.unitSellPrice = unitSellPrice;
                await product.save({ session });
            }
            updatedStock = stock;
        });

        await recalculateStockTotals();
        return Stock.findById(updatedStock._id).lean();
    } finally {
        await session.endSession();
    }
}

module.exports = { recalculateStockTotals, createStock, updateStockEntry };
