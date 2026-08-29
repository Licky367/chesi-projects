const mongoose = require("mongoose");
const Product = require("../models/products");
const Stock = require("../models/stock");
const Substation = require("../models/substations");

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

function integer(value, label, { required = false } = {}) {
  const n = number(value, label, { required });

  if (!Number.isInteger(n)) {
    throw new Error(`${label} must be a whole number.`);
  }

  return n;
}

function buildSubstationProduct(product) {
  return {
    product: product._id,
    stock: product.stock,
    name: product.name,
    category: product.category,
    image: product.image,
    units: product.units,
    buyPrice: product.buyPrice,
    unitSellPrice: product.unitSellPrice,
    description: product.description
  };
}

async function listStock() {
  return Stock.find({ isActive: true })
    .sort({ category: 1, name: 1 })
    .lean();
}

async function getStock(id) {
  if (!mongoose.isValidObjectId(id)) return null;

  return Stock.findById(id).lean();
}

async function getSubstations() {
  return Substation.find({ isActive: true })
    .sort({ name: 1 })
    .lean();
}

async function createStock(body) {
  const name = cleanString(body.name);
  const category = cleanString(body.category).toLowerCase();
  const image = cleanString(body.image);
  const units = integer(body.units, "Opening units", { required: true });
  const buyPrice = number(body.buyPrice, "Buy price");
  const description = cleanString(body.description);

  if (!name) throw new Error("Stock name is required.");
  if (!category) throw new Error("Category is required.");

  const [stock] = await Stock.create([{
    name,
    category,
    image,
    units,
    buyPrice,
    description,
    isActive: true
  }]);

  return stock;
}

async function createProductFromStock(stockId, body) {
  const stock = await Stock.findById(stockId);

  if (!stock) throw new Error("Stock record not found.");

  const unitsToAdd = integer(body.units, "Units to add", { required: true });

  if (unitsToAdd <= 0) {
    throw new Error("Units to add must be greater than zero.");
  }

  const image = cleanString(body.image);
  const buyPrice = number(body.buyPrice, "Buy price");
  const unitSellPrice = number(body.unitSellPrice, "Selling price", { required: true });
  const description = cleanString(body.description);
  const substationId = cleanString(body.substation);

  if (substationId && !mongoose.isValidObjectId(substationId)) {
    throw new Error("Invalid substation.");
  }

  const dbSession = await mongoose.startSession();

  try {
    let product;

    await dbSession.withTransaction(async () => {
      const liveStock = await Stock.findById(stockId).session(dbSession);

      if (!liveStock) throw new Error("Stock record not found.");

      const nextUnits = liveStock.units + unitsToAdd;

      [product] = await Product.create([{
        stock: liveStock._id,
        name: liveStock.name,
        category: liveStock.category,
        image,
        units: unitsToAdd,
        buyPrice,
        unitSellPrice,
        description,
        substation: substationId || null,
        isActive: true
      }], { session: dbSession });

      liveStock.units = nextUnits;
      await liveStock.save({ session: dbSession });

      if (substationId) {
        const substation = await Substation.findById(substationId).session(dbSession);

        if (!substation || !substation.isActive) {
          throw new Error("Selected substation was not found.");
        }

        substation.products.push(buildSubstationProduct(product));
        await substation.save({ session: dbSession });
      }
    });

    return product;
  } finally {
    await dbSession.endSession();
  }
}

module.exports = {
  listStock,
  getStock,
  getSubstations,
  createStock,
  createProductFromStock
};
