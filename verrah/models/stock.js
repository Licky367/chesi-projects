// ==========================================================
// models/stock.js
// STOCK MODEL
//
// Stock.category stores Category.name.
// It does NOT store Category._id.
//
// FIFO:
//
// Stock.purchaseBatches stores individual stock purchases.
//
// The oldest batch is consumed first.
//
// Example:
//
// purchaseBatches:
// [
// {
// units: 100,
// buyPrice: 100,
// purchasedAt: Date
// },
// {
// units: 50,
// buyPrice: 120,
// purchasedAt: Date
// }
// ]
//
// The stock service consumes these batches using FIFO.
// ==========================================================

const mongoose = require("mongoose");

// ==========================================================
// DIRECTIONS OF USE ITEM
// ==========================================================

const directionsOfUseItemSchema =
    new mongoose.Schema(
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

const directionsOfUseSchema =
    new mongoose.Schema(
        {
            title: {
                type: String,
                trim: true,
                default: ""
            },

            items: {
                type:
                    [directionsOfUseItemSchema],

                default: []
            }
        },
        {
            _id: false
        }
    );

// ==========================================================
// FIFO PURCHASE BATCH
// ==========================================================

const purchaseBatchSchema =
    new mongoose.Schema(
        {
            // --------------------------------------------------
            // REMAINING UNITS IN THIS PURCHASE
            // --------------------------------------------------

            units: {
                type: Number,
                required: true,
                min: 0,
                default: 0
            },

            // --------------------------------------------------
            // PURCHASE PRICE PER UNIT
            // --------------------------------------------------

            buyPrice: {
                type: Number,
                required: true,
                min: 0,
                default: 0
            },

            // --------------------------------------------------
            // PURCHASE DATE
            // --------------------------------------------------

            purchasedAt: {
                type: Date,
                required: true,
                default: Date.now
            }
        },
        {
            timestamps: true
        }
    );

// ==========================================================
// STOCK SCHEMA
// ==========================================================

const stockSchema =
    new mongoose.Schema(
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
            // CATEGORY - Stores Category.name
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
            // WAREHOUSE UNITS - equals sum of purchaseBatches.units
            // ------------------------------------------------------

            units: {
                type: Number,
                required: true,
                min: 0,
                default: 0
            },

            // ------------------------------------------------------
            // BUY PRICE - Legacy field, FIFO does NOT use this
            // when purchaseBatches exist
            // ------------------------------------------------------

            buyPrice: {
                type: Number,
                min: 0,
                default: 0
            },

            // ------------------------------------------------------
            // FIFO PURCHASE BATCHES
            // ------------------------------------------------------

            purchaseBatches: {
                type:
                    [purchaseBatchSchema],

                default: []
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
                type:
                    directionsOfUseSchema,

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

stockSchema.index({
    "purchaseBatches.purchasedAt": 1
});

// ==========================================================
// FIFO VALIDATION
// ==========================================================

stockSchema.pre(
    "validate",
    function (next) {

        if (
          !Array.isArray(
                this.purchaseBatches
            ) ||
            this.purchaseBatches.length === 0
        ) {
            return next();
        }

        const fifoUnits =
            this.purchaseBatches.reduce(
                (total, batch) =>
                    total +
                    Number(
                        batch.units || 0
                    ),
                0
            );

        if (
            fifoUnits!==
            Number(
                this.units || 0
            )
        ) {
            return next(
                new Error(
                    "Stock FIFO batch units must equal the warehouse stock units."
                )
            );
        }

        next();
    }
);

// ==========================================================
// FIFO IMPLEMENTATION - CURRENT BATCH PRICE
// Price taken from current batch, not fixed unit
// ==========================================================

// Get current FIFO batch - oldest batch with units > 0
stockSchema.methods.getCurrentBatch = function () {
    if (
      !Array.isArray(this.purchaseBatches) ||
      !this.purchaseBatches.length
    ) {
        return null;
    }

    const available = this.purchaseBatches
      .filter(b => Number(b.units || 0) > 0)
      .sort((a, b) => new Date(a.purchasedAt) - new Date(b.purchasedAt));

    return available[0] || null;
};

// Get current buy price from current batch
stockSchema.methods.getCurrentPrice = function () {
    const batch = this.getCurrentBatch();
    if (batch) {
        return Number(batch.buyPrice || 0);
    }
    // Fallback for legacy records with no batches
    return Number(this.buyPrice || 0);
};

// Get current batch units
stockSchema.methods.getCurrentBatchUnits = function () {
    const batch = this.getCurrentBatch();
    if (batch) {
        return Number(batch.units || 0);
    }
    return Number(this.units || 0);
};

// Virtuals for EJS
stockSchema.virtual("currentBatchPrice").get(function () {
    return this.getCurrentPrice();
});

stockSchema.virtual("currentBatch").get(function () {
    return this.getCurrentBatch();
});

stockSchema.virtual("currentBatchUnits").get(function () {
    return this.getCurrentBatchUnits();
});

stockSchema.set("toJSON", { virtuals: true });
stockSchema.set("toObject", { virtuals: true });

// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    mongoose.model(
        "Stock",
        stockSchema
    );