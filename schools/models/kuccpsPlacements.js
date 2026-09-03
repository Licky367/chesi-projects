// ==========================================================
// schools/models/kuccpsPlacements.js
// KUCCPS PLACEMENT MODEL
// ==========================================================
//
// REGISTRATION NUMBER
// ----------------------------------------------------------
//
// The registration number is generated as:
//
//     Programme.code / sequentialNumber / admissionYear
//
// Example:
//
//     BBA/001/2026
//     BBA/002/2026
//     ...
//     BBA/010/2026
//     BCS/011/2026
//     BCS/012/2026
//
// IMPORTANT
// ----------------------------------------------------------
//
// The sequential number is GLOBAL for the admission year.
//
// It is NOT reset for every programme.
//
// Therefore:
//
//     BBA/001/2026
//     BBA/002/2026
//     BCS/003/2026
//
// is valid.
//
// But this is NOT valid:
//
//     BBA/001/2026
//     BCS/001/2026
//
// for the same admission year.
//
// The programme code only forms the prefix.
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

const SEMESTERS = [
  "September-December",
  "January-April",
  "May-August"
];


// ==========================================================
// VALIDATION
// ==========================================================

const academicYearPattern = /^\d{4}\/\d{2}$/;


// ==========================================================
// REGISTRATION NUMBER COUNTER
// ==========================================================
//
// ONE counter is maintained per admission year.
//
// Example:
//
// admissionYear = 2026
//
// sequence:
//
// 1
// 2
// 3
// ...
//
// The programme is NOT part of the counter.
//
// This is what makes the number continuous across all
// programmes.
//
// ==========================================================

const kuccpsRegistrationCounterSchema =
  new mongoose.Schema(
    {

      admissionYear: {
        type: Number,
        required: true,
        unique: true,
        index: true
      },

      sequence: {
        type: Number,
        required: true,
        min: 0,
        default: 0
      }

    },
    {
      timestamps: true
    }
  );


// ==========================================================
// MAIN KUCCPS PLACEMENT SCHEMA
// ==========================================================

const kuccpsPlacementSchema =
  new mongoose.Schema(
    {

      // ====================================================
      // KUCCPS IDENTIFICATION
      // ====================================================

      kuccpsIndexNumber: {
        type: String,
        required: true,
        trim: true,
        index: true
      },

      /*
       * KUCCPS placement number.
       *
       * This is the number supplied by KUCCPS and is kept
       * separately from the institution's registration
       * sequence.
       */
      kuccpsPlacementNumber: {
        type: String,
        trim: true,
        index: true
      },

      kuccpsApplicationNumber: {
        type: String,
        trim: true
      },


      // ====================================================
      // STUDENT PERSONAL INFORMATION
      // ====================================================

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


      // ====================================================
      // KCSE INFORMATION
      // ====================================================

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


      // ====================================================
      // PROGRAMME
      // ====================================================
      //
      // This is the programme KUCCPS placed the student into.
      //
      // It is intentionally independent of Student.programme.
      //
      // ====================================================

      programme: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Programme",
        required: true,
        index: true
      },


      // ====================================================
      // INSTITUTION
      // ====================================================

      university: {
        type: String,
        trim: true
      },

      campus: {
        type: String,
        trim: true
      },


      // ====================================================
      // ADMISSION YEAR
      // ====================================================
      //
      // Example:
      //
      //     2026
      //
      // Used as the final component of the registration
      // number.
      //
      // ====================================================

      admissionYear: {
        type: Number,
        required: true,
        min: 1900,
        index: true
      },


      // ====================================================
      // ACADEMIC YEAR
      // ====================================================

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


      // ====================================================
      // SEMESTER
      // ====================================================

      semester: {
        type: String,
        required: true,
        enum: SEMESTERS
      },


      // ====================================================
      // ACADEMIC SESSION
      // ====================================================

      academicSession: {
        type: String,
        required: true,
        trim: true,
        index: true
      },


      // ====================================================
      // REGISTRATION NUMBER
      // ====================================================
      //
      // Generated automatically.
      //
      // Example:
      //
      //     BCS/011/2026
      //
      // ====================================================

      registrationNumber: {
        type: String,
        trim: true,
        unique: true,
        sparse: true,
        index: true
      },


      // ====================================================
      // GLOBAL REGISTRATION SEQUENCE
      // ====================================================
      //
      // Example:
      //
      //     registrationNumber: BCS/011/2026
      //
      //     registrationSequence: 11
      //
      // This number is global across ALL programmes for the
      // admission year.
      //
      // ====================================================

      registrationSequence: {
        type: Number,
        min: 1,
        index: true
      },


      // ====================================================
      // PLACEMENT STATUS
      // ====================================================

      status: {
        type: String,
        enum: PLACEMENT_STATUSES,
        required: true,
        default: "placed",
        index: true
      },


      // ====================================================
      // STUDENT REFERENCE
      // ====================================================
      //
      // Null while the KUCCPS placement has not yet been
      // converted into a Student record.
      //
      // ====================================================

      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        default: null,
        index: true
      },


      // ====================================================
      // IMPORTANT DATES
      // ====================================================

      placementDate: {
        type: Date
      },

      reportingDate: {
        type: Date
      },

      admittedAt: {
        type: Date
      },

      registeredAt: {
        type: Date
      },


      // ====================================================
      // INTAKE
      // ====================================================

      intake: {
        type: String,
        trim: true
      },


      // ====================================================
      // REMARKS
      // ====================================================

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
// KUCCPS PLACEMENT INDEX
// ==========================================================
//
// A KUCCPS student should not appear twice for the same
// academic year.
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
// ADMISSION-YEAR INDEX
// ==========================================================

