// =========================================================
// models/corevester/products.js
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

        category: {
            type: String,
            required: true,
            trim: true
        },

        image: {
            type: String,
            trim: true,
            default: ""
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