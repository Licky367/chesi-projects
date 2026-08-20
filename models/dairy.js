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
//     = FACILITY / ASSET
//
// ==========================================================
//
// ASSET OWNERSHIP
// ----------------------------------------------------------
//
// assetCode
//     = negative code of the parent Dairy Farm
//
// Dairy Farms:
//     assetCode = null
//
// Animals:
//     assetCode = negative Dairy Farm code
//
// Assigned Assets:
//     assetCode = negative Dairy Farm code
//
// Standalone Assets:
//     assetCode = null
//
// ==========================================================
//
// DWELLING / ALLOCATION
// ----------------------------------------------------------
//
// dwellNumber >= 0
//     = NORMAL ROOM
//
// dwellNumber < 0
//     = AGROSTORE
//
// dwellNumber === null
//     = NOT ALLOCATED
//
// ==========================================================
//
// IMPORTANT
// ----------------------------------------------------------
//
// Negative dwellNumber values are VALID.
//
// Example:
//
//     assetCode: -1
//     dwellNumber: -2
//
// means:
//
//     Farm -1
//     AgroStore -2
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
// DAIRY FARM TYPES
// ==========================================================

const DAIRY_FARM_TYPES = [

    "ranch",
    "zeroGrazing",
    "semiZeroGrazing",
    "pastureBased",
    "mixedFarming",
    "cooperative",
    "other"

];


// ==========================================================
// STRUCTURE / ASSET TYPES
// ==========================================================

const STRUCTURE_TYPES = [

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

];


// ==========================================================
// DAIRY STATUSES
// ==========================================================

const DAIRY_STATUSES = [

    "active",
    "sold",
    "disposed",
    "inactive"

];


// ==========================================================
// HELPER: INTEGER OR NULL
// ==========================================================

function isIntegerOrNull(value) {

    return (

        value === null ||

        value === undefined ||

        Number.isInteger(value)

    );

}


// ==========================================================
// HELPER: NEGATIVE INTEGER OR NULL
// ==========================================================

function isNegativeIntegerOrNull(value) {

    return (

        value === null ||

        value === undefined ||

        (

            Number.isInteger(value) &&

            value < 0

        )

    );

}


// ==========================================================
// HELPER: NORMALIZE PROFILE IMAGE
// ==========================================================

function normalizeProfileImage(
    image,
    name
) {

    if (!image) {

        return (

            "https://ui-avatars.com/api/?name=" +

            `${encodeURIComponent(
                name || "Dairy"
            )}`

        );

    }


    const value = String(image).trim();


    if (!value) {

        return (

            "https://ui-avatars.com/api/?name=" +

            `${encodeURIComponent(
                name || "Dairy"
            )}`

        );

    }


    return value;

}


// ==========================================================
// MAIN DAIRY SCHEMA
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

                validator: function (images) {

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
        // CODE
        // ==================================================
        //
        // NEGATIVE = DAIRY FARM
        // POSITIVE = ANIMAL
        // NULL     = STRUCTURE / ASSET
        //
        // ==================================================

        code: {

            type: Number,

            default: null,

            validate: {

                validator: function (value) {

                    return isIntegerOrNull(value);

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
        // ASSET CODE
        // ==================================================
        //
        // Identifies the parent Dairy Farm.
        //
        // Must be negative when supplied.
        //
        // ==================================================

        assetCode: {

            type: Number,

            default: null,

            validate: {

                validator: function (value) {

                    return isNegativeIntegerOrNull(
                        value
                    );

                },

                message:
                    "assetCode must be a negative Dairy Farm code or null."

            }

        },


        // ==================================================
        // DWELL NUMBER
        // ==================================================
        //
        // >= 0
        //     normal room
        //
        // < 0
        //     AgroStore
        //
        // null
        //     not allocated
        //
        // ==================================================

        dwellNumber: {

            type: Number,

            default: null,

            validate: {

                validator: function (value) {

                    return isIntegerOrNull(value);

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

            default: false

        },


        // ==================================================
        // MAINTENANCE
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

            default: "active"

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
// VIRTUAL: IS DAIRY FARM
// ==========================================================

dairySchema.virtual(
    "isDairyFarm"
).get(function () {

    return (

        this.code !== null &&

        this.code !== undefined &&

        Number(this.code) < 0

    );

});


// ==========================================================
// VIRTUAL: IS ANIMAL
// ==========================================================

dairySchema.virtual(
    "isAnimal"
).get(function () {

    return (

        this.code !== null &&

        this.code !== undefined &&

        Number(this.code) > 0

    );

});


// ==========================================================
// VIRTUAL: IS STRUCTURE
// ==========================================================

dairySchema.virtual(
    "isStructure"
).get(function () {

    return (

        this.code === null ||

        this.code === undefined

    );

});


// ==========================================================
// VIRTUAL: IS MANUAL ASSET
// ==========================================================

dairySchema.virtual(
    "isManualAsset"
).get(function () {

    return this.isStructure;

});


// ==========================================================
// VIRTUAL: IS ASSIGNED ASSET
// ==========================================================

dairySchema.virtual(
    "isAssignedAsset"
).get(function () {

    return (

        this.isStructure &&

        this.assetCode !== null &&

        this.assetCode !== undefined

    );

});


// ==========================================================
// VIRTUAL: IS STANDALONE ASSET
// ==========================================================

dairySchema.virtual(
    "isStandaloneAsset"
).get(function () {

    return (

        this.isStructure &&

        (

            this.assetCode === null ||

            this.assetCode === undefined

        )

    );

});


// ==========================================================
// VIRTUAL: IS DWELLING
// ==========================================================

dairySchema.virtual(
    "isDwelling"
).get(function () {

    return (

        this.dwellNumber !== null &&

        this.dwellNumber !== undefined

    );

});


// ==========================================================
// VIRTUAL: IS NORMAL ROOM
// ==========================================================

dairySchema.virtual(
    "isNormalRoom"
).get(function () {

    return (

        this.dwellNumber !== null &&

        this.dwellNumber !== undefined &&

        Number(this.dwellNumber) >= 0

    );

});


// ==========================================================
// VIRTUAL: IS AGROSTORE CONTENT
// ==========================================================

dairySchema.virtual(
    "isAgroStoreContent"
).get(function () {

    return (

        this.dwellNumber !== null &&

        this.dwellNumber !== undefined &&

        Number(this.dwellNumber) < 0

    );

});


// ==========================================================
// VIRTUAL: STORAGE DWELL NUMBER
// ==========================================================

dairySchema.virtual(
    "storageDwellNumber"
).get(function () {

    return this.isAgroStoreContent

        ? Number(this.dwellNumber)

        : null;

});


// ==========================================================
// VIRTUAL: HAS NEGATIVE DWELL
// ==========================================================

dairySchema.virtual(
    "hasNegativeDwell"
).get(function () {

    return this.isAgroStoreContent;

});


// ==========================================================
// VIRTUAL: PARENT FARM CODE
// ==========================================================

dairySchema.virtual(
    "parentFarmCode"
).get(function () {

    if (this.isDairyFarm) {

        return this.code;

    }


    if (

        this.assetCode !== null &&

        this.assetCode !== undefined

    ) {

        return this.assetCode;

    }


    return null;

});


// ==========================================================
// VIRTUAL: GENDER
// ==========================================================

dairySchema.virtual(
    "gender"
).get(function () {

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

dairySchema.virtual(
    "isFemale"
).get(function () {

    return (

        this.isAnimal &&

        Number(this.code) % 2 === 0

    );

});


// ==========================================================
// VIRTUAL: HAS IDENTITY
// ==========================================================

dairySchema.virtual(
    "hasIdentity"
).get(function () {

    return this.isAnimal;

});


// ==========================================================
// VIRTUAL: AGE TEXT
// ==========================================================

dairySchema.virtual(
    "ageText"
).get(function () {

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

dairySchema.virtual(
    "ageYears"
).get(function () {

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

            now.getDate() <
                dob.getDate()

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

dairySchema.virtual(
    "isMilkingText"
).get(function () {

    return this.isMilking

        ? "Yes"

        : "No";

});


// ==========================================================
// VIRTUAL: DISPLAY IMAGES
// ==========================================================

dairySchema.virtual(
    "displayImages"
).get(function () {

    let images = [];


    if (
        Array.isArray(
            this.profileImages
        )
    ) {

        images =

            this.profileImages

                .filter(Boolean)

                .map(

                    image =>

                        normalizeProfileImage(

                            image,

                            this.name

                        )

                );

    }


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

dairySchema.virtual(
    "displayImage"
).get(function () {

    const images =
        this.displayImages;


    return images.length

        ? images[0]

        : normalizeProfileImage(

            "",

            this.name

        );

});


// ==========================================================
// VIRTUAL: REQUIRES MAINTENANCE
// ==========================================================

dairySchema.virtual(
    "requiresMaintenance"
).get(function () {

    return !!this.needsMaintenance;

});


// ==========================================================
// VIRTUAL: NEEDS MEDICAL ATTENTION
// ==========================================================

dairySchema.virtual(
    "needsMedicalAttention"
).get(function () {

    return !!(

        this.medicalAttention &&

        this.medicalAttention.isMarked

    );

});


// ==========================================================
// VIRTUAL: ASSET VALUE
// ==========================================================

dairySchema.virtual(
    "assetValue"
).get(function () {

    return Number(
        this.currentWorth
    ) || 0;

});


// ==========================================================
// VIRTUAL: ACTIVE ASSET
// ==========================================================

dairySchema.virtual(
    "isActiveAsset"
).get(function () {

    return this.status === "active";

});


// ==========================================================
// VIRTUAL: IDENTIFIED DAIRY
// ==========================================================

dairySchema.virtual(
    "isIdentifiedDairy"
).get(function () {

    return this.isAnimal;

});
// ==========================================================
// models/dairy.js
// DAIRY / ANIMAL / FACILITY / ASSET MODEL
// PART 2 OF 2
// ==========================================================


// ==========================================================
// PRE-VALIDATE
// ==========================================================

dairySchema.pre("validate", function (next) {

    // ------------------------------------------------------
    // PROFILE IMAGES
    // ------------------------------------------------------

    if (!Array.isArray(this.profileImages)) {
        this.profileImages = [];
    }

    this.profileImages = this.profileImages
        .filter(Boolean)
        .map(image => String(image).trim())
        .filter(Boolean)
        .slice(0, MAX_PROFILE_IMAGES);


    // ------------------------------------------------------
    // LEGACY PROFILE IMAGE MIGRATION
    // ------------------------------------------------------

    if (
        this.profileImages.length === 0 &&
        this.profileImage
    ) {
        this.profileImages = [
            String(this.profileImage).trim()
        ];
    }


    // ------------------------------------------------------
    // PRIMARY PROFILE IMAGE
    // ------------------------------------------------------

    if (this.profileImages.length > 0) {

        this.profileImage =
            this.profileImages[0];

    } else {

        this.profileImage = "";

    }


    // ------------------------------------------------------
    // NORMALIZE NULLABLE VALUES
    // ------------------------------------------------------

    if (this.code === undefined) {
        this.code = null;
    }

    if (this.assetCode === undefined) {
        this.assetCode = null;
    }

    if (this.dwellNumber === undefined) {
        this.dwellNumber = null;
    }


    // ======================================================
    // DAIRY FARM
    // ======================================================

    if (this.isDairyFarm) {

        // A farm is a root entity.

        this.assetCode = null;
        this.dwellNumber = null;

        this.dateOfBirth = null;
        this.mass = 0;
        this.isMilking = false;


        // Validate farm type.

        if (
            this.type &&
            !DAIRY_FARM_TYPES.includes(this.type)
        ) {

            const error = new Error(
                `Invalid dairy farm type: ${this.type}.`
            );

            error.status = 400;

            return next(error);

        }

    }


    // ======================================================
    // ANIMAL
    // ======================================================

    if (this.isAnimal) {

        // --------------------------------------------------
        // Male animals cannot be marked as milking.
        // --------------------------------------------------

        if (!this.isFemale) {
            this.isMilking = false;
        }


        // --------------------------------------------------
        // Every animal must belong to a farm.
        // --------------------------------------------------

        if (
            this.assetCode === null ||
            this.assetCode === undefined
        ) {

            const error = new Error(
                "Animal must belong to a Dairy Farm. assetCode is required."
            );

            error.status = 400;

            return next(error);

        }


        // --------------------------------------------------
        // Parent farm code must be negative.
        // --------------------------------------------------

        if (Number(this.assetCode) >= 0) {

            const error = new Error(
                "Animal assetCode must be the negative code of its parent Dairy Farm."
            );

            error.status = 400;

            return next(error);

        }


        // --------------------------------------------------
        // Validate breed.
        // --------------------------------------------------

        if (
            this.type &&
            !DAIRY_BREEDS.includes(this.type)
        ) {

            const error = new Error(
                `Invalid dairy breed: ${this.type}.`
            );

            error.status = 400;

            return next(error);

        }

    }


    // ======================================================
    // STRUCTURE / ASSET
    // ======================================================

    if (this.isStructure) {

        this.dateOfBirth = null;
        this.mass = 0;
        this.isMilking = false;


        // --------------------------------------------------
        // Assigned asset
        // --------------------------------------------------

        if (
            this.assetCode !== null &&
            this.assetCode !== undefined
        ) {

            if (Number(this.assetCode) >= 0) {

                const error = new Error(
                    "Structure assetCode must be the negative code of its parent Dairy Farm."
                );

                error.status = 400;

                return next(error);

            }

        }


        // --------------------------------------------------
        // Validate structure type.
        // --------------------------------------------------

        if (
            this.type &&
            !STRUCTURE_TYPES.includes(this.type)
        ) {

            const error = new Error(
                `Invalid structure type: ${this.type}.`
            );

            error.status = 400;

            return next(error);

        }

    }


    // ======================================================
    // DWELL NUMBER
    // ======================================================
    //
    // Both positive and negative integers are valid.
    //
    // >= 0 = normal room
    // <  0 = AgroStore
    //
    // ======================================================

    if (
        this.dwellNumber !== null &&
        !Number.isInteger(this.dwellNumber)
    ) {

        const error = new Error(
            "dwellNumber must be a whole number or null."
        );

        error.status = 400;

        return next(error);

    }


    // ======================================================
    // MEDICAL ATTENTION NORMALIZATION
    // ======================================================

    if (!this.medicalAttention) {
        this.medicalAttention = {};
    }


    this.medicalAttention.isMarked =
        !!this.medicalAttention.isMarked;


    this.medicalAttention.type =
        String(
            this.medicalAttention.type || ""
        ).trim();


    this.medicalAttention.details =
        String(
            this.medicalAttention.details || ""
        ).trim();


    this.medicalAttention.charges =
        Math.max(
            0,
            Number(
                this.medicalAttention.charges
            ) || 0
        );


    this.medicalAttention.description =
        String(
            this.medicalAttention.description || ""
        ).trim();


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


    // ======================================================
    // CLEAR MEDICAL DATA WHEN NOT MARKED
    // ======================================================

    if (!this.medicalAttention.isMarked) {

        this.medicalAttention.type = "";
        this.medicalAttention.details = "";
        this.medicalAttention.charges = 0;
        this.medicalAttention.description = "";

        /*
         * Do not retain the previous active medical
         * marker once the condition has been cleared.
         */

        this.medicalAttention.markedBy = null;
        this.medicalAttention.markedAt = null;

    }


    next();

});


// ==========================================================
// PRE-SAVE
// ==========================================================

dairySchema.pre("save", function (next) {

    // ======================================================
    // MEDICAL UPDATED DATE
    // ======================================================

    if (
        this.isModified("medicalAttention") &&
        this.medicalAttention
    ) {

        this.medicalAttention.updatedAt =
            new Date();

    }


    // ======================================================
    // ACQUISITION DATE
    // ======================================================

    if (!this.acquisitionDate) {

        this.acquisitionDate =
            this.createdAt || new Date();

    }


    // ======================================================
    // DAIRY FARM NORMALIZATION
    // ======================================================

    if (this.isDairyFarm) {

        this.assetCode = null;
        this.dwellNumber = null;

        this.dateOfBirth = null;
        this.mass = 0;
        this.isMilking = false;

    }


    // ======================================================
    // STRUCTURE NORMALIZATION
    // ======================================================

    if (this.isStructure) {

        this.dateOfBirth = null;
        this.mass = 0;
        this.isMilking = false;

    }


    // ======================================================
    // FINAL DWELL VALIDATION
    // ======================================================

    if (
        this.dwellNumber !== null &&
        this.dwellNumber !== undefined &&
        !Number.isInteger(this.dwellNumber)
    ) {

        const error = new Error(
            "dwellNumber must be a whole number or null."
        );

        error.status = 400;

        return next(error);

    }


    next();

});


// ==========================================================
// INDEXES
// ==========================================================
//
// IMPORTANT:
// Do NOT use `index: true` on a field when the same index is
// also declared below with schema.index().
//
// This avoids the Mongoose duplicate-index warning.
//
// ==========================================================


// ----------------------------------------------------------
// MILKING
// ----------------------------------------------------------

dairySchema.index({
    isMilking: 1
});


// ----------------------------------------------------------
// MAINTENANCE
// ----------------------------------------------------------
//
// This is the ONLY index declaration for needsMaintenance.
// There must NOT also be:
//     needsMaintenance: { type: Boolean, index: true }
// ----------------------------------------------------------

dairySchema.index({
    needsMaintenance: 1
});


// ----------------------------------------------------------
// MEDICAL
// ----------------------------------------------------------

dairySchema.index({
    "medicalAttention.isMarked": 1
});


// ----------------------------------------------------------
// ASSET ASSIGNMENT
// ----------------------------------------------------------

dairySchema.index({
    assetCode: 1,
    status: 1
});


// ----------------------------------------------------------
// DWELLING / ALLOCATION
// ----------------------------------------------------------

dairySchema.index({
    dwellNumber: 1,
    status: 1
});


// ----------------------------------------------------------
// FARM + DWELLING
// ----------------------------------------------------------
//
// Covers:
//
//     Farm room contents
//     Farm AgroStore contents
//
// Example:
//
//     assetCode: -1
//     dwellNumber: -2
//
// ----------------------------------------------------------

dairySchema.index({
    assetCode: 1,
    dwellNumber: 1,
    status: 1
});


// ----------------------------------------------------------
// FACILITY TYPE
// ----------------------------------------------------------

dairySchema.index({
    type: 1,
    status: 1
});


// ----------------------------------------------------------
// CODE UNIQUENESS
// ----------------------------------------------------------
//
// Farms:
//     code < 0
//
// Animals:
//     code > 0
//
// Structures/assets:
//     code === null
//
// Only numeric codes participate in uniqueness.
//
// ----------------------------------------------------------

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
// STATIC: GET FARM ASSETS
// ==========================================================

dairySchema.statics.getFarmAssets =
    function (farmCode) {

        const code = Number(farmCode);

        if (
            !Number.isInteger(code) ||
            code >= 0
        ) {

            return this.find({
                _id: null
            });

        }

        return this.find({
            assetCode: code
        });

    };


// ==========================================================
// STATIC: GET FARM DWELLINGS
// ==========================================================
//
// Returns all entities belonging to the farm that have an
// allocation.
//
// Includes:
//
//     normal rooms
//     AgroStores
//
// ==========================================================

dairySchema.statics.getFarmDwellings =
    function (farmCode) {

        const code = Number(farmCode);

        if (
            !Number.isInteger(code) ||
            code >= 0
        ) {

            return this.find({
                _id: null
            });

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
// Works for both:
//
//     normal rooms
//     AgroStores
//
// Examples:
//
//     getFarmRoomContent(-1, 1)
//     getFarmRoomContent(-1, -1)
//
// ==========================================================

dairySchema.statics.getFarmRoomContent =
    function (
        farmCode,
        roomNumber
    ) {

        const farm = Number(farmCode);
        const room = Number(roomNumber);

        if (
            !Number.isInteger(farm) ||
            farm >= 0 ||
            !Number.isInteger(room)
        ) {

            return this.find({
                _id: null
            });

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

dairySchema.statics.getAgroStoreContent =
    function (
        farmCode,
        agroStoreNumber
    ) {

        const farm = Number(farmCode);
        const store = Number(agroStoreNumber);

        if (
            !Number.isInteger(farm) ||
            farm >= 0 ||
            !Number.isInteger(store) ||
            store >= 0
        ) {

            return this.find({
                _id: null
            });

        }

        return this.find({
            assetCode: farm,
            dwellNumber: store
        });

    };


// ==========================================================
// STATIC: GET FARM NORMAL ROOM CONTENT
// ==========================================================

dairySchema.statics.getFarmNormalRoomContent =
    function (
        farmCode,
        roomNumber
    ) {

        const farm = Number(farmCode);
        const room = Number(roomNumber);

        if (
            !Number.isInteger(farm) ||
            farm >= 0 ||
            !Number.isInteger(room) ||
            room < 0
        ) {

            return this.find({
                _id: null
            });

        }

        return this.find({
            assetCode: farm,
            dwellNumber: room
        });

    };


// ==========================================================
// STATIC: GET ACTIVE ROOM NUMBERS
// ==========================================================
//
// Returns occupied normal-room numbers.
//
// AgroStore numbers are excluded.
//
// ==========================================================

dairySchema.statics.getActiveRoomNumbers =
    async function (farmCode) {

        const farm = Number(farmCode);

        if (
            !Number.isInteger(farm) ||
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

        return result.map(
            item => item._id
        );

    };


// ==========================================================
// STATIC: GET ACTIVE AGROSTORE NUMBERS
// ==========================================================
//
// Returns negative dwell numbers currently occupied by
// AgroStore contents.
//
// ==========================================================

dairySchema.statics.getActiveAgroStoreNumbers =
    async function (farmCode) {

        const farm = Number(farmCode);

        if (
            !Number.isInteger(farm) ||
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

        return result.map(
            item => item._id
        );

    };


// ==========================================================
// STATIC: GET FARM AGROSTORE CONTENTS
// ==========================================================
//
// Returns every active entity allocated to an AgroStore
// belonging to the specified farm.
//
// ==========================================================

dairySchema.statics.getFarmAgroStoreContents =
    function (farmCode) {

        const farm = Number(farmCode);

        if (
            !Number.isInteger(farm) ||
            farm >= 0
        ) {

            return this.find({
                _id: null
            });

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

dairySchema.statics.getStandaloneAssets =
    function () {

        return this.find({
            code: null,
            assetCode: null
        });

    };


// ==========================================================
// STATIC: GET DAIRY BREEDS
// ==========================================================

dairySchema.statics.getDairyBreeds =
    function () {

        return [
            ...DAIRY_BREEDS
        ];

    };


// ==========================================================
// STATIC: GET DAIRY FARM TYPES
// ==========================================================

dairySchema.statics.getDairyFarmTypes =
    function () {

        return [
            ...DAIRY_FARM_TYPES
        ];

    };


// ==========================================================
// STATIC: GET STRUCTURE TYPES
// ==========================================================

dairySchema.statics.getStructureTypes =
    function () {

        return [
            ...STRUCTURE_TYPES
        ];

    };


// ==========================================================
// STATIC: GET STATUSES
// ==========================================================

dairySchema.statics.getDairyStatuses =
    function () {

        return [
            ...DAIRY_STATUSES
        ];

    };


// ==========================================================
// STATIC: GET MAX PROFILE IMAGES
// ==========================================================

dairySchema.statics.getMaxProfileImages =
    function () {

        return MAX_PROFILE_IMAGES;

    };


// ==========================================================
// STATIC: CALCULATE NET WORTH
// ==========================================================
//
// Current worth of all active records.
//
// ==========================================================

dairySchema.statics.calculateNetWorth =
    async function () {

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
                        $sum: "$currentWorth"
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

dairySchema.statics.getTotalCurrentWorth =
    async function () {

        return this.calculateNetWorth();

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