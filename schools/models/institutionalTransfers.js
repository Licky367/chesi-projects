const mongoose = require("mongoose");

const TRANSFER_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "completed"
];

const TRANSFER_TYPES = [
  "institutional-transfer",
  "inter-university-transfer",
  "inter-college-transfer",
  "programme-transfer"
];

const SEMESTERS = [
  "September-December",
  "January-April",
  "May-August"
];

const academicYearPattern = /^\d{4}\/\d{2}$/;

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    file: { type: String, required: true, trim: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const institutionalTransferSchema = new mongoose.Schema(
  {
    /*
     * Nullable because the transfer application may exist before
     * the receiving institution creates the Student record.
     */
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
      index: true
    },

    transferApplicationNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true
    },

    transferType: {
      type: String,
      enum: TRANSFER_TYPES,
      required: true,
      default: "institutional-transfer"
    },

    status: {
      type: String,
      enum: TRANSFER_STATUSES,
      required: true,
      default: "pending",
      index: true
    },

    /*
     * Student identity as supplied by the previous institution.
     * These values are retained as transfer history even after the
     * student gets a new registration number here.
     */
    studentName: {
      type: String,
      required: true,
      trim: true
    },

    previousInstitution: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    previousInstitutionCode: {
      type: String,
      trim: true
    },

    previousRegistrationNumber: {
      type: String,
      trim: true
    },

    previousProgramme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Programme"
    },

    previousProgrammeName: {
      type: String,
      trim: true
    },

    previousYearOfStudy: {
      type: Number,
      min: 1
    },

    /*
     * Programme being entered at THIS institution.
     * This is independent of Student.programme so the transfer
     * application can exist before registration.
     */
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
      min: 1
    },

    creditsTransferred: {
      type: Number,
      min: 0,
      default: 0
    },

    creditsAccepted: {
      type: Number,
      min: 0,
      default: 0
    },

    reason: { type: String, trim: true },

    applicationDate: {
      type: Date,
      default: Date.now
    },

    transferDate: { type: Date },

    registrationNumber: {
      type: String,
      trim: true,
      index: true
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff"
    },

    approvalDate: { type: Date },

    approvalRemarks: { type: String, trim: true },
    rejectionReason: { type: String, trim: true },
    cancellationReason: { type: String, trim: true },

    documents: {
      type: [documentSchema],
      default: []
    },

    remarks: { type: String, trim: true }
  },
  { timestamps: true }
);

institutionalTransferSchema.index({
  student: 1,
  status: 1
});

institutionalTransferSchema.index({
  previousInstitution: 1,
  previousRegistrationNumber: 1
});

institutionalTransferSchema.index({
  programme: 1,
  academicSession: 1
});

institutionalTransferSchema.methods.markCompleted = function (
  studentId,
  registrationNumber
) {
  this.student = studentId;
  this.registrationNumber = registrationNumber;
  this.status = "completed";
  this.transferDate = this.transferDate || new Date();

  return this.save();
};

institutionalTransferSchema.set("toJSON", { virtuals: true });
institutionalTransferSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model(
  "InstitutionalTransfer",
  institutionalTransferSchema
);

module.exports.TRANSFER_STATUSES = TRANSFER_STATUSES;
module.exports.TRANSFER_TYPES = TRANSFER_TYPES;
module.exports.SEMESTERS = SEMESTERS;
