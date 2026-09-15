const mongoose = require("mongoose");
const User = require("./user");

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
    salesName: {
      type: String,
      default: ""
    },

    // --------------------------------------------------------
    // CUSTOMER-SELECTED PICKUP SUBSTATION
    // --------------------------------------------------------
    packageSubstation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Substation",
      default: null,
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
// DEFAULT PACKAGE SUBSTATION FROM USER PICKUP STATION
//
// Checkout updates User.pickupStation first. This hook makes
// every newly created package carry a snapshot of that choice.
//
// If packageSubstation was explicitly supplied, never overwrite
// it.
// ------------------------------------------------------------

packageSchema.pre("validate", async function(next) {
  try {
    if (!this.packageSubstation && this.clientId) {
      const user = await User.findById(this.clientId)
        .select("pickupStation")
        .lean();

      if (user?.pickupStation) {
        this.packageSubstation = user.pickupStation;
      }
    }

    next();
  } catch (err) {
    next(err);
  }
});


// ------------------------------------------------------------
// LEGACY PAYMENT COMPATIBILITY
// ------------------------------------------------------------

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
