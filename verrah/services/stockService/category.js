const mongoose = require("mongoose");
const Category = require("../../models/category");
const { text } = require("./helpers");

async function getCategory(value, session = null) {
    const raw = text(value);
    if (!raw) throw new Error("Select a valid stock category.");

    let category;
    if (mongoose.isValidObjectId(raw)) {
        const query = Category.findOne({ _id: raw, isActive: true }).select("_id name categoryIcon isActive");
        if (session) query.session(session);
        category = await query.lean();
    } else {
        const query = Category.findOne({ name: raw.toLowerCase(), isActive: true }).select("_id name categoryIcon isActive");
        if (session) query.session(session);
        category = await query.lean();
    }

    if (!category) throw new Error("The selected category was not found or is inactive.");

    const categoryName = text(category.name).toLowerCase();
    if (!categoryName) throw new Error("The selected category has no valid name.");
    return category;
}

async function validateCategory(value, session = null) {
    const category = await getCategory(value, session);
    return text(category.name).toLowerCase();
}

async function getCategoryByName(name, session = null) {
    const query = Category.findOne({
        name: text(name).toLowerCase(),
        isActive: true
    }).select("_id name categoryIcon isActive");
    if (session) query.session(session);
    return query.lean();
}

async function getCategories() {
    return Category.find({ isActive: true })
        .select("_id name categoryIcon isActive")
        .sort({ name: 1 }).lean();
}

module.exports = { getCategory, validateCategory, getCategoryByName, getCategories };
