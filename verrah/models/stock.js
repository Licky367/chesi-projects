// ==========================================================
// models/stock.js
// STOCK MODEL
//
// Stock.category stores Category.name.
// It does NOT store Category._id.
// ==========================================================

const mongoose = require("mongoose");

// ==========================================================
// DIRECTIONS OF USE ITEM
// ==========================================================

const directionsOfUseItemSchema = new mongoose.Schema(
    {
        subtitle: {
            type: String,
            trim: true,
            default: ""
        },

        content: {
            type: String,
            trim: true,
            default: ""
        }
    },
    {
        _id: false
    }
);

// ==========================================================
// DIRECTIONS OF USE
// ==========================================================

const directionsOfUseSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
            default: ""
        },

        items: {
            type: [directionsOfUseItemSchema],
            default: []
        }
    },
    {
        _id: false
    }
);

// ==========================================================
// STOCK SCHEMA
// ==========================================================

const stockSchema = new mongoose.Schema(
    {
        // ------------------------------------------------------
        // STOCK NAME
        // ------------------------------------------------------

        name: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        // ------------------------------------------------------
        // CATEGORY
        //
        // Stores Category.name.
        //
        // Example:
        // "laboratory"
        //
        // NOT:
        // ObjectId("...")
        // ------------------------------------------------------

        category: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true
        },

        // ------------------------------------------------------
        // SUBCATEGORY
        // ------------------------------------------------------

        subcategory: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true
        },

        // ------------------------------------------------------
        // DELIVERY DAYS
        // ------------------------------------------------------

        days: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        // ------------------------------------------------------
        // IMAGE
        // ------------------------------------------------------

        image: {
            type: String,
            trim: true,
            default: ""
        },

        // ------------------------------------------------------
        // WAREHOUSE UNITS
        // ------------------------------------------------------

        units: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        // ------------------------------------------------------
        // BUY PRICE
        // ------------------------------------------------------

        buyPrice: {
            type: Number,
            min: 0,
            default: 0
        },

        // ------------------------------------------------------
        // DESCRIPTION
        // ------------------------------------------------------

        description: {
            type: String,
            default: ""
        },

        // ------------------------------------------------------
        // DIRECTIONS OF USE
        // ------------------------------------------------------

        directionsOfUse: {
            type: directionsOfUseSchema,
            default: undefined
        },

        // ------------------------------------------------------
        // ACTIVE STATUS
        // ------------------------------------------------------

        isActive: {
            type: Boolean,
            default: true
        }
    },

    {
        timestamps: true
    }
);

// ==========================================================
// INDEXES
// ==========================================================

stockSchema.index({
    category: 1,
    subcategory: 1
});

// ==========================================================
// EXPORT
// ==========================================================

module.exports = mongoose.model(
    "Stock",
    stockSchema
);