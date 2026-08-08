const mongoose = require("mongoose");


/* =========================================================
   DAIRY MODEL
   SINGLE SOURCE OF TRUTH

   This model contains:

   1. Identified dairy / animal records
   2. Dairy structure / facility records
   3. Manual asset records
   4. Maintenance information
   5. Medical information
   6. Net Worth information


   =========================================================
   CODE SYSTEM
   =========================================================

   code > 0
       Identified dairy / animal.

   code < 0
       Dairy structure / facility.

   code === null
       Manual asset.

   IMPORTANT:

       Manual assets DO NOT use code = 0.

       Manual assets have:

           code = null

       because they have no dairy identity.


   =========================================================
   STRUCTURE RELATIONSHIP
   =========================================================

   assetCode contains the NEGATIVE code of the structure.

   Example:

       Dairy Farm:
           code = -10

       Cow:
           code = 25
           assetCode = -10

       Manual Asset:
           code = null
           assetCode = -10


   Therefore:

       assetCode is the authoritative structure
       relationship.

   There is no separate NetWorth model.
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
           DAIRY CODE

           Positive:
               Identified dairy / animal.

           Negative:
               Dairy structure / facility.

           Null:
               Manual asset without dairy identity.

           IMPORTANT:

               Manual assets MUST NOT use 0.

               Sparse unique index allows multiple
               manual assets with code = null.
        ===================================================== */

        code: {

            type: Number,

            default: null,

            unique: true,

            sparse: true,

            validate: {

                validator: function (value) {

                    if (
                        value === null ||
                        value === undefined
                    ) {

                        return true;

                    }


                    return Number.isInteger(value);

                },

                message:
                    "Code must be a whole number or null."

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

           Only identified dairy / animal records require
           a date of birth.

           Structures and manual assets do not.
        ===================================================== */

        dateOfBirth: {

            type: Date,

            required: function () {

                return this.code !== null &&
                       this.code > 0;

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

           Only positive-code female animals can be milking.

           Female rule:

               even positive code = female

           Male rule:

               odd positive code = male
        ===================================================== */

        isMilking: {

            type: Boolean,

            default: false,

            validate: {

                validator: function (value) {

                    /*
                     * Non-animal records cannot be milking.
                     */

                    if (
                        value &&
                        (
                            this.code === null ||
                            this.code <= 0
                        )
                    ) {

                        return false;

                    }


                    /*
                     * Odd positive codes are male.
                     *
                     * Only even positive codes can
                     * be marked as milking.
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

           Authoritative relationship between this record
           and a Dairy Farm / structure.

           Examples:

               Structure:
                   code = -10

               Identified dairy:
                   code = 25
                   assetCode = -10

               Manual asset:
                   code = null
                   assetCode = -10


           Valid relationship:

               assetCode must reference a negative
               structure code.

           Structures themselves cannot have assetCode.
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

           There is NO separate NetWorth model.
        ===================================================== */


        /* =====================================================
           ASSET TYPE
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
               code > 0

           structure:
               code < 0

           asset:
               code === null
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

    /*
     * Structures and manual assets have no gender.
     */

    if (
        this.code === null ||
        this.code <= 0
    ) {

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

        this.code !== null &&

        this.code > 0 &&

        this.code % 2 === 0

    );

});


/* =========================================================
   VIRTUAL
   REAL ANIMAL / IDENTIFIED DAIRY CHECK
========================================================= */

dairySchema.virtual("hasIdentity").get(function () {

    return (

        this.code !== null &&

        this.code > 0

    );

});


/* =========================================================
   VIRTUAL
   IS STRUCTURE
========================================================= */

dairySchema.virtual("isStructure").get(function () {

    return (

        this.code !== null &&

        this.code < 0

    );

});


/* =========================================================
   VIRTUAL
   IS MANUAL ASSET
========================================================= */

dairySchema.virtual("isManualAsset").get(function () {

    return this.code === null;

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
           STRUCTURE

           code < 0

           A structure:

               - has no DOB
               - cannot milk
               - cannot belong to another structure
               - is always assetSource = structure
        ----------------------------------------------------- */

        if (
            this.code !== null &&
            this.code < 0
        ) {

            this.dateOfBirth =
                null;

            this.isMilking =
                false;

            this.assetCode =
                null;

            this.assetSource =
                "structure";

        }


        /* -----------------------------------------------------
           IDENTIFIED DAIRY

           code > 0

           Positive-code records are dairy / animal records.
        ----------------------------------------------------- */

        else if (
            this.code !== null &&
            this.code > 0
        ) {

            this.assetSource =
                "dairy";

        }


        /* -----------------------------------------------------
           MANUAL ASSET

           code === null

           Manual assets:

               - have no dairy identity
               - have no DOB
               - cannot milk
               - may have assetCode
               - are assetSource = asset
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

            if (
                this.code !== null &&
                this.code < 0
            ) {

                this.assetType =
                    "dairy Facility";

            }

            else if (
                this.code !== null &&
                this.code > 0
            ) {

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

        if (
            this.code !== null &&
            this.code < 0
        ) {

            this.assetCode =
                null;

        }


        /* -----------------------------------------------------
           MANUAL ASSET

           code === null

           Manual assets MAY have assetCode.

           Example:

               code = null
               assetCode = -10

           This means:

               manual asset
               contained in structure -10.

           Do NOT clear assetCode.
        ----------------------------------------------------- */

        if (
            this.code === null
        ) {

            /*
             * Intentionally leave assetCode unchanged.
             */

        }


        /* -----------------------------------------------------
           IDENTIFIED DAIRY

           Positive-code records may belong to a structure.

           If none is assigned, keep assetCode null.
        ----------------------------------------------------- */

        if (
            this.code !== null &&
            this.code > 0
        ) {

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


/* =========================================================
   STRUCTURE LOOKUP

   This is the authoritative Net Worth relationship.

   Example:

       assetCode = -10

   finds:

       Dairy document where code = -10
========================================================= */

dairySchema.index({

    assetCode: 1,

    assetStatus: 1

});


/* =========================================================
   ASSET SOURCE + STATUS
========================================================= */

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