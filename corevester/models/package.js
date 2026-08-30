const mongoose = require("mongoose");

const packageItemSchema = new mongoose.Schema(
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
      required: true
    },

    qty: {
      type: Number,
      required: true,
      min: 1
    },

    image: {
      type: String,
      default: ""
    }
  },
  {
    _id: false
  }
);

const packageSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      required: true,
      index: true
    },

    items: {
      type: [packageItemSchema],
      default: []
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "partialPaid", "paid"],
      default: "unpaid",
      index: true
    },

    // Aggregate of confirmed Payment.paidAmount records.
    paidAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    paymentMethod: {
      type: String,
      enum: ["mpesa", "pay_on_delivery"],
      default: "pay_on_delivery"
    },

    mpesaReceiptNumber: {
      type: String,
      default: ""
    },

    phoneNumber: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "delivered"],
      default: "pending"
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true
    },
    toObject: {
      virtuals: true
    }
  }
);

packageSchema.virtual("totalPaid").get(function () {
  return Math.max(
    0,
    Number(this.paidAmount || 0)
  );
});

packageSchema.virtual("arrearsAmount").get(function () {
  return Math.max(
    0,
    Number(this.totalAmount || 0) -
    Number(this.paidAmount || 0)
  );
});

module.exports =
  mongoose.model("Package", packageSchema);
