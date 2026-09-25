// ==========================================================
// verrah/models/products.js
// PRODUCT MODEL
//
// FIFO PRODUCT COSTING
// ==========================================================

const mongoose = require("mongoose");

const directionsOfUseItemSchema = new mongoose.Schema(
  {
    subtitle: { type: String, trim: true, default: "" },
    content: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const directionsOfUseSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    items: { type: [directionsOfUseItemSchema], default: [] }
  },
  { _id: false }
);

const fifoBatchSchema = new mongoose.Schema(
  {
    units: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    buyPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    receivedAt: {
      type: Date,
      required: true,
      default: Date.now
    },

    StaffFIFOsubstation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Substation",
      default: null
    }
  },

  {
    timestamps: true
  }
);

const productSchema = new mongoose.Schema(
  {
    stock: { type: mongoose.Schema.Types.ObjectId, ref: "Stock", required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    subcategory: { type: String, required: true, trim: true, lowercase: true, index: true },
    days: { type: Number, required: true, min: 0, default: 1 },
    image: { type: String, trim: true, default: "" },
    units: { type: Number, required: true, min: 0, default: 0 },
    buyPrice: { type: Number, min: 0, default: 0 },
    fifoBatches: { type: [fifoBatchSchema], default: [] },
    unitSellPrice: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, default: "" },
    directionsOfUse: { type: directionsOfUseSchema, default: undefined },
    substation: { type: mongoose.Schema.Types.ObjectId, ref: "Substation", default: null, index: true },
    isActive: { type: Boolean, default: true, index: true }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

productSchema.index({ stock: 1, isActive: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ category: 1, subcategory: 1, name: 1 });
productSchema.index({ "fifoBatches.receivedAt": 1 });

productSchema.pre("validate", function (next) {
    if (!Array.isArray(this.fifoBatches) || this.fifoBatches.length === 0) {
        return next();
    }
    const fifoUnits = this.fifoBatches.reduce((total, batch) => total + Number(batch.units || 0), 0);
    if (fifoUnits!== Number(this.units || 0)) {
        return next(new Error("Product FIFO batch units must equal product units."));
    }
    next();
});

// ==========================================================
// FIFO CURRENT BATCH PRICE - SAME PRINCIPLE AS STOCK
// ==========================================================

productSchema.methods.getCurrentBatch = function () {
    if (!Array.isArray(this.fifoBatches) ||!this.fifoBatches.length) return null;
    const available = this.fifoBatches
     .filter(b => Number(b.units || 0) > 0)
     .sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt));
    return available[0] || null;
};

productSchema.methods.getCurrentPrice = function () {
    const batch = this.getCurrentBatch();
    if (batch) return Number(batch.buyPrice || 0);
    return Number(this.buyPrice || 0); // legacy fallback
};

productSchema.methods.getCurrentBatchUnits = function () {
    const batch = this.getCurrentBatch();
    if (batch) return Number(batch.units || 0);
    return Number(this.units || 0);
};

productSchema.virtual("currentBatchPrice").get(function () {
    return this.getCurrentPrice();
});

productSchema.virtual("currentBatch").get(function () {
    return this.getCurrentBatch();
});

productSchema.virtual("currentBatchUnits").get(function () {
    return this.getCurrentBatchUnits();
});

module.exports = mongoose.model("Product", productSchema);