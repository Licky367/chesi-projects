const mongoose = require("mongoose");


/* =========================================================
   DAIRY SCHEMA
========================================================= */

const dairySchema = new mongoose.Schema(

  {

    /* =====================================================
       PROFILE IMAGE
    ===================================================== */

    profileImage: {

      type: String,

      trim: true,

      default: ""

    },


    /* =====================================================
       UNIQUE CODE

       Positive:
           Real dairy animal

       Negative:
           Dairy structure / facility
    ===================================================== */

    code: {

      type: Number,

      required: true,

      unique: true,

      validate: {

        validator: Number.isInteger,

        message: "Code must be a whole number."

      }

    },


    /* =====================================================
       NAME
    ===================================================== */

    name: {

      type: String,

      required: true,

      trim: true

    },


    /* =====================================================
       DATE OF BIRTH

       Only positive-code Dairy records are animals.
    ===================================================== */

    dateOfBirth: {

      type: Date,

      required: function () {

        return this.code >= 0;

      },

      default: null

    },


    /* =====================================================
       MASS
       
       Applies to Dairy records.
    ===================================================== */

    mass: {

      type: Number,

      required: true,

      min: 0,

      default: 0

    },


    /* =====================================================
       ASSET CODE

       ONLY positive-code Dairy records may have an
       assetCode.

       Example:

           cow.code = 25
           cow.assetCode = -10

       means cow 25 belongs to structure -10.

       Negative-code structures must always have null.
    ===================================================== */

    assetCode: {

      type: Number,

      default: null

    },


    /* =====================================================
       NET WORTH / ASSET INFORMATION

       These fields are stored in Dairy as the source
       of truth for Dairy-generated NetWorth assets.
    ===================================================== */

    buyingPrice: {

      type: Number,

      default: 0,

      min: 0

    },


    currentWorth: {

      type: Number,

      default: 0,

      min: 0

    },


    description: {

      type: String,

      trim: true,

      default: ""

    },


    condition: {

      type: String,

      trim: true,

      default: ""

    },


    location: {

      type: String,

      trim: true,

      default: ""

    },


    valuationDate: {

      type: Date,

      default: null

    },


    status: {

      type: String,

      enum: [

        "active",

        "sold",

        "disposed",

        "inactive"

      ],

      default: "active"

    },


    /* =====================================================
       MILKING STATUS
    ===================================================== */

    isMilking: {

      type: Boolean,

      default: false,

      validate: {

        validator: function (value) {

          if (value && this.code < 0) {

            return false;

          }

          if (

            value &&

            this.code >= 0 &&

            this.code % 2 !== 0

          ) {

            return false;

          }

          return true;

        },

        message:
          "Only female animals can be marked as milking."

      }

    },


    /* =====================================================
       MAINTENANCE
    ===================================================== */

    needsMaintenance: {

      type: Boolean,

      default: false

    },


    maintenance: {

      type: {

        type: String,

        default: ""

      },

      description: {

        type: String,

        default: ""

      },

      charges: {

        type: Number,

        default: 0

      },

      completionDescription: {

        type: String,

        default: ""

      },

      markedBy: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        default: null

      },

      markedAt: {

        type: Date,

        default: null

      },

      clearedBy: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        default: null

      },

      clearedAt: {

        type: Date,

        default: null

      }

    },


    /* =====================================================
       MEDICAL ATTENTION
    ===================================================== */

    medicalAttention: {

      isMarked: {

        type: Boolean,

        default: false

      },

      type: {

        type: String,

        trim: true,

        default: ""

      },

      details: {

        type: String,

        trim: true,

        default: ""

      },

      charges: {

        type: Number,

        default: 0

      },

      description: {

        type: String,

        default: ""

      },

      markedBy: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        default: null

      },

      markedAt: {

        type: Date,

        default: null

      },

      clearedBy: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        default: null

      },

      clearedAt: {

        type: Date,

        default: null

      },

      updatedAt: {

        type: Date,

        default: null

      }

    }

  },

  {

    timestamps: true,

    minimize: false,

    toJSON: {

      virtuals: true

    },

    toObject: {

      virtuals: true

    }

  }

);


/* =========================================================
   VIRTUAL
   GENDER
========================================================= */

dairySchema.virtual("gender").get(function () {

  if (this.code < 0) {

    return null;

  }

  return this.code % 2 === 0

    ? "Female"

    : "Male";

});


/* =========================================================
   VIRTUAL
   FEMALE CHECK
========================================================= */

dairySchema.virtual("isFemale").get(function () {

  return (

    this.code >= 0 &&

    this.code % 2 === 0

  );

});


/* =========================================================
   VIRTUAL
   REAL ANIMAL CHECK
========================================================= */

dairySchema.virtual("hasIdentity").get(function () {

  return this.code >= 0;

});


/* =========================================================
   VIRTUAL
   AGE
========================================================= */

dairySchema.virtual("ageText").get(function () {

  if (!this.dateOfBirth) {

    return "";

  }

  const now = new Date();

  const dob =
    new Date(this.dateOfBirth);

  let years =
    now.getFullYear() -
    dob.getFullYear();

  let months =
    now.getMonth() -
    dob.getMonth();

  let days =
    now.getDate() -
    dob.getDate();


  if (days < 0) {

    months--;

    const previousMonth =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        0
      );

    days +=
      previousMonth.getDate();

  }


  if (months < 0) {

    years--;

    months += 12;

  }


  return `${years} years, ${months} months, ${days} days`;

});


/* =========================================================
   VIRTUAL
   MILKING TEXT
========================================================= */

dairySchema.virtual("isMilkingText").get(function () {

  return this.isMilking

    ? "Yes"

    : "No";

});


/* =========================================================
   VIRTUAL
   PROFILE IMAGE
========================================================= */

dairySchema.virtual("displayImage").get(function () {

  if (this.profileImage) {

    return `/uploads/${this.profileImage}`;

  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(

    this.name

  )}`;

});


/* =========================================================
   VIRTUAL
   MAINTENANCE SHORTCUT
========================================================= */

dairySchema.virtual("requiresMaintenance").get(function () {

  return !!this.needsMaintenance;

});


/* =========================================================
   VIRTUAL
   MEDICAL SHORTCUT
========================================================= */

dairySchema.virtual("needsMedicalAttention").get(function () {

  return !!(

    this.medicalAttention &&

    this.medicalAttention.isMarked

  );

});


/* =========================================================
   PRE VALIDATE
========================================================= */

dairySchema.pre(

  "validate",

  function (next) {

    /* ---------------------------------------------
       ONLY FEMALES CAN BE MILKING
    --------------------------------------------- */

    if (!this.isFemale) {

      this.isMilking = false;

    }


    /* ---------------------------------------------
       NON-ANIMALS DON'T HAVE DOB
    --------------------------------------------- */

    if (this.code < 0) {

      this.dateOfBirth = null;

    }


    /* ---------------------------------------------
       ONLY POSITIVE-CODE DAIRY RECORDS CAN HAVE
       AN ASSET CODE
    --------------------------------------------- */

    if (this.code < 0) {

      this.assetCode = null;

    }


    /* ---------------------------------------------
       ALWAYS HAVE MEDICAL OBJECT
    --------------------------------------------- */

    if (!this.medicalAttention) {

      this.medicalAttention = {};

    }


    this.medicalAttention.isMarked =
      !!this.medicalAttention.isMarked;

    this.medicalAttention.type =
      this.medicalAttention.type || "";

    this.medicalAttention.details =
      this.medicalAttention.details || "";

    this.medicalAttention.charges =
      Number(this.medicalAttention.charges) || 0;

    this.medicalAttention.description =
      this.medicalAttention.description || "";

    this.medicalAttention.markedBy =
      this.medicalAttention.markedBy || null;

    this.medicalAttention.markedAt =
      this.medicalAttention.markedAt || null;

    this.medicalAttention.clearedBy =
      this.medicalAttention.clearedBy || null;

    this.medicalAttention.clearedAt =
      this.medicalAttention.clearedAt || null;

    this.medicalAttention.updatedAt =
      this.medicalAttention.updatedAt || null;


    /* ---------------------------------------------
       CLEAR STALE MEDICAL DATA
    --------------------------------------------- */

    if (!this.medicalAttention.isMarked) {

      this.medicalAttention.type = "";

      this.medicalAttention.details = "";

      this.medicalAttention.charges = 0;

      this.medicalAttention.description = "";

      this.medicalAttention.markedBy = null;

      this.medicalAttention.markedAt = null;

      this.medicalAttention.clearedBy = null;

      this.medicalAttention.clearedAt = null;

    }


    next();

  }

);


/* =========================================================
   PRE SAVE
========================================================= */

dairySchema.pre(

  "save",

  function (next) {

    if (

      this.isModified("medicalAttention")

    ) {

      this.medicalAttention.updatedAt =
        new Date();

    }

    next();

  }

);


/* =========================================================
   INDEXES
========================================================= */

dairySchema.index({

  isMilking: 1

});


dairySchema.index({

  needsMaintenance: 1

});


dairySchema.index({

  "medicalAttention.isMarked": 1

});


/* =========================================================
   EXPORT
========================================================= */

module.exports = mongoose.model(

  "Dairy",

  dairySchema

);