const mongoose = require("mongoose");

// ==========================================================
// STOCK SCHEMA
// Category is stored as a reference to the Category collection.
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
  { _id: false }
);

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
  { _id: false }
);

const stockSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    // Category is a MongoDB reference, not a hard-coded enum.
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true
    },

    subcategory: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },

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

    directionsOfUse: {
      type: directionsOfUseSchema,
      default: undefined
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

stockSchema.index({
  category: 1,
  subcategory: 1
});

module.exports = mongoose.model("Stock", stockSchema);
