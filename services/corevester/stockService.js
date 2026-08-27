// =========================================================
// services/corevester/stockService.js
// WAREHOUSE STOCK SERVICE
// =========================================================
const Stock = require("../../models/corevester/stock");
const Product = require("../../models/corevester/products");

module.exports = {

    async getAllStock(){
        const stock = await Stock.find().sort({ createdAt: -1 }).lean();
        // enrich with product linkage
        for(let s of stock){
            const prod = await Product.findOne({ name: s.name }).lean();
            s.onMarket = prod? prod.units : 0;
            s.remainingInWarehouse = s.units; // after product deduction, this is true warehouse remaining
            s.totalValue = s.units * s.unitBuyPrice + (prod? prod.units * prod.unitSellPrice : 0);
        }
        return stock;
    },

    async getStats(){
        const totalItems = await Stock.countDocuments();
        const agg = await Stock.aggregate([
            { $group: { _id: null, totalUnits: { $sum: "$units" }, totalBuyValue: { $sum: { $multiply: ["$units", "$unitBuyPrice"] } } } }
        ]);
        const prodAgg = await Product.aggregate([
            { $group: { _id: null, totalMarketUnits: { $sum: "$units" }, totalSellValue: { $sum: { $multiply: ["$units", "$unitSellPrice"] } } } }
        ]);
        return {
            totalItems,
            totalWarehouseUnits: agg[0]?.totalUnits || 0,
            totalWarehouseBuyValue: agg[0]?.totalBuyValue || 0,
            totalMarketUnits: prodAgg[0]?.totalMarketUnits || 0,
            totalMarketSellValue: prodAgg[0]?.totalSellValue || 0
        };
    },

    async createOrUpdateStock(data){
        const { name, units, unitBuyPrice } = data;
        if(!name || units===undefined || unitBuyPrice===undefined){
            throw new Error("All fields required");
        }

        let stock = await Stock.findOne({ name: name.trim() });
        if(stock){
            // Add units to existing stock
            stock.units += parseInt(units);
            stock.unitBuyPrice = parseFloat(unitBuyPrice); // update to latest buy price
            await stock.save();
            return stock;
        }

        return await Stock.create({
            name: name.trim(),
            units: parseInt(units),
            unitBuyPrice: parseFloat(unitBuyPrice)
        });
    },

    async updateStock(id, data){
        const stock = await Stock.findById(id);
        if(!stock) throw new Error("Stock not found");

        if(data.name) stock.name = data.name.trim();
        if(data.units!==undefined) stock.units = parseInt(data.units);
        if(data.unitBuyPrice!==undefined) stock.unitBuyPrice = parseFloat(data.unitBuyPrice);

        await stock.save();
        return stock;
    },

    async deleteStock(id){
        const stock = await Stock.findById(id);
        if(!stock) throw new Error("Stock not found");

        // Check if on market
        const product = await Product.findOne({ name: stock.name });
        if(product && product.units > 0){
            throw new Error(`Cannot delete. ${product.units} units are still ON MARKET. Remove Product first.`);
        }

        await Stock.findByIdAndDelete(id);
        return true;
    }
};