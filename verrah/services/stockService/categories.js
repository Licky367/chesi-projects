const Category = require("../../models/category");

const {
  text
} = require("./helpers");

async function getCategory(categoryId, session) {
  if (!categoryId) return null;

  return Category.findById(categoryId).session(session || null);
}

async function validateCategory(categoryId, session) {
  const category = await getCategory(categoryId, session);

  if (!category) {
    throw new Error("Selected category was not found.");
  }

  return category;
}

async function getCategoryByName(name, session) {
  const categoryName = text(name);

  if (!categoryName) return null;

  return Category.findOne({
    name: new RegExp(`^${categoryName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
  }).session(session || null);
}

async function getCategories() {
  return Category.find({}).sort({ name: 1 }).lean();
}

module.exports = {
  getCategory,
  validateCategory,
  getCategoryByName,
  getCategories
};
