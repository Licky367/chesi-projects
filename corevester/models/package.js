// =========================================================
// models/package.js
// CUSTOMER PACKAGE / ORDER MODEL
// =========================================================
const mongoose = require("mongoose");

const packageItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    image: { type: String, default: "" }
  },
  { _id: false }
);

const packageSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true, index: true },
    items: { type: [packageItemSchema], default: [] },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["mpesa", "pay_on_delivery"],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "confirmed", "not_required", "failed"],
      default: "pending"
    },
    mpesaReceiptNumber: { type: String, default: "" },
    phoneNumber: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "delivered"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Package", packageSchema);
