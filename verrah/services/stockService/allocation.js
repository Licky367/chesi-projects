const mongoose = require("mongoose");
const Stock = require("../../models/stock");
const Product = require("../../models/products");
const Substation = require("../../models/substations");

const {
  text,
  number,
  wholeNumber,
  totalBatchUnits,
  productNameFromStock
} = require("./helpers");

const {
  validateCategory
} = require("./categories");

const {
  reconcilePurchaseBatches,
  consumeFifoBatches
} = require("./stockFifo");

const {
  productFifoUnits,
  reconcileProductFifo,
  addLayersToProductFifo
} = require("./productFifo");

const {
  recalculateStockTotals
} = require("./totals");

function normalizeAllocations(rawAllocations) {
  if (!Array.isArray(rawAllocations)) {
    throw new Error("Substation allocations are required.");
  }

  const seen = new Set();

  return rawAllocations.map((item, index) => {
    const substationId = text(item.substation || item.substationId);
    const units = wholeNumber(
      item.units,
      `Allocation units ${index + 1}`,
      true
    );

    if (!mongoose.Types.ObjectId.isValid(substationId)) {
      throw new Error(`Invalid substation at allocation ${index + 1}.`);
    }

    if (seen.has(substationId)) {
      throw new Error("A substation cannot be allocated more than once.");
    }

    seen.add(substationId);

    return {
      substationId,
      units
    };
  });
}

async function createProductFromStock(stockId, body, session) {
  const unitSellPrice = number(
    body.unitSellPrice ?? body.sellPrice,
    "Selling price",
    true
  );

  const allocations = normalizeAllocations(
    body.allocations ||
    body.substationAllocations ||
    []
  );

  if (!allocations.length) {
    throw new Error("At least one substation allocation is required.");
  }

  const ownsTransaction = !session;
  const transactionSession =
    session ||
    await mongoose.startSession();

  try {
    if (ownsTransaction) {
      transactionSession.startTransaction();
    }

    const stock = await Stock.findById(stockId)
      .session(transactionSession);

    if (!stock) {
      throw new Error("Stock entry not found.");
    }

    reconcilePurchaseBatches(stock);

    const category = await validateCategory(
      stock.category,
      transactionSession
    );

    let product = await Product.findOne({
      category: stock.category,
      subcategory: stock.subcategory
    }).session(transactionSession);

    if (!product) {
      product = new Product({
        name: productNameFromStock(stock),
        category: stock.category,
        subcategory: stock.subcategory,
        units: 0,
        unitBuyPrice: 0,
        unitSellPrice,
        assetValue: 0,
        purchaseFifo: []
      });
    }

    const substationIds = allocations.map(
      (allocation) => allocation.substationId
    );

    const substations = await Substation.find({
      _id: { $in: substationIds }
    }).session(transactionSession);

    if (substations.length !== substationIds.length) {
      throw new Error("One or more selected substations were not found.");
    }

    const selectedSubstations = new Map(
      substations.map((substation) => [
        String(substation._id),
        substation
      ])
    );

    const allSubstations = await Substation.find({})
      .session(transactionSession);

    const currentProductAllocation = allSubstations.reduce(
      (sum, substation) => {
        const inventory = Array.isArray(substation.productInventory)
          ? substation.productInventory
          : [];

        const entry = inventory.find(
          (item) =>
            String(item.productId || "") === String(product._id)
        );

        return sum + (Number(entry?.units) || 0);
      },
      0
    );

    reconcileProductFifo(product);

    const targetAllocationTotal = allocations.reduce(
      (sum, allocation) => sum + allocation.units,
      0
    );

    const allocationIncrease =
      targetAllocationTotal - currentProductAllocation;

    if (allocationIncrease < 0) {
      throw new Error(
        "Allocation cannot be reduced while creating stock allocation."
      );
    }

    if (allocationIncrease > Number(stock.units || 0)) {
      throw new Error("Insufficient stock for the requested allocation.");
    }

    if (
      allocationIncrease > 0 &&
      allocationIncrease > totalBatchUnits(stock.purchaseBatches || [])
    ) {
      throw new Error("Insufficient FIFO stock for the requested allocation.");
    }

    let consumedLayers = [];

    if (allocationIncrease > 0) {
      consumedLayers = consumeFifoBatches(
        stock,
        allocationIncrease
      );

      addLayersToProductFifo(
        product,
        consumedLayers
      );

      stock.units -= allocationIncrease;
    }

    reconcilePurchaseBatches(stock);
    reconcileProductFifo(product);

    const expectedProductUnits =
      currentProductAllocation + allocationIncrease;

    if (productFifoUnits(product) !== product.units) {
      throw new Error("Product FIFO invariant failed.");
    }

    if (stock.units !== totalBatchUnits(stock.purchaseBatches || [])) {
      throw new Error("Stock FIFO invariant failed.");
    }

    product.name =
      product.name ||
      productNameFromStock(stock);

    product.category = category._id;
    product.subcategory = stock.subcategory;
    product.unitSellPrice = unitSellPrice;

    if (product.units !== expectedProductUnits) {
      product.units = expectedProductUnits;
    }

    for (const allocation of allocations) {
      const substation = selectedSubstations.get(
        String(allocation.substationId)
      );

      if (!Array.isArray(substation.productInventory)) {
        substation.productInventory = [];
      }

      let inventory = substation.productInventory.find(
        (item) =>
          String(item.productId || "") === String(product._id)
      );

      if (!inventory) {
        inventory = {
          productId: product._id,
          productName: product.name,
          category: product.category,
          subcategory: product.subcategory,
          units: 0,
          updatedAt: new Date()
        };

        substation.productInventory.push(inventory);
      }

      inventory.productName = product.name;
      inventory.category = product.category;
      inventory.subcategory = product.subcategory;
      inventory.units =
        (Number(inventory.units) || 0) + allocation.units;
      inventory.updatedAt = new Date();

      await substation.save({
        session: transactionSession
      });
    }

    reconcilePurchaseBatches(stock);
    reconcileProductFifo(product);

    if (stock.units !== totalBatchUnits(stock.purchaseBatches || [])) {
      throw new Error("Final stock FIFO invariant failed.");
    }

    if (product.units !== productFifoUnits(product)) {
      throw new Error("Final product FIFO invariant failed.");
    }

    await stock.save({
      session: transactionSession
    });

    await product.save({
      session: transactionSession
    });

    if (ownsTransaction) {
      await recalculateStockTotals(transactionSession);
      await transactionSession.commitTransaction();
    }

    return Product.findById(product._id)
      .populate("category")
      .lean();
  } catch (error) {
    if (ownsTransaction && transactionSession.inTransaction()) {
      await transactionSession.abortTransaction();
    }

    throw error;
  } finally {
    if (ownsTransaction) {
      transactionSession.endSession();
    }
  }
}

module.exports = {
  normalizeAllocations,
  createProductFromStock
};
