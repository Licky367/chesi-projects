const mongoose = require("mongoose");

const deliveredProductSchema = new mongoose.Schema(
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
      required: true,
      min: 0
    },

    qty: {
      type: Number,
      required: true,
      min: 1
    },

    image: {
      type: String,
      default: ""
    },

    substationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Substation",
      default: null
    }
  },
  {
    _id: false
  }
);

const deliveredSchema = new mongoose.Schema(
  {
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
      unique: true,
      index: true
    },

    products: {
      type: [deliveredProductSchema],
      default: []
    },

    clientName: {
      type: String,
      required: true,
      trim: true
    },

    staffName: {
      type: String,
      required: true,
      trim: true
    },

    substationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Substation",
      required: true,
      index: true
    },

    amountPaid: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    arrearsAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    // --------------------------------------------------------
    // CLEARANCE
    // --------------------------------------------------------

    cleared: {
      type: Boolean,
      default: false,
      index: true
    },

    clearedAt: {
      type: Date,
      default: null
    },

    clearedByStaffId: {
      type: String,
      default: null
    },

    clearedByStaffName: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "DeliveredPackage",
  deliveredSchema
);
