// ==========================================================
// models/substations.js
// SUBSTATION MODEL
// ==========================================================

const mongoose = require("mongoose");


// ==========================================================
// PRODUCT INVENTORY SCHEMA
// ==========================================================

const productInventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    productName: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      default: "",
      trim: true
    },

    subcategory: {
      type: String,
      default: "",
      trim: true
    },

    days: {
      type: Number,
      min: 0,
      default: 0
    },

    units: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);


// ==========================================================
// SUBSTATION PRODUCT REDUCTION SCHEMA
// ==========================================================

const substationProductReductionSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    productName: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      default: "",
      trim: true
    },

    unitsReduced: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    lastReducedAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);


// ==========================================================
// SUBSTATION SCHEMA
// ==========================================================

const substationSchema = new mongoose.Schema(
  {
    // ------------------------------------------------------
    // BASIC INFORMATION
    // ------------------------------------------------------

    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true
    },

    location: {
      type: String,
      trim: true,
      default: ""
    },

    // ------------------------------------------------------
    // CONTACT INFORMATION
    // ------------------------------------------------------

    phoneNumber: {
      type: string,
      default: null
    },

    // ------------------------------------------------------
    // SUBSTATION ICON
    // Single image
    // ------------------------------------------------------

    substationIcon: {
      type: String,
      trim: true,
      default: ""
    },

    // ------------------------------------------------------
    // SUBSTATION IMAGES
    // Multiple images
    // ------------------------------------------------------

    images: {
      type: [String],
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
    // DIRECTIONS
    // ------------------------------------------------------

    directions: {
      type: String,
      default: ""
    },

    // ------------------------------------------------------
    // STATUS
    // ------------------------------------------------------

    isActive: {
      type: Boolean,
      default: true
    },

    // ------------------------------------------------------
    // PRODUCT INVENTORY
    // ------------------------------------------------------

    productInventory: {
      type: [productInventorySchema],
      default: []
    },

    // ------------------------------------------------------
    // PRODUCT REDUCTIONS
    // ------------------------------------------------------

    productReductions: {
      type: [substationProductReductionSchema],
      default: []
    }
  },

  {
    timestamps: true
  }
);


// ==========================================================
// EXPORT MODEL
// ==========================================================

module.exports = mongoose.model("Substation", substationSchema);