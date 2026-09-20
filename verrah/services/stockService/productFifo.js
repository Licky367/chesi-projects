const {
    number, wholeNumber, batchUnits, batchBuyPrice, fifoDate,
    productFifoUnits, weightedProductBuyPrice, sortProductFifo
} = require("./helpers");

async function reconcileProductFifo(product, targetUnits, session = null) {
    const target = wholeNumber(targetUnits, "Product allocated units");
    let batches = Array.isArray(product.fifoBatches) ? product.fifoBatches : [];
    batches = sortProductFifo(batches);
    batches = batches.filter(batch => batchUnits(batch) > 0);

    let currentUnits = batches.reduce((sum, batch) => sum + batchUnits(batch), 0);

    if (currentUnits > target) {
        let excess = currentUnits - target;
        for (let i = batches.length - 1; i >= 0 && excess > 0; i--) {
            const batch = batches[i];
            const available = batchUnits(batch);
            const remove = Math.min(available, excess);
            batch.units = available - remove;
            excess -= remove;
        }
        batches = batches.filter(batch => batchUnits(batch) > 0);
        currentUnits = target;
    }

    if (currentUnits < target) {
        const missingUnits = target - currentUnits;
        const existingUnitBuyPrice = number(product.unitBuyPrice ?? product.buyPrice ?? 0, "Product unit buy price");
        batches.push({
            units: missingUnits,
            buyPrice: existingUnitBuyPrice,
            receivedAt: fifoDate(product.createdAt)
        });
    }

    batches = sortProductFifo(batches);
    product.fifoBatches = batches;
    product.units = target;

    const finalUnits = productFifoUnits(product);
    if (finalUnits !== target) {
        throw new Error(`Product FIFO could not be reconciled. Product FIFO contains ${finalUnits} units, but Product requires ${target} units.`);
    }

    const unitBuyPrice = weightedProductBuyPrice(product);
    product.unitBuyPrice = unitBuyPrice;
    product.buyPrice = unitBuyPrice;
    return product.fifoBatches;
}

function addLayersToProductFifo(product, layers) {
    const existing = Array.isArray(product.fifoBatches) ? product.fifoBatches : [];
    for (const layer of layers) {
        const units = batchUnits(layer);
        if (units <= 0) continue;
        existing.push({
            units,
            buyPrice: batchBuyPrice(layer),
            receivedAt: fifoDate(layer.receivedAt || layer.purchasedAt)
        });
    }
    product.fifoBatches = sortProductFifo(existing);
    return product.fifoBatches;
}

function releaseProductFifo(product, requestedUnits) {
    const quantity = wholeNumber(requestedUnits, "Product FIFO release units", true);
    if (quantity <= 0) throw new Error("Product FIFO release quantity must be greater than zero.");

    let batches = Array.isArray(product.fifoBatches) ? product.fifoBatches : [];
    batches = sortProductFifo(batches);

    const availableUnits = batches.reduce((total, batch) => total + batchUnits(batch), 0);
    if (quantity > availableUnits) {
        throw new Error(`Cannot release ${quantity} Product FIFO units because only ${availableUnits} Product FIFO units exist.`);
    }

    let remaining = quantity;
    const released = [];

    for (let i = batches.length - 1; i >= 0 && remaining > 0; i--) {
        const batch = batches[i];
        const available = batchUnits(batch);
        if (available <= 0) continue;
        const release = Math.min(available, remaining);
        released.push({
            units: release,
            buyPrice: batchBuyPrice(batch),
            receivedAt: fifoDate(batch.receivedAt || batch.createdAt)
        });
        batch.units = available - release;
        remaining -= release;
    }

    product.fifoBatches = batches.filter(batch => batchUnits(batch) > 0);
    product.fifoBatches = sortProductFifo(product.fifoBatches);

    if (remaining > 0) throw new Error("Product FIFO release could not be completed.");
    return released;
}

module.exports = { reconcileProductFifo, addLayersToProductFifo, releaseProductFifo };
