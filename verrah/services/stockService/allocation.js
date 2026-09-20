const mongoose = require("mongoose");
const Stock = require("../models/stock");
const Product = require("../models/products");
const Substation = require("../models/substations");
const { text, number, wholeNumber, productNameFromStock, totalBatchUnits, calculateUnitBuyPrice, sortFifoBatches, productFifoUnits, weightedProductBuyPrice, batchUnits } = require("./helpers");
const { getCategoryByName } = require("./category");
const { reconcilePurchaseBatches, consumeFifoBatches } = require("./stockFifo");
const { reconcileProductFifo, addLayersToProductFifo } = require("./productFifo");

function normalizeAllocations(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) return [];
    return Object.entries(input).map(([substationId, rawValue]) => ({
        substationId: text(substationId),
        units: wholeNumber(rawValue, `Units for substation ${substationId}`)
    })).filter(entry => entry.substationId && entry.units > 0);
}

async function createProductFromStock(stockId, body) {
    if (!mongoose.isValidObjectId(stockId)) throw new Error("Invalid stock.");

    const unitSellPrice = number(body.unitSellPrice ?? body.sellPrice, "Selling price", true);
    const allocations = normalizeAllocations(body.allocations);
    if (!allocations.length) throw new Error("Enter at least one substation allocation.");

    const ids = allocations.map(item => item.substationId);
    if (ids.some(id => !mongoose.isValidObjectId(id))) throw new Error("One or more selected substations are invalid.");
    if (new Set(ids).size !== ids.length) throw new Error("Each substation can appear only once in the allocation.");

    const session = await mongoose.startSession();
    let resultProduct;

    try {
        await session.withTransaction(async () => {
            const stock = await Stock.findOne({ _id: stockId, isActive: true }).session(session);
            if (!stock) throw new Error("Stock not found.");

            await reconcilePurchaseBatches(stock, session);

            const category = await getCategoryByName(stock.category, session);
            if (!category) throw new Error("The category assigned to this stock record no longer exists or is inactive.");

            const product = await Product.findOne({ stock: stock._id, isActive: true }).session(session);
            if (!product) throw new Error("The Product linked to this stock record was not found.");

            const substations = await Substation.find({ _id: { $in: ids }, isActive: true }).session(session);
            const substationMap = new Map(substations.map(substation => [String(substation._id), substation]));

            for (const allocation of allocations) {
                if (!substationMap.has(allocation.substationId)) {
                    throw new Error("One or more selected substations were not found or are inactive.");
                }
            }

            const allSubstations = await Substation.find({ isActive: true }).session(session);
            let currentAllocationTotal = 0;

            for (const substation of allSubstations) {
                const inventory = Array.isArray(substation.productInventory)
                    ? substation.productInventory.find(entry => String(entry.productId) === String(product._id))
                    : null;
                if (inventory) {
                    currentAllocationTotal += wholeNumber(
                        inventory.units || 0,
                        `Current units for substation ${substation.name || substation._id}`
                    );
                }
            }

            await reconcileProductFifo(product, currentAllocationTotal, session);

            const allocationUnits = allocations.reduce((total, allocation) => total + allocation.units, 0);
            if (allocationUnits <= 0) throw new Error("Allocation units must be greater than zero.");

            const newProductUnits = currentAllocationTotal + allocationUnits;
            const warehouseUnits = wholeNumber(stock.units || 0, "Warehouse units");
            const stockFifoUnits = totalBatchUnits(stock);

            if (warehouseUnits < allocationUnits) {
                throw new Error(`Only ${warehouseUnits} units are available in this stock, but ${allocationUnits} units are being allocated.`);
            }
            if (stockFifoUnits < allocationUnits) {
                throw new Error(`Only ${stockFifoUnits} FIFO units are available in this stock, but ${allocationUnits} units are being allocated.`);
            }

            const fifoResult = consumeFifoBatches(stock, allocationUnits);
            addLayersToProductFifo(product, fifoResult.consumed);

            stock.units = warehouseUnits - allocationUnits;
            product.units = newProductUnits;

            product.fifoBatches = sortFifoBatches(
                Array.isArray(product.fifoBatches) ? product.fifoBatches : []
            );
            product.fifoBatches = product.fifoBatches.filter(batch => batchUnits(batch) > 0);

            const finalProductFifoUnits = productFifoUnits(product);
            if (finalProductFifoUnits !== newProductUnits) {
                throw new Error(`Product FIFO allocation is inconsistent. Product contains ${newProductUnits} units, but Product FIFO contains ${finalProductFifoUnits} units.`);
            }

            const finalProductUnitBuyPrice = weightedProductBuyPrice(product);
            product.unitBuyPrice = finalProductUnitBuyPrice;
            product.buyPrice = finalProductUnitBuyPrice;

            product.name = productNameFromStock(stock);
            product.category = category._id;
            product.subcategory = stock.subcategory;
            product.days = Number(stock.days || 0);
            product.image = stock.image || "";
            product.description = stock.description || "";
            product.unitSellPrice = unitSellPrice;

            for (const allocation of allocations) {
                const substation = substationMap.get(allocation.substationId);
                if (!Array.isArray(substation.productInventory)) substation.productInventory = [];

                const inventory = substation.productInventory.find(
                    entry => String(entry.productId) === String(product._id)
                );

                if (inventory) {
                    const currentUnits = wholeNumber(
                        inventory.units || 0,
                        `Current units for substation ${substation.name || substation._id}`
                    );
                    inventory.units = currentUnits + allocation.units;
                    inventory.productName = product.name;
                    inventory.category = product.category;
                    inventory.subcategory = product.subcategory;
                    inventory.days = Number(product.days || 0);
                    inventory.updatedAt = new Date();
                } else {
                    substation.productInventory.push({
                        productId: product._id,
                        productName: product.name,
                        category: product.category,
                        subcategory: product.subcategory,
                        days: Number(product.days || 0),
                        units: allocation.units,
                        updatedAt: new Date()
                    });
                }

                await substation.save({ session });
            }

            stock.purchaseBatches = sortFifoBatches(
                Array.isArray(stock.purchaseBatches) ? stock.purchaseBatches : []
            );
            stock.purchaseBatches = stock.purchaseBatches.filter(batch => batchUnits(batch) > 0);

            const finalStockFifoUnits = totalBatchUnits(stock);
            if (finalStockFifoUnits !== stock.units) {
                throw new Error(`Stock FIFO allocation is inconsistent. Stock contains ${stock.units} units, but Stock FIFO contains ${finalStockFifoUnits} units.`);
            }

            stock.unitBuyPrice = calculateUnitBuyPrice(stock);
            stock.buyPrice = stock.unitBuyPrice;

            await stock.save({ session });
            await product.save({ session });

            let finalAllocationTotal = 0;
            const finalSubstations = await Substation.find({ isActive: true }).session(session);

            for (const substation of finalSubstations) {
                const inventory = Array.isArray(substation.productInventory)
                    ? substation.productInventory.find(entry => String(entry.productId) === String(product._id))
                    : null;
                if (inventory) finalAllocationTotal += wholeNumber(inventory.units || 0, "Final substation product units");
            }

            if (finalAllocationTotal !== product.units) {
                throw new Error(`Product allocation is inconsistent. Product contains ${product.units} units, but all substations contain ${finalAllocationTotal} units for this Product.`);
            }

            const savedProductFifoUnits = productFifoUnits(product);
            if (savedProductFifoUnits !== product.units) {
                throw new Error(`Product FIFO is inconsistent. Product contains ${product.units} units, but Product FIFO contains ${savedProductFifoUnits} units.`);
            }

            const savedStockFifoUnits = totalBatchUnits(stock);
            if (savedStockFifoUnits !== stock.units) {
                throw new Error(`Stock FIFO is inconsistent. Stock contains ${stock.units} units, but Stock FIFO contains ${savedStockFifoUnits} units.`);
            }

            const { recalculateStockTotals } = require("./stockCrud");
            await recalculateStockTotals(session);
            resultProduct = product;
        });

        return Product.findById(resultProduct._id).lean();
    } finally {
        await session.endSession();
    }
}

module.exports = { normalizeAllocations, createProductFromStock };
