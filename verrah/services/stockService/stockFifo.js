const {
  mongoose,
  batchUnits,
  batchBuyPrice,
  totalBatchUnits,
  calculateFifoValue,
  setCalculatedUnitBuyPrice,
  sortFifoBatches
} = require("./helpers");

function ensurePurchaseBatches(stock) {
  if (!Array.isArray(stock.purchaseBatches)) {
    stock.purchaseBatches = [];
  }

  return stock.purchaseBatches;
}

function reconcilePurchaseBatches(stock) {
  const batches = ensurePurchaseBatches(stock);

  stock.purchaseBatches = sortFifoBatches(
    batches
      .map((batch) => {
        const units = Math.max(0, Number(batch?.units) || 0);
        const buyPrice = Math.max(0, Number(batch?.buyPrice) || 0);

        return {
          ...batch.toObject?.() || batch,
          units,
          buyPrice
        };
      })
      .filter((batch) => batch.units > 0)
  );

  stock.units = totalBatchUnits(stock.purchaseBatches);
  stock.assetValue = calculateFifoValue(stock.purchaseBatches);
  setCalculatedUnitBuyPrice(stock);

  return stock;
}

function consumeFifoBatches(stock, unitsToConsume) {
  let remaining = Math.max(0, Number(unitsToConsume) || 0);
  const batches = sortFifoBatches(ensurePurchaseBatches(stock));

  if (remaining > totalBatchUnits(batches)) {
    throw new Error("Insufficient stock.");
  }

  const consumedLayers = [];

  for (const batch of batches) {
    if (remaining <= 0) break;

    const available = batchUnits(batch);
    if (available <= 0) continue;

    const take = Math.min(available, remaining);

    batch.units = available - take;

    consumedLayers.push({
      units: take,
      buyPrice: batchBuyPrice(batch),
      purchaseDate: batch.purchaseDate || batch.date || new Date()
    });

    remaining -= take;
  }

  stock.purchaseBatches = batches.filter((batch) => batchUnits(batch) > 0);
  reconcilePurchaseBatches(stock);

  return consumedLayers;
}

function returnLayersToStock(stock, layers = []) {
  const batches = ensurePurchaseBatches(stock);

  for (const layer of layers) {
    const units = Math.max(0, Number(layer?.units) || 0);
    if (units <= 0) continue;

    batches.push({
      units,
      buyPrice: Math.max(0, Number(layer?.buyPrice) || 0),
      purchaseDate: layer?.purchaseDate || new Date()
    });
  }

  reconcilePurchaseBatches(stock);
  return stock;
}

module.exports = {
  ensurePurchaseBatches,
  reconcilePurchaseBatches,
  consumeFifoBatches,
  returnLayersToStock
};
