const mongoose = require("mongoose");

const VALID_POULTRY_TYPES = [
  "chicken",
  "duck",
  "turkey",
  "goose",
  "quail",
  "other"
];

const VALID_CATEGORIES = [
  "investment",
  "poultry_sale",
  "egg_sale"
];

const VALID_META_TYPES = [
  "investment",
  "reinvest",
  "pay_workers",
  "consumption"
];


// =========================
// FINANCE SCHEMA
// =========================

const poultryFinanceSchema = new mongoose.Schema(
  {

    // =========================
    // MAIN TRANSACTION CATEGORY
    // =========================
    // investment  = money put into poultry business
    // poultry_sale = income from birds
    // egg_sale     = income from eggs
    category: {
      type: String,
      enum: VALID_CATEGORIES,
      required: true,
      trim: true
    },


    // =========================
    // INVESTMENT CLASSIFICATION
    // =========================
    // Used when category = investment
    //
    // investment       = initial investment
    // reinvest         = profit put back into business
    // pay_workers      = labour expense
    // consumption      = farm usage expense
    metaType: {
      type: String,
      enum: VALID_META_TYPES,
      default: "investment",
      trim: true
    },


    // =========================
    // POULTRY TYPE
    // =========================
    poultryType: {
      type: String,
      enum: VALID_POULTRY_TYPES,
      required: true,
      trim: true,
      lowercase: true
    },


    // =========================
    // MONEY VALUE
    // =========================
    amount: {
      type: Number,
      required: true,
      min: 0,
      set: value => Math.max(0, Number(value))
    },


    // =========================
    // QUANTITY
    // =========================
    // Birds sold or eggs sold
    quantity: {
      type: Number,
      default: 0,
      min: 0,
      set: value => Math.max(0, Number(value))
    },


    // =========================
    // DESCRIPTION
    // =========================
    description: {
      type: String,
      trim: true,
      default: ""
    },


    // =========================
    // RELATED BATCH
    // =========================
    relatedBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NursingBatch",
      default: null
    },


    // =========================
    // USER RECORDING ENTRY
    // =========================
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    }

  },
  {
    timestamps: true
  }
);


// =========================
// INDEXES
// =========================

poultryFinanceSchema.index({
  category: 1,
  poultryType: 1
});

poultryFinanceSchema.index({
  metaType: 1
});

poultryFinanceSchema.index({
  poultryType: 1,
  createdAt: -1
});

poultryFinanceSchema.index({
  createdAt: -1
});


// =========================
// EXPORT MODEL
// =========================

module.exports = mongoose.model(
  "PoultryFinance",
  poultryFinanceSchema
);