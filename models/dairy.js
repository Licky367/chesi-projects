// ==========================================================
// models/dairy.js
// DAIRY / ANIMAL / FACILITY / ASSET MODEL
// ==========================================================
//
// ENTITY IDENTITY
// ----------------------------------------------------------
//
// code < 0
//     = DAIRY FARM
//
// code > 0
//     = ANIMAL
//
// code === null
//     = STRUCTURE / FACILITY / ASSET
//
// ==========================================================
//
// OWNERSHIP
// ----------------------------------------------------------
//
// assetCode
//     = negative code of the parent Dairy Farm
//
// Dairy Farm:
//     assetCode = null
//
// Animal:
//     assetCode = negative parent farm code
//
// Assigned Asset:
//     assetCode = negative parent farm code
//
// Standalone Asset:
//     assetCode = null
//
// ==========================================================
//
// DWELLING / ALLOCATION
// ----------------------------------------------------------
//
// dwellNumber >= 0
//     = normal room
//
// dwellNumber < 0
//     = AgroStore
//
// dwellNumber === null
//     = not allocated
//
// ==========================================================
//
// STORAGE
// ----------------------------------------------------------
//
// DairyStorage.roomNumber uses negative numbers:
//
//     -1
//     -2
//     -3
//
// Dairy.dwellNumber uses the SAME number when an entity is
// allocated to that AgroStore.
//
// Example:
//
//     DairyStorage.roomNumber = -2
//
//     Dairy.assetCode = -1
//     Dairy.dwellNumber = -2
//
// ==========================================================

const mongoose = require("mongoose");


// ==========================================================
// CONSTANTS
// ==========================================================

const MAX_PROFILE_IMAGES = 5;


// ==========================================================
// DAIRY BREEDS
// ==========================================================

const DAIRY_BREEDS = Object.freeze([

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

]);


// ==========================================================
// DAIRY FARM TYPES
// ==========================================================

const DAIRY_FARM_TYPES = Object.freeze([

    "ranch",
    "zeroGrazing",
    "semiZeroGrazing",
    "pastureBased",
    "mixedFarming",
    "cooperative",
    "other"

]);


// ==========================================================
// STRUCTURE / ASSET TYPES
// ==========================================================

const STRUCTURE_TYPES = Object.freeze([

    "machine",
    "equipment",
    "tool",
    "building",
    "cowshed",
    "milkingParlour",
    "hayShed",
    "waterSystem",
    "fencing",
    "vehicle",
    "generator",
    "solarSystem",
    "feedStore",
    "feeds",
    "other"

]);


// ==========================================================
// STATUSES
// ==========================================================

const DAIRY_STATUSES = Object.freeze([

    "active",
    "sold",
    "disposed",
    "inactive"

]);


// ==========================================================
// HELPER FUNCTIONS
// ==========================================================

function isNullish(value) {

    return (

        value === null ||

        value === undefined

    );

}


function isInteger(value) {

    return Number.isInteger(value);

}


function isNegativeInteger(value) {

    return (

        isInteger(value) &&

        value < 0

    );

}


function isNonNegativeInteger(value) {

    return (

        isInteger(value) &&

        value >= 0

    );

}


function toFiniteNumber(value, fallback = 0) {

    const number = Number(value);

    return Number.isFinite(number)

        ? number

        : fallback;

}


function cleanString(value) {

    if (isNullish(value)) {

        return "";

    }

    return String(value).trim();

}


function createValidationError(message) {

    const error = new Error(message);

    error.status = 400;

    return error;

}


// ==========================================================
// MAIN SCHEMA
// ==========================================================

