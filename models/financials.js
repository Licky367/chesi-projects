const mongoose = require("mongoose");


/* =========================================================
   LIABILITY SUB-SCHEMA
========================================================= */

const liabilitySchema = new mongoose.Schema(
  {

    type: {
      type: String,
      required: true,
      trim: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    description: {
      type: String,
      required: true,
      trim: true
    },

    time: {
      type: Date,
      default: Date.now
    }

  },
  {
    _id: true
  }
);


/* =========================================================
   FINANCIAL SCHEMA
========================================================= */

const financialSchema = new mongoose.Schema({

  periodType: {
    type: String,
    enum: ["daily", "monthly", "yearly"],
    required: true,
    index: true
  },

  day: {
    type: String,
    index: true
  },

  month: {
    type: String,
    index: true
  },

  year: {
    type: Number,
    index: true
  },


  /* =======================================================
     INCOME
  ======================================================= */

  milkCash: {
    type: Number,
    default: 0
  },


  /* =======================================================
     EXPENSES
  ======================================================= */

  maintenanceCost: {
    type: Number,
    default: 0
  },

  medicalCost: {
    type: Number,
    default: 0
  },

  /*
   * Total amount of all liability entries.
   */
  liabilities: {
    type: Number,
    default: 0
  },


  /* =======================================================
     INDIVIDUAL LIABILITIES
  ======================================================= */

  liability: {
    type: [liabilitySchema],
    default: []
  },


  /* =======================================================
     TOTALS
  ======================================================= */

  totalExpenses: {
    type: Number,
    default: 0
  },

  profit: {
    type: Number,
    default: 0
  },


  /* =======================================================
     LOCK STATUS
  ======================================================= */

  locked: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});


/* =========================================================
   CORE CALCULATION HELPER
========================================================= */

financialSchema.statics._calculate = function (data) {

  const totalLiabilities =
    (data.liability || []).reduce(
      (total, item) => total + (Number(item.amount) || 0),
      0
    );

  const totalExpenses =
    (data.maintenanceCost || 0) +
    (data.medicalCost || 0) +
    totalLiabilities;

  const profit =
    (data.milkCash || 0) - totalExpenses;

  return {
    ...data,

    liabilities: totalLiabilities,

    totalExpenses,

    profit,

    locked: true
  };
};


/* =========================================================
   UNIFIED UPSERT METHOD
========================================================= */

financialSchema.statics.upsertFinancial = async function (
  query,
  data
) {

  const computed = this._calculate(data);

  return this.findOneAndUpdate(
    query,
    {
      $set: computed
    },
    {
      upsert: true,
      new: true
    }
  );

};


/* =========================================================
   DAILY
========================================================= */

financialSchema.statics.computeDailyFinancials = async function (
  data
) {

  return this.upsertFinancial(
    {
      periodType: "daily",
      day: data.day
    },
    data
  );

};


/* =========================================================
   MONTHLY
========================================================= */

financialSchema.statics.computeMonthlyFinancials = async function (
  data
) {

  return this.upsertFinancial(
    {
      periodType: "monthly",
      month: data.month
    },
    data
  );

};


/* =========================================================
   YEARLY
========================================================= */

financialSchema.statics.computeYearlyFinancials = async function (
  data
) {

  return this.upsertFinancial(
    {
      periodType: "yearly",
      year: data.year
    },
    data
  );

};


/* =========================================================
   STRONG UNIQUE SAFETY INDEX
========================================================= */

financialSchema.index(
  {
    periodType: 1,
    day: 1,
    month: 1,
    year: 1
  },
  {
    unique: true,
    sparse: true
  }
);


/* =========================================================
   EXPORT
========================================================= */

module.exports = mongoose.model(
  "Financial",
  financialSchema
);