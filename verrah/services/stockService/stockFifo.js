const Stock = require("../../models/stock");
const {
    number, wholeNumber, batchUnits, batchBuyPrice, totalBatchUnits,
    calculateFifoValue, calculateUnitBuyPrice, setCalculatedUnitBuyPrice,
    sortFifoBatches, fifoDate
} = require("./helpers");

async function ensurePurchaseBatches(stock, session = null) {
    if (Array.isArray(stock.purchaseBatches) && stock.purchaseBatches.length > 0) {
        setCalculatedUnitBuyPrice(stock);
        return stock.purchaseBatches;
    }

    const units = wholeNumber(stock.units || 0, "Warehouse units");
    if (units <= 0) {
        stock.purchaseBatches = [];
        stock.unitBuyPrice = 0;
        if (Object.prototype.hasOwnProperty.call(stock.toObject ? stock.toObject() : stock, "buyPrice")) stock.buyPrice = 0;
        await stock.save({ session });
        return stock.purchaseBatches;
    }

    const legacyUnitBuyPrice = number(stock.buyPrice ?? stock.unitBuyPrice ?? 0, "Buy price");
    stock.purchaseBatches = [{
        units,
        buyPrice: legacyUnitBuyPrice,
        purchasedAt: fifoDate(stock.createdAt)
    }];
    setCalculatedUnitBuyPrice(stock);
    await stock.save({ session });
    return stock.purchaseBatches;
}

async function reconcilePurchaseBatches(stock, session = null) {
    await ensurePurchaseBatches(stock, session);
    const expectedUnits = wholeNumber(stock.units || 0, "Warehouse units");
    let batches = Array.isArray(stock.purchaseBatches) ? stock.purchaseBatches : [];
    batches = sortFifoBatches(batches);
    let batchTotal = batches.reduce((sum, batch) => sum + batchUnits(batch), 0);

    if (expectedUnits === 0) {
        stock.purchaseBatches = [];
        stock.unitBuyPrice = 0;
        if (Object.prototype.hasOwnProperty.call(stock.toObject ? stock.toObject() : stock, "buyPrice")) stock.buyPrice = 0;
        await stock.save({ session });
        return stock.purchaseBatches;
    }

    if (batchTotal === expectedUnits) {
        stock.purchaseBatches = batches;
        setCalculatedUnitBuyPrice(stock);
        await stock.save({ session });
        return stock.purchaseBatches;
    }

    if (batchTotal > expectedUnits) {
        let excess = batchTotal - expectedUnits;
        for (const batch of batches) {
            if (excess <= 0) break;
            const available = batchUnits(batch);
            if (available <= 0) continue;
            const remove = Math.min(available, excess);
            batch.units = available - remove;
            excess -= remove;
        }
        stock.purchaseBatches = batches.filter(batch => batchUnits(batch) > 0);
        setCalculatedUnitBuyPrice(stock);
        await stock.save({ session });
        return stock.purchaseBatches;
    }

    const missingUnits = expectedUnits - batchTotal;
    if (missingUnits > 0) {
        const legacyUnitBuyPrice = number(stock.buyPrice ?? stock.unitBuyPrice ?? 0, "Buy price");
        batches.push({ units: missingUnits, buyPrice: legacyUnitBuyPrice, purchasedAt: new Date() });
    }

    stock.purchaseBatches = sortFifoBatches(batches);
    setCalculatedUnitBuyPrice(stock);
    await stock.save({ session });
    return stock.purchaseBatches;
}

function consumeFifoBatches(stock, requestedUnits) {
    const quantity = wholeNumber(requestedUnits, "FIFO allocation units", true);
    if (quantity <= 0) throw new Error("FIFO allocation must be greater than zero.");

    const batches = sortFifoBatches(Array.isArray(stock.purchaseBatches) ? stock.purchaseBatches : []);
    let remaining = quantity;
    let totalCost = 0;
    const consumed = [];

    for (const batch of batches) {
        if (remaining <= 0) break;
        const available = batchUnits(batch);
        if (available <= 0) continue;
        const buyPrice = batchBuyPrice(batch);
        const consume = Math.min(available, remaining);
        totalCost += consume * buyPrice;
        consumed.push({ units: consume, buyPrice, receivedAt: fifoDate(batch.purchasedAt || batch.createdAt) });
        batch.units = available - consume;
        remaining -= consume;
    }

    if (remaining > 0) {
        throw new Error(`Only ${quantity - remaining} FIFO units are available, but ${quantity} units were requested.`);
    }

    stock.purchaseBatches = batches.filter(batch => batchUnits(batch) > 0);
    return { consumed, totalCost, weightedBuyPrice: totalCost / quantity };
}

function returnLayersToStock(stock, layers) {
    if (!Array.isArray(stock.purchaseBatches)) stock.purchaseBatches = [];
    for (const layer of layers) {
        const units = batchUnits(layer);
        if (units <= 0) continue;
        stock.purchaseBatches.push({
            units,
            buyPrice: batchBuyPrice(layer),
            purchasedAt: fifoDate(layer.receivedAt || layer.purchasedAt)
        });
    }
    stock.purchaseBatches = sortFifoBatches(stock.purchaseBatches);
    return stock.purchaseBatches;
}

module.exports = {
    ensurePurchaseBatches, reconcilePurchaseBatches, consumeFifoBatches, returnLayersToStock
};
