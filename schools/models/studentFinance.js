const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0
    },

    paymentDate: {
      type: Date,
      default: Date.now
    },

    reference: {
      type: String,
      trim: true
    },

    method: {
      type: String,
      trim: true
    },

    remarks: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

const feeItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    amountRequired: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const studentFinanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true
    },

    programme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Programme",
      required: true
    },

    academicYear: {
      type: String,
      required: true,
      trim: true
    },

    semester: {
      type: String,
      required: true,
      enum: [
        "September-December",
        "January-April",
        "May-August"
      ]
    },

    academicSession: {
      type: String,
      required: true,
      trim: true
    },

    yearOfStudy: {
      type: Number,
      required: true,
      min: 1
    },

    feeItems: {
      type: [feeItemSchema],
      default: []
    },

    amountRequired: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    amountPaid: {
      type: Number,
      min: 0,
      default: 0
    },

    feeBalance: {
      type: Number,
      min: 0,
      default: 0
    },

    payments: {
      type: [paymentSchema],
      default: []
    },

    lastFeeUpdate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

studentFinanceSchema.index(
  { student: 1, academicSession: 1 },
  { unique: true }
);

studentFinanceSchema.pre("validate", function (next) {
  const paymentTotal = this.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  if (this.isModified("payments")) {
    this.amountPaid = paymentTotal;
  }

  this.feeBalance = Math.max(
    0,
    this.amountRequired - this.amountPaid
  );

  next();
});

/*
 * Refreshes the student's current-session fee record.
 *
 * Fee is only required for an on-session student.
 * The amount is obtained from ProgrammeFee for:
 *   - student's programme
 *   - current academic year
 *   - student's year of study
 *   - current semester
 *
 * This method deliberately belongs to the finance model so controllers
 * and services have one consistent operation for synchronising fees.
 */
studentFinanceSchema.statics.syncCurrentSessionFee =
async function (studentId) {
  const Student = mongoose.model("Student");
  const Registration = mongoose.model("Registration");
  const ProgrammeFee = mongoose.model("ProgrammeFee");

  const student = await Student.findById(studentId);

  if (!student) {
    throw new Error("Student not found.");
  }

  const registration = await Registration.findOne().sort({
    updatedAt: -1
  });

  if (!registration) {
    throw new Error(
      "Current academic registration has not been configured."
    );
  }

  const academicSession =
    registration.getCurrentAcademicSession();

  if (student.status !== "on-session") {
    return this.findOne({
      student: student._id,
      academicSession
    });
  }

  if (!student.yearOfStudy) {
    throw new Error(
      "Student yearOfStudy is required before calculating fees."
    );
  }

  const programmeFee = await ProgrammeFee.findOne({
    programme: student.programme,
    academicYear: registration.currentAcademicYear
  });

  if (!programmeFee) {
    throw new Error(
      "No programme fee structure exists for the student's " +
      "current academic year."
    );
  }

  const feeItems = programmeFee.getFeesForSemester(
    student.yearOfStudy,
    registration.currentSemester
  );

  const amountRequired = feeItems.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const existing = await this.findOne({
    student: student._id,
    academicSession
  });

  const amountPaid = existing ? existing.amountPaid : 0;
  const payments = existing ? existing.payments : [];

  const finance = await this.findOneAndUpdate(
    {
      student: student._id,
      academicSession
    },
    {
      $set: {
        programme: student.programme,
        academicYear: registration.currentAcademicYear,
        semester: registration.currentSemester,
        academicSession,
        yearOfStudy: student.yearOfStudy,
        feeItems,
        amountRequired,
        amountPaid,
        feeBalance: Math.max(
          0,
          amountRequired - amountPaid
        ),
        payments,
        lastFeeUpdate: new Date()
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  return finance;
};

module.exports = mongoose.model(
  "StudentFinance",
  studentFinanceSchema
);