kuccpsPlacementSchema.index({
  admissionYear: 1,
  registrationSequence: 1
});


// ==========================================================
// GENERATE REGISTRATION NUMBER
// ==========================================================
//
// The sequence is GLOBAL for the admission year.
//
// Example:
//
// First BBA:
//     BBA/001/2026
//
// Second BBA:
//     BBA/002/2026
//
// First BCS:
//     BCS/003/2026
//
// Therefore the programme does NOT reset the sequence.
//
// ==========================================================

kuccpsPlacementSchema.methods.generateRegistrationNumber =
  async function () {

    // ------------------------------------------------------
    // Do not generate another number if one already exists.
    // ------------------------------------------------------

    if (this.registrationNumber) {
      return this.registrationNumber;
    }


    // ------------------------------------------------------
    // Validate programme.
    // ------------------------------------------------------

    if (!this.programme) {
      throw new Error(
        "Programme is required before generating a registration number."
      );
    }


    // ------------------------------------------------------
    // Validate admission year.
    // ------------------------------------------------------

    if (!this.admissionYear) {
      throw new Error(
        "Admission year is required before generating a registration number."
      );
    }


    // ------------------------------------------------------
    // Load Programme.
    // ------------------------------------------------------

    const Programme =
      mongoose.model("Programme");

    const programme =
      await Programme
        .findById(this.programme)
        .select("code")
        .lean();


    if (!programme) {
      throw new Error(
        "The programme associated with this KUCCPS placement does not exist."
      );
    }


    // ------------------------------------------------------
    // Validate programme code.
    // ------------------------------------------------------

    if (
      !programme.code ||
      !String(programme.code).trim()
    ) {
      throw new Error(
        "Programme code is required before generating a registration number."
      );
    }


    // ------------------------------------------------------
    // Get the GLOBAL counter for this admission year.
    // ------------------------------------------------------
    //
    // IMPORTANT:
    //
    // Programme is intentionally NOT included here.
    //
    // Therefore BBA and BCS share the same sequence.
    //
    // ------------------------------------------------------

    const Counter =
      mongoose.model(
        "KuccpsRegistrationCounter"
      );


    const counter =
      await Counter.findOneAndUpdate(

        {
          admissionYear:
            this.admissionYear
        },

        {
          $inc: {
            sequence: 1
          }
        },

        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true
        }

      );


    // ------------------------------------------------------
    // Get sequence.
    // ------------------------------------------------------

    const sequence =
      counter.sequence;


    // ------------------------------------------------------
    // Format sequence.
    //
    // 1   -> 001
    // 9   -> 009
    // 10  -> 010
    // 99  -> 099
    // 100 -> 100
    //
    // ------------------------------------------------------

    const formattedSequence =
      String(sequence)
        .padStart(3, "0");


    // ------------------------------------------------------
    // Programme code.
    // ------------------------------------------------------

    const programmeCode =
      String(programme.code)
        .trim()
        .toUpperCase();


    // ------------------------------------------------------
    // Build registration number.
    // ------------------------------------------------------

    const registrationNumber =
      `${programmeCode}/${formattedSequence}/${this.admissionYear}`;


    // ------------------------------------------------------
    // Save generated values on placement.
    // ------------------------------------------------------

    this.registrationSequence =
      sequence;

    this.registrationNumber =
      registrationNumber;


    return registrationNumber;
  };


