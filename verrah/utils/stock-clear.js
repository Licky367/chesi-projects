// ==========================================================
// utils/stock-clear.js
// CLEAR ALL STOCK RECORDS
// Run with: node utils/stock-clear.js
// ==========================================================

require("dotenv").config();

const mongoose = require("mongoose");
const Stock = require("../models/stock");

async function clearStocks() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("[STOCK CLEAR] MongoDB connected.");

        const result = await Stock.deleteMany({});

        console.log(
            `[STOCK CLEAR] Removed ${result.deletedCount} stock record(s).`
        );

    } catch (error) {
        console.error("[STOCK CLEAR] Failed:", error);
        process.exitCode = 1;

    } finally {
        await mongoose.disconnect();
    }
}

clearStocks();