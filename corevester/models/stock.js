const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema(
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

    // A category may contain many subcategories.
    // A Stock document represents one warehouse subcategory record.
    subcategory: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },

    // Delivery/lead days belong to the subcategory, not the category.
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

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Do not make this unique: older databases may contain legacy duplicates.
// The service enforces the active category + subcategory combination.
stockSchema.index({ category: 1, subcategory: 1 });

module.exports = mongoose.model("Stock", stockSchema);
