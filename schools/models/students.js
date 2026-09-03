// ==========================================================
// schools/models/students.js
// STUDENT MODEL
// ==========================================================

const mongoose = require("mongoose");


// ==========================================================
// ENUMS
// ==========================================================

const STUDENT_STATUSES = [
  "on-session",
  "off-session",
  "differed",
  "suspended",
  "expelled"
];

const GENDERS = [
  "male",
  "female",
  "other"
];


// ==========================================================
// EMERGENCY CONTACT
// ==========================================================

const emergencyContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },

    relationship: {
      type: String,
      trim: true
    },

    telephone: {
      type: String,
      trim: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    remarks: {
      type: String,
      trim: true
    }
  },
  {
    _id: false
  }
);


// ==========================================================
// STUDENT SCHEMA
// ==========================================================

const studentSchema = new mongoose.Schema(
  {

    // ======================================================
    // STUDENT IDENTITY
    // ======================================================

    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },


    // ======================================================
    // PROGRAMME
    // ======================================================

    programme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Programme",
      required: true,
      index: true
    },


    // ======================================================
    // ADMISSION / REGISTRATION STATE
    // ======================================================

    /*
     * True when the student has been formally admitted
     * into the institution.
     *
     * This is separate from registration.
     */
    isAdmitted: {
      type: Boolean,
      default: false,
      index: true
    },

    /*
     * True when the student has completed registration.
     *
     * A student may therefore be:
     *
     * isAdmitted: true
     * isRegistered: false
     *
     * while they are admitted but have not yet completed
     * registration.
     */
    isRegistered: {
      type: Boolean,
      default: false,
      index: true
    },


    // ======================================================
    // CURRENT STUDENT STATUS
    // ======================================================

    status: {
      type: String,
      enum: STUDENT_STATUSES,
      required: true,
      default: "on-session",
      index: true
    },


    // ======================================================
    // ACADEMIC INFORMATION
    // ======================================================

    yearOfStudy: {
      type: Number,
      min: 1
    },


    // ======================================================
    // NATIONAL / PERSONAL INFORMATION
    // ======================================================

    nationalID: {
      type: String,
      trim: true,
      index: true
    },

    dateOfBirth: {
      type: Date
    },

    gender: {
      type: String,
      enum: GENDERS
    },

    maritalStatus: {
      type: String,
      trim: true
    },

    religion: {
      type: String,
      trim: true
    },


    // ======================================================
    // DISABILITY
    // ======================================================

    disability: {
      type: Boolean,
      default: false
    },

    disabilityDescription: {
      type: String,
      trim: true
    },


    // ======================================================
    // CO-CURRICULAR ACTIVITIES
    // ======================================================

    coCurricular: {
      type: [String],
      default: []
    },


    // ======================================================
    // KCSE INFORMATION
    // ======================================================

    kcseIndexNumber: {
      type: String,
      trim: true
    },

    kcseYear: {
      type: Number,
      min: 1900
    },

    kcseGrade: {
      type: String,
      trim: true
    },


    // ======================================================
    // CONTACT INFORMATION
    // ======================================================

    telephone: {
      type: [String],
      default: [],

      validate: {
        validator: function (value) {
          return value.length <= 3;
        },

        message:
          "A student can have a maximum of three telephone numbers."
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


    // ======================================================
    // EMERGENCY CONTACT
    // ======================================================

    emergencyContact: {
      type: emergencyContactSchema
    },


    // ======================================================
    // PROFILE IMAGE
    // ======================================================

    profileImage: {
      type: String,
      trim: true
    }

  },
  {
    timestamps: true
  }
);


// ==========================================================
// INDEXES
// ==========================================================

studentSchema.index({
  programme: 1,
  status: 1
});

studentSchema.index({
  isAdmitted: 1,
  isRegistered: 1
});


// ==========================================================
// EXPORT
// ==========================================================

module.exports = mongoose.model(
  "Student",
  studentSchema
);


// ==========================================================
// EXPORT ENUMS
// ==========================================================

module.exports.STUDENT_STATUSES =
  STUDENT_STATUSES;

module.exports.GENDERS =
  GENDERS;