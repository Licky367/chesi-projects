const mongoose = require("mongoose");

const STOCK_CATEGORIES = [
  "Diagnostic Equipment",
  "Hospital Furniture",
  "Laboratory Equipment",
  "Surgical Equipment"
];

const stockSchema = new mongoose.Schema(
  {
    // Product name is the subcategory name. It is never keyed separately.
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
      enum: STOCK_CATEGORIES,
      index: true
    },

    subcategory: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    // Retained for compatibility with existing Product documents.
    // It is no longer exposed on the stock-entry/allocation UI.
    days: {
      type: Number,
      required: true,
      min: 0,
      default: 0
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

    description: {
      type: String,
      default: ""
    },

    // Current warehouse purchase-value total for this subcategory.
    cashOutflow: {
      type: Number,
      min: 0,
      default: 0
    },

    // Sum of cashOutflow for every active subcategory in this category.
    categoryOveral: {
      type: Number,
      min: 0,
      default: 0
    },

    // Sum of cashOutflow for all active categories/subcategories.
    overal: {
      type: Number,
      min: 0,
      default: 0
    },

    totalsUpdatedAt: {
      type: Date,
      default: Date.now
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

stockSchema.index({ category: 1, subcategory: 1 });
stockSchema.statics.CATEGORIES = STOCK_CATEGORIES;

module.exports = mongoose.model("Stock", stockSchema);
