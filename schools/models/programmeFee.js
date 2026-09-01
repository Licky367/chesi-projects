const mongoose = require("mongoose");


/*
|--------------------------------------------------------------------------
| FEE CHARGE SCHEMA
|--------------------------------------------------------------------------
| Stores the amount charged for a particular fee item during a specific
| year of study and semester.
|
| Example:
|
| Year 1
| Semester 1
| Amount: 8000
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
| Represents one type of fee.
|
| Examples:
|
| Activity Fees
| Admission Fees
| Attachment Fees
| Tuition Fees
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
| One document represents the fee structure of ONE programme.
|
| The academic session is obtained through the referenced Programme.
|
| Programme
|    |
|    └── academicSession
|
| ProgrammeFee
|    |
|    └── programme → Programme
|
|--------------------------------------------------------------------------
*/

const programmeFeeSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | PROGRAMME
    |--------------------------------------------------------------------------
    | References the programme in models/programmes.js.
    |
    | The Programme contains the academicSession field.
    |--------------------------------------------------------------------------
    */

    programme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Programme",
      required: true
    },


    /*
    |--------------------------------------------------------------------------
    | FEE ITEMS
    |--------------------------------------------------------------------------
    | Contains all charges applicable to this programme.
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
| UNIQUE PROGRAMME
|--------------------------------------------------------------------------
| Each programme has one programme fee structure document.
|
|--------------------------------------------------------------------------
*/

programmeFeeSchema.index(
  {
    programme: 1
  },
  {
    unique: true
  }
);


/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
| Prevents the same fee item from having duplicate year/semester
| combinations.
|
| Example of invalid data:
|
| Tuition Fees
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


/*
|--------------------------------------------------------------------------
| GET SEMESTER TOTAL
|--------------------------------------------------------------------------
| Calculates the total amount required for a particular year and
| semester.
|
| The total is calculated rather than stored in MongoDB.
|
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
| GET ALL SEMESTER TOTALS
|--------------------------------------------------------------------------
| Returns the total required for every year/semester contained in the
| fee structure.
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
| GET FEES FOR A PARTICULAR SEMESTER
|--------------------------------------------------------------------------
| Returns all fee items applicable to the selected year and semester.
|
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