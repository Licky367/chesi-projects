const mongoose = require("mongoose");


/* ==========================================================
   DAIRY SCHEMA
========================================================== */

const dairySchema = new mongoose.Schema(

    {

        /* ==================================================
           PROFILE IMAGE
        ================================================== */

        profileImage: {

            type: String,

            trim: true,

            default: ""

        },


        /* ==================================================
           CODE

           > 0  = identified dairy / animal
           < 0  = Dairy Farm / structure
           null = manual asset
        ================================================== */

        code: {

            type: Number,

            default: null,

            unique: true,

            sparse: true,

            validate: {

                validator: function(value) {

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


        /* ==================================================
           NAME
        ================================================== */

        name: {

            type: String,

            required: true,

            trim: true

        },


        /* ==================================================
           DATE OF BIRTH
        ================================================== */

        dateOfBirth: {

            type: Date,

            required: function() {

                return (
                    this.code !== null &&
                    this.code > 0
                );

            },

            default: null

        },


        /* ==================================================
           MASS
        ================================================== */

        mass: {

            type: Number,

            min: 0,

            default: 0

        },


        /* ==================================================
           MILKING
        ================================================== */

        isMilking: {

            type: Boolean,

            default: false,

            validate: {

                validator: function(value) {

                    if (!value) {

                        return true;

                    }


                    if (
                        this.code === null ||
                        this.code <= 0
                    ) {

                        return false;

                    }


                    return (
                        this.code % 2 === 0
                    );

                },

                message:
                    "Only female animals can be marked as milking."

            }

        },


        /* ==================================================
           STRUCTURE ASSIGNMENT
        ================================================== */

        assetCode: {

            type: Number,

            default: null

        },


        /* ==================================================
           MAINTENANCE
        ================================================== */

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


        /* ==================================================
           MEDICAL ATTENTION
        ================================================== */

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


        /* ==================================================
           TYPE

           This is the Net Worth asset type.

           Examples:
               Cow
               Equipment
               Building
               Vehicle
               Machine
        ================================================== */

        type: {

            type: String,

            trim: true,

            default: ""

        },


        /* ==================================================
           BUYING PRICE
        ================================================== */

        buyingPrice: {

            type: Number,

            min: 0,

            default: 0

        },


        /* ==================================================
           CURRENT WORTH
        ================================================== */

        currentWorth: {

            type: Number,

            min: 0,

            default: 0

        },


        /* ==================================================
           DESCRIPTION
        ================================================== */

        description: {

            type: String,

            trim: true,

            default: ""

        },


        /* ==================================================
           CONDITION
        ================================================== */

        condition: {

            type: String,

            trim: true,

            default: ""

        },


        /* ==================================================
           LOCATION
        ================================================== */

        location: {

            type: String,

            trim: true,

            default: ""

        },


        /* ==================================================
           ACQUISITION DATE
        ================================================== */

        acquisitionDate: {

            type: Date,

            default: null

        },


        /* ==================================================
           VALUATION DATE
        ================================================== */

        valuationDate: {

            type: Date,

            default: null

        },


        /* ==================================================
           STATUS
        ================================================== */

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


/* ==========================================================
   GENDER
========================================================== */

dairySchema.virtual("gender").get(function() {

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


/* ==========================================================
   FEMALE
========================================================== */

dairySchema.virtual("isFemale").get(function() {

    return (

        this.code !== null &&

        this.code > 0 &&

        this.code % 2 === 0

    );

});


/* ==========================================================
   HAS IDENTITY
========================================================== */

dairySchema.virtual("hasIdentity").get(function() {

    return (

        this.code !== null &&

        this.code > 0

    );

});


/* ==========================================================
   IS STRUCTURE
========================================================== */

dairySchema.virtual("isStructure").get(function() {

    return (

        this.code !== null &&

        this.code < 0

    );

});


/* ==========================================================
   IS MANUAL ASSET
========================================================== */

dairySchema.virtual("isManualAsset").get(function() {

    return this.code === null;

});


/* ==========================================================
   AGE
========================================================== */

dairySchema.virtual("ageText").get(function() {

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


/* ==========================================================
   MILKING TEXT
========================================================== */

dairySchema.virtual("isMilkingText").get(function() {

    return this.isMilking
        ? "Yes"
        : "No";

});


/* ==========================================================
   DISPLAY IMAGE
========================================================== */

dairySchema.virtual("displayImage").get(function() {

    if (this.profileImage) {

        return `/uploads/${this.profileImage}`;

    }


    return `https://ui-avatars.com/api/?name=${encodeURIComponent(

        this.name

    )}`;

});


/* ==========================================================
   MAINTENANCE SHORTCUT
========================================================== */

dairySchema.virtual("requiresMaintenance").get(function() {

    return !!this.needsMaintenance;

});


/* ==========================================================
   MEDICAL SHORTCUT
========================================================== */

dairySchema.virtual("needsMedicalAttention").get(function() {

    return !!(

        this.medicalAttention &&

        this.medicalAttention.isMarked

    );

});


/* ==========================================================
   ASSET VALUE
========================================================== */

dairySchema.virtual("assetValue").get(function() {

    return Number(
        this.currentWorth
    ) || 0;

});


/* ==========================================================
   ACTIVE ASSET
========================================================== */

dairySchema.virtual("isActiveAsset").get(function() {

    return this.status === "active";

});


/* ==========================================================
   PRE VALIDATE
========================================================== */

dairySchema.pre(
    "validate",
    function(next) {

        /* ==================================================
           ONLY FEMALES CAN MILK
        ================================================== */

        if (!this.isFemale) {

            this.isMilking = false;

        }


        /* ==================================================
           STRUCTURE
        ================================================== */

        if (
            this.code !== null &&
            this.code < 0
        ) {

            this.dateOfBirth = null;

            this.isMilking = false;

            this.assetCode = null;

        }


        /* ==================================================
           MANUAL ASSET
        ================================================== */

        if (
            this.code === null
        ) {

            this.dateOfBirth = null;

            this.isMilking = false;

        }


        /* ==================================================
           MEDICAL OBJECT
        ================================================== */

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


        /* ==================================================
           CLEAR MEDICAL DATA
        ================================================== */

        if (
            !this.medicalAttention.isMarked
        ) {

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


/* ==========================================================
   PRE SAVE
========================================================== */

dairySchema.pre(
    "save",
    function(next) {

        /* ==================================================
           MEDICAL UPDATED DATE
        ================================================== */

        if (
            this.isModified(
                "medicalAttention"
            )
        ) {

            this.medicalAttention.updatedAt =
                new Date();

        }


        /* ==================================================
           ACQUISITION DATE
        ================================================== */

        if (!this.acquisitionDate) {

            this.acquisitionDate =
                this.createdAt ||
                new Date();

        }


        /* ==================================================
           STRUCTURE
        ================================================== */

        if (
            this.code !== null &&
            this.code < 0
        ) {

            this.assetCode = null;

        }


        next();

    }
);


/* ==========================================================
   INDEXES
========================================================== */

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

    assetCode: 1,

    status: 1

});


/* ==========================================================
   CALCULATE TOTAL NET WORTH
========================================================== */

dairySchema.statics.calculateNetWorth =
async function() {

    const result =
        await this.aggregate([

            {

                $match: {

                    status: "active"

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


/* ==========================================================
   TOTAL CURRENT WORTH
========================================================== */

dairySchema.statics.getTotalCurrentWorth =
async function() {

    return this.calculateNetWorth();

};


/* ==========================================================
   EXPORT
========================================================== */

module.exports =
    mongoose.model(
        "Dairy",
        dairySchema
    );