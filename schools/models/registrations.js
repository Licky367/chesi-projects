const mongoose = require("mongoose");

const SEMESTERS = [
  "September-December",
  "January-April",
  "May-August"
];

const academicYearPattern = /^\d{4}\/\d{2}$/;

const registrationSchema = new mongoose.Schema(
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
    },

    /*
     * Singleton key: this collection represents the institution's
     * current academic registration configuration, not a history table.
     */
    configKey: {
      type: String,
      default: "CURRENT",
      unique: true,
      immutable: true
    }
  },
  { timestamps: true }
);

registrationSchema.virtual("currentAcademicSession").get(function () {
  return `${this.currentAcademicYear}, ${this.currentSemester}`;
});

registrationSchema.methods.getCurrentAcademicSession = function () {
  return `${this.currentAcademicYear}, ${this.currentSemester}`;
};

registrationSchema.set("toJSON", { virtuals: true });
registrationSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Registration", registrationSchema);
module.exports.SEMESTERS = SEMESTERS;
