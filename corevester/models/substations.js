const mongoose = require("mongoose");

const substationProductSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    stock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stock",
      required: true
    },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, lowercase: true },
    image: { type: String, trim: true, default: "" },
    units: { type: Number, required: true, min: 0, default: 0 },
    buyPrice: { type: Number, min: 0, default: 0 },
    unitSellPrice: { type: Number, required: true, min: 0 },
    description: { type: String, default: "" }
  },
  { _id: false, timestamps: true }
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
    products: {
      type: [substationProductSchema],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Substation", substationSchema);
