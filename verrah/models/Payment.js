const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    // =======================================================
    // CLIENT
    // =======================================================

    clientId: {
      type: String,
      required: true,
      index: true
    },

    // =======================================================
    // CART ITEMS
    //
    // Snapshot of the products being paid for.
    // The cart itself is identified by Cart.user.
    // =======================================================

    cartItems: {
      type: [
        {
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
          },

          name: {
            type: String,
            required: true
          },

          price: {
            type: Number,
            required: true,
            min: 0
          },

          image: {
            type: String,
            default: ""
          },

          qty: {
            type: Number,
            required: true,
            min: 1
          }
        }
      ],

      default: []
    },

    // =======================================================
    // PACKAGE
    //
    // Null for a new cart checkout.
    // Contains the package ID when an existing package
    // is being paid.
    // =======================================================

    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      default: null,
      index: true
    },

    // =======================================================
    // PAYMENT AMOUNTS
    // =======================================================

    // Amount expected for this payment request.
    amount: {
      type: Number,
      required: true,
      min: 1
    },

    // Amount actually verified from M-Pesa.
    paidAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    // =======================================================
    // CUSTOMER PHONE
    // =======================================================

    phoneNumber: {
      type: String,
      required: true
    },

    // =======================================================
    // DARAJA REFERENCES
    // =======================================================

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

    // =======================================================
    // MPESA RECEIPT
    // =======================================================

    mpesaReceiptNumber: {
      type: String,
      default: "",
      index: true
    },

    // =======================================================
    // PAYMENT STATUS
    // =======================================================

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

    // =======================================================
    // DARAJA RESULT
    // =======================================================

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


// =========================================================
// MODEL
// =========================================================

module.exports =
  mongoose.model(
    "Payment",
    paymentSchema
  );