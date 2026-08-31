const mongoose = require("mongoose");

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
      trim: true,
      lowercase: true
    },

    subcategory: {
      type: String,
      default: "",
      trim: true,
      lowercase: true
    },

    days: {
      type: Number,
      min: 0,
      default: 0
    },

    // Current quantity of that Product physically allocated to this substation.
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
      trim: true,
      lowercase: true
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

const substationSchema = new mongoose.Schema(
  {
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

    description: {
      type: String,
      default: ""
    },

    isActive: {
      type: Boolean,
      default: true
    },

    /*
     * Product.units is the marketplace total and is reduced when the
     * customer reserves a product in the cart.
     *
     * productInventory is the separate physical quantity held by each
     * substation. Allocating 10 units to 3 substations therefore makes
     * Product.units = 30 and records 10 in each substation.
     *
     * Delivery does NOT decrement Product.units again. It decrements
     * the delivering substation's physical inventory.
     */
    productInventory: {
      type: [productInventorySchema],
      default: []
    },

    /*
     * Kept for compatibility with the earlier delivery ledger.
     */
    productReductions: {
      type: [substationProductReductionSchema],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Substation", substationSchema);
