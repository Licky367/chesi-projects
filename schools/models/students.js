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

const ADMISSION_SOURCES = [
  "kuccps",
  "institutional-transfer",
  "interschool-transfer",
  "intraschool-transfer",
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

    /*
     * This may come from:
     *
     * 1. KUCCPS placement
     * 2. Institutional transfer
     * 3. Later manual entry
     *
     * It is therefore not required at the initial
     * Student creation stage.
     */

    registrationNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true
    },


    /*
     * Student name.
     *
     * If the admission source contains a name, that name
     * becomes the initial/default value.
     *
     * The student record can subsequently be edited.
     */

    name: {
      type: String,
      trim: true
    },


    // ======================================================
    // ADMISSION SOURCE
    // ======================================================

    /*
     * Identifies where the student's initial admission
     * information came from.
     */

    admissionSource: {
      type: String,
      enum: ADMISSION_SOURCES,
      index: true
    },


    /*
     * Reference to the original KUCCPS placement.
     *
     * This is only a reference to the source record.
     *
     * Student details are copied from the placement when
     * the Student record is created.
     *
     * Editing the Student later does NOT modify the
     * KUCCPS placement.
     */

    kuccpsPlacement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KuccpsPlacement",
      index: true
    },


    /*
     * Reference to the original institutional transfer.
     *
     * Again, this is only the source/reference.
     */

    institutionalTransfer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InstitutionalTransfer",
      index: true
    },


    // ======================================================
    // PROGRAMME
    // ======================================================

    /*
     * Programme can be obtained from:
     *
     * KUCCPS:
     *     placement.programme
     *
     * Institutional transfer:
     *     transfer.programme
     *
     * If neither source supplies a programme, it can be
     * entered later.
     */

    programme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Programme",
      index: true
    },


    // ======================================================
    // ADMISSION / REGISTRATION STATE
    // ======================================================

    /*
     * True when the student has been formally admitted.
     */

    isAdmitted: {
      type: Boolean,
      default: false,
      index: true
    },


    /*
     * True when the student has completed registration.
     *
     * These two fields are deliberately independent.
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

studentSchema.index({
  admissionSource: 1,
  isAdmitted: 1
});


// ==========================================================
// COPY ONLY DEFINED VALUES
// ==========================================================

/*
 * This helper is important.
 *
 * It copies only values that actually exist in the source.
 *
 * Therefore:
 *
 * KUCCPS has:
 *     name
 *     programme
 *     registrationNumber
 *
 * but does not have:
 *     nationalID
 *     religion
 *     emergencyContact
 *
 * The Student receives the first three and leaves the
 * others empty for later entry.
 */

function copyDefined(source, target, fields) {

  fields.forEach(function (field) {

    if (
      source[field] !== undefined &&
      source[field] !== null &&
      source[field] !== ""
    ) {

      target[field] = source[field];

    }

  });

}


// ==========================================================
// CREATE STUDENT FROM KUCCPS PLACEMENT
// ==========================================================

studentSchema.statics.fromKuccpsPlacement =
async function (placement) {

  if (!placement) {
    throw new Error(
      "KUCCPS placement is required."
    );
  }


  const Student = this;


  const studentData = {

    admissionSource: "kuccps",

    kuccpsPlacement: placement._id,

    isAdmitted: true,

    isRegistered: false

  };


  // --------------------------------------------------------
  // Copy fields available in KUCCPS placement
  // --------------------------------------------------------

  copyDefined(
    placement,
    studentData,
    [
      "registrationNumber",
      "name",
      "programme",
      "yearOfStudy",
      "nationalID",
      "dateOfBirth",
      "gender",
      "telephone",
      "email",
      "county",
      "domicile",
      "kcseIndexNumber",
      "kcseYear",
      "kcseGrade"
    ]
  );


  /*
   * If registrationNumber was generated by the KUCCPS
   * placement model, it is copied into the Student.
   */


  return Student.create(
    studentData
  );

};


// ==========================================================
// CREATE STUDENT FROM INSTITUTIONAL TRANSFER
// ==========================================================

studentSchema.statics.fromInstitutionalTransfer =
async function (transfer) {

  if (!transfer) {
    throw new Error(
      "Institutional transfer is required."
    );
  }


  const Student = this;


  const studentData = {

    admissionSource: "institutional-transfer",

    institutionalTransfer: transfer._id,

    /*
     * A completed/approved transfer represents admission
     * into the institution.
     */

    isAdmitted: true,

    isRegistered: false

  };


  // --------------------------------------------------------
  // Copy fields available in institutional transfer
  // --------------------------------------------------------

  copyDefined(
    transfer,
    studentData,
    [
      "registrationNumber",
      "studentName",
      "programme",
      "yearOfStudy",
      "academicYear",
      "semester",
      "academicSession"
    ]
  );


  /*
   * InstitutionalTransfer uses studentName rather than
   * name, so map it explicitly.
   */

  if (
    !studentData.name &&
    transfer.studentName
  ) {

    studentData.name =
      transfer.studentName;

  }


  return Student.create(
    studentData
  );

};


// ==========================================================
// BUILD STUDENT DATA FROM KUCCPS
// ==========================================================

studentSchema.statics.buildFromKuccpsPlacement =
function (placement) {

  if (!placement) {

    throw new Error(
      "KUCCPS placement is required."
    );

  }


  const studentData = {

    admissionSource: "kuccps",

    kuccpsPlacement: placement._id,

    isAdmitted: true,

    isRegistered: false

  };


  copyDefined(
    placement,
    studentData,
    [
      "registrationNumber",
      "name",
      "programme",
      "yearOfStudy",
      "nationalID",
      "dateOfBirth",
      "gender",
      "telephone",
      "email",
      "county",
      "domicile",
      "kcseIndexNumber",
      "kcseYear",
      "kcseGrade"
    ]
  );


  return studentData;

};


// ==========================================================
// BUILD STUDENT DATA FROM INSTITUTIONAL TRANSFER
// ==========================================================

studentSchema.statics.buildFromInstitutionalTransfer =
function (transfer) {

  if (!transfer) {

    throw new Error(
      "Institutional transfer is required."
    );

  }


  const studentData = {

    admissionSource: "institutional-transfer",

    institutionalTransfer: transfer._id,

    isAdmitted: true,

    isRegistered: false

  };


  /*
   * Institutional transfer uses studentName.
   */

  if (transfer.studentName) {

    studentData.name =
      transfer.studentName;

  }


  copyDefined(
    transfer,
    studentData,
    [
      "registrationNumber",
      "programme",
      "yearOfStudy"
    ]
  );


  return studentData;

};


// ==========================================================
// INSTANCE METHOD
// UPDATE STUDENT FROM SOURCE
// ==========================================================

/*
 * This method is intentionally NOT called automatically.
 *
 * It can be used when an administrator wants to re-import
 * missing/default information from the original admission
 * source.
 *
 * Existing Student information is not overwritten by default.
 */

studentSchema.methods.fillMissingFromSource =
function (source) {

  if (!source) {

    throw new Error(
      "Admission source is required."
    );

  }


  const fields = [
    "registrationNumber",
    "name",
    "programme",
    "yearOfStudy",
    "nationalID",
    "dateOfBirth",
    "gender",
    "telephone",
    "email",
    "county",
    "domicile",
    "kcseIndexNumber",
    "kcseYear",
    "kcseGrade"
  ];


  fields.forEach((field) => {

    const currentValue =
      this[field];

    const sourceValue =
      source[field];


    /*
     * Only fill a field if the Student currently
     * doesn't have a value.
     */

    if (
      (
        currentValue === undefined ||
        currentValue === null ||
        currentValue === "" ||
        (
          Array.isArray(currentValue) &&
          currentValue.length === 0
        )
      ) &&
      sourceValue !== undefined &&
      sourceValue !== null &&
      sourceValue !== ""
    ) {

      this[field] = sourceValue;

    }

  });


  /*
   * InstitutionalTransfer uses studentName.
   */

  if (
    !this.name &&
    source.studentName
  ) {

    this.name =
      source.studentName;

  }


  return this;

};


// ==========================================================
// EXPORT MODEL
// ==========================================================

const Student =
  mongoose.model(
    "Student",
    studentSchema
  );


// ==========================================================
// EXPORT ENUMS
// ==========================================================

Student.STUDENT_STATUSES =
  STUDENT_STATUSES;

Student.GENDERS =
  GENDERS;

Student.ADMISSION_SOURCES =
  ADMISSION_SOURCES;


module.exports = Student;