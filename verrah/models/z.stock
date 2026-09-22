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
//     {
//         units: 100,
//         buyPrice: 100,
//         purchasedAt: Date
//     },
//     {
//         units: 50,
//         buyPrice: 120,
//         purchasedAt: Date
//     }
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
//
// Every time stock is purchased/added, a new batch is
// created.
//
// IMPORTANT:
//
// `units` represents the CURRENT REMAINING units in that
// purchase batch.
//
// Example:
//
// Original purchase:
//
// 100 units @ 100
//
// After 30 units are consumed:
//
// 70 units @ 100
//
// The batch remains in the FIFO queue with 70 units.
//
// The original buy price is NEVER changed.
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
            //
            // This price belongs ONLY to this batch.
            //
            // It must never be changed when another purchase
            // is added.
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
            //
            // FIFO uses this field to determine which batch
            // is oldest.
            //
            // IMPORTANT:
            //
            // Do not add `index: true` here.
            // The parent Stock schema defines the single
            // index for purchaseBatches.purchasedAt below.
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
            //
            // This is the total current warehouse balance.
            //
            // It must equal the sum of all remaining
            // purchaseBatches.units.
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
            //
            // Legacy/current purchase price field.
            //
            // FIFO calculations DO NOT use this field when
            // purchaseBatches are available.
            //
            // It is retained for compatibility with the existing
            // application and UI.
            //
            // When new stock is purchased, the stock service
            // updates this field to the latest purchase price.
            // ------------------------------------------------------

            buyPrice: {
                type: Number,
                min: 0,
                default: 0
            },

            // ------------------------------------------------------
            // FIFO PURCHASE BATCHES
            // ------------------------------------------------------
            //
            // Each purchase is stored independently.
            //
            // The stock service consumes these batches from
            // oldest to newest.
            //
            // Example:
            //
            // [
            //     {
            //         units: 100,
            //         buyPrice: 100,
            //         purchasedAt: ...
            //     },
            //     {
            //         units: 50,
            //         buyPrice: 120,
            //         purchasedAt: ...
            //     }
            // ]
            //
            // Current warehouse units:
            //
            // 150
            //
            // FIFO value:
            //
            // (100 × 100) + (50 × 120)
            // = 16,000
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

// ==========================================================
// FIFO INDEX
// ==========================================================
//
// Helps MongoDB locate stock records containing FIFO batches.
// The service itself determines FIFO ordering by
// purchaseBatches.purchasedAt.
//
// This is the SINGLE index definition for:
//     purchaseBatches.purchasedAt
//
// Do not also use `index: true` on purchasedAt inside
// purchaseBatchSchema.
// ==========================================================

stockSchema.index({
    "purchaseBatches.purchasedAt": 1
});

// ==========================================================
// FIFO VALIDATION
// ==========================================================
//
// Ensure that a stock record's warehouse balance agrees with
// its FIFO purchase batches.
//
// This validation intentionally does NOT reject legacy records
// where purchaseBatches is empty, because the service contains
// migration logic for existing stock records.
//
// Once FIFO batches exist, their total must equal Stock.units.
// ==========================================================

stockSchema.pre(
    "validate",
    function (next) {
        // ------------------------------------------------------
        // No FIFO batches
        //
        // Allow this for existing/legacy records.
        // The service will initialize them when required.
        // ------------------------------------------------------

        if (
            !Array.isArray(
                this.purchaseBatches
            ) ||
            this.purchaseBatches.length === 0
        ) {
            return next();
        }

        // ------------------------------------------------------
        // CALCULATE FIFO TOTAL
        // ------------------------------------------------------

        const fifoUnits =
            this.purchaseBatches.reduce(
                (total, batch) =>
                    total +
                    Number(
                        batch.units || 0
                    ),
                0
            );

        // ------------------------------------------------------
        // COMPARE WITH STOCK BALANCE
        // ------------------------------------------------------

        if (
            fifoUnits !==
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
// EXPORT
// ==========================================================

module.exports =
    mongoose.model(
        "Stock",
        stockSchema
    );