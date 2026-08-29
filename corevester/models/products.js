// =========================================================
// models/corevester/products.js
// =========================================================
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        category: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true
        },
        image: {
            type: String,
            trim: true,
            default: ""
        },
        units: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        buyPrice: {
            type: Number,
            min: 0,
            default: 0
        },
        unitSellPrice: {
            type: Number,
            required: true,
            min: 0
        },
        description: {
            type: String,
            default: ""
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

// Indexes for marketplace filtering
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ createdAt: -1 });

productSchema.virtual('profitPerUnit').get(function(){
    return this.unitSellPrice - (this.buyPrice || 0);
});

productSchema.virtual('isOutOfStock').get(function(){
    return this.units <= 0;
});

module.exports = mongoose.model("Product", productSchema);