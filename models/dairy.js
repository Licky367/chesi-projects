const mongoose = require("mongoose");


/* =========================================================
   DAIRY MODEL
========================================================= */

const dairySchema = new mongoose.Schema(

    {

        /* =====================================================
           PROFILE
        ===================================================== */

        profileImage: {

            type: String,

            trim: true,

            default: ""

        },


        /* =====================================================
           IDENTITY CODE

           > 0  = identified dairy / animal
           < 0  = Dairy Farm / structure
           null = manual asset
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
           ITEM

           Used by the Net Worth service for assets.
        ===================================================== */

        item: {

            type: String,

            trim: true,

            default: ""

        },


        /* =====================================================
           DATE OF BIRTH
        ===================================================== */

        dateOfBirth: {

            type: Date,

            required: function () {

                return (

                    this.code !== null &&

                    this.code > 0

                );

            },

            default: null

        },


        /* =====================================================
           MASS
        ===================================================== */

        mass: {

            type: Number,

            min: 0,

            default: 0

        },


        /* =====================================================
           MILKING
        ===================================================== */

        isMilking: {

            type: Boolean,

            default: false,

            validate: {

                validator: function (value) {

                    if (!value) {

                        return true;

                    }


                    if (
                        this.code === null ||
                        this.code <= 0
                    ) {

                        return false;

                    }


                    if (
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

           Contains the negative code of the Dairy Farm.

           Example:

               Farm:
                   code = -10

               Asset:
                   assetCode = -10
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
           MEDICAL
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
           NET WORTH
        ===================================================== */

        assetType: {

            type: String,

            trim: true,

            default: ""

        },


        buyingPrice: {

            type: Number,

            min: 0,

            default: 0

        },


        currentWorth: {

            type: Number,

            min: 0,

            default: 0

        },


        /*
         * Primary description field used by the service.
         */
        description: {

            type: String,

            trim: true,

            default: ""

        },


        /*
         * Kept for compatibility with existing documents/code.
         */
        assetDescription: {

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


        acquisitionDate: {

            type: Date,

            default: null

        },


        valuationDate: {

            type: Date,

            default: null

        },


        /* =====================================================
           STATUS

           This is intentionally named "status".

           The Net Worth service reads and writes:

               dairy.status
               body.status

           Allowed values:

               active
               sold
               disposed
               inactive
        ===================================================== */

        status: {

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


        /*
         * Compatibility field for existing code/documents
         * that may still use assetStatus.
         *
         * The Net Worth service does NOT use this field.
         */
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
       OPTIONS
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
   FEMALE
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
   IDENTITY
========================================================= */

dairySchema.virtual("hasIdentity").get(function () {

    return (

        this.code !== null &&

        this.code > 0

    );

});


/* =========================================================
   VIRTUAL
   STRUCTURE
========================================================= */

dairySchema.virtual("isStructure").get(function () {

    return (

        this.code !== null &&

        this.code < 0

    );

});


/* =========================================================
   VIRTUAL
   MANUAL ASSET
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
   MAINTENANCE
========================================================= */

dairySchema.virtual("requiresMaintenance").get(function () {

    return !!this.needsMaintenance;

});


/* =========================================================
   VIRTUAL
   MEDICAL
========================================================= */

dairySchema.virtual("needsMedicalAttention").get(function () {

    return !!(

        this.medicalAttention &&

        this.medicalAttention.isMarked

    );

});


/* =========================================================
   VIRTUAL
   ASSET VALUE
========================================================= */

dairySchema.virtual("assetValue").get(function () {

    return Number(
        this.currentWorth
    ) || 0;

});


/* =========================================================
   VIRTUAL
   ACTIVE ASSET
========================================================= */

dairySchema.virtual("isActiveAsset").get(function () {

    return this.status === "active";

});


/* =========================================================
   PRE VALIDATE
========================================================= */

dairySchema.pre(

    "validate",

    function (next) {

        /* -----------------------------------------------------
           MILKING
        ----------------------------------------------------- */

        if (!this.isFemale) {

            this.isMilking = false;

        }


        /* -----------------------------------------------------
           STRUCTURE
        ----------------------------------------------------- */

        if (
            this.code !== null &&
            this.code < 0
        ) {

            this.dateOfBirth =
                null;

            this.isMilking =
                false;

            /*
             * A Dairy Farm cannot belong to another
             * Dairy Farm.
             */
            this.assetCode =
                null;

            this.assetSource =
                "structure";

        }


        /* -----------------------------------------------------
           IDENTIFIED DAIRY
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
        ----------------------------------------------------- */

        else {

            this.dateOfBirth =
                null;

            this.isMilking =
                false;

            this.assetSource =
                "asset";

            /*
             * IMPORTANT:
             *
             * Do NOT clear assetCode.
             *
             * Manual assets may have:
             *
             *     code = null
             *     assetCode = -10
             */

        }


        /* -----------------------------------------------------
           MEDICAL OBJECT
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


        /* -----------------------------------------------------
           STATUS SYNCHRONIZATION
        ----------------------------------------------------- */

        /*
         * The service uses "status" as the authoritative
         * field.
         *
         * Keep assetStatus synchronized for compatibility.
         */

        if (
            this.isModified("status")
        ) {

            this.assetStatus =
                this.status;

        }

        else if (
            this.isModified("assetStatus")
        ) {

            this.status =
                this.assetStatus;

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
        ----------------------------------------------------- */

        if (
            !this.acquisitionDate
        ) {

            this.acquisitionDate =
                this.createdAt ||
                new Date();

        }


        /* -----------------------------------------------------
           STRUCTURE
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
        ----------------------------------------------------- */

        if (
            this.code === null
        ) {

            /*
             * Intentionally preserve assetCode.
             */

        }


        /* -----------------------------------------------------
           IDENTIFIED DAIRY
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


/*
 * Primary structure relationship lookup.
 *
 * The service performs:
 *
 *     Dairy.find({
 *         assetCode: farmCode
 *     })
 */
dairySchema.index({

    assetCode: 1

});


/*
 * Useful for Net Worth filtering.
 */
dairySchema.index({

    status: 1,

    currentWorth: 1

});


dairySchema.index({

    assetSource: 1,

    status: 1

});


/* =========================================================
   STATIC
   CALCULATE TOTAL NET WORTH

   Structures themselves are excluded because their
   code is negative.

   Assets with positive codes and manual assets with
   null codes are included.

   This follows the same fundamental rule as the
   Net Worth service.
========================================================= */

dairySchema.statics.calculateNetWorth =
async function () {

    const result =
        await this.aggregate([

            {

                $match: {

                    $or: [

                        {
                            code: {
                                $gt: 0
                            }
                        },

                        {
                            code: null
                        },

                        {
                            code: {
                                $exists: false
                            }
                        }

                    ]

                }

            },

            {

                $group: {

                    _id: null,

                    totalNetWorth: {

                        $sum: {

                            $ifNull: [

                                "$currentWorth",

                                0

                            ]

                        }

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