const Stock = require("../../models/stock");
const Product = require("../../models/products");

const {
  reconcilePurchaseBatches
} = require("./stockFifo");

const {
  reconcileProductFifo
} = require("./productFifo");

async function recalculateStockTotals(session) {
  const stockItems = await Stock.find({}).session(session || null);

  for (const stock of stockItems) {
    reconcilePurchaseBatches(stock);
    await stock.save({ session });
  }

  const products = await Product.find({}).session(session || null);

  for (const product of products) {
    reconcileProductFifo(product);
    await product.save({ session });
  }

  return {
    stockCount: stockItems.length,
    productCount: products.length
  };
}

module.exports = {
  recalculateStockTotals
};
