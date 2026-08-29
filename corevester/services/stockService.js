// ==========================================================
// services/stockService.js
// STOCK + PRODUCT MANAGEMENT
//
// Product.units is the marketplace source of truth for live
// sellable quantity. Stock.units mirrors it for management.
//
// product-entry.ejs creates BOTH Product and Stock.
// stock-entry.ejs updates BOTH records.
// Images are URL strings only; no file upload is used.
// ==========================================================
const mongoose = require("mongoose");
const Product = require("../models/products");
const Stock = require("../corevester/models/stock");

function cleanString(value) {
  return String(value ?? "").trim();
}

function number(value, label, { required = false } = {}) {
  if (value === "" || value === undefined || value === null) {
    if (!required) return 0;
    throw new Error(`${label} is required.`);
  }

  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${label} must be a valid number greater than or equal to zero.`);
  }

  return n;
}

async function listStock() {
  return Stock.find({})
    .populate("product")
    .sort({ category: 1, name: 1 })
    .lean();
}

async function getStock(id) {
  return Stock.findById(id).populate("product").lean();
}

async function createProductAndStock(body) {
  const name = cleanString(body.name);
  const category = cleanString(body.category).toLowerCase();
  const image = cleanString(body.image);
  const units = number(body.units, "Units", { required: true });
  const unitBuyPrice = number(body.buyPrice, "Buy price");
  const unitSellPrice = number(body.unitSellPrice, "Selling price", { required: true });
  const description = cleanString(body.description);

  if (!name) throw new Error("Product name is required.");
  if (!category) throw new Error("Category is required.");

  const dbSession = await mongoose.startSession();

  try {
    let product;

    await dbSession.withTransaction(async () => {
      [product] = await Product.create(
        [{
          name,
          category,
          image,
          units,
          buyPrice: unitBuyPrice,
          unitSellPrice,
          description,
          isActive: true
        }],
        { session: dbSession }
      );

      await Stock.create(
        [{
          product: product._id,
          name,
          category,
          image,
          units,
          unitBuyPrice,
          unitSellPrice
        }],
        { session: dbSession }
      );
    });

    return product;
  } finally {
    await dbSession.endSession();
  }
}

async function updateStockAndProduct(stockId, body) {
  const stock = await Stock.findById(stockId);
  if (!stock) throw new Error("Stock record not found.");

  const name = cleanString(body.name);
  const category = cleanString(body.category).toLowerCase();
  const image = cleanString(body.image);
  const units = number(body.units, "Units", { required: true });
  const unitBuyPrice = number(body.unitBuyPrice, "Buy price");
  const unitSellPrice = number(body.unitSellPrice, "Selling price", { required: true });
  const description = cleanString(body.description);

  if (!name) throw new Error("Product name is required.");
  if (!category) throw new Error("Category is required.");

  const dbSession = await mongoose.startSession();

  try {
    await dbSession.withTransaction(async () => {
      let product = stock.product
        ? await Product.findById(stock.product).session(dbSession)
        : null;

      if (!product) {
        throw new Error("The stock record is not linked to a Product.");
      }

      product.name = name;
      product.category = category;
      product.image = image;
      product.units = units;
      product.buyPrice = unitBuyPrice;
      product.unitSellPrice = unitSellPrice;
      product.description = description;
      await product.save({ session: dbSession });

      stock.name = name;
      stock.category = category;
      stock.image = image;
      stock.units = units;
      stock.unitBuyPrice = unitBuyPrice;
      stock.unitSellPrice = unitSellPrice;
      await stock.save({ session: dbSession });
    });
  } finally {
    await dbSession.endSession();
  }
}

module.exports = {
  listStock,
  getStock,
  createProductAndStock,
  updateStockAndProduct
};
