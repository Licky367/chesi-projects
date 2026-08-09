// ==========================================================
// models/dairy.js
// ==========================================================

const mongoose = require("mongoose");


// ==========================================================
// CONSTANTS
// ==========================================================

const DAIRY_BREEDS = [

    "Friesian",
    "Ayrshire",
    "Guernsey",
    "Jersey",
    "Brown Swiss",
    "Sahiwal",
    "Boran",
    "Ankole",
    "Fleckvieh",
    "Simmental",
    "Holstein",
    "Crossbreed",
    "Other"

];


const DAIRY_STATUSES = [

    "active",
    "sold",
    "disposed",
    "inactive"

];


// ==========================================================
// SCHEMA
// ==========================================================

const dairySchema = new mongoose.Schema(

    {

        // ==================================================
        // PROFILE IMAGE
        // ==================================================

        profileImage: {

            type: String,

            trim: true,

            default: ""

        },


        // ==================================================
        // CODE
        //
        // > 0  = identified dairy animal
        // < 0  = Dairy Farm / structure
        // null = manual asset
        // ==================================================

        code: {

            type: Number,

            default: null,

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


        // ==================================================
        // NAME
        // ==================================================

        name: {

            type: String,

            required: true,

            trim: true

        },


        // ==================================================
        // DATE OF BIRTH
        // ==================================================

        dateOfBirth: {

            type: Date,

            required: function() {

                return (

                    this.code !== null &&

                    this.code !== undefined &&

                    Number(this.code) > 0

                );

            },

            default: null

        },


        // ==================================================
        // MASS
        // ==================================================

        mass: {

            type: Number,

            min: 0,

            default: 0

        },


        // ==================================================
        // MILKING
        // ==================================================

        isMilking: {

            type: Boolean,

            default: false

        },


        // ==================================================
        // PARENT / FARM ASSIGNMENT
        // ==================================================

        assetCode: {

            type: Number,

            default: null

        },


        // ==================================================
        // MAINTENANCE
        // ==================================================

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


        // ==================================================
        // MEDICAL ATTENTION
        // ==================================================

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

        },


        // ==================================================
        // TYPE
        //
        // Positive code = breed
        // Negative code = structure type
        // Null code = manual asset type
        // ==================================================

        type: {

            type: String,

            trim: true,

            default: ""

        },


        // ==================================================
        // BUYING PRICE
        // ==================================================

        buyingPrice: {

            type: Number,

            min: 0,

            default: 0

        },


        // ==================================================
        // CURRENT WORTH
        // ==================================================

        currentWorth: {

            type: Number,

            min: 0,

            default: 0

        },


        // ==================================================
        // DESCRIPTION
        // ==================================================

        description: {

            type: String,

            trim: true,

            default: ""

        },


        // ==================================================
        // CONDITION
        // ==================================================

        condition: {

            type: String,

            trim: true,

            default: ""

        },


        // ==================================================
        // LOCATION
        // ==================================================

        location: {

            type: String,

            trim: true,

            default: ""

        },


        // ==================================================
        // ACQUISITION DATE
        // ==================================================

        acquisitionDate: {

            type: Date,

            default: null

        },


        // ==================================================
        // VALUATION DATE
        // ==================================================

        valuationDate: {

            type: Date,

            default: null

        },


        // ==================================================
        // STATUS
        // ==================================================

        status: {

            type: String,

            enum: DAIRY_STATUSES,

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


// ==========================================================
// VIRTUAL: GENDER
// ==========================================================

dairySchema.virtual("gender").get(function() {

    if (

        this.code === null ||

        this.code === undefined ||

        Number(this.code) <= 0

    ) {

        return null;

    }


    return (

        Number(this.code) % 2 === 0

            ? "Female"

            : "Male"

    );

});


// ==========================================================
// VIRTUAL: IS FEMALE
// ==========================================================

dairySchema.virtual("isFemale").get(function() {

    return (

        this.code !== null &&

        this.code !== undefined &&

        Number(this.code) > 0 &&

        Number(this.code) % 2 === 0

    );

});


// ==========================================================
// VIRTUAL: HAS IDENTITY
// ==========================================================

dairySchema.virtual("hasIdentity").get(function() {

    return (

        this.code !== null &&

        this.code !== undefined &&

        Number(this.code) > 0

    );

});


// ==========================================================
// VIRTUAL: IS STRUCTURE
// ==========================================================

dairySchema.virtual("isStructure").get(function() {

    return (

        this.code !== null &&

        this.code !== undefined &&

        Number(this.code) < 0

    );

});


// ==========================================================
// VIRTUAL: IS MANUAL ASSET
// ==========================================================

dairySchema.virtual("isManualAsset").get(function() {

    return (

        this.code === null ||

        this.code === undefined

    );

});


// ==========================================================
// VIRTUAL: IS STANDALONE ASSET
// ==========================================================

dairySchema.virtual("isStandaloneAsset").get(function() {

    return (

        this.code !== null &&

        this.code !== undefined &&

        Number(this.code) > 0 &&

        (

            this.assetCode === null ||

            this.assetCode === undefined

        )

    );

});


// ==========================================================
// VIRTUAL: IS ASSIGNED ASSET
// ==========================================================

dairySchema.virtual("isAssignedAsset").get(function() {

    return (

        this.assetCode !== null &&

        this.assetCode !== undefined

    );

});


// ==========================================================
// VIRTUAL: AGE TEXT
// ==========================================================

dairySchema.virtual("ageText").get(function() {

    if (!this.dateOfBirth) {

        return "";

    }


    const dob =
        new Date(
            this.dateOfBirth
        );


    const now =
        new Date();


    if (
        Number.isNaN(
            dob.getTime()
        ) ||
        dob > now
    ) {

        return "";

    }


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


    return (

        `${years} years, ` +

        `${months} months, ` +

        `${days} days`

    );

});


// ==========================================================
// VIRTUAL: AGE YEARS
// ==========================================================

dairySchema.virtual("ageYears").get(function() {

    if (!this.dateOfBirth) {

        return null;

    }


    const dob =
        new Date(
            this.dateOfBirth
        );


    const now =
        new Date();


    if (
        Number.isNaN(
            dob.getTime()
        ) ||
        dob > now
    ) {

        return null;

    }


    let age =
        now.getFullYear() -
        dob.getFullYear();


    const monthDifference =
        now.getMonth() -
        dob.getMonth();


    if (

        monthDifference < 0 ||

        (
            monthDifference === 0 &&
            now.getDate() < dob.getDate()
        )

    ) {

        age--;

    }


    return Math.max(
        0,
        age
    );

});


// ==========================================================
// VIRTUAL: MILKING TEXT
// ==========================================================

dairySchema.virtual("isMilkingText").get(function() {

    return this.isMilking
        ? "Yes"
        : "No";

});


// ==========================================================
// VIRTUAL: DISPLAY IMAGE
// ==========================================================

dairySchema.virtual("displayImage").get(function() {

    if (!this.profileImage) {

        return (

            `https://ui-avatars.com/api/?name=` +

            `${encodeURIComponent(
                this.name || "Dairy"
            )}`

        );

    }


    if (
        /^https?:\/\//i.test(
            this.profileImage
        )
    ) {

        return this.profileImage;

    }


    if (
        this.profileImage.startsWith("/")
    ) {

        return this.profileImage;

    }


    return `/uploads/${this.profileImage}`;

});


// ==========================================================
// VIRTUAL: REQUIRES MAINTENANCE
// ==========================================================

dairySchema.virtual("requiresMaintenance").get(function() {

    return !!this.needsMaintenance;

});


// ==========================================================
// VIRTUAL: NEEDS MEDICAL ATTENTION
// ==========================================================

dairySchema.virtual("needsMedicalAttention").get(function() {

    return !!(

        this.medicalAttention &&

        this.medicalAttention.isMarked

    );

});


// ==========================================================
// VIRTUAL: ASSET VALUE
// ==========================================================

dairySchema.virtual("assetValue").get(function() {

    return Number(
        this.currentWorth
    ) || 0;

});


// ==========================================================
// VIRTUAL: ACTIVE ASSET
// ==========================================================

dairySchema.virtual("isActiveAsset").get(function() {

    return this.status === "active";

});


// ==========================================================
// VIRTUAL: IS IDENTIFIED DAIRY
// ==========================================================

dairySchema.virtual("isIdentifiedDairy").get(function() {

    return (

        this.code !== null &&

        this.code !== undefined &&

        Number(this.code) > 0

    );

});


// ==========================================================
// PRE VALIDATE
// ==========================================================

dairySchema.pre(
    "validate",
    function(next) {

        // ==================================================
        // STRUCTURE
        // ==================================================

        if (

            this.code !== null &&

            this.code !== undefined &&

            Number(this.code) < 0

        ) {

            this.dateOfBirth = null;

            this.isMilking = false;

            this.assetCode = null;

        }


        // ==================================================
        // MANUAL ASSET
        // ==================================================

        if (

            this.code === null ||

            this.code === undefined

        ) {

            this.dateOfBirth = null;

            this.isMilking = false;


            if (

                this.assetCode === null ||

                this.assetCode === undefined

            ) {

                return next(

                    new Error(
                        "Manual assets must belong to a Dairy Farm. assetCode is required."
                    )

                );

            }

        }


        // ==================================================
        // IDENTIFIED DAIRY
        // ==================================================

        if (

            this.code !== null &&

            this.code !== undefined &&

            Number(this.code) > 0

        ) {

            // ------------------------------------------------
            // Male animals cannot be milking
            // ------------------------------------------------

            if (!this.isFemale) {

                this.isMilking = false;

            }


            // ------------------------------------------------
            // Validate breed when supplied
            // ------------------------------------------------

            if (

                this.type &&

                !DAIRY_BREEDS.includes(
                    this.type
                )

            ) {

                return next(

                    new Error(
                        `Invalid dairy breed: ${this.type}.`
                    )

                );

            }

        }


        // ==================================================
        // STRUCTURES CANNOT HAVE PARENT
        // ==================================================

        if (

            this.code !== null &&

            this.code !== undefined &&

            Number(this.code) < 0 &&

            this.assetCode !== null &&

            this.assetCode !== undefined

        ) {

            return next(

                new Error(
                    "Dairy Farms / structures cannot have an assetCode."
                )

            );

        }


        // ==================================================
        // ENSURE MEDICAL OBJECT
        // ==================================================

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


        // ==================================================
        // CLEAR MEDICAL DATA WHEN NOT MARKED
        // ==================================================

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


// ==========================================================
// PRE SAVE
// ==========================================================

dairySchema.pre(
    "save",
    function(next) {

        // ==================================================
        // MEDICAL UPDATED DATE
        // ==================================================

        if (
            this.isModified(
                "medicalAttention"
            )
        ) {

            this.medicalAttention.updatedAt =
                new Date();

        }


        // ==================================================
        // ACQUISITION DATE
        // ==================================================

        if (!this.acquisitionDate) {

            this.acquisitionDate =
                this.createdAt ||
                new Date();

        }


        // ==================================================
        // STRUCTURE
        // ==================================================

        if (

            this.code !== null &&

            this.code !== undefined &&

            Number(this.code) < 0

        ) {

            this.assetCode = null;

        }


        // ==================================================
        // MANUAL ASSET
        // ==================================================

        if (

            this.code === null ||

            this.code === undefined

        ) {

            this.dateOfBirth = null;

            this.isMilking = false;

        }


        next();

    }
);


// ==========================================================
// INDEXES
// ==========================================================

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


// ==========================================================
// UNIQUE CODE INDEX
//
// Numeric codes are unique.
//
// null is allowed multiple times.
// ==========================================================

dairySchema.index(

    {
        code: 1
    },

    {

        unique: true,

        partialFilterExpression: {

            code: {

                $type: "number"

            }

        }

    }

);


// ==========================================================
// STATIC: GET BREEDS
// ==========================================================

dairySchema.statics.getDairyBreeds =
function() {

    return [
        ...DAIRY_BREEDS
    ];

};


// ==========================================================
// STATIC: GET STATUSES
// ==========================================================

dairySchema.statics.getDairyStatuses =
function() {

    return [
        ...DAIRY_STATUSES
    ];

};


// ==========================================================
// STATIC: CALCULATE NET WORTH
// ==========================================================

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


    return (

        result.length

            ? Number(
                result[0].totalNetWorth || 0
            )

            : 0

    );

};


// ==========================================================
// STATIC: TOTAL CURRENT WORTH
// ==========================================================

dairySchema.statics.getTotalCurrentWorth =
async function() {

    return this.calculateNetWorth();

};


// ==========================================================
// MODEL
//
// IMPORTANT:
//
// mongoose.models.Dairy
//
// prevents:
//
//     OverwriteModelError:
//     Cannot overwrite `Dairy` model once compiled.
//
// This is especially important during development,
// hot reloads, and when multiple route modules require
// this model.
// ==========================================================

const Dairy =
    mongoose.models.Dairy ||
    mongoose.model(
        "Dairy",
        dairySchema
    );


// ==========================================================
// ATTACH CONSTANTS TO THE MODEL
//
// This preserves:
//
//     Dairy.DAIRY_BREEDS
//     Dairy.DAIRY_STATUSES
//
// WITHOUT changing module.exports into a plain object.
//
// Therefore this continues to work:
//
//     const Dairy = require("../models/dairy");
//
//     Dairy.find(...);
//
//     Dairy.findById(...);
//
//     new Dairy(...);
// ==========================================================

Dairy.DAIRY_BREEDS =
    DAIRY_BREEDS;

Dairy.DAIRY_STATUSES =
    DAIRY_STATUSES;


// ==========================================================
// EXPORT
//
// IMPORTANT:
//
// Export the MODEL itself.
//
// DO NOT do:
//
//     module.exports = {
//         Dairy,
//         DAIRY_BREEDS,
//         DAIRY_STATUSES
//     };
//
// because your services use:
//
//     Dairy.find()
//     Dairy.findOne()
//     Dairy.findById()
//     new Dairy()
// ==========================================================

module.exports =
    Dairy;