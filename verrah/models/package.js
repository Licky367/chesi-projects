const mongoose = require("mongoose");
const User = require("./user");


// ============================================================
// PACKAGE ITEM SCHEMA
//
// IMPORTANT:
//
// These fields are SNAPSHOTS captured when the package is
// created.
//
// They must NOT be recalculated from Product later.
//
// Example:
//
// Product.unitSellPrice = 500
// Package is created
// Package.items[0].price = 500
//
// Later:
//
// Product.unitSellPrice = 600
//
// Existing package:
// Package.items[0].price === 500
//
// A NEW package created afterwards may use 600.
//
// ============================================================

const packageItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    // Snapshot of product name at package creation
    name: {
      type: String,
      required: true
    },

    // Snapshot of category at package creation
    category: {
      type: String,
      default: ""
    },

    // ----------------------------------------------------------
    // SNAPSHOT SELL PRICE
    //
    // This is the actual price charged in THIS package.
    //
    // NEVER replace this with Product.unitSellPrice when
    // displaying an existing package.
    // ----------------------------------------------------------
    price: {
      type: Number,
      required: true,
      min: 0
    },

    // Quantity selected for this package
    qty: {
      type: Number,
      required: true,
      min: 1
    },

    // Snapshot of product image at package creation
    image: {
      type: String,
      default: ""
    }
  },
  {
    _id: false
  }
);


// ============================================================
// PACKAGE SCHEMA
// ============================================================

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
    // CASH PACKAGE
    //
    // false = normal / non-cash package
    // true  = cash package
    // --------------------------------------------------------

    isCash: {
      type: Boolean,
      default: false,
      index: true
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


    // --------------------------------------------------------
    // PACKAGE ITEMS
    //
    // Product information is stored directly inside the
    // package.
    //
    // DO NOT populate Product and overwrite these values.
    // --------------------------------------------------------

    items: {
      type: [packageItemSchema],
      default: []
    },


    // --------------------------------------------------------
    // TOTAL AMOUNT
    //
    // This should be calculated from the SNAPSHOT item prices:
    //
    // item.price × item.qty
    //
    // It should never be recalculated using current Product
    // prices.
    // --------------------------------------------------------

    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },


    // --------------------------------------------------------
    // PAYMENT
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // PACKAGE STATUS
    // --------------------------------------------------------

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

    toJSON: {
      virtuals: true
    },

    toObject: {
      virtuals: true
    }
  }
);


// ============================================================
// DEFAULT PACKAGE SUBSTATION FROM USER PICKUP STATION
//
// Checkout updates User.pickupStation first.
//
// This hook copies that value into the newly-created package.
//
// If packageSubstation was explicitly supplied, it is preserved.
// ============================================================

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


// ============================================================
// LEGACY PAYMENT COMPATIBILITY
// ============================================================

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


// ============================================================
// TOTAL PAID VIRTUAL
// ============================================================

packageSchema.virtual("totalPaid").get(function() {
  return Math.max(
    0,
    Number(this.paidAmount || 0)
  );
});


// ============================================================
// ARREARS VIRTUAL
// ============================================================

packageSchema.virtual("arrearsAmount").get(function() {
  return Math.max(
    0,
    Number(this.totalAmount || 0) -
      Number(this.paidAmount || 0)
  );
});


// ============================================================
// EXPORT
// ============================================================

module.exports = mongoose.model(
  "Package",
  packageSchema
);