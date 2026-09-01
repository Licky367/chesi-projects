const mongoose = require("mongoose");

const unitResultSchema = new mongoose.Schema(
  {
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true
    },

    score: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },

    grade: {
      type: String,
      trim: true,
      default: null
    }
  },
  { _id: false }
);

const academicSessionUnitsSchema = new mongoose.Schema(
  {
    academicYear: {
      type: String,
      required: true,
      trim: true
    },

    semester: {
      type: String,
      required: true,
      enum: [
        "September-December",
        "January-April",
        "May-August"
      ]
    },

    academicSession: {
      type: String,
      required: true,
      trim: true
    },

    unitsRegistered: {
      type: [unitResultSchema],
      default: []
    }
  },
  { _id: false }
);

const studentAcademicsSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      unique: true,
      index: true
    },

    /*
     * Historical/current academic record.
     *
     * Every entry represents one academic session and contains
     * the units registered during that session together with scores.
     */
    unitsRegistered: {
      type: [academicSessionUnitsSchema],
      default: []
    },

    /*
     * Units registered in the CURRENT academic session only.
     * These are kept separately for fast access by dashboards,
     * registration pages and current-semester academic workflows.
     */
    currentUnitsRegistered: {
      type: [unitResultSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

/*
 * Prevent the same unit from being registered twice in one
 * historical academic session.
 */
studentAcademicsSchema.pre("validate", function (next) {
  for (const session of this.unitsRegistered) {
    const seen = new Set();

    for (const result of session.unitsRegistered) {
      const key = String(result.unit);

      if (seen.has(key)) {
        return next(
          new Error(
            `Unit ${key} is registered more than once in ` +
            `${session.academicSession}.`
          )
        );
      }

      seen.add(key);
    }
  }

  const currentSeen = new Set();

  for (const result of this.currentUnitsRegistered) {
    const key = String(result.unit);

    if (currentSeen.has(key)) {
      return next(
        new Error(
          `Unit ${key} is registered more than once in ` +
          "the current academic session."
        )
      );
    }

    currentSeen.add(key);
  }

  next();
});

studentAcademicsSchema.methods.getUnitsForSession =
function (academicSession) {
  const session = this.unitsRegistered.find(
    item => item.academicSession === academicSession
  );

  return session ? session.unitsRegistered : [];
};

module.exports = mongoose.model(
  "StudentAcademics",
  studentAcademicsSchema
);
