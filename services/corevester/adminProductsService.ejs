// =========================================================
// services/corevester/adminProductsService.js
// Handles Stock -> Products linkage
// =========================================================
const Product = require("../../models/corevester/products");
const Stock = require("../../models/corevester/stock");

module.exports = {

    // Get all stock for dropdown
    async getAllStock(){
        return await Stock.find().sort({ name: 1 }).lean();
    },

    // Get all products with profit margin calc
    async getAllProducts(){
        const products = await Product.find().sort({ createdAt: -1 }).lean();
        // enrich with stock info
        for(let p of products){
            const s = await Stock.findOne({ name: p.name }).lean();
            p.stockUnits = s? s.units : 0;
            p.buyPrice = s? s.unitBuyPrice : 0;
            p.profitPerUnit = s? (p.unitSellPrice - s.unitBuyPrice) : 0;
        }
        return products;
    },

    async createProduct(data){
        const { name, category, image, units, unitSellPrice } = data;

        // 1. Check stock exists
        const stockItem = await Stock.findOne({ name: name.trim() });
        if(!stockItem){
            throw new Error(`Stock not found for "${name}". First add it in Stock.`);
        }

        // 2. Check units - can't put more than you have
        if(units > stockItem.units){
            throw new Error(`You only have ${stockItem.units} units in Stock. Can't list ${units}.`);
        }

        // 3. Check if product already exists - update instead of duplicate
        let existing = await Product.findOne({ name: name.trim() });
        if(existing){
            // Deduct difference from stock?
            const diff = units - existing.units;
            if(diff > stockItem.units){
                throw new Error(`Need ${diff} more units but Stock has only ${stockItem.units}`);
            }
            // update product
            existing.category = category;
            existing.image = image;
            existing.units = units;
            existing.unitSellPrice = unitSellPrice;
            await existing.save();

            // Deduct from stock: reduce stock by diff (if increased listing)
            if(diff !== 0){
                stockItem.units -= diff;
                await stockItem.save();
            }
            return existing;
        }

        // 4. Create new product and deduct from stock
        const product = await Product.create({
            name: name.trim(),
            category: category.trim(),
            image,
            units,
            unitSellPrice
        });

        stockItem.units -= units;
        await stockItem.save();

        return product;
    },

    async deleteProduct(productId){
        const product = await Product.findById(productId);
        if(!product) throw new Error("Product not found");

        // Return units back to Stock
        const stockItem = await Stock.findOne({ name: product.name });
        if(stockItem){
            stockItem.units += product.units;
            await stockItem.save();
        }

        await Product.findByIdAndDelete(productId);
        return true;
    }
};