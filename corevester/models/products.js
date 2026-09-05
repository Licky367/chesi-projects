const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
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

    days: {
      type: Number,
      required: true,
      min: 0,
      default: 1
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

    unitSellPrice: {
      type: Number,
      required: true,
      min: 0
    },

    description: {
      type: String,
      default: ""
    },

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
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// This reads directionsOfUse from Stock
productSchema.virtual("directionsOfUse").get(function () {
  // If stock is populated (object), return its directionsOfUse
  if (this.stock && typeof this.stock === "object" && this.stock.directionsOfUse) {
    return this.stock.directionsOfUse;
  }
  return undefined;
});

// Auto-populate Stock so directionsOfUse is always available
productSchema.pre(/^find/, function (next) {
  this.populate({
    path: "stock",
    select: "directionsOfUse name category subcategory"
  });
  next();
});

productSchema.index({ stock: 1, isActive: 1 });

module.exports = mongoose.model("Product", productSchema);