const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
    index: true
  },

  sessionId: {
    type: String,
    default: "",
    index: true
  },

  cartItems: {
    type: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      },
      name: String,
      price: Number,
      image: String,
      qty: Number
    }],
    default: []
  },

  // Existing package being paid, if applicable.
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Package",
    default: null,
    index: true
  },

  // Amount requested by this payment.
  amount: {
    type: Number,
    required: true,
    min: 1
  },

  // Amount actually credited to the package.
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
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
    enum: ["pending", "confirmed", "failed", "cancelled"],
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
}, {
  timestamps: true
});

module.exports = mongoose.model("Payment", paymentSchema);
