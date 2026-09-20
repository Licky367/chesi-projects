const {
  batchUnits,
  batchBuyPrice,
  totalBatchUnits,
  calculateFifoValue,
  calculateUnitBuyPrice,
  sortFifoBatches
} = require("./helpers");

function productFifoUnits(product) {
  return totalBatchUnits(product?.purchaseFifo || []);
}

function productFifoValue(product) {
  return calculateFifoValue(product?.purchaseFifo || []);
}

function weightedProductBuyPrice(product) {
  const batches = product?.purchaseFifo || [];
  return calculateUnitBuyPrice(batches);
}

function sortProductFifo(product) {
  product.purchaseFifo = sortFifoBatches(product.purchaseFifo || []);
  return product.purchaseFifo;
}

function reconcileProductFifo(product) {
  sortProductFifo(product);

  product.purchaseFifo = product.purchaseFifo.filter(
    (batch) => batchUnits(batch) > 0
  );

  product.units = productFifoUnits(product);
  product.assetValue = productFifoValue(product);
  product.unitBuyPrice = weightedProductBuyPrice(product);

  return product;
}

function addLayersToProductFifo(product, layers = []) {
  if (!Array.isArray(product.purchaseFifo)) {
    product.purchaseFifo = [];
  }

  for (const layer of layers) {
    const units = Math.max(0, Number(layer?.units) || 0);
    if (units <= 0) continue;

    product.purchaseFifo.push({
      units,
      buyPrice: Math.max(0, Number(layer?.buyPrice) || 0),
      purchaseDate: layer?.purchaseDate || new Date()
    });
  }

  return reconcileProductFifo(product);
}

function releaseProductFifo(product, unitsToRelease) {
  let remaining = Math.max(0, Number(unitsToRelease) || 0);

  sortProductFifo(product);

  if (remaining > productFifoUnits(product)) {
    throw new Error("Insufficient product FIFO stock.");
  }

  const releasedLayers = [];

  for (const batch of product.purchaseFifo) {
    if (remaining <= 0) break;

    const available = batchUnits(batch);
    if (available <= 0) continue;

    const take = Math.min(available, remaining);

    batch.units = available - take;

    releasedLayers.push({
      units: take,
      buyPrice: batchBuyPrice(batch),
      purchaseDate: batch.purchaseDate || new Date()
    });

    remaining -= take;
  }

  reconcileProductFifo(product);

  return releasedLayers;
}

module.exports = {
  productFifoUnits,
  productFifoValue,
  weightedProductBuyPrice,
  sortProductFifo,
  reconcileProductFifo,
  addLayersToProductFifo,
  releaseProductFifo
};
