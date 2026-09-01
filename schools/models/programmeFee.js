const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| FEE CHARGE SCHEMA
|--------------------------------------------------------------------------
| Represents one fee item for a particular year and semester.
|
| Example:
|
| {
|   year: 1,
|   semester: 1,
|   amount: 8000
| }
|
|--------------------------------------------------------------------------
*/

const feeChargeSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true,
      min: 1
    },

    semester: {
      type: Number,
      required: true,
      min: 1
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    _id: false
  }
);


/*
|--------------------------------------------------------------------------
| FEE ITEM SCHEMA
|--------------------------------------------------------------------------
| Represents a particular type of fee.
|
| Examples:
|
| Tuition Fees
| Activity Fees
| Admission Fees
| ICT Fees
| Library Fees
| Medical Fees
| Examination Fees
| etc.
|
|--------------------------------------------------------------------------
*/

const feeItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    charges: {
      type: [feeChargeSchema],
      default: []
    }
  },
  {
    _id: false
  }
);


/*
|--------------------------------------------------------------------------
| PROGRAMME FEE SCHEMA
|--------------------------------------------------------------------------
| One document represents the complete fee structure of ONE programme
| for ONE academic session.
|
| Example:
|
| Programme:
| BSc Electrical & Electronics Engineering
|
| Academic Session:
| 2026/2027
|
| feeItems:
|   Tuition Fees
|   Activity Fees
|   ICT Fees
|   Library Fees
|   ...
|
|--------------------------------------------------------------------------
*/

const programmeFeeSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | PROGRAMME
    |--------------------------------------------------------------------------
    | Links this fee structure to the programme in programmes.js
    |--------------------------------------------------------------------------
    */

    programme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Programme",
      required: true
    },


    /*
    |--------------------------------------------------------------------------
    | academicYear
    |--------------------------------------------------------------------------
    | Example:
    | 2025/2026
    | 2026/2027
    |--------------------------------------------------------------------------
    */

    academicYear: {
      type: String,
      required: true,
      trim: true
    },


    /*
    |--------------------------------------------------------------------------
    | FEE ITEMS
    |--------------------------------------------------------------------------
    | Each fee item contains its charges for different years and semesters.
    |--------------------------------------------------------------------------
    */

    feeItems: {
      type: [feeItemSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);


/*
|--------------------------------------------------------------------------
| PREVENT DUPLICATE FEE STRUCTURES
|--------------------------------------------------------------------------
| A programme should have only ONE fee structure for a particular
| academic session.
|
| Example:
|
| BSc EEE + 2026/2027
|
| cannot appear twice.
|--------------------------------------------------------------------------
*/

programmeFeeSchema.index(
  {
    programme: 1,
    academicSession: 1
  },
  {
    unique: true
  }
);


/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
| Prevents duplicate year/semester combinations within the same
| fee item.
|
| Example of INVALID data:
|
| Tuition Fees:
|   Year 1 Semester 1
|   Year 1 Semester 1
|
|--------------------------------------------------------------------------
*/

programmeFeeSchema.pre("validate", function (next) {
  for (const feeItem of this.feeItems) {
    const combinations = new Set();

    for (const charge of feeItem.charges) {
      const key = `${charge.year}-${charge.semester}`;

      if (combinations.has(key)) {
        return next(
          new Error(
            `Duplicate charge for ${feeItem.name}: Year ${charge.year}, Semester ${charge.semester}.`
          )
        );
      }

      combinations.add(key);
    }
  }

  next();
});


/*
|--------------------------------------------------------------------------
| VIRTUAL: TOTAL FOR A PARTICULAR YEAR AND SEMESTER
|--------------------------------------------------------------------------
| This is intentionally NOT stored in MongoDB.
|
| The actual total can be calculated when needed from feeItems.
|--------------------------------------------------------------------------
*/

programmeFeeSchema.methods.getSemesterTotal = function (
  year,
  semester
) {
  let total = 0;

  for (const feeItem of this.feeItems) {
    for (const charge of feeItem.charges) {
      if (
        charge.year === year &&
        charge.semester === semester
      ) {
        total += charge.amount;
      }
    }
  }

  return total;
};


/*
|--------------------------------------------------------------------------
| METHOD: GET ALL SEMESTER TOTALS
|--------------------------------------------------------------------------
| Returns totals grouped by year and semester.
|
| Example:
|
| [
|   {
|     year: 1,
|     semester: 1,
|     total: 29217
|   },
|   {
|     year: 1,
|     semester: 2,
|     total: 22677
|   }
| ]
|
|--------------------------------------------------------------------------
*/

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
    if (a.year !== b.year) {
      return a.year - b.year;
    }

    return a.semester - b.semester;
  });
};


/*
|--------------------------------------------------------------------------
| METHOD: GET FEE ITEMS FOR A PARTICULAR SEMESTER
|--------------------------------------------------------------------------
| Useful when displaying a student's required fees.
|--------------------------------------------------------------------------
*/

programmeFeeSchema.methods.getFeesForSemester = function (
  year,
  semester
) {
  const result = [];

  for (const feeItem of this.feeItems) {
    const charge = feeItem.charges.find(
      item =>
        item.year === year &&
        item.semester === semester
    );

    if (charge) {
      result.push({
        name: feeItem.name,
        amount: charge.amount
      });
    }
  }

  return result;
};


/*
|--------------------------------------------------------------------------
| MODEL
|--------------------------------------------------------------------------
*/

module.exports = mongoose.model(
  "ProgrammeFee",
  programmeFeeSchema
);