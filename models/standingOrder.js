const mongoose = require("mongoose");

const standingOrderSchema = new mongoose.Schema({

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

  effectiveDate: {
    type: Date,
    required: true,
    default: Date.now
  },

  isActive: {
    type: Boolean,
    default: true
  },

  omitted: {
    type: Boolean,
    default: false
  }

}, {

  timestamps: true

});

// Faster lookups for active orders
standingOrderSchema.index({
  isActive: 1,
  omitted: 1,
  effectiveDate: 1
});

module.exports = mongoose.model(
  "StandingOrder",
  standingOrderSchema
);