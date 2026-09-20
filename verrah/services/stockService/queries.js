const Stock = require("../../models/stock");
const Substation = require("../../models/substations");

async function listStock(options = {}) {
  const {
    category,
    subcategory,
    substation,
    search
  } = options;

  const query = {};

  if (category) query.category = category;
  if (subcategory) query.subcategory = subcategory;
  if (substation) query.substation = substation;

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { subcategory: { $regex: search, $options: "i" } }
    ];
  }

  return Stock.find(query)
    .populate("category")
    .populate("substation")
    .sort({ createdAt: -1 })
    .lean();
}

async function getStock(id, session) {
  return Stock.findById(id)
    .populate("category")
    .populate("substation")
    .session(session || null);
}

async function getStockCategories() {
  return Stock.distinct("category");
}

async function getSubstations() {
  return Substation.find({}).sort({ name: 1 }).lean();
}

module.exports = {
  listStock,
  getStock,
  getStockCategories,
  getSubstations
};
