// ==========================================================
// models/products.js
// PRODUCT MODEL
// ==========================================================

const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
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

        unitSellPrice: {
            type: Number,
            required: true,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Product", productSchema);