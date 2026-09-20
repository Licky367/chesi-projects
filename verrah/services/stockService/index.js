// ==========================================================
// verrah/services/stockService/index.js
//
// STOCK SERVICE ENTRY POINT
// ==========================================================

const {
  getCategories,
  getCategory,
  validateCategory,
  getCategoryByName
} = require("./categories");

const {
  listStock,
  getStock,
  getStockCategories,
  getSubstations
} = require("./queries");

const {
  recalculateStockTotals
} = require("./totals");

const {
  createStock
} = require("./create");

const {
  updateStockEntry
} = require("./update");

const {
  normalizeAllocations,
  createProductFromStock
} = require("./allocation");

module.exports = {
  getCategories,
  listStock,
  getStock,
  getStockCategories,
  getSubstations,
  recalculateStockTotals,
  createStock,
  updateStockEntry,
  createProductFromStock
};
