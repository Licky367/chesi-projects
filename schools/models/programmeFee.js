const mongoose = require("mongoose");

const SEMESTERS = [
  "September-December",
  "January-April",
  "May-August"
];

const feeChargeSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true, min: 1 },

    semester: {
      type: String,
      required: true,
      enum: SEMESTERS
    },

    amount: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const feeItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    charges: { type: [feeChargeSchema], default: [] }
  },
  { _id: false }
);

const programmeFeeSchema = new mongoose.Schema(
  {
    programme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Programme",
      required: true,
      index: true
    },

    academicYear: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^\d{4}\/\d{2}$/,
        "Academic year must use the format YYYY/YY, e.g. 2025/26."
      ]
    },

    feeItems: {
      type: [feeItemSchema],
      default: []
    }
  },
  { timestamps: true }
);

programmeFeeSchema.index(
  { programme: 1, academicYear: 1 },
  { unique: true }
);

programmeFeeSchema.pre("validate", function (next) {
  for (const feeItem of this.feeItems) {
    const combinations = new Set();

    for (const charge of feeItem.charges) {
      const key = `${charge.year}-${charge.semester}`;

      if (combinations.has(key)) {
        return next(
          new Error(
            `Duplicate charge for ${feeItem.name}: ` +
            `Year ${charge.year}, Semester ${charge.semester}.`
          )
        );
      }

      combinations.add(key);
    }
  }

  next();
});

programmeFeeSchema.methods.getSemesterTotal = function (year, semester) {
  return this.feeItems.reduce((total, feeItem) => {
    const charge = feeItem.charges.find(
      item => item.year === year && item.semester === semester
    );

    return total + (charge ? charge.amount : 0);
  }, 0);
};

programmeFeeSchema.methods.getSemesterTotals = function () {
  const totals = {};

  for (const feeItem of this.feeItems) {
    for (const charge of feeItem.charges) {
      const key = `${charge.year}-${charge.semester}`;

      if (!totals[key]) {
        totals[key] = {
          year: charge.year,
          semester: charge.semester,
          total: 0
        };
      }

      totals[key].total += charge.amount;
    }
  }

  return Object.values(totals).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.semester.localeCompare(b.semester);
  });
};

programmeFeeSchema.methods.getFeesForSemester = function (year, semester) {
  return this.feeItems
    .map(feeItem => {
      const charge = feeItem.charges.find(
        item => item.year === year && item.semester === semester
      );

      return charge
        ? { name: feeItem.name, amount: charge.amount }
        : null;
    })
    .filter(Boolean);
};

module.exports = mongoose.model("ProgrammeFee", programmeFeeSchema);
module.exports.SEMESTERS = SEMESTERS;
