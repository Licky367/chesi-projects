const mongoose = require("mongoose");
const Stock = require("../models/stock");
const Substation = require("../models/substations");
const Category = require("../models/category");
const { text, displayLabel } = require("./helpers");
const { getCategoryByName } = require("./category");

async function listStock() {
    const [stocks, categories] = await Promise.all([
        Stock.find({ isActive: true }).sort({ category: 1, subcategory: 1, name: 1, createdAt: 1 }).lean(),
        Category.find({ isActive: true }).select("_id name categoryIcon isActive").sort({ name: 1 }).lean()
    ]);

    const categoryMap = new Map();
    for (const category of categories) {
        const key = text(category.name).toLowerCase();
        if (!key) continue;
        categoryMap.set(key, category);
    }

    const groups = new Map();
    for (const stock of stocks) {
        const categoryName = text(stock.category).toLowerCase();
        if (!categoryName) continue;
        const category = categoryMap.get(categoryName);
        if (!category) continue;

        if (!groups.has(categoryName)) {
            groups.set(categoryName, { category, label: displayLabel(category.name), stocks: [] });
        }
        groups.get(categoryName).stocks.push(stock);
    }

    return Array.from(groups.values()).map(group => {
        const rows = [];
        for (let i = 0; i < group.stocks.length; i += 6) {
            rows.push({ products: group.stocks.slice(i, i + 6) });
        }
        return { ...group, rows };
    });
}

async function getStock(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    const stock = await Stock.findOne({ _id: id, isActive: true }).lean();
    if (!stock) return null;
    const category = await getCategoryByName(stock.category);
    return { ...stock, categoryDocument: category || null };
}

async function getStockCategories() {
    return Stock.find({ isActive: true })
        .select("name category subcategory days image units buyPrice unitBuyPrice description purchaseBatches")
        .sort({ category: 1, subcategory: 1, name: 1 }).lean();
}

function getSubstations() {
    return Substation.find({ isActive: true })
        .select("name location description productInventory")
        .sort({ name: 1 }).lean();
}

module.exports = { listStock, getStock, getStockCategories, getSubstations };
