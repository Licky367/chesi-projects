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
    productInventory: {
      type: [productInventorySchema],
      default: []
    },
    productReductions: {
      type: [substationProductReductionSchema],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Substation", substationSchema);
