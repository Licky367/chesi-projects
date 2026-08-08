const mongoose = require("mongoose");

/* =========================================================
DAIRY ANIMAL / STRUCTURE SCHEMA
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
           Real Dairy animal

       Negative:
           Dairy structure / facility
    ===================================================== */

    code: {

        type: Number,

        required: true,

        unique: true,

        validate: {

            validator: Number.isInteger,

            message:
                "Code must be a whole number."

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
       ASSET CODE

       Only positive-code Dairy records use this.

       It identifies the negative-code Dairy structure
       to which the asset belongs.

       Example:

           Cow:
               code = 25
               assetCode = -10

           Structure:
               code = -10
    ===================================================== */

    assetCode: {

        type: Number,

        default: null,

        validate: {

            validator: function (value) {

                if (
                    value === null ||
                    value === undefined
                ) {

                    return true;

                }

                if (!Number.isInteger(value)) {

                    return false;

                }

                /*
                 * Structures themselves cannot have
                 * an assetCode.
                 */

                if (this.code < 0) {

                    return false;

                }

                /*
                 * A positive Dairy record may point
                 * to a negative structure code.
                 */

                return value < 0;

            },

            message:
                "Asset code must be a negative structure code."

        },

        index: true

    },


    /* =====================================================
       DATE OF BIRTH
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
    ===================================================== */

    mass: {

        type: Number,

        required: true,

        min: 0,

        default: 0

    },


    /* =====================================================
       MILKING STATUS
    ===================================================== */

    isMilking: {

        type: Boolean,

        default: false,

        validate: {

            validator: function (value) {

                if (
                    value &&
                    this.code < 0
                ) {

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
VIRTUALS
========================================================= */

/* =========================================================
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
FEMALE CHECK
========================================================= */

dairySchema.virtual("isFemale").get(function () {

return (

    this.code >= 0 &&

    this.code % 2 === 0

);

});

/* =========================================================
REAL ANIMAL CHECK
========================================================= */

dairySchema.virtual("hasIdentity").get(function () {

return this.code >= 0;

});

/* =========================================================
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
MILKING TEXT
========================================================= */

dairySchema.virtual("isMilkingText").get(function () {

return this.isMilking
    ? "Yes"
    : "No";

});

/* =========================================================
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
MAINTENANCE SHORTCUT
========================================================= */

dairySchema.virtual("requiresMaintenance").get(function () {

return !!this.needsMaintenance;

});

/* =========================================================
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

        /*
         * Structures cannot belong to another
         * structure.
         */

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

    this.medicalAttention.updatedAt =
        this.medicalAttention.updatedAt || null;

    this.medicalAttention.clearedBy =
        this.medicalAttention.clearedBy || null;

    this.medicalAttention.clearedAt =
        this.medicalAttention.clearedAt || null;


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