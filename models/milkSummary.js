const mongoose = require("mongoose");

// ==================================================
// DAILY SALE
// ==================================================

const saleSchema = new mongoose.Schema({

  customerName: {
    type: String,
    required: true,
    trim: true
  },

  liters: {
    type: Number,
    required: true,
    min: 0
  },

  price: {
    type: Number,
    required: true,
    default: 50
  },

  cash: {
    type: Number,
    required: true,
    default: 0
  },

  standingOrderId: {

    type: mongoose.Schema.Types.ObjectId,

    ref: "StandingOrder",

    default: null

  },

  createdAt: {

    type: Date,

    default: Date.now

  }

}, {

  _id: false

});

// ==================================================
// DAILY SUMMARY
// ==================================================

const milkSummarySchema = new mongoose.Schema({

  day: {

    type: String,

    required: true,

    unique: true

  },

  month: {

    type: String

  },

  price: {

    type: Number,

    default: 50

  },

  locked: {

    type: Boolean,

    default: false

  },

  sales: {

    type: [saleSchema],

    default: []

  }

}, {

  timestamps: true

});

// ==================================================
// SET MONTH FROM DAY
// ==================================================

milkSummarySchema.pre("save", function(next) {

  if (this.day) {

    this.month = this.day.slice(0, 7);

  }

  next();

});

// ==================================================
// EXPORT
// ==================================================

module.exports = mongoose.model(

  "MilkSummary",

  milkSummarySchema

);