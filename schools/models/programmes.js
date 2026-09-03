const mongoose = require("mongoose");

const programmeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    abbreviation: { type: String, trim: true },

    code: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    description: { type: String, trim: true },
    award: { type: String, trim: true },
    level: { type: String, trim: true },
    duration: { type: String, trim: true },

    studyModes: { type: [String], default: [] },
    admissionRequirements: { type: [String], default: [] },
    objectives: { type: [String], default: [] },
    careerOpportunities: { type: [String], default: [] },

    departments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SchoolDepartment"
      }
    ]
  },
  { timestamps: true }
);

programmeSchema.index({ name: 1 });
module.exports = mongoose.model("Programme", programmeSchema);
