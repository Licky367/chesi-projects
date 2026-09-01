// ==========================================================
// models/kuccpsPlacements.js
// KUCCPS PLACED STUDENTS
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Stores students who have been placed at the university by
// KUCCPS before they complete university registration.
//
// A KUCCPS placement may therefore exist WITHOUT a Student
// document.
//
// Once the student completes registration, the placement can
// be linked to the resulting Student document.
//
// ==========================================================

const mongoose = require("mongoose");


// ==========================================================
// ENUMS
// ==========================================================

const PLACEMENT_STATUSES = [
  "placed",
  "contacted",
  "admitted",
  "registered",
  "declined",
  "deferred",
  "cancelled"
];

const GENDERS = [
  "male",
  "female",
  "other"
];


// ==========================================================
// KUCCPS PLACEMENT SCHEMA
// ==========================================================

const kuccpsPlacementSchema = new mongoose.Schema(
  {

    // ------------------------------------------------------
    // KUCCPS IDENTIFICATION
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // STUDENT PERSONAL INFORMATION
    // ------------------------------------------------------

    name: {
      type: String,
      required: true,
      trim: true
    },

    nationalID: {
      type: String,
      trim: true
    },

    gender: {
      type: String,
      enum: GENDERS
    },

    dateOfBirth: {
      type: Date
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


    // ------------------------------------------------------
    // KCSE INFORMATION
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // UNIVERSITY PLACEMENT
    // ------------------------------------------------------

    programme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Programme",
      required: true,
      index: true
    },

    university: {
      type: String,
      trim: true
    },

    campus: {
      type: String,
      trim: true
    },


    // ------------------------------------------------------
    // PLACEMENT ACADEMIC SESSION
    // ------------------------------------------------------

    academicYear: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^\d{4}\/\d{2}$/,
        "Academic year must use the format YYYY/YY, e.g. 2025/26."
      ],
      index: true
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
      trim: true,
      index: true
    },


    // ------------------------------------------------------
    // PLACEMENT STATUS
    // ------------------------------------------------------

    status: {
      type: String,
      enum: PLACEMENT_STATUSES,
      required: true,
      default: "placed",
      index: true
    },


    // ------------------------------------------------------
    // REGISTRATION LINK
    // ------------------------------------------------------
    //
    // This remains null until the placed student actually
    // becomes a registered Student.
    //

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
      index: true
    },


    // ------------------------------------------------------
    // REGISTRATION INFORMATION
    // ------------------------------------------------------

    registrationNumber: {
      type: String,
      trim: true,
      index: true
    },

    registeredAt: {
      type: Date
    },


    // ------------------------------------------------------
    // PLACEMENT INFORMATION
    // ------------------------------------------------------

    placementDate: {
      type: Date
    },

    reportingDate: {
      type: Date
    },

    intake: {
      type: String,
      trim: true
    },


    // ------------------------------------------------------
    // REMARKS
    // ------------------------------------------------------

    remarks: {
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
//
// A KUCCPS index number should identify one placement for a
// particular academic intake. The same student may legitimately
// appear in different academic years if a new placement occurs.
//
// ==========================================================

kuccpsPlacementSchema.index(
  {
    kuccpsIndexNumber: 1,
    academicYear: 1
  },
  {
    unique: true
  }
);


// ==========================================================
// VIRTUAL
// ==========================================================

kuccpsPlacementSchema.virtual("isRegistered").get(
  function () {
    return (
      this.status === "registered" &&
      this.student !== null
    );
  }
);


kuccpsPlacementSchema.virtual("isPendingRegistration").get(
  function () {
    return (
      this.status !== "registered" &&
      this.status !== "cancelled"
    );
  }
);


// ==========================================================
// METHODS
// ==========================================================

kuccpsPlacementSchema.methods.markRegistered =
  function (
    studentId,
    registrationNumber
  ) {

    this.student = studentId;

    this.registrationNumber =
      registrationNumber;

    this.status = "registered";

    this.registeredAt = new Date();

    return this.save();
  };


// ==========================================================
// EXPORT
// ==========================================================

module.exports = mongoose.model(
  "KuccpsPlacement",
  kuccpsPlacementSchema
);


module.exports.PLACEMENT_STATUSES =
  PLACEMENT_STATUSES;

module.exports.GENDERS =
  GENDERS;