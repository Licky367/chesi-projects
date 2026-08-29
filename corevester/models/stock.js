// ==========================================================
// models/corevester/stock.js
// STOCK MODEL
// =========================================================

const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        units: {
            type: Number,
            required: true,
            min: 0
        },

        unitBuyPrice: {
            type: Number,
            required: true,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Stock", stockSchema);