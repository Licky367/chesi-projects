// =========================================================
// models/Payment.js
// MPESA DARAJA PAYMENT RECORD
// =========================================================
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, index: true },

    cartItems: {
      type: [
        {
          productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
          name: String,
          price: Number,
          image: String,
          qty: Number
        }
      ],
      default: []
    },

    amount: { type: Number, required: true, min: 1 },
    phoneNumber: { type: String, required: true },

    merchantRequestId: { type: String, default: "" },
    checkoutRequestId: { type: String, unique: true, sparse: true, index: true },
    mpesaReceiptNumber: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "confirmed", "failed", "cancelled"],
      default: "pending",
      index: true
    },

    resultCode: { type: String, default: "" },
    resultDescription: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
