const mongoose = require("mongoose");

const SEMESTERS = [
  "September-December",
  "January-April",
  "May-August"
];

const assessmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    percentage: { type: Number, min: 0, max: 100 },
    description: { type: String, trim: true }
  },
  { _id: false }
);

const unitSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    semesterOffered: {
      type: String,
      required: true,
      enum: SEMESTERS
    },

    academicYearsOffered: {
      type: [String],
      default: []
    },

    objectives: { type: [String], default: [] },
    learningOutcomes: { type: [String], default: [] },
    topics: { type: [String], default: [] },
    prerequisites: { type: [String], default: [] },
    assessment: { type: [assessmentSchema], default: [] },
    textBooks: { type: [String], default: [] },
    references: { type: [String], default: [] },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SchoolDepartment",
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

unitSchema.index({ department: 1, semesterOffered: 1 });

module.exports = mongoose.model("Unit", unitSchema);
module.exports.SEMESTERS = SEMESTERS;