// ==========================================================
// MARK ADMITTED
// ==========================================================
//
// Admission and registration are separate events.
//
// A student can therefore be:
//
//     isAdmitted = true
//     isRegistered = false
//
// ==========================================================

kuccpsPlacementSchema.methods.markAdmitted =
  async function () {

    if (!this.registrationNumber) {
      await this.generateRegistrationNumber();
    }

    this.status =
      "admitted";

    this.admittedAt =
      new Date();

    await this.save();

    return this;
  };


// ==========================================================
// MARK REGISTERED
// ==========================================================

kuccpsPlacementSchema.methods.markRegistered =
  async function (studentId) {

    if (!studentId) {
      throw new Error(
        "Student ID is required when registering a KUCCPS placement."
      );
    }


    // ------------------------------------------------------
    // Generate registration number if necessary.
    // ------------------------------------------------------

    if (!this.registrationNumber) {
      await this.generateRegistrationNumber();
    }


    // ------------------------------------------------------
    // Attach Student.
    // ------------------------------------------------------

    this.student =
      studentId;


    // ------------------------------------------------------
    // Update status.
    // ------------------------------------------------------

    this.status =
      "registered";


    // ------------------------------------------------------
    // Registration date.
    // ------------------------------------------------------

    this.registeredAt =
      new Date();


    await this.save();

    return this;
  };


// ==========================================================
// VIRTUAL: IS REGISTERED
// ==========================================================

kuccpsPlacementSchema.virtual(
  "isRegistered"
).get(function () {

  return (
    this.status === "registered" &&
    this.student !== null
  );

});


// ==========================================================
// VIRTUAL: IS ADMITTED
// ==========================================================

kuccpsPlacementSchema.virtual(
  "isAdmitted"
).get(function () {

  return [
    "admitted",
    "registered"
  ].includes(this.status);

});


// ==========================================================
// VIRTUAL: IS PENDING REGISTRATION
// ==========================================================

kuccpsPlacementSchema.virtual(
  "isPendingRegistration"
).get(function () {

  return (
    this.status !== "registered" &&
    this.status !== "cancelled"
  );

});


// ==========================================================
// JSON / OBJECT VIRTUALS
// ==========================================================

kuccpsPlacementSchema.set(
  "toJSON",
  {
    virtuals: true
  }
);

kuccpsPlacementSchema.set(
  "toObject",
  {
    virtuals: true
  }
);


// ==========================================================
// MODELS
// ==========================================================

const KuccpsPlacement =
  mongoose.model(
    "KuccpsPlacement",
    kuccpsPlacementSchema
  );


// ==========================================================
// GLOBAL REGISTRATION COUNTER MODEL
// ==========================================================

const KuccpsRegistrationCounter =
  mongoose.model(
    "KuccpsRegistrationCounter",
    kuccpsRegistrationCounterSchema
  );


// ==========================================================
// EXPORT MAIN MODEL
// ==========================================================

module.exports =
  KuccpsPlacement;


// ==========================================================
// EXPORT ENUMS
// ==========================================================

module.exports.PLACEMENT_STATUSES =
  PLACEMENT_STATUSES;

module.exports.GENDERS =
  GENDERS;

module.exports.SEMESTERS =
  SEMESTERS;


// ==========================================================
// EXPORT COUNTER MODEL
// ==========================================================

module.exports.KuccpsRegistrationCounter =
  KuccpsRegistrationCounter;