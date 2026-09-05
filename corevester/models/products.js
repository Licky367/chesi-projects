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

const productSchema = new mongoose.Schema(
  {
    stock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stock",
      required: true,
      index: true
    },
    name: { type: String, required: true, trim: true, index: true },
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
    days: { type: Number, required: true, min: 0, default: 1 },
    image: { type: String, trim: true, default: "" },
    units: { type: Number, required: true, min: 0, default: 0 },
    buyPrice: { type: Number, min: 0, default: 0 },
    unitSellPrice: { type: Number, required: true, min: 0 },
    description: { type: String, default: "" },

    // A snapshot of the stock instructions. This makes them available
    // directly to /products/:id and keeps the product display reliable.
    directionsOfUse: {
      type: directionsOfUseSchema,
      default: undefined
    },

    substation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Substation",
      default: null,
      index: true
    },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

productSchema.index({ stock: 1, isActive: 1 });

module.exports = mongoose.model("Product", productSchema);
