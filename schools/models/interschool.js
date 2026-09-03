const mongoose = require("mongoose");

const TRANSFER_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "completed",
  "cancelled"
];

/*
 * INTERSCHOOL TRANSFER
 *
 * In this application this means:
 *   the student changes programme BUT remains in the SAME School.
 *
 * Example:
 *   School A / BSc Computer Science
 *        ->
 *   School A / BSc Mathematics
 *
 * The old and new School IDs are deliberately stored so that the
 * historical transfer remains understandable even if programme
 * structures change later.
 */
const interschoolSchema = new mongoose.Schema(
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

    school: {
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

interschoolSchema.index({
  student: 1,
  createdAt: -1
});

module.exports = mongoose.model("InterschoolTransfer", interschoolSchema);
module.exports.TRANSFER_STATUSES = TRANSFER_STATUSES;
