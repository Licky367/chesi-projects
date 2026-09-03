// ==========================================================
// models/interschool.js
// PROGRAMME CHANGE WITHIN THE SAME SCHOOL
// ==========================================================
//
// Business rule:
//
// SAME SCHOOL + DIFFERENT PROGRAMME
//     => interschool-transfer
//
// A NEW registration number IS generated.
// It uses the DESTINATION SCHOOL code, the destination
// school's sequence for the admission year, and the year.
//
// Generation itself is handled ONLY by:
//     services/studentAdmissionService.js
// ==========================================================

const mongoose = require("mongoose");

const TRANSFER_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "completed",
  "cancelled"
];

const interschoolSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true
    },

    previousRegistrationNumber: {
      type: String,
      required: true,
      trim: true
    },

    registrationNumber: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    registrationSequence: {
      type: Number,
      required: true,
      min: 1
    },

    fromProgramme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Programme",
      required: true
    },

    toProgramme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Programme",
      required: true
    },

    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true
    },

    admissionYear: {
      type: Number,
      required: true,
      min: 1900,
      index: true
    },

    academicYear: {
      type: String,
      trim: true,
      match: /^\d{4}\/\d{2}$/
    },

    academicSession: {
      type: String,
      trim: true,
      index: true
    },

    reason: {
      type: String,
      trim: true
    },

    requestedAt: {
      type: Date,
      default: Date.now
    },

    approvedAt: Date,
    completedAt: Date,

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff"
    },

    status: {
      type: String,
      enum: TRANSFER_STATUSES,
      default: "completed",
      index: true
    },

    remarks: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

interschoolSchema.index({
  student: 1,
  createdAt: -1
});

interschoolSchema.index({
  registrationNumber: 1,
  admissionYear: 1
});

module.exports = mongoose.model(
  "InterschoolTransfer",
  interschoolSchema
);

module.exports.TRANSFER_STATUSES =
  TRANSFER_STATUSES;
