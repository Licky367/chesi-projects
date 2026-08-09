// ==========================================================
// models/dairy.js
// ==========================================================

const mongoose =
    require("mongoose");


// ==========================================================
// CONSTANTS
// ==========================================================


// ==========================================================
// DAIRY BREEDS
//
// Must remain aligned with:
//     services/networthService.js
//
// Used primarily when:
//     code > 0
//
// For identified dairy:
//     type = breed
//
// Manual assets and Dairy Farms may use type for their
// own classification.
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
// ALLOWED STATUSES
//
// Must remain aligned with:
//     services/networthService.js
// ==========================================================

const ALLOWED_STATUSES = [

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
            //     Dairy Farm
            //
            // null
            //     Manual asset
            //
            // IMPORTANT:
            //
            // The service never modifies code during asset
            // updates.
            // ==================================================

            code: {

                type: Number,

                default: null,

                validate: {

                    validator:
                        function(value) {

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
            //
            // Required for every record:
            //
            //     Dairy Farm
            //     Identified animal
            //     Manual asset
            // ==================================================

            name: {

                type: String,

                required: true,

                trim: true

            },


            // ==================================================
            // DATE OF BIRTH
            //
            // Only identified dairy animals require DOB.
            //
            // code > 0:
            //     required
            //
            // code < 0:
            //     null
            //
            // code === null:
            //     null
            // ==================================================

            dateOfBirth: {

                type: Date,

                required:
                    function() {

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
            //
            // Mainly used by identified dairy animals.
            // ==================================================

            mass: {

                type: Number,

                min: 0,

                default: 0

            },


            // ==================================================
            // MILKING
            //
            // Only positive even-numbered codes are female.
            //
            // The service controls whether this value changes.
            // ==================================================

            isMilking: {

                type: Boolean,

                default: false

            },


            // ==================================================
            // ASSET CODE
            //
            // Parent Dairy Farm code.
            //
            // Identified animal:
            //
            //     null
            //         standalone
            //
            //     negative number
            //         assigned to Dairy Farm
            //
            // Dairy Farm:
            //
            //     null
            //
            // Manual asset:
            //
            //     negative number
            //         parent Dairy Farm
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
            // Identified:
            //     breed
            //
            // Dairy Farm:
            //     structure type
            //
            // Manual asset:
            //     asset type
            //
            // No global enum is used because the latter two
            // categories have different possible values.
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
            //
            // Used by net-worth calculations.
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
            //
            // Must match ALLOWED_STATUSES in the service.
            // ==================================================

            status: {

                type: String,

                enum: ALLOWED_STATUSES,

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
//
// Positive code only.
//
// Even:
//     Female
//
// Odd:
//     Male
//
// Farms/manual assets:
//     null
// ==========================================================

dairySchema.virtual(
    "gender"
)
.get(
    function() {

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

    }
);


// ==========================================================
// VIRTUAL: IS FEMALE
// ==========================================================

dairySchema.virtual(
    "isFemale"
)
.get(
    function() {

        return (

            this.code !== null &&

            this.code !== undefined &&

            Number(this.code) > 0 &&

            Number(this.code) % 2 === 0

        );

    }
);


// ==========================================================
// VIRTUAL: HAS IDENTITY
//
// Positive code = identified dairy.
// ==========================================================

dairySchema.virtual(
    "hasIdentity"
)
.get(
    function() {

        return (

            this.code !== null &&

            this.code !== undefined &&

            Number(this.code) > 0

        );

    }
);


// ==========================================================
// VIRTUAL: IS IDENTIFIED DAIRY
//
// Same concept as hasIdentity.
//
// Kept separately because templates/services may use
// either property.
// ==========================================================

dairySchema.virtual(
    "isIdentifiedDairy"
)
.get(
    function() {

        return (

            this.code !== null &&

            this.code !== undefined &&

            Number(this.code) > 0

        );

    }
);


// ==========================================================
// VIRTUAL: IS STRUCTURE
//
// Negative code = Dairy Farm.
// ==========================================================

dairySchema.virtual(
    "isStructure"
)
.get(
    function() {

        return (

            this.code !== null &&

            this.code !== undefined &&

            Number(this.code) < 0

        );

    }
);


// ==========================================================
// VIRTUAL: IS MANUAL ASSET
//
// A valid manual asset has:
//
//     code = null
//     assetCode = parent Dairy Farm code
//
// This is deliberately aligned with the service helper,
// rather than treating every null-code record as an asset.
// ==========================================================

dairySchema.virtual(
    "isManualAsset"
)
.get(
    function() {

        const noCode =
            this.code === null ||
            this.code === undefined;


        const hasParent =
            this.assetCode !== null &&
            this.assetCode !== undefined;


        return (
            noCode &&
            hasParent
        );

    }
);


// ==========================================================
// VIRTUAL: IS STANDALONE ASSET
//
// Identified dairy with no parent farm.
// ==========================================================

dairySchema.virtual(
    "isStandaloneAsset"
)
.get(
    function() {

        return (

            this.code !== null &&

            this.code !== undefined &&

            Number(this.code) > 0 &&

            (
                this.assetCode === null ||
                this.assetCode === undefined
            )

        );

    }
);


// ==========================================================
// VIRTUAL: IS ASSIGNED ASSET
// ==========================================================

dairySchema.virtual(
    "isAssignedAsset"
)
.get(
    function() {

        return (

            this.assetCode !== null &&

            this.assetCode !== undefined

        );

    }
);


// ==========================================================
// VIRTUAL: AGE
//
// Display-only.
//
// Age is NEVER stored in MongoDB.
//
// Returns:
//
//     integer years
//
// The service also calculates this property when using lean()
// so the service remains independent of document virtuals.
// ==========================================================

dairySchema.virtual(
    "age"
)
.get(
    function() {

        if (
            !this.dateOfBirth
        ) {

            return null;

        }


        const dob =
            new Date(
                this.dateOfBirth
            );


        if (
            Number.isNaN(
                dob.getTime()
            )
        ) {

            return null;

        }


        const today =
            new Date();


        if (
            dob > today
        ) {

            return null;

        }


        let age =
            today.getFullYear() -
            dob.getFullYear();


        const birthdayNotReached =
            today.getMonth() <
                dob.getMonth() ||

            (
                today.getMonth() ===
                    dob.getMonth() &&

                today.getDate() <
                    dob.getDate()
            );


        if (
            birthdayNotReached
        ) {

            age--;

        }


        return age >= 0
            ? age
            : null;

    }
);


// ==========================================================
// VIRTUAL: AGE TEXT
//
// Example:
//
//     7 years, 4 months, 12 days
//
// Display-only.
// ==========================================================

dairySchema.virtual(
    "ageText"
)
.get(
    function() {

        if (
            !this.dateOfBirth
        ) {

            return "";

        }


        const dob =
            new Date(
                this.dateOfBirth
            );


        if (
            Number.isNaN(
                dob.getTime()
            )
        ) {

            return "";

        }


        const today =
            new Date();


        if (
            dob > today
        ) {

            return "";

        }


        let years =
            today.getFullYear() -
            dob.getFullYear();


        let months =
            today.getMonth() -
            dob.getMonth();


        let days =
            today.getDate() -
            dob.getDate();


        if (
            days < 0
        ) {

            months--;


            const previousMonth =
                new Date(

                    today.getFullYear(),

                    today.getMonth(),

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

    }
);


// ==========================================================
// VIRTUAL: AGE YEARS
//
// Compatibility helper.
//
// Returns the same integer-year value as `age`.
// ==========================================================

dairySchema.virtual(
    "ageYears"
)
.get(
    function() {

        if (
            !this.dateOfBirth
        ) {

            return null;

        }


        const dob =
            new Date(
                this.dateOfBirth
            );


        if (
            Number.isNaN(
                dob.getTime()
            )
        ) {

            return null;

        }


        const today =
            new Date();


        if (
            dob > today
        ) {

            return null;

        }


        let age =
            today.getFullYear() -
            dob.getFullYear();


        const birthdayNotReached =
            today.getMonth() <
                dob.getMonth() ||

            (
                today.getMonth() ===
                    dob.getMonth() &&

                today.getDate() <
                    dob.getDate()
            );


        if (
            birthdayNotReached
        ) {

            age--;

        }


        return age >= 0
            ? age
            : null;

    }
);


// ==========================================================
// VIRTUAL: MILKING TEXT
// ==========================================================

dairySchema.virtual(
    "isMilkingText"
)
.get(
    function() {

        return this.isMilking
            ? "Yes"
            : "No";

    }
);


// ==========================================================
// VIRTUAL: DISPLAY IMAGE
//
// profileImage may contain:
//
//     complete URL
//     /path/to/file
//     filename
//
// If missing, generate an avatar.
// ==========================================================

dairySchema.virtual(
    "displayImage"
)
.get(
    function() {

        if (
            !this.profileImage
        ) {

            return (

                `https://ui-avatars.com/api/?name=` +

                `${encodeURIComponent(

                    this.name ||
                    "Dairy"

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
            this.profileImage.startsWith(
                "/"
            )
        ) {

            return this.profileImage;

        }


        return (
            `/uploads/${this.profileImage}`
        );

    }
);


// ==========================================================
// VIRTUAL: REQUIRES MAINTENANCE
// ==========================================================

dairySchema.virtual(
    "requiresMaintenance"
)
.get(
    function() {

        return !!this.needsMaintenance;

    }
);


// ==========================================================
// VIRTUAL: NEEDS MEDICAL ATTENTION
// ==========================================================

dairySchema.virtual(
    "needsMedicalAttention"
)
.get(
    function() {

        return !!(

            this.medicalAttention &&

            this.medicalAttention.isMarked

        );

    }
);


// ==========================================================
// VIRTUAL: ASSET VALUE
// ==========================================================

dairySchema.virtual(
    "assetValue"
)
.get(
    function() {

        return (

            Number(
                this.currentWorth
            ) || 0

        );

    }
);


// ==========================================================
// VIRTUAL: IS ACTIVE ASSET
// ==========================================================

dairySchema.virtual(
    "isActiveAsset"
)
.get(
    function() {

        return (
            this.status === "active"
        );

    }
);


// ==========================================================
// PRE VALIDATE
//
// Enforces structural rules.
//
// IMPORTANT:
//
// updateAsset() performs PATCH-style updates, but
// dairy.save() still runs validation.
//
// Therefore this middleware must preserve the service's
// intended data model without making optional fields
// artificially required.
// ==========================================================

dairySchema.pre(
    "validate",
    function(next) {

        // ==================================================
        // DAIRY FARM
        //
        // code < 0
        //
        // Farms:
        //
        //     no DOB
        //     no milking
        //     no parent
        // ==================================================

        if (
            this.code !== null &&
            this.code !== undefined &&
            Number(this.code) < 0
        ) {

            this.dateOfBirth =
                null;


            this.isMilking =
                false;


            this.assetCode =
                null;

        }


        // ==================================================
        // MANUAL ASSET
        //
        // code === null
        //
        // Must have a parent Dairy Farm.
        // ==================================================

        if (
            this.code === null ||
            this.code === undefined
        ) {

            this.dateOfBirth =
                null;


            this.isMilking =
                false;


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


            // Manual asset parent must be a negative code.
            if (
                !Number.isFinite(
                    Number(this.assetCode)
                ) ||
                Number(this.assetCode) >= 0
            ) {

                return next(

                    new Error(
                        "Manual asset assetCode must be a valid negative Dairy Farm code."
                    )

                );

            }

        }


        // ==================================================
        // IDENTIFIED DAIRY
        //
        // code > 0
        // ==================================================

        if (
            this.code !== null &&
            this.code !== undefined &&
            Number(this.code) > 0
        ) {

            // ----------------------------------------------
            // Female / male milking validation
            // ----------------------------------------------

            if (
                !this.isFemale
            ) {

                this.isMilking =
                    false;

            }


            // ----------------------------------------------
            // Breed validation
            //
            // Empty type is allowed.
            //
            // Non-empty type must be a recognized breed.
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


            // ----------------------------------------------
            // Parent farm validation
            //
            // An identified animal can be:
            //
            //     standalone
            //     OR
            //     assigned to a negative farm code.
            // ----------------------------------------------

            if (
                this.assetCode !== null &&
                this.assetCode !== undefined
            ) {

                if (
                    !Number.isFinite(
                        Number(this.assetCode)
                    ) ||
                    Number(this.assetCode) >= 0
                ) {

                    return next(

                        new Error(
                            "Identified dairy assetCode must be a valid negative Dairy Farm code."
                        )

                    );

                }

            }

        }


        // ==================================================
        // MEDICAL ATTENTION
        // ==================================================

        if (
            !this.medicalAttention
        ) {

            this.medicalAttention =
                {};

        }


        this.medicalAttention.isMarked =
            !!this.medicalAttention.isMarked;


        this.medicalAttention.type =
            this.medicalAttention.type ||
            "";


        this.medicalAttention.details =
            this.medicalAttention.details ||
            "";


        this.medicalAttention.charges =
            Number(
                this.medicalAttention.charges
            ) || 0;


        this.medicalAttention.description =
            this.medicalAttention.description ||
            "";


        this.medicalAttention.markedBy =
            this.medicalAttention.markedBy ||
            null;


        this.medicalAttention.markedAt =
            this.medicalAttention.markedAt ||
            null;


        this.medicalAttention.updatedAt =
            this.medicalAttention.updatedAt ||
            null;


        this.medicalAttention.clearedBy =
            this.medicalAttention.clearedBy ||
            null;


        this.medicalAttention.clearedAt =
            this.medicalAttention.clearedAt ||
            null;


        // ==================================================
        // CLEAR MEDICAL DETAILS WHEN NOT MARKED
        // ==================================================

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
        //
        // Preserve an existing date.
        //
        // If missing, create one.
        // ==================================================

        if (
            !this.acquisitionDate
        ) {

            this.acquisitionDate =
                this.createdAt ||
                new Date();

        }


        // ==================================================
        // DAIRY FARM
        // ==================================================

        if (
            this.code !== null &&
            this.code !== undefined &&
            Number(this.code) < 0
        ) {

            this.assetCode =
                null;

        }


        // ==================================================
        // MANUAL ASSET
        // ==================================================

        if (
            this.code === null ||
            this.code === undefined
        ) {

            this.dateOfBirth =
                null;

            this.isMilking =
                false;

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

    isMilking:
        1

});


// ==========================================================
// MAINTENANCE
// ==========================================================

dairySchema.index({

    needsMaintenance:
        1

});


// ==========================================================
// MEDICAL
// ==========================================================

dairySchema.index({

    "medicalAttention.isMarked":
        1

});


// ==========================================================
// ASSET ASSIGNMENT
// ==========================================================

dairySchema.index({

    assetCode:
        1,

    status:
        1

});


// ==========================================================
// CODE
//
// Numeric codes are unique.
//
// Multiple null codes are allowed.
//
// Examples:
//
//     1
//     2
//     3
//     -1
//     -2
//
// must all be unique.
//
// But:
//
//     null
//     null
//     null
//
// is allowed.
// ==========================================================

dairySchema.index(

    {
        code:
            1
    },

    {

        unique:
            true,

        partialFilterExpression: {

            code: {

                $type:
                    "number"

            }

        }

    }

);


// ==========================================================
// STATIC: GET DAIRY BREEDS
// ==========================================================

dairySchema.statics.getDairyBreeds =
function() {

    return [
        ...DAIRY_BREEDS
    ];

};


// ==========================================================
// STATIC: CALCULATE NET WORTH
//
// Kept for compatibility with other parts of the project.
//
// The networthService itself calculates net worth using
// getNetWorth(), which also returns structures and standalone
// assets.
// ==========================================================

dairySchema.statics.calculateNetWorth =
async function() {

    const result =
        await this.aggregate(

            [

                {
                    $match: {

                        status:
                            "active"

                    }

                },

                {
                    $group: {

                        _id:
                            null,

                        totalNetWorth: {

                            $sum:
                                "$currentWorth"

                        }

                    }

                }

            ]

        );


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

    return (
        this.calculateNetWorth()
    );

};


// ==========================================================
// CREATE MODEL
// ==========================================================

const Dairy =
    mongoose.model(
        "Dairy",
        dairySchema
    );


// ==========================================================
// EXPORT MODEL
// ==========================================================

module.exports =
    Dairy;


// ==========================================================
// EXPORT CONSTANTS AS MODEL PROPERTIES
//
// Allows:
//
//     Dairy.DAIRY_BREEDS
//
//     Dairy.ALLOWED_STATUSES
//
// ==========================================================

module.exports.DAIRY_BREEDS =
    DAIRY_BREEDS;

module.exports.ALLOWED_STATUSES =
    ALLOWED_STATUSES;