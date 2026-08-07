const mongoose = require("mongoose");


/* =========================
   FINANCIAL SCHEMA
========================= */
const financialSchema = new mongoose.Schema({

  periodType: {
    type: String,
    enum: ["daily", "monthly", "yearly"],
    required: true,
    index: true
  },

  day: { type: String, index: true },
  month: { type: String, index: true },
  year: { type: Number, index: true },

  milkCash: { type: Number, default: 0 },

  maintenanceCost: { type: Number, default: 0 },
  medicalCost: { type: Number, default: 0 },

  totalExpenses: { type: Number, default: 0 },

  profit: { type: Number, default: 0 },

  locked: { type: Boolean, default: false }

}, {
  timestamps: true
});


/* =========================
   CORE CALCULATION HELPER
========================= */
financialSchema.statics._calculate = function (data) {
  const totalExpenses =
    (data.maintenanceCost || 0) +
    (data.medicalCost || 0);

  const profit =
    (data.milkCash || 0) - totalExpenses;

  return {
    ...data,
    totalExpenses,
    profit,
    locked: true
  };
};


/* =========================
   UNIFIED UPSERT METHOD
========================= */
financialSchema.statics.upsertFinancial = async function (query, data) {
  const computed = this._calculate(data);

  return this.findOneAndUpdate(
    query,
    { $set: computed },
    { upsert: true, new: true }
  );
};


/* =========================
   DAILY
========================= */
financialSchema.statics.computeDailyFinancials = async function (data) {
  return this.upsertFinancial(
    {
      periodType: "daily",
      day: data.day
    },
    data
  );
};


/* =========================
   MONTHLY
========================= */
financialSchema.statics.computeMonthlyFinancials = async function (data) {
  return this.upsertFinancial(
    {
      periodType: "monthly",
      month: data.month
    },
    data
  );
};


/* =========================
   YEARLY
========================= */
financialSchema.statics.computeYearlyFinancials = async function (data) {
  return this.upsertFinancial(
    {
      periodType: "yearly",
      year: data.year
    },
    data
  );
};


/* =========================
   STRONG UNIQUE SAFETY INDEX
========================= */
financialSchema.index(
  { periodType: 1, day: 1, month: 1, year: 1 },
  { unique: true, sparse: true }
);


/* =========================
   EXPORT
========================= */
module.exports = mongoose.model("Financial", financialSchema);