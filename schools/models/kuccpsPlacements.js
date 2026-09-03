const mongoose = require("mongoose");

const PLACEMENT_STATUSES = [
  "placed",
  "contacted",
  "admitted",
  "registered",
  "declined",
  "deferred",
  "cancelled"
];

const GENDERS = ["male", "female", "other"];

const SEMESTERS = [
  "September-December",
  "January-April",
  "May-August"
];

const academicYearPattern = /^\d{4}\/\d{2}$/;

const kuccpsPlacementSchema = new mongoose.Schema(
  {
    kuccpsIndexNumber: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    kuccpsPlacementNumber: {
      type: String,
      trim: true,
      index: true
    },

    kuccpsApplicationNumber: {
      type: String,
      trim: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    nationalID: { type: String, trim: true },
    gender: { type: String, enum: GENDERS },
    dateOfBirth: { type: Date },
    telephone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },

    kcseIndexNumber: { type: String, trim: true },
    kcseYear: { type: Number, min: 1900 },
    kcseGrade: { type: String, trim: true },

    /*
     * The placement owns its own programme reference.
     * It does NOT depend on Student.programme because a placement
     * exists before registration and may later differ from the
     * student's registered programme after an approved change.
     */
    programme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Programme",
      required: true,
      index: true
    },

    university: { type: String, trim: true },
    campus: { type: String, trim: true },

    academicYear: {
      type: String,
      required: true,
      trim: true,
      match: [
        academicYearPattern,
        "Academic year must use the format YYYY/YY, e.g. 2025/26."
      ],
      index: true
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

    status: {
      type: String,
      enum: PLACEMENT_STATUSES,
      required: true,
      default: "placed",
      index: true
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
      index: true
    },

    registrationNumber: {
      type: String,
      trim: true,
      index: true
    },

    registeredAt: { type: Date },
    placementDate: { type: Date },
    reportingDate: { type: Date },
    intake: { type: String, trim: true },
    remarks: { type: String, trim: true }
  },
  { timestamps: true }
);

kuccpsPlacementSchema.index(
  {
    kuccpsIndexNumber: 1,
    academicYear: 1
  },
  { unique: true }
);

kuccpsPlacementSchema.virtual("isRegistered").get(function () {
  return (
    this.status === "registered" &&
    this.student !== null
  );
});

kuccpsPlacementSchema.virtual("isPendingRegistration").get(function () {
  return (
    this.status !== "registered" &&
    this.status !== "cancelled"
  );
});

kuccpsPlacementSchema.methods.markRegistered = function (
  studentId,
  registrationNumber
) {
  this.student = studentId;
  this.registrationNumber = registrationNumber;
  this.status = "registered";
  this.registeredAt = new Date();

  return this.save();
};

kuccpsPlacementSchema.set("toJSON", { virtuals: true });
kuccpsPlacementSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model(
  "KuccpsPlacement",
  kuccpsPlacementSchema
);

module.exports.PLACEMENT_STATUSES = PLACEMENT_STATUSES;
module.exports.GENDERS = GENDERS;
module.exports.SEMESTERS = SEMESTERS;
