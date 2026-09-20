const Stock = require("../../models/stock");
const Product = require("../../models/products");

const {
  text,
  cleanSubcategory,
  number
} = require("./helpers");

const {
  validateCategory
} = require("./categories");

const {
  recalculateStockTotals
} = require("./totals");

async function createStock(body, session) {
  const categoryId = text(body.category);
  const subcategory = cleanSubcategory(body.subcategory);

  const units = number(body.units, "Units", true);
  const buyPrice = number(body.buyPrice, "Buying price", true);
  const sellPrice = number(body.sellPrice ?? body.unitSellPrice, "Selling price", true);

  const category = await validateCategory(categoryId, session);

  const stock = await Stock.create(
    [{
      category: category._id,
      subcategory,
      units,
      unitBuyPrice: buyPrice,
      unitSellPrice: sellPrice,
      assetValue: units * buyPrice,
      purchaseBatches: [{
        units,
        buyPrice,
        purchaseDate: new Date()
      }]
    }],
    { session }
  );

  await Product.create(
    [{
      name: [category.name, subcategory]
        .filter(Boolean)
        .join(" "),
      category: category._id,
      subcategory,
      units,
      unitBuyPrice: buyPrice,
      unitSellPrice: sellPrice,
      assetValue: units * buyPrice,
      purchaseFifo: [{
        units,
        buyPrice,
        purchaseDate: new Date()
      }]
    }],
    { session }
  );

  await recalculateStockTotals();

  return stock[0];
}

module.exports = {
  createStock
};
