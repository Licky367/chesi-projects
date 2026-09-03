const mongoose = require("mongoose");

const STUDENT_STATUSES = [
  "on-session",
  "off-session",
  "differed",
  "suspended",
  "expelled"
];

const GENDERS = ["male", "female", "other"];

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
      trim: true
    },

    name: { type: String, required: true, trim: true },

    programme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Programme",
      required: true,
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

    nationalID: { type: String, trim: true, index: true },
    dateOfBirth: { type: Date },

    gender: {
      type: String,
      enum: GENDERS
    },

    maritalStatus: { type: String, trim: true },
    religion: { type: String, trim: true },

    disability: { type: Boolean, default: false },
    disabilityDescription: { type: String, trim: true },

    coCurricular: { type: [String], default: [] },

    kcseIndexNumber: { type: String, trim: true },
    kcseYear: { type: Number, min: 1900 },
    kcseGrade: { type: String, trim: true },

    telephone: {
      type: [String],
      default: [],
      validate: {
        validator: value => value.length <= 3,
        message: "A student can have a maximum of three telephone numbers."
      }
    },

    email: { type: String, trim: true, lowercase: true },
    county: { type: String, trim: true },
    domicile: { type: String, trim: true },

    emergencyContact: {
      type: emergencyContactSchema
    },

    profileImage: { type: String, trim: true }
  },
  { timestamps: true }
);

studentSchema.index({ programme: 1, status: 1 });

module.exports = mongoose.model("Student", studentSchema);
module.exports.STUDENT_STATUSES = STUDENT_STATUSES;
module.exports.GENDERS = GENDERS;
