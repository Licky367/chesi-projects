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

   THERE IS NO SEPARATE NETWORTH MODEL.

   CODE RULES:

       code > 0
           Identified dairy / animal record.

       code < 0
           Dairy structure / facility.

       code === 0
           Manual asset without a dairy identity/code.

   STRUCTURE RELATIONSHIP:

       assetCode = negative code of the structure.

   Example:

       Structure:
           code = -10

       Identified cow:
           code = 25
           assetCode = -10

       Manual structure asset:
           code = 0
           assetCode = -10
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
               Identified dairy / animal.

           Negative:
               Dairy structure / facility.

           Zero:
               Manual asset without dairy identity.
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

           Only required for identified dairy animals.

           Structures and manual assets do not require DOB.
        ===================================================== */

        dateOfBirth: {

            type: Date,

            required: function () {

                return this.code > 0;

            },

            default: null

        },


        /* =====================================================
           MASS

           Mainly applicable to animals.

           Structures and manual assets may remain at 0.
        ===================================================== */

        mass: {

            type: Number,

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
                     * Only positive-code animals may milk.
                     */

                    if (
                        value &&
                        this.code <= 0
                    ) {

                        return false;

                    }


                    /*
                     * Odd positive codes are male.
                     *
                     * Only even positive codes are female.
                     */

                    if (
                        value &&
                        this.code > 0 &&
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

           This is the AUTHORITATIVE relationship between
           an asset and a dairy structure.

           Example:

               Structure:
                   code = -10

               Animal:
                   code = 25
                   assetCode = -10

               Manual asset:
                   code = 0
                   assetCode = -10

           IMPORTANT:

           For code > 0:
               assetCode may be edited.

           For code === 0:
               assetCode is assigned when the manual asset
               is created and is not treated as an editable
               dairy-code relationship.

           For code < 0:
               assetCode must be null.
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

           These fields belong directly to Dairy.

           There is NO separate NetWorth document.
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
        ===================================================== */

        buyingPrice: {

            type: Number,

            min: 0,

            default: 0

        },


        /* =====================================================
           CURRENT WORTH

           Active assets contribute this value to Net Worth.
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
        ===================================================== */

        acquisitionDate: {

            type: Date,

            default: null

        },


        /* =====================================================
           VALUATION DATE
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

           dairy:
               Identified positive-code dairy record.

           structure:
               Negative-code structure.

           asset:
               Code-zero manual asset.

        ===================================================== */

        assetSource: {

            type: String,

            enum: [

                "dairy",

                "structure",

                "asset"

            ],

            default: "dairy",

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

    if (this.code <= 0) {

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

        this.code > 0 &&

        this.code % 2 === 0

    );

});


/* =========================================================
   VIRTUAL
   REAL ANIMAL CHECK
========================================================= */

dairySchema.virtual("hasIdentity").get(function () {

    return this.code > 0;

});


/* =========================================================
   VIRTUAL
   IS STRUCTURE
========================================================= */

dairySchema.virtual("isStructure").get(function () {

    return this.code < 0;

});


/* =========================================================
   VIRTUAL
   IS MANUAL ASSET
========================================================= */

dairySchema.virtual("isManualAsset").get(function () {

    return this.code === 0;

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
           STRUCTURES

           Structures cannot have:

               DOB
               assetCode
               milking status

        ----------------------------------------------------- */

        if (this.code < 0) {

            this.dateOfBirth =
                null;

            this.isMilking =
                false;

            this.assetSource =
                "structure";

        }


        /* -----------------------------------------------------
           IDENTIFIED DAIRY

           Positive-code records are dairy records.
        ----------------------------------------------------- */

        else if (this.code > 0) {

            this.assetSource =
                "dairy";

        }


        /* -----------------------------------------------------
           MANUAL ASSET

           Code zero means the record has no dairy identity.
        ----------------------------------------------------- */

        else {

            this.dateOfBirth =
                null;

            this.isMilking =
                false;

            this.assetSource =
                "asset";

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
           STRUCTURE RECORDS

           A structure cannot belong to another structure.
        ----------------------------------------------------- */

        if (this.code < 0) {

            this.assetCode =
                null;

        }


        /* -----------------------------------------------------
           MANUAL ASSET

           Code zero may have assetCode because it can be
           physically contained within a structure.

           IMPORTANT:

           We DO NOT clear assetCode here.

           This allows:

               code = 0
               assetCode = -10

           to remain a valid manual asset inside structure -10.
        ----------------------------------------------------- */

        if (this.code === 0) {

            /*
             * No dairy identity is required.
             *
             * assetCode, when present, identifies the
             * structure containing the manual asset.
             */

        }


        /* -----------------------------------------------------
           IDENTIFIED DAIRY

           Positive-code records may belong to a structure.

           If no structure is assigned, assetCode remains null.
        ----------------------------------------------------- */

        if (this.code > 0) {

            if (
                this.assetCode === null ||
                this.assetCode === undefined
            ) {

                this.assetCode =
                    null;

            }

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


/*
 * Structure lookup.
 *
 * This is the important Net Worth relationship.
 */

dairySchema.index({

    assetCode: 1,

    assetStatus: 1

});


dairySchema.index({

    assetSource: 1,

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

        ? Number(
            result[0].totalNetWorth || 0
        )

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