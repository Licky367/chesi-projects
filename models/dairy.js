const mongoose = require("mongoose");


/* =========================================================
   DAIRY SCHEMA
   SINGLE SOURCE OF TRUTH

   This model contains:

   1. Dairy / animal information
   2. Dairy structure information
   3. Maintenance information
   4. Medical information
   5. Net Worth / asset information

   IMPORTANT:

   All systems should read and update this model.

   There is NO separate NetWorth model.
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
           UNIQUE DAIRY CODE

           Positive:
               Real animal

           Negative:
               Dairy structure / facility

           Zero:
               Reserved / non-identity record if required
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
           DATE OF BIRTH

           Only applicable to real animals.
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

           Mainly applicable to animals.

           Structures can keep the default value of 0.
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

                    /*
                     * Non-animals cannot be milking.
                     */

                    if (
                        value &&
                        this.code < 0
                    ) {

                        return false;

                    }


                    /*
                     * Odd positive codes are male.
                     * Only even positive codes are female.
                     */

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
           STRUCTURE ASSIGNMENT

           Used by positive-code animals.

           Example:

               Cow:
                   code = 25

               Structure:
                   code = -10

               cow.assetCode = -10
        ===================================================== */

        assetCode: {

            type: Number,

            default: null

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

                trim: true,

                default: ""

            },

            description: {

                type: String,

                trim: true,

                default: ""

            },

            charges: {

                type: Number,

                min: 0,

                default: 0

            },

            completionDescription: {

                type: String,

                trim: true,

                default: ""

            },

            markedBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "User",

                default: null

            },

            markedAt: {

                type: Date,

                default: null

            },

            clearedBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

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

                min: 0,

                default: 0

            },

            description: {

                type: String,

                trim: true,

                default: ""

            },

            markedBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "User",

                default: null

            },

            markedAt: {

                type: Date,

                default: null

            },

            clearedBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

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

        },


        /* =====================================================
           NET WORTH / ASSET INFORMATION

           These fields replace the former NetWorth model.

           Every Dairy record can therefore participate
           directly in the Net Worth system.
        ===================================================== */


        /* =====================================================
           ASSET TYPE

           Examples:

               cow
               dairy Facility
               Equipment
               Vehicle
               Water Tank
               etc.
        ===================================================== */

        assetType: {

            type: String,

            trim: true,

            default: ""

        },


        /* =====================================================
           BUYING PRICE

           Original acquisition / purchase price.
        ===================================================== */

        buyingPrice: {

            type: Number,

            min: 0,

            default: 0

        },


        /* =====================================================
           CURRENT WORTH

           Current estimated value.

           This is what contributes to Net Worth.
        ===================================================== */

        currentWorth: {

            type: Number,

            min: 0,

            default: 0

        },


        /* =====================================================
           ASSET DESCRIPTION
        ===================================================== */

        assetDescription: {

            type: String,

            trim: true,

            default: ""

        },


        /* =====================================================
           CONDITION
        ===================================================== */

        condition: {

            type: String,

            trim: true,

            default: ""

        },


        /* =====================================================
           LOCATION
        ===================================================== */

        location: {

            type: String,

            trim: true,

            default: ""

        },


        /* =====================================================
           ACQUISITION DATE

           Normally populated from createdAt when the
           record is first created.
        ===================================================== */

        acquisitionDate: {

            type: Date,

            default: null

        },


        /* =====================================================
           VALUATION DATE

           Last date the current worth was evaluated.
        ===================================================== */

        valuationDate: {

            type: Date,

            default: null

        },


        /* =====================================================
           ASSET STATUS

           active:
               Included in Net Worth.

           sold:
               Excluded.

           disposed:
               Excluded.

           inactive:
               Excluded.
        ===================================================== */

        assetStatus: {

            type: String,

            enum: [

                "active",

                "sold",

                "disposed",

                "inactive"

            ],

            default: "active",

            index: true

        },


        /* =====================================================
           ASSET SOURCE

           Since Dairy is now the only model, this identifies
           what kind of Dairy record the asset represents.

           dairy:
               Real animal.

           structure:
               Dairy facility / structure.

           The value is optional because existing Dairy
           records may not yet have been classified.
        ===================================================== */

        assetSource: {

            type: String,

            enum: [

                "dairy",

                "structure"

            ],

            default: "dairy",

            index: true

        },


        /* =====================================================
           PARENT STRUCTURE

           Replaces NetWorth.parentStructure.

           Stores the Dairy document _id of the structure.

           Example:

               Cow:
                   code = 25

               Structure:
                   code = -10

               cow.parentStructure = structure._id
        ===================================================== */

        parentStructure: {

            type:
                mongoose.Schema.Types.ObjectId,

            ref: "Dairy",

            default: null,

            index: true

        },


        /* =====================================================
           STRUCTURE CODE

           Stores the negative Dairy structure code.

           Example:

               structure.code = -10

               cow.structureCode = -10
        ===================================================== */

        structureCode: {

            type: Number,

            default: null,

            index: true

        }

    },


    /* =========================================================
       SCHEMA OPTIONS
    ========================================================= */

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


    const now =
        new Date();


    const dob =
        new Date(
            this.dateOfBirth
        );


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
   VIRTUAL
   NET WORTH ASSET VALUE
========================================================= */

dairySchema.virtual("assetValue").get(function () {

    return Number(
        this.currentWorth
    ) || 0;

});


/* =========================================================
   VIRTUAL
   NET WORTH ACTIVE CHECK
========================================================= */

dairySchema.virtual("isActiveAsset").get(function () {

    return this.assetStatus === "active";

});


/* =========================================================
   PRE VALIDATE
========================================================= */

dairySchema.pre(

    "validate",

    function (next) {

        /* -----------------------------------------------------
           ONLY FEMALES CAN BE MILKING
        ----------------------------------------------------- */

        if (!this.isFemale) {

            this.isMilking = false;

        }


        /* -----------------------------------------------------
           NON-ANIMALS DON'T HAVE DOB
        ----------------------------------------------------- */

        if (this.code < 0) {

            this.dateOfBirth = null;

            this.assetSource =
                "structure";

        }


        /* -----------------------------------------------------
           POSITIVE CODE = DAIRY ANIMAL
        ----------------------------------------------------- */

        if (this.code > 0) {

            this.assetSource =
                "dairy";

        }


        /* -----------------------------------------------------
           ENSURE MEDICAL OBJECT
        ----------------------------------------------------- */

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
            Number(
                this.medicalAttention.charges
            ) || 0;


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


        /* -----------------------------------------------------
           CLEAR STALE MEDICAL DATA
        ----------------------------------------------------- */

        if (
            !this.medicalAttention.isMarked
        ) {

            this.medicalAttention.type =
                "";

            this.medicalAttention.details =
                "";

            this.medicalAttention.charges =
                0;

            this.medicalAttention.description =
                "";

            this.medicalAttention.markedBy =
                null;

            this.medicalAttention.markedAt =
                null;

            this.medicalAttention.clearedBy =
                null;

            this.medicalAttention.clearedAt =
                null;

        }


        /* -----------------------------------------------------
           ASSET TYPE DEFAULT

           Automatically determine type where possible.
        ----------------------------------------------------- */

        if (
            !this.assetType ||
            !this.assetType.trim()
        ) {

            if (this.code < 0) {

                this.assetType =
                    "dairy Facility";

            }

            else if (this.code > 0) {

                this.assetType =
                    "cow";

            }

        }


        /* -----------------------------------------------------
           ACQUISITION DATE
        ----------------------------------------------------- */

        if (
            !this.acquisitionDate
        ) {

            /*
             * createdAt is not guaranteed to exist yet
             * during initial validation, so this is finalized
             * in pre-save below.
             */

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

        /* -----------------------------------------------------
           MEDICAL UPDATED DATE
        ----------------------------------------------------- */

        if (
            this.isModified(
                "medicalAttention"
            )
        ) {

            this.medicalAttention.updatedAt =
                new Date();

        }


        /* -----------------------------------------------------
           ACQUISITION DATE

           Set once when the record is first saved.
        ----------------------------------------------------- */

        if (
            !this.acquisitionDate
        ) {

            this.acquisitionDate =
                this.createdAt ||
                new Date();

        }


        /* -----------------------------------------------------
           STRUCTURE RECORDS CANNOT BELONG TO ANOTHER
           STRUCTURE
        ----------------------------------------------------- */

        if (this.code < 0) {

            this.assetCode =
                null;

            this.parentStructure =
                null;

            this.structureCode =
                null;

        }


        /* -----------------------------------------------------
           STANDALONE ANIMAL

           Keep the structure relationship consistent.
        ----------------------------------------------------- */

        if (
            this.code > 0 &&
            (
                this.assetCode === null ||
                this.assetCode === undefined
            )
        ) {

            this.parentStructure =
                null;

            this.structureCode =
                null;

        }


        /* -----------------------------------------------------
           KEEP STRUCTURE CODE SYNCHRONIZED WITH ASSET CODE
        ----------------------------------------------------- */

        if (
            this.code > 0 &&
            this.assetCode !== null &&
            this.assetCode !== undefined
        ) {

            this.structureCode =
                Number(this.assetCode);

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


dairySchema.index({

    parentStructure: 1,

    assetStatus: 1

});


dairySchema.index({

    assetSource: 1,

    assetStatus: 1

});


dairySchema.index({

    structureCode: 1,

    assetStatus: 1

});


/* =========================================================
   STATIC
   CALCULATE TOTAL NET WORTH
========================================================= */

dairySchema.statics.calculateNetWorth =
async function () {

    const result =
        await this.aggregate([

            {

                $match: {

                    assetStatus:
                        "active"

                }

            },

            {

                $group: {

                    _id: null,

                    totalNetWorth: {

                        $sum:
                            "$currentWorth"

                    }

                }

            }

        ]);


    return result.length

        ? result[0].totalNetWorth

        : 0;

};


/* =========================================================
   STATIC
   TOTAL CURRENT WORTH
========================================================= */

dairySchema.statics.getTotalCurrentWorth =
async function () {

    return this.calculateNetWorth();

};


/* =========================================================
   EXPORT
========================================================= */

module.exports =
    mongoose.model(
        "Dairy",
        dairySchema
    );