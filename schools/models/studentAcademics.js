const mongoose = require("mongoose");

const SEMESTERS = [
  "September-December",
  "January-April",
  "May-August"
];

const academicYearPattern = /^\d{4}\/\d{2}$/;

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
      trim: true,
      match: [
        academicYearPattern,
        "Academic year must use the format YYYY/YY, e.g. 2025/26."
      ]
    },

    semester: {
      type: String,
      required: true,
      enum: SEMESTERS
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
     * Historical academic record.
     * Each item represents one academic session.
     */
    unitsRegistered: {
      type: [academicSessionUnitsSchema],
      default: []
    },

    /*
     * Current-session units are kept for fast current workflows.
     */
    currentAcademicYear: {
      type: String,
      trim: true,
      match: [
        academicYearPattern,
        "Academic year must use the format YYYY/YY, e.g. 2025/26."
      ]
    },

    currentSemester: {
      type: String,
      enum: SEMESTERS
    },

    currentUnitsRegistered: {
      type: [unitResultSchema],
      default: []
    }
  },
  { timestamps: true }
);

studentAcademicsSchema.pre("validate", function (next) {
  const sessions = new Set();

  for (const session of this.unitsRegistered) {
    if (sessions.has(session.academicSession)) {
      return next(
        new Error(
          `Academic session ${session.academicSession} is duplicated.`
        )
      );
    }

    sessions.add(session.academicSession);

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
          `Unit ${key} is registered more than once in the current academic session.`
        )
      );
    }

    currentSeen.add(key);
  }

  if (
    this.currentAcademicYear &&
    this.currentSemester &&
    this.currentUnitsRegistered.length
  ) {
    const currentSession =
      `${this.currentAcademicYear}, ${this.currentSemester}`;

    const historical = this.unitsRegistered.find(
      item => item.academicSession === currentSession
    );

    if (historical) {
      const historicalUnits = new Set(
        historical.unitsRegistered.map(item => String(item.unit))
      );

      for (const result of this.currentUnitsRegistered) {
        if (!historicalUnits.has(String(result.unit))) {
          return next(
            new Error(
              `Current unit ${result.unit} does not exist in the ` +
              `historical record for ${currentSession}.`
            )
          );
        }
      }
    }
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
module.exports.SEMESTERS = SEMESTERS;
