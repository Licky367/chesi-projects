const mongoose = require("mongoose");

const SEMESTERS = [
  "September-December",
  "January-April",
  "May-August"
];

const academicYearPattern = /^\d{4}\/\d{2}$/;

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, default: Date.now },
    reference: { type: String, trim: true },
    method: { type: String, trim: true },
    remarks: { type: String, trim: true }
  },
  { timestamps: true }
);

const feeItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    amountRequired: { type: Number, required: true, min: 0 }
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
      trim: true,
      match: [
        academicYearPattern,
        "Academic year must use the format YYYY/YY, e.g. 2025/26."
      ]
    },

    semester: {
      type: String,
      required: true,
      enum: SEMESTERS
    },

    academicSession: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    yearOfStudy: {
      type: Number,
      required: true,
      min: 1
    },

    feeItems: { type: [feeItemSchema], default: [] },

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

    lastFeeUpdate: { type: Date }
  },
  { timestamps: true }
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

  /*
   * Payment history is the source of truth for amountPaid.
   * This prevents amountPaid from drifting away from payments.
   */
  this.amountPaid = paymentTotal;

  this.feeBalance = Math.max(
    0,
    this.amountRequired - this.amountPaid
  );

  next();
});

studentFinanceSchema.statics.syncCurrentSessionFee = async function (studentId) {
  const Student = mongoose.model("Student");
  const Registration = mongoose.model("Registration");
  const ProgrammeFee = mongoose.model("ProgrammeFee");

  const student = await Student.findById(studentId);

  if (!student) {
    throw new Error("Student not found.");
  }

  const registration = await Registration.findOne({
    configKey: "CURRENT"
  });

  if (!registration) {
    throw new Error(
      "Current academic registration has not been configured."
    );
  }

  const academicSession =
    registration.getCurrentAcademicSession();

  /*
   * Students who are not on-session do not receive a current-session
   * fee requirement from this synchronization operation.
   */
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
      "No programme fee structure exists for the student's current academic year."
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

  const payments = existing ? existing.payments : [];
  const amountPaid = payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  return this.findOneAndUpdate(
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
};

module.exports = mongoose.model(
  "StudentFinance",
  studentFinanceSchema
);
module.exports.SEMESTERS = SEMESTERS;