const dairySchema = new mongoose.Schema(

    {

        // ==================================================
        // PROFILE IMAGES
        // ==================================================

        profileImages: {

            type: [

                {

                    type: String,

                    trim: true

                }

            ],

            default: [],

            validate: {

                validator(images) {

                    return (

                        Array.isArray(images) &&

                        images.length <=
                            MAX_PROFILE_IMAGES

                    );

                },

                message:
                    `A maximum of ${MAX_PROFILE_IMAGES} profile images is allowed.`

            }

        },


        // ==================================================
        // PRIMARY / LEGACY PROFILE IMAGE
        // ==================================================

        profileImage: {

            type: String,

            trim: true,

            default: ""

        },


        // ==================================================
        // ENTITY CODE
        // ==================================================
        //
        // Negative = Dairy Farm
        // Positive = Animal
        // Null     = Structure / Asset
        //
        // ==================================================

        code: {

            type: Number,

            default: null,

            validate: {

                validator(value) {

                    return (

                        isNullish(value) ||

                        isInteger(value)

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

            trim: true,

            maxlength: 200

        },


        // ==================================================
        // DATE OF BIRTH
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
        // MILKING STATUS
        // ==================================================

        isMilking: {

            type: Boolean,

            default: false

        },


        // ==================================================
        // PARENT FARM CODE
        // ==================================================
        //
        // Must be the negative code of a Dairy Farm.
        //
        // ==================================================

        assetCode: {

            type: Number,

            default: null,

            validate: {

                validator(value) {

                    return (

                        isNullish(value) ||

                        isNegativeInteger(value)

                    );

                },

                message:
                    "assetCode must be a negative Dairy Farm code or null."

            }

        },


        // ==================================================
        // DWELL / ALLOCATION NUMBER
        // ==================================================
        //
        // >= 0 = normal room
        // < 0  = AgroStore
        // null = not allocated
        //
        // ==================================================

        dwellNumber: {

            type: Number,

            default: null,

            validate: {

                validator(value) {

                    return (

                        isNullish(value) ||

                        isInteger(value)

                    );

                },

                message:
                    "dwellNumber must be a whole number or null."

            }

        },


        // ==================================================
        // MAINTENANCE FLAG
        // ==================================================

        needsMaintenance: {

            type: Boolean,

            default: false,

            index: true

        },


        // ==================================================
        // MAINTENANCE INFORMATION
        // ==================================================

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
        // ==================================================
        //
        // For animals:
        //     breed
        //
        // For farms:
        //     farm type
        //
        // For assets:
        //     structure type
        //
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
        // SELLING PRICE
        // ==================================================

        sellingPrice: {

            type: Number,

            min: 0,

            default: 0

        },


        // ==================================================
        // REVENUE
        // ==================================================

        revenue: {

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

            default: "",

            maxlength: 5000

        },


        // ==================================================
        // CONDITION
        // ==================================================

        condition: {

            type: String,

            trim: true,

            default: "",

            maxlength: 500

        },


        // ==================================================
        // LOCATION
        // ==================================================

        location: {

            type: String,

            trim: true,

            default: "",

            maxlength: 500

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

        strict: true,

        toJSON: {

            virtuals: true

        },

        toObject: {

            virtuals: true

        }

    }

);


// ==========================================================
// VIRTUAL: IS DAIRY FARM
// ==========================================================

dairySchema.virtual("isDairyFarm").get(function () {

    return (

        !isNullish(this.code) &&

        Number(this.code) < 0

    );

});


// ==========================================================
// VIRTUAL: IS ANIMAL
// ==========================================================

dairySchema.virtual("isAnimal").get(function () {

    return (

        !isNullish(this.code) &&

        Number(this.code) > 0

    );

});


// ==========================================================
// VIRTUAL: IS STRUCTURE / ASSET
// ==========================================================

dairySchema.virtual("isStructure").get(function () {

    return isNullish(this.code);

});


// ==========================================================
// VIRTUAL: IS MANUAL ASSET
// ==========================================================

dairySchema.virtual("isManualAsset").get(function () {

    return this.isStructure;

});


// ==========================================================
// VIRTUAL: IS ASSIGNED ASSET
// ==========================================================

dairySchema.virtual("isAssignedAsset").get(function () {

    return (

        this.isStructure &&

        !isNullish(this.assetCode)

    );

});


// ==========================================================
// VIRTUAL: IS STANDALONE ASSET
// ==========================================================

dairySchema.virtual("isStandaloneAsset").get(function () {

    return (

        this.isStructure &&

        isNullish(this.assetCode)

    );

});


// ==========================================================
// VIRTUAL: IS DWELLING
// ==========================================================

dairySchema.virtual("isDwelling").get(function () {

    return !isNullish(this.dwellNumber);

});


// ==========================================================
// VIRTUAL: IS NORMAL ROOM
// ==========================================================

dairySchema.virtual("isNormalRoom").get(function () {

    return (

        !isNullish(this.dwellNumber) &&

        Number(this.dwellNumber) >= 0

    );

});


// ==========================================================
// VIRTUAL: IS AGROSTORE CONTENT
// ==========================================================

dairySchema.virtual("isAgroStoreContent").get(function () {

    return (

        !isNullish(this.dwellNumber) &&

        Number(this.dwellNumber) < 0

    );

});


// ==========================================================
// VIRTUAL: STORAGE DWELL NUMBER
// ==========================================================

dairySchema.virtual("storageDwellNumber").get(function () {

    return this.isAgroStoreContent

        ? Number(this.dwellNumber)

        : null;

});


// ==========================================================
// VIRTUAL: HAS NEGATIVE DWELL
// ==========================================================

dairySchema.virtual("hasNegativeDwell").get(function () {

    return this.isAgroStoreContent;

});


// ==========================================================
// VIRTUAL: PARENT FARM CODE
// ==========================================================

dairySchema.virtual("parentFarmCode").get(function () {

    if (this.isDairyFarm) {

        return Number(this.code);

    }

    if (!isNullish(this.assetCode)) {

        return Number(this.assetCode);

    }

    return null;

});


// ==========================================================
// VIRTUAL: GENDER
// ==========================================================

dairySchema.virtual("gender").get(function () {

    if (!this.isAnimal) {

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

dairySchema.virtual("isFemale").get(function () {

    return (

        this.isAnimal &&

        Number(this.code) % 2 === 0

    );

});


// ==========================================================
// VIRTUAL: HAS IDENTITY
// ==========================================================

dairySchema.virtual("hasIdentity").get(function () {

    return this.isAnimal;

});


// ==========================================================
// VIRTUAL: AGE TEXT
// ==========================================================

dairySchema.virtual("ageText").get(function () {

    if (!this.dateOfBirth) {

        return "";

    }

    const dob = new Date(this.dateOfBirth);

    const now = new Date();

    if (

        Number.isNaN(dob.getTime()) ||

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

        const previousMonth = new Date(

            now.getFullYear(),

            now.getMonth(),

            0

        );

        days += previousMonth.getDate();

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
// VIRTUAL: AGE IN YEARS
// ==========================================================

dairySchema.virtual("ageYears").get(function () {

    if (!this.dateOfBirth) {

        return null;

    }

    const dob = new Date(this.dateOfBirth);

    const now = new Date();

    if (Number.isNaN(dob.getTime())) {

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


    return Math.max(0, age);

});


// ==========================================================
// VIRTUAL: MILKING TEXT
// ==========================================================

dairySchema.virtual("isMilkingText").get(function () {

    return this.isMilking
        ? "Yes"
        : "No";

});


// ==========================================================
// PROFILE IMAGE HELPER
// ==========================================================

function normalizeProfileImage(image, name) {

    if (!image) {

        return (

            "https://ui-avatars.com/api/?name=" +

            encodeURIComponent(
                name || "Dairy"
            )

        );

    }


    const value = String(image).trim();


    if (!value) {

        return (

            "https://ui-avatars.com/api/?name=" +

            encodeURIComponent(
                name || "Dairy"
            )

        );

    }


    return value;

}


// ==========================================================
// VIRTUAL: DISPLAY IMAGES
// ==========================================================

dairySchema.virtual("displayImages").get(function () {

    let images = [];


    if (Array.isArray(this.profileImages)) {

        images = this.profileImages

            .filter(Boolean)

            .map(image =>
                normalizeProfileImage(
                    image,
                    this.name
                )
            );

    }


    // ----------------------------------------------
    // Legacy profileImage fallback
    // ----------------------------------------------

    if (

        images.length === 0 &&

        this.profileImage

    ) {

        images.push(

            normalizeProfileImage(
                this.profileImage,
                this.name
            )

        );

    }


    // ----------------------------------------------
    // Avatar fallback
    // ----------------------------------------------

    if (images.length === 0) {

        images.push(

            normalizeProfileImage(
                "",
                this.name
            )

        );

    }


    return images.slice(
        0,
        MAX_PROFILE_IMAGES
    );

});


// ==========================================================
// VIRTUAL: DISPLAY IMAGE
// ==========================================================

dairySchema.virtual("displayImage").get(function () {

    const images = this.displayImages;

    return images.length > 0

        ? images[0]

        : normalizeProfileImage(
            "",
            this.name
        );

});


// ==========================================================
// VIRTUAL: REQUIRES MAINTENANCE
// ==========================================================

dairySchema.virtual("requiresMaintenance").get(function () {

    return Boolean(this.needsMaintenance);

});


// ==========================================================
// VIRTUAL: NEEDS MEDICAL ATTENTION
// ==========================================================

dairySchema.virtual("needsMedicalAttention").get(function () {

    return Boolean(

        this.medicalAttention &&

        this.medicalAttention.isMarked

    );

});


// ==========================================================
// VIRTUAL: ASSET VALUE
// ==========================================================

dairySchema.virtual("assetValue").get(function () {

    return Number(this.currentWorth) || 0;

});


// ==========================================================
// VIRTUAL: ACTIVE ASSET
// ==========================================================

dairySchema.virtual("isActiveAsset").get(function () {

    return this.status === "active";

});


// ==========================================================
// VIRTUAL: IDENTIFIED DAIRY
// ==========================================================

dairySchema.virtual("isIdentifiedDairy").get(function () {

    return this.isAnimal;

});


// ==========================================================
// PRE-VALIDATE
// ==========================================================

dairySchema.pre("validate", function (next) {

    try {

        // ==================================================
        // NORMALIZE PROFILE IMAGES
        // ==================================================

        if (!Array.isArray(this.profileImages)) {

            this.profileImages = [];

        }


        this.profileImages = this.profileImages

            .filter(Boolean)

            .map(image => String(image).trim())

            .filter(Boolean)

            .slice(0, MAX_PROFILE_IMAGES);


        // ==================================================
        // LEGACY PROFILE IMAGE MIGRATION
        // ==================================================

        if (

            this.profileImages.length === 0 &&

            this.profileImage

        ) {

            this.profileImages = [

                String(this.profileImage).trim()

            ];

        }


        // ==================================================
        // KEEP PRIMARY IMAGE SYNCHRONIZED
        // ==================================================

        this.profileImage =

            this.profileImages.length > 0

                ? this.profileImages[0]

                : "";


        // ==================================================
        // NORMALIZE NULLABLE NUMBERS
        // ==================================================

        if (this.code === undefined) {

            this.code = null;

        }

        if (this.assetCode === undefined) {

            this.assetCode = null;

        }

        if (this.dwellNumber === undefined) {

            this.dwellNumber = null;

        }


        // ==================================================
        // NORMALIZE MONEY / NUMERIC VALUES
        // ==================================================

        this.mass =
            Math.max(
                0,
                toFiniteNumber(this.mass)
            );

        this.buyingPrice =
            Math.max(
                0,
                toFiniteNumber(this.buyingPrice)
            );

        this.sellingPrice =
            Math.max(
                0,
                toFiniteNumber(this.sellingPrice)
            );

        this.revenue =
            Math.max(
                0,
                toFiniteNumber(this.revenue)
            );

        this.currentWorth =
            Math.max(
                0,
                toFiniteNumber(this.currentWorth)
            );


        // ==================================================
        // DAIRY FARM
        // ==================================================

        if (this.isDairyFarm) {

            // ----------------------------------------------
            // Farms cannot belong to another farm.
            // ----------------------------------------------

            this.assetCode = null;

            this.dwellNumber = null;


            // ----------------------------------------------
            // Farm-specific fields.
            // ----------------------------------------------

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;


            // ----------------------------------------------
            // Validate farm type.
            // ----------------------------------------------

            if (

                this.type &&

                !DAIRY_FARM_TYPES.includes(this.type)

            ) {

                return next(

                    createValidationError(

                        `Invalid dairy farm type: ${this.type}.`

                    )

                );

            }

        }


        // ==================================================
        // ANIMAL
        // ==================================================

        if (this.isAnimal) {

            // ----------------------------------------------
            // Male animals cannot be marked as milking.
            // ----------------------------------------------

            if (!this.isFemale) {

                this.isMilking = false;

            }


            // ----------------------------------------------
            // Animal must belong to a farm.
            // ----------------------------------------------

            if (isNullish(this.assetCode)) {

                return next(

                    createValidationError(

                        "Animal must belong to a Dairy Farm. assetCode is required."

                    )

                );

            }


            // ----------------------------------------------
            // Animal parent must be negative.
            // ----------------------------------------------

            if (Number(this.assetCode) >= 0) {

                return next(

                    createValidationError(

                        "Animal assetCode must be the negative code of its parent Dairy Farm."

                    )

                );

            }


            // ----------------------------------------------
            // Validate breed.
            // ----------------------------------------------

            if (

                this.type &&

                !DAIRY_BREEDS.includes(this.type)

            ) {

                return next(

                    createValidationError(

                        `Invalid dairy breed: ${this.type}.`

                    )

                );

            }

            // ----------------------------------------------
            // IMPORTANT:
            //
            // Negative dwellNumber is VALID.
            //
            // It represents AgroStore allocation.
            // ----------------------------------------------

        }


        // ==================================================
        // STRUCTURE / ASSET
        // ==================================================

        if (this.isStructure) {

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;


            // ----------------------------------------------
            // Assigned asset
            // ----------------------------------------------

            if (!isNullish(this.assetCode)) {

                if (Number(this.assetCode) >= 0) {

                    return next(

                        createValidationError(

                            "Structure assetCode must be the negative code of its parent Dairy Farm."

                        )

                    );

                }

            }


            // ----------------------------------------------
            // Validate structure type.
            // ----------------------------------------------

            if (

                this.type &&

                !STRUCTURE_TYPES.includes(this.type)

            ) {

                return next(

                    createValidationError(

                        `Invalid structure type: ${this.type}.`

                    )

                );

            }


            // ----------------------------------------------
            // Negative dwellNumber is VALID.
            //
            // Negative = AgroStore
            // Positive/zero = normal room
            // ----------------------------------------------

        }


        // ==================================================
        // GLOBAL DWELL VALIDATION
        // ==================================================

        if (

            !isNullish(this.dwellNumber) &&

            !isInteger(this.dwellNumber)

        ) {

            return next(

                createValidationError(

                    "dwellNumber must be a whole number or null."

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
            Boolean(
                this.medicalAttention.isMarked
            );


        this.medicalAttention.type =
            cleanString(
                this.medicalAttention.type
            );


        this.medicalAttention.details =
            cleanString(
                this.medicalAttention.details
            );


        this.medicalAttention.description =
            cleanString(
                this.medicalAttention.description
            );


        this.medicalAttention.charges =
            Math.max(
                0,
                toFiniteNumber(
                    this.medicalAttention.charges
                )
            );


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
        // CLEAR ACTIVE MEDICAL DETAILS ONLY WHEN NOT MARKED
        // ==================================================
        //
        // This keeps the model internally consistent.
        //
        // ==================================================

        if (!this.medicalAttention.isMarked) {

            this.medicalAttention.type = "";

            this.medicalAttention.details = "";

            this.medicalAttention.charges = 0;

            this.medicalAttention.description = "";

        }


        next();

    } catch (error) {

        next(error);

    }

});


// ==========================================================
// PRE-SAVE
// ==========================================================

dairySchema.pre("save", function (next) {

    try {

        // ==================================================
        // MEDICAL UPDATED DATE
        // ==================================================

        if (

            this.isModified("medicalAttention") &&

            this.medicalAttention

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
        // DAIRY FARM NORMALIZATION
        // ==================================================

        if (this.isDairyFarm) {

            this.assetCode = null;

            this.dwellNumber = null;

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;

        }


        // ==================================================
        // STRUCTURE NORMALIZATION
        // ==================================================

        if (this.isStructure) {

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;

        }


        // ==================================================
        // FINAL DWELL SAFETY
        // ==================================================

        if (

            !isNullish(this.dwellNumber) &&

            !isInteger(this.dwellNumber)

        ) {

            return next(

                createValidationError(

                    "dwellNumber must be a whole number or null."

                )

            );

        }


        next();

    } catch (error) {

        next(error);

    }

});

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
// ASSET OWNERSHIP
// ==========================================================

dairySchema.index({

    assetCode: 1,

    status: 1

});


// ==========================================================
// DWELLING / ALLOCATION
// ==========================================================
//
// Covers:
//
//     Normal rooms
//     AgroStores
//
// ==========================================================

dairySchema.index({

    dwellNumber: 1,

    status: 1

});


// ==========================================================
// FARM + DWELLING
// ==========================================================
//
// Important for retrieving:
//
//     Farm room contents
//     Farm AgroStore contents
//
// ==========================================================

dairySchema.index({

    assetCode: 1,

    dwellNumber: 1,

    status: 1

});


// ==========================================================
// FACILITY / ASSET TYPE
// ==========================================================

dairySchema.index({

    type: 1,

    status: 1

});


// ==========================================================
// CODE UNIQUENESS
// ==========================================================
//
// Only numeric codes are unique.
//
// code === null is allowed for multiple structures/assets.
//
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
// STATIC HELPER
// ==========================================================
//
// Returns an empty query when an invalid farm code is
// supplied instead of throwing an exception.
//
// ==========================================================

function emptyDairyQuery(Model) {

    return Model.find({

        _id: null

    });

}


// ==========================================================
// STATIC: GET FARM ASSETS
// ==========================================================
//
// Returns all assets/animals belonging to a farm.
//
// ==========================================================

dairySchema.statics.getFarmAssets = function (farmCode) {

    const code = Number(farmCode);


    if (

        !isInteger(code) ||

        code >= 0

    ) {

        return emptyDairyQuery(this);

    }


    return this.find({

        assetCode: code

    });

};


// ==========================================================
// STATIC: GET FARM DWELLINGS
// ==========================================================
//
// Returns every entity belonging to the farm that has been
// allocated to a normal room OR AgroStore.
//
// ==========================================================

dairySchema.statics.getFarmDwellings = function (farmCode) {

    const code = Number(farmCode);


    if (

        !isInteger(code) ||

        code >= 0

    ) {

        return emptyDairyQuery(this);

    }


    return this.find({

        assetCode: code,

        dwellNumber: {

            $ne: null

        }

    });

};


// ==========================================================
// STATIC: GET FARM ROOM CONTENT
// ==========================================================
//
// Works for BOTH:
//
//     roomNumber >= 0
//         normal room
//
//     roomNumber < 0
//         AgroStore
//
// ==========================================================

dairySchema.statics.getFarmRoomContent = function (

    farmCode,

    roomNumber

) {

    const farm = Number(farmCode);

    const room = Number(roomNumber);


    if (

        !isInteger(farm) ||

        farm >= 0 ||

        !isInteger(room)

    ) {

        return emptyDairyQuery(this);

    }


    return this.find({

        assetCode: farm,

        dwellNumber: room

    });

};


// ==========================================================
// STATIC: GET AGROSTORE CONTENT
// ==========================================================
//
// Example:
//
//     Dairy.getAgroStoreContent(-1, -2)
//
// Means:
//
//     Farm -1
//     AgroStore -2
//
// ==========================================================

dairySchema.statics.getAgroStoreContent = function (

    farmCode,

    agroStoreNumber

) {

    const farm = Number(farmCode);

    const store = Number(agroStoreNumber);


    if (

        !isInteger(farm) ||

        farm >= 0 ||

        !isInteger(store) ||

        store >= 0

    ) {

        return emptyDairyQuery(this);

    }


    return this.find({

        assetCode: farm,

        dwellNumber: store

    });

};


// ==========================================================
// STATIC: GET NORMAL ROOM CONTENT
// ==========================================================

dairySchema.statics.getFarmNormalRoomContent = function (

    farmCode,

    roomNumber

) {

    const farm = Number(farmCode);

    const room = Number(roomNumber);


    if (

        !isInteger(farm) ||

        farm >= 0 ||

        !isInteger(room) ||

        room < 0

    ) {

        return emptyDairyQuery(this);

    }


    return this.find({

        assetCode: farm,

        dwellNumber: room

    });

};


// ==========================================================
// STATIC: GET ACTIVE NORMAL ROOM NUMBERS
// ==========================================================
//
// Returns only normal rooms currently occupied.
//
// AgroStores are excluded.
//
// ==========================================================

dairySchema.statics.getActiveRoomNumbers = async function (

    farmCode

) {

    const farm = Number(farmCode);


    if (

        !isInteger(farm) ||

        farm >= 0

    ) {

        return [];

    }


    const result = await this.aggregate([

        {

            $match: {

                assetCode: farm,

                dwellNumber: {

                    $gte: 0

                },

                status: "active"

            }

        },

        {

            $group: {

                _id: "$dwellNumber"

            }

        },

        {

            $sort: {

                _id: 1

            }

        }

    ]);


    return result.map(item => item._id);

};


// ==========================================================
// STATIC: GET ACTIVE AGROSTORE NUMBERS
// ==========================================================
//
// Returns negative dwell numbers currently occupied by
// active AgroStore contents.
//
// ==========================================================

dairySchema.statics.getActiveAgroStoreNumbers = async function (

    farmCode

) {

    const farm = Number(farmCode);


    if (

        !isInteger(farm) ||

        farm >= 0

    ) {

        return [];

    }


    const result = await this.aggregate([

        {

            $match: {

                assetCode: farm,

                dwellNumber: {

                    $lt: 0

                },

                status: "active"

            }

        },

        {

            $group: {

                _id: "$dwellNumber"

            }

        },

        {

            $sort: {

                _id: 1

            }

        }

    ]);


    return result.map(item => item._id);

};


// ==========================================================
// STATIC: GET FARM AGROSTORE CONTENTS
// ==========================================================
//
// Returns all active entities belonging to AgroStores of
// the specified farm.
//
// ==========================================================

dairySchema.statics.getFarmAgroStoreContents = function (

    farmCode

) {

    const farm = Number(farmCode);


    if (

        !isInteger(farm) ||

        farm >= 0

    ) {

        return emptyDairyQuery(this);

    }


    return this.find({

        assetCode: farm,

        dwellNumber: {

            $lt: 0

        },

        status: "active"

    });

};


// ==========================================================
// STATIC: GET STANDALONE ASSETS
// ==========================================================

dairySchema.statics.getStandaloneAssets = function () {

    return this.find({

        code: null,

        assetCode: null

    });

};


// ==========================================================
// STATIC: GET DAIRY BREEDS
// ==========================================================

dairySchema.statics.getDairyBreeds = function () {

    return [...DAIRY_BREEDS];

};


// ==========================================================
// STATIC: GET DAIRY FARM TYPES
// ==========================================================

dairySchema.statics.getDairyFarmTypes = function () {

    return [...DAIRY_FARM_TYPES];

};


// ==========================================================
// STATIC: GET STRUCTURE TYPES
// ==========================================================

dairySchema.statics.getStructureTypes = function () {

    return [...STRUCTURE_TYPES];

};


// ==========================================================
// STATIC: GET STATUSES
// ==========================================================

dairySchema.statics.getDairyStatuses = function () {

    return [...DAIRY_STATUSES];

};


// ==========================================================
// STATIC: GET MAX PROFILE IMAGES
// ==========================================================

dairySchema.statics.getMaxProfileImages = function () {

    return MAX_PROFILE_IMAGES;

};


// ==========================================================
// STATIC: CALCULATE NET WORTH
// ==========================================================
//
// Calculates the total current worth of all ACTIVE records.
//
// ==========================================================

dairySchema.statics.calculateNetWorth = async function () {

    const result = await this.aggregate([

        {

            $match: {

                status: "active"

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


    if (!result.length) {

        return 0;

    }


    return Number(

        result[0].totalNetWorth || 0

    );

};


// ==========================================================
// STATIC: TOTAL CURRENT WORTH
// ==========================================================

dairySchema.statics.getTotalCurrentWorth = function () {

    return this.calculateNetWorth();

};


// ==========================================================
// STATIC: GET ACTIVE FARM ASSETS
// ==========================================================
//
// Useful when a service wants only active records belonging
// to a farm.
//
// ==========================================================

dairySchema.statics.getActiveFarmAssets = function (

    farmCode

) {

    const code = Number(farmCode);


    if (

        !isInteger(code) ||

        code >= 0

    ) {

        return emptyDairyQuery(this);

    }


    return this.find({

        assetCode: code,

        status: "active"

    });

};


// ==========================================================
// STATIC: GET FARM
// ==========================================================
//
// Finds a Dairy Farm by its negative code.
//
// ==========================================================

dairySchema.statics.getFarmByCode = function (farmCode) {

    const code = Number(farmCode);


    if (

        !isInteger(code) ||

        code >= 0

    ) {

        return this.findOne({

            _id: null

        });

    }


    return this.findOne({

        code,

        status: "active"

    });

};


// ==========================================================
// STATIC: GET ANIMAL BY CODE
// ==========================================================
//
// Finds an animal by its positive identity code.
//
// ==========================================================

dairySchema.statics.getAnimalByCode = function (animalCode) {

    const code = Number(animalCode);


    if (

        !isInteger(code) ||

        code <= 0

    ) {

        return this.findOne({

            _id: null

        });

    }


    return this.findOne({

        code,

        status: "active"

    });

};


// ==========================================================
// STATIC: GET FARM ANIMALS
// ==========================================================

dairySchema.statics.getFarmAnimals = function (farmCode) {

    const farm = Number(farmCode);


    if (

        !isInteger(farm) ||

        farm >= 0

    ) {

        return emptyDairyQuery(this);

    }


    return this.find({

        assetCode: farm,

        code: {

            $gt: 0

        },

        status: "active"

    }).sort({

        code: 1

    });

};


// ==========================================================
// STATIC: GET FARM MILKING ANIMALS
// ==========================================================

dairySchema.statics.getFarmMilkingAnimals = function (

    farmCode

) {

    const farm = Number(farmCode);


    if (

        !isInteger(farm) ||

        farm >= 0

    ) {

        return emptyDairyQuery(this);

    }


    return this.find({

        assetCode: farm,

        code: {

            $gt: 0

        },

        isMilking: true,

        status: "active"

    }).sort({

        code: 1

    });

};


// ==========================================================
// MODEL
// ==========================================================

const Dairy =

    mongoose.models.Dairy ||

    mongoose.model(

        "Dairy",

        dairySchema

    );


// ==========================================================
// CONSTANT EXPORTS
// ==========================================================
//
// These remain attached to the model so existing code such
// as:
//
//     Dairy.DAIRY_BREEDS
//
// continues to work.
//
// ==========================================================

Dairy.DAIRY_BREEDS =
    DAIRY_BREEDS;

Dairy.DAIRY_FARM_TYPES =
    DAIRY_FARM_TYPES;

Dairy.STRUCTURE_TYPES =
    STRUCTURE_TYPES;

Dairy.DAIRY_STATUSES =
    DAIRY_STATUSES;

Dairy.MAX_PROFILE_IMAGES =
    MAX_PROFILE_IMAGES;


// ==========================================================
// EXPORT
// ==========================================================

module.exports = Dairy;