const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    // Product identity is now the source Stock/subcategory record.
    // It is no longer tied to one substation.
    stock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stock",
      required: true,
      index: true
    },

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

    subcategory: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },

    // Inherited from the Stock subcategory.
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

    // This is the total marketplace quantity across all substations.
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

    /*
     * Legacy field retained so old documents can still be read.
     * New products are NOT substation-scoped. Their quantities are
     * held in Substation.productInventory instead.
     */
    substation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Substation",
      default: null,
      index: true
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

productSchema.index({ stock: 1, isActive: 1 });

module.exports = mongoose.model("Product", productSchema);
