// =========================================================
// models/Payment.js
// MPESA DARAJA PAYMENT RECORD
// =========================================================
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    // Existing cart checkout user.
    clientId: {
      type: String,
      required: true,
      index: true
    },

    // Existing cart checkout session. Optional for payments
    // made from an already-created Package.
    sessionId: {
      type: String,
      default: "",
      index: true
    },

    // Existing cart checkout snapshot.
    // Package payments also store a snapshot here so the
    // transaction can be audited without depending on Cart.
    cartItems: {
      type: [
        {
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product"
          },
          name: String,
          price: Number,
          image: String,
          qty: Number
        }
      ],
      default: []
    },

    // Existing package being paid, if this payment was
    // initiated from /packages/:id.
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      default: null,
      index: true
    },

    amount: {
      type: Number,
      required: true,
      min: 1
    },

    phoneNumber: {
      type: String,
      required: true
    },

    merchantRequestId: {
      type: String,
      default: ""
    },

    checkoutRequestId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },

    mpesaReceiptNumber: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "failed",
        "cancelled"
      ],
      default: "pending",
      index: true
    },

    resultCode: {
      type: String,
      default: ""
    },

    resultDescription: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Payment", paymentSchema);
