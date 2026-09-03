const mongoose = require("mongoose");

const STUDENT_STATUSES = [
  "on-session",
  "off-session",
  "differed",
  "suspended",
  "expelled"
];

const ADMISSION_SOURCES = [
  "kuccps",
  "institutional-transfer",
  "interschool-transfer",
  "intraschool-transfer"
];

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    relationship: { type: String, trim: true },
    telephone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    remarks: { type: String, trim: true }
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    programme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Programme",
      required: true,
      index: true
    },

    /*
     * The student's CURRENT admission source.
     *
     * Initial admissions:
     *   kuccps
     *   institutional-transfer
     *
     * A later programme change changes this to:
     *   interschool-transfer
     *   intraschool-transfer
     *
     * The transfer documents keep the complete historical trail.
     */
    admissionSource: {
      type: String,
      enum: ADMISSION_SOURCES,
      required: true,
      default: "kuccps",
      index: true
    },

    /*
     * These flags describe whether the student has ever undergone
     * either kind of programme transfer.
     *
     * They are intentionally independent. A student may have more
     * than one transfer in his/her academic lifetime.
     */
    hasInterschoolTransfer: {
      type: Boolean,
      default: false,
      index: true
    },

    hasIntraschoolTransfer: {
      type: Boolean,
      default: false,
      index: true
    },

    status: {
      type: String,
      enum: STUDENT_STATUSES,
      required: true,
      default: "on-session",
      index: true
    },

    yearOfStudy: {
      type: Number,
      min: 1
    },

    nationalID: {
      type: String,
      trim: true
    },

    dateOfBirth: Date,

    gender: {
      type: String,
      trim: true
    },

    maritalStatus: {
      type: String,
      trim: true
    },

    religion: {
      type: String,
      trim: true
    },

    disability: {
      type: Boolean,
      default: false
    },

    disabilityDescription: {
      type: String,
      trim: true
    },

    coCurricular: {
      type: [String],
      default: []
    },

    kcseIndexNumber: {
      type: String,
      trim: true
    },

    kcseYear: Number,

    telephone: {
      type: [String],
      default: [],
      validate: {
        validator: value => value.length <= 3,
        message: "A student can have a maximum of three telephone numbers."
      }
    },

    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    county: {
      type: String,
      trim: true
    },

    domicile: {
      type: String,
      trim: true
    },

    emergencyContact: {
      type: emergencyContactSchema
    },

    profileImage: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

studentSchema.index({ programme: 1, status: 1 });
studentSchema.index({ admissionSource: 1, status: 1 });

module.exports = mongoose.model("Student", studentSchema);

module.exports.STUDENT_STATUSES = STUDENT_STATUSES;
module.exports.ADMISSION_SOURCES = ADMISSION_SOURCES;
