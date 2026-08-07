const EggStock = require("../models/EggStock");
const EggCollectionLog = require("../models/EggCollectionLog");
const PoultryFinance = require("../models/PoultryFinance");

const VALID = ["chicken", "duck", "turkey", "goose", "quail", "other"];

// =========================
// GET STOCK
// =========================
exports.getEggStock = async (type) => {
  return await EggStock.findOne({ poultryType: type });
};

// =========================
// COLLECT EGGS (NOW TRACKED)
// =========================
exports.collectEggs = async ({ poultryType, quantity, user }) => {
  if (!VALID.includes(poultryType)) {
    throw new Error("Invalid poultry type");
  }

  quantity = Number(quantity);
  if (!quantity || quantity <= 0) {
    throw new Error("Invalid egg quantity");
  }

  // 1. Update stock
  await EggStock.findOneAndUpdate(
    { poultryType },
    { $inc: { totalAvailable: quantity } },
    { upsert: true }
  );

  // 2. Log history
  await EggCollectionLog.create({
    poultryType,
    quantity,
    collectedBy: user._id
  });

  return true;
};

// =========================
// SELL EGGS
// =========================
exports.sellEggs = async ({ poultryType, quantity, amount, user }) => {
  if (!VALID.includes(poultryType)) {
    throw new Error("Invalid poultry type");
  }

  quantity = Number(quantity);
  amount = Number(amount);

  const stock = await EggStock.findOne({ poultryType });

  if (!stock || stock.totalAvailable < quantity) {
    throw new Error("Not enough eggs");
  }

  stock.totalAvailable -= quantity;
  await stock.save();

  await PoultryFinance.create({
    category: "egg_sale",
    poultryType,
    amount,
    quantity,
    recordedBy: user._id
  });

  return stock;
};