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

const stockSchema = new mongoose.Schema(
  {
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
    days: { type: Number, required: true, min: 0, default: 0 },
    image: { type: String, trim: true, default: "" },
    units: { type: Number, required: true, min: 0, default: 0 },
    buyPrice: { type: Number, min: 0, default: 0 },
    description: { type: String, default: "" },

    // Optional instructions shown to customers on the product details page.
    directionsOfUse: {
      type: directionsOfUseSchema,
      default: undefined
    },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Do not make this unique: legacy databases may contain duplicates.
stockSchema.index({ category: 1, subcategory: 1 });

module.exports = mongoose.model("Stock", stockSchema);
