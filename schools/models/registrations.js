const mongoose = require("mongoose");

const SEMESTERS = [
  "September-December",
  "January-April",
  "May-August"
];

const academicYearPattern = /^\d{4}\/\d{2}$/;

const registrationsSchema = new mongoose.Schema(
  {
    currentAcademicYear: {
      type: String,
      required: true,
      trim: true,
      match: [
        academicYearPattern,
        "Academic year must use the format YYYY/YY, e.g. 2025/26."
      ]
    },

    currentSemester: {
      type: String,
      required: true,
      enum: SEMESTERS
    }
  },
  {
    timestamps: true
  }
);

/*
 * This is the single current academic-session configuration.
 * Keep one document in this collection.
 */
registrationsSchema.index(
  { currentAcademicYear: 1, currentSemester: 1 },
  { unique: true }
);

registrationsSchema.virtual("currentAcademicSession").get(function () {
  return `${this.currentAcademicYear}, ${this.currentSemester}`;
});

registrationsSchema.methods.getCurrentAcademicSession = function () {
  return `${this.currentAcademicYear}, ${this.currentSemester}`;
};

registrationsSchema.set("toJSON", { virtuals: true });
registrationsSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Registration", registrationsSchema);
module.exports.SEMESTERS = SEMESTERS;
