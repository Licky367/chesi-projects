const mongoose = require("mongoose");

const TRANSFER_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "completed",
  "cancelled"
];

/*
 * INTRASCHOOL TRANSFER
 *
 * Per the application's business rule, this means:
 *   the student changes programme AND changes School.
 *
 * Example:
 *   School A / BSc Computer Science
 *        ->
 *   School B / BSc Economics
 *
 * Although terminology can vary between institutions, this model
 * follows the exact business meaning required by this application.
 */
const intraschoolSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true
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

    fromSchool: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true
    },

    toSchool: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
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

intraschoolSchema.index({
  student: 1,
  createdAt: -1
});

module.exports = mongoose.model("IntraschoolTransfer", intraschoolSchema);
module.exports.TRANSFER_STATUSES = TRANSFER_STATUSES;
