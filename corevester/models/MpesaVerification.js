const mongoose = require("mongoose");

const mpesaVerificationSchema = new mongoose.Schema(
  {
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
      index: true
    },

    clientId: {
      type: String,
      required: true,
      index: true
    },

    transactionCode: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "failed"],
      default: "pending",
      index: true
    },

    amount: {
      type: Number,
      default: 0,
      min: 0
    },

    phoneNumber: {
      type: String,
      default: ""
    },

    receiptNumber: {
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

module.exports =
  mongoose.model(
    "MpesaVerification",
    mpesaVerificationSchema
  );
