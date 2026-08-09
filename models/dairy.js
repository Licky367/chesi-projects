// ==========================.================================
// models/dairy.js
// ==========================================================

const mongoose =
    require("mongoose");


// ==========================================================
// DAIRY BREEDS
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


// ==========================================================
// STATUS VALUES
// ==========================================================

const DAIRY_STATUSES = [

    "active",

    "sold",

    "disposed",

    "inactive"

];


// ==========================================================
// DAIRY SCHEMA
// ==========================================================

const dairySchema =
    new mongoose.Schema(

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
            // > 0
            //     Identified dairy animal
            //
            // < 0
            //     Dairy Farm / structure
            //
            // null
            //     Manual asset
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


                        return Number.isInteger(
                            value
                        );

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
            //
            // Only identified dairy animals use DOB.
            //
            // It is intentionally NOT required at schema level
            // because updateAsset() supports PATCH-style updates
            // and explicit clearing.
            // ==================================================

            dateOfBirth: {

                type: Date,

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
            //
            // Only female identified dairy animals can milk.
            // ==================================================

            isMilking: {

                type: Boolean,

                default: false

            },


            // ==================================================
            // PARENT / FARM ASSIGNMENT
            //
            // Positive code:
            //
            //     null
            //         standalone animal
            //
            //     negative number
            //         assigned to Dairy Farm
            //
            // Negative code:
            //
            //     null
            //         Dairy Farm
            //
            // Null code:
            //
            //     negative number
            //         manual asset belonging to farm
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


            // ==================================================
            // TYPE
            //
            // code > 0:
            //     dairy breed
            //
            // code < 0:
            //     structure type
            //
            // code === null:
            //     manual asset type
            //
            // No global enum is used here because structures
            // and manual assets can have their own types.
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
// GENDER
//
// Positive code:
//
// Even = Female
// Odd  = Male
//
// Structures/manual assets:
//
// null
// ==========================================================

dairySchema.virtual(
    "gender"
).get(function() {

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
// IS FEMALE
// ==========================================================

dairySchema.virtual(
    "isFemale"
).get(function() {

    return (

        this.code !== null &&

        this.code !== undefined &&

        Number(this.code) > 0 &&

        Number(this.code) % 2 === 0

    );

});


// ==========================================================
// HAS IDENTITY
// ==========================================================

dairySchema.virtual(
    "hasIdentity"
).get(function() {

    return (

        this.code !== null &&

        this.code !== undefined &&

        Number(this.code) > 0

    );

});


// ==========================================================
// IS STRUCTURE
// ==========================================================

dairySchema.virtual(
    "isStructure"
).get(function() {

    return (

        this.code !== null &&

        this.code !== undefined &&

        Number(this.code) < 0

    );

});


// ==========================================================
// IS MANUAL ASSET
// ==========================================================

dairySchema.virtual(
    "isManualAsset"
).get(function() {

    return (

        this.code === null ||

        this.code === undefined

    );

});


// ==========================================================
// IS STANDALONE ASSET
//
// Positive identified dairy with no parent farm.
// ==========================================================

dairySchema.virtual(
    "isStandaloneAsset"
).get(function() {

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
// IS ASSIGNED ASSET
// ==========================================================

dairySchema.virtual(
    "isAssignedAsset"
).get(function() {

    return (

        this.assetCode !== null &&

        this.assetCode !== undefined

    );

});


// ==========================================================
// AGE TEXT
//
// Example:
//
//     4 years, 3 months, 12 days
// ==========================================================

dairySchema.virtual(
    "ageText"
).get(function() {

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
        )
    ) {

        return "";

    }


    if (
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


    if (
        days < 0
    ) {

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


    if (
        months < 0
    ) {

        years--;

        months += 12;

    }


    if (
        years < 0
    ) {

        return "";

    }


    return (

        `${years} years, ` +

        `${months} months, ` +

        `${days} days`

    );

});


// ==========================================================
// AGE IN YEARS
// ==========================================================

dairySchema.virtual(
    "ageYears"
).get(function() {

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
        )
    ) {

        return null;

    }


    if (
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
// MILKING TEXT
// ==========================================================

dairySchema.virtual(
    "isMilkingText"
).get(function() {

    return this.isMilking

        ? "Yes"

        : "No";

});


// ==========================================================
// DISPLAY IMAGE
// ==========================================================

dairySchema.virtual(
    "displayImage"
).get(function() {

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
// REQUIRES MAINTENANCE
// ==========================================================

dairySchema.virtual(
    "requiresMaintenance"
).get(function() {

    return !!this.needsMaintenance;

});


// ==========================================================
// NEEDS MEDICAL ATTENTION
// ==========================================================

dairySchema.virtual(
    "needsMedicalAttention"
).get(function() {

    return !!(

        this.medicalAttention &&

        this.medicalAttention.isMarked

    );

});


// ==========================================================
// ASSET VALUE
// ==========================================================

dairySchema.virtual(
    "assetValue"
).get(function() {

    return (

        Number(
            this.currentWorth
        ) || 0

    );

});


// ==========================================================
// ACTIVE ASSET
// ==========================================================

dairySchema.virtual(
    "isActiveAsset"
).get(function() {

    return (

        this.status === "active"

    );

});


// ==========================================================
// IS IDENTIFIED DAIRY
// ==========================================================

dairySchema.virtual(
    "isIdentifiedDairy"
).get(function() {

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
        //
        // Manual assets must belong to a Dairy Farm.
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

            // ----------------------------------------------
            // Male animals cannot be milking.
            // ----------------------------------------------

            if (!this.isFemale) {

                this.isMilking = false;

            }


            // ----------------------------------------------
            // Validate breed when supplied.
            // ----------------------------------------------

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
        // MEDICAL OBJECT
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

            if (
                this.medicalAttention
            ) {

                this.medicalAttention.updatedAt =
                    new Date();

            }

        }


        // ==================================================
        // ACQUISITION DATE
        //
        // Preserve an existing date.
        // Create one only when missing.
        // ==================================================

        if (
            !this.acquisitionDate
        ) {

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


// ==========================================================
// MILKING
// ==========================================================

dairySchema.index({

    isMilking: 1

});


// ==========================================================
// MAINTENANCE
// ==========================================================

dairySchema.index({

    needsMaintenance: 1

});


// ==========================================================
// MEDICAL
// ==========================================================

dairySchema.index({

    "medicalAttention.isMarked": 1

});


// ==========================================================
// ASSET ASSIGNMENT
// ==========================================================

dairySchema.index({

    assetCode: 1,

    status: 1

});


// ==========================================================
// CODE
//
// Numeric codes are unique.
//
// Multiple null values are allowed.
//
// Examples:
//
//     1
//     2
//     3
//     -1
//     -2
//
// must be unique.
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
// CREATE / REUSE MONGOOSE MODEL
//
// IMPORTANT:
//
// NEVER blindly call:
//
//     mongoose.model("Dairy", dairySchema)
//
// because this file can be loaded by multiple routes,
// services, controllers, etc.
//
// Reuse the already compiled model when available.
// ==========================================================

const Dairy =
    mongoose.models.Dairy ||
    mongoose.model(
        "Dairy",
        dairySchema
    );


// ==========================================================
// ATTACH CONSTANTS TO MODEL
// ==========================================================

Dairy.DAIRY_BREEDS =
    DAIRY_BREEDS;

Dairy.DAIRY_STATUSES =
    DAIRY_STATUSES;


// ==========================================================
// EXPORT MODEL
// ==========================================================
//
// IMPORTANT:
//
// Export the actual Mongoose model.
//
// This allows:
//
//     Dairy.find()
//
//     Dairy.findById()
//
//     Dairy.findOne()
//
//     new Dairy()
//
// ==========================================================

module.exports =
    Dairy;