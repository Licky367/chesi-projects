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

    paymentStatus: {
      type: String,
      enum: ["unpaid", "partialPaid", "paid"],
      default: "unpaid",
      index: true
    },
    paidAmount: { type: Number, default: 0, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["mpesa", "pay_on_delivery"],
      default: "pay_on_delivery"
    },
    mpesaReceiptNumber: { type: String, default: "" },
    phoneNumber: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "confirmed", "delivered"],
      default: "pending",
      index: true
    },

    // Staff workflow. These fields make the package ownership explicit:
    // the staff member who confirms a package is the only staff member who
    // can subsequently deliver it.
    confirmedByStaffId: { type: String, default: null, index: true },
    confirmedByStaffName: { type: String, default: "" },
    confirmedAt: { type: Date, default: null },
    confirmedSubstationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Substation",
      default: null,
      index: true
    },

    deliveredByStaffId: { type: String, default: null, index: true },
    deliveredByStaffName: { type: String, default: "" },
    deliveredAt: { type: Date, default: null },
    deliveredSubstationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Substation",
      default: null,
      index: true
    },

    // True means the delivery transaction has already recorded its
    // per-substation reduction ledger entry. Product.units is NOT changed
    // by the delivery transaction.
    substationReductionRecorded: { type: Boolean, default: false, index: true }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

packageSchema.virtual("totalPaid").get(function () {
  return Math.max(0, Number(this.paidAmount || 0));
});

packageSchema.virtual("arrearsAmount").get(function () {
  return Math.max(
    0,
    Number(this.totalAmount || 0) - Number(this.paidAmount || 0)
  );
});

module.exports = mongoose.model("Package", packageSchema);
