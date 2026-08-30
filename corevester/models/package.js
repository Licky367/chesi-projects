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
    category: {
      type: String,
      default: ""
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
  { _id: false }
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
      default: "pending",
      index: true
    },

    // --------------------------------------------------------
    // STAFF PACKAGE WORKFLOW
    // --------------------------------------------------------

    confirmedByStaffId: {
      type: String,
      default: null,
      index: true
    },

    confirmedByStaffName: {
      type: String,
      default: ""
    },

    confirmedAt: {
      type: Date,
      default: null
    },

    confirmedSubstationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Substation",
      default: null,
      index: true
    },

    deliveredByStaffId: {
      type: String,
      default: null,
      index: true
    },

    deliveredByStaffName: {
      type: String,
      default: ""
    },

    deliveredAt: {
      type: Date,
      default: null
    },

    deliveredSubstationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Substation",
      default: null,
      index: true
    },

    // Delivery records the physical fulfilment against the
    // staff member's assigned substation. It does NOT reduce
    // Product.units a second time.
    substationReductionRecorded: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ------------------------------------------------------------
// LEGACY PAYMENT COMPATIBILITY
// ------------------------------------------------------------
//
// Older packages may still contain:
//
//     paymentStatus: "not_required"
//
// That value is no longer part of the application's payment
// state machine. Normalize it BEFORE Mongoose enum validation
// so an old package can still be opened/updated safely.
//
packageSchema.pre("validate", function(next) {
  if (this.paymentStatus === "not_required") {
    const total = Math.max(
      0,
      Number(this.totalAmount || 0)
    );

    const paid = Math.max(
      0,
      Number(this.paidAmount || 0)
    );

    if (paid <= 0) {
      this.paymentStatus = "unpaid";
    } else if (paid >= total) {
      this.paymentStatus = "paid";
    } else {
      this.paymentStatus = "partialPaid";
    }
  }

  next();
});

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

module.exports = mongoose.model(
  "Package",
  packageSchema
);
