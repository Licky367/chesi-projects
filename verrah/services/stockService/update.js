const Stock = require("../../models/stock");

const {
  text,
  number
} = require("./helpers");

const {
  validateCategory
} = require("./categories");

const {
  reconcilePurchaseBatches
} = require("./stockFifo");

const {
  recalculateStockTotals
} = require("./totals");

async function updateStockEntry(id, body, session) {
  const stock = await Stock.findById(id).session(session || null);

  if (!stock) {
    throw new Error("Stock entry not found.");
  }

  const categoryId = text(body.category);

  if (categoryId) {
    await validateCategory(categoryId, session);
    stock.category = categoryId;
  }

  if (body.subcategory !== undefined) {
    stock.subcategory = text(body.subcategory).toLowerCase();
  }

  if (body.unitSellPrice !== undefined || body.sellPrice !== undefined) {
    stock.unitSellPrice = number(
      body.unitSellPrice ?? body.sellPrice,
      "Selling price",
      true
    );
  }

  if (body.units !== undefined || body.buyPrice !== undefined) {
    const additionalUnits =
      body.units !== undefined
        ? number(body.units, "Units", true)
        : 0;

    const buyPrice =
      body.buyPrice !== undefined
        ? number(body.buyPrice, "Buying price", true)
        : Number(stock.unitBuyPrice || 0);

    if (additionalUnits > 0) {
      if (!Array.isArray(stock.purchaseBatches)) {
        stock.purchaseBatches = [];
      }

      stock.purchaseBatches.push({
        units: additionalUnits,
        buyPrice,
        purchaseDate: new Date()
      });
    }

    reconcilePurchaseBatches(stock);
  }

  await stock.save({ session });

  await recalculateStockTotals();

  return stock;
}

module.exports = {
  updateStockEntry
};
