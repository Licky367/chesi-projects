// ==========================================================
// models/dairy.js
// ==========================================================
//
// DAIRY / ANIMAL / FACILITY / ASSET MODEL
//
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
// STORAGE FACILITY
// ----------------------------------------------------------
//
// Storage is a special facility.
//
// It is identified by:
//
//     storageNumber
//
// Example:
//
//     storageNumber = -1
//
// means:
//
//     Storage Facility belonging to
//     Dairy Farm code -1.
//
// A storage facility:
//
//     code          = null
//     assetCode     = null
//     storageNumber = negative farm code
//
// There may be:
//
//     ZERO storage facilities
//     ONE storage facility
//
// per Dairy Farm.
//
// MongoDB enforces this uniqueness.
//
// ==========================================================
//
// FEED / MEDICINE STOCK
// ----------------------------------------------------------
//
// FeedStock is NOT embedded in this model.
//
// FeedStock remains an independent MongoDB collection.
//
// A storage facility can be the physical owner/location
// of FeedStock.
//
// The relationship is exposed through the virtual:
//
//     feedStocks
//
// and:
//
//     feedStockCount
//
// IMPORTANT:
//
// These are virtual relationships only.
//
// No FeedStock documents are duplicated inside Dairy.
//
// ==========================================================
//
// IMPORTANT
// ----------------------------------------------------------
//
// feedStore is NO LONGER a structure type.
//
// feedStock.js remains an independent model.
//
// Storage facilities are represented by Dairy documents
// using:
//
//     code          = null
//     assetCode     = null
//     storageNumber = negative farm code
//
// ==========================================================

const mongoose =
    require("mongoose");


// ==========================================================
// CONSTANTS
// ==========================================================


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
// STRUCTURE / FACILITY TYPES
// ==========================================================
//
// IMPORTANT:
//
// 
//
// Storage facilities are identified by
// storageNumber instead.
//
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
// PROFILE IMAGE LIMIT
// ==========================================================

const MAX_PROFILE_IMAGES = 5;


// ==========================================================
// STOCK RELATIONSHIP NOTES
// ==========================================================
//
// FeedStock is intentionally NOT required here at schema
// validation time.
//
// This prevents circular model dependency:
//
//     Dairy -> FeedStock -> Dairy
//
// The relationship is implemented using a Mongoose virtual.
//
// FeedStock documents can reference the Dairy document
// representing the storage facility.
//
// ==========================================================


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
        //
        // POSITIVE = ANIMAL
        //
        // NULL     = FACILITY / ASSET
        //
        // ==================================================

        code: {

            type: Number,

            default: null,

            validate: {

                validator: function (value) {

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

            trim: true,

            maxlength: 200

        },


        // ==================================================
        // DATE OF BIRTH
        // ==================================================
        //
        // Used by animals.
        //
        // Farms and facilities have no DOB.
        //
        // ==================================================

        dateOfBirth: {

            type: Date,

            default: null

        },


        // ==================================================
        // MASS
        // ==================================================
        //
        // Used by animals.
        //
        // Farms and facilities are normalized to 0.
        //
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
        // This identifies the Dairy Farm to which an
        // animal or asset belongs.
        //
        // Animals:
        //
        //     assetCode = negative farm code
        //
        // Assigned assets:
        //
        //     assetCode = negative farm code
        //
        // Standalone assets:
        //
        //     assetCode = null
        //
        // Dairy Farms:
        //
        //     assetCode = null
        //
        // STORAGE FACILITIES:
        //
        //     assetCode = null
        //
        // because storage ownership is identified through
        // storageNumber.
        //
        // ==================================================

        assetCode: {

            type: Number,

            default: null,

            validate: {

                validator: function (value) {

                    if (

                        value === null ||

                        value === undefined

                    ) {

                        return true;

                    }

                    return (

                        Number.isInteger(value) &&

                        value < 0

                    );

                },

                message:
                    "assetCode must be a negative Dairy Farm code or null."

            }

        },


        // ==================================================
        // STORAGE NUMBER
        // ==================================================
        //
        // This identifies a storage facility's parent farm.
        //
        // Example:
        //
        //     storageNumber = -1
        //
        // means:
        //
        //     storage facility belonging to
        //     Dairy Farm code -1.
        //
        // A storage facility:
        //
        //     code          = null
        //     assetCode     = null
        //     storageNumber = negative farm code
        //
        // Non-storage entities:
        //
        //     storageNumber = null
        //
        // ==================================================

        storageNumber: {

            type: Number,

            default: null,

            validate: {

                validator: function (value) {

                    if (

                        value === null ||

                        value === undefined

                    ) {

                        return true;

                    }

                    return (

                        Number.isInteger(value) &&

                        value < 0

                    );

                },

                message:
                    "storageNumber must be a negative Dairy Farm code or null."

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
        //
        // Dairy Farm:
        //
        //     DAIRY_FARM_TYPES
        //
        // Animal:
        //
        //     DAIRY_BREEDS
        //
        // Facility / Asset:
        //
        //     STRUCTURE_TYPES
        //
        // Storage facility:
        //
        //     identified by storageNumber
        //
        //     type may be empty.
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
//
// Any entity with no code is a facility/asset.
//
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

        this.assetCode !== undefined &&

        !this.isStorageFacility

    );

});


// ==========================================================
// VIRTUAL: IS STANDALONE ASSET
// ==========================================================
//
// Standalone asset:
//
//     no code
//     no assetCode
//     no storageNumber
//
// ==========================================================

dairySchema.virtual(
    "isStandaloneAsset"
).get(function () {

    return (

        this.isStructure &&

        (

            this.assetCode === null ||

            this.assetCode === undefined

        ) &&

        (

            this.storageNumber === null ||

            this.storageNumber === undefined

        )

    );

});


// ==========================================================
// VIRTUAL: IS STORAGE FACILITY
// ==========================================================
//
// A storage facility is identified ONLY by storageNumber.
//
// ==========================================================

dairySchema.virtual(
    "isStorageFacility"
).get(function () {

    return (

        this.isStructure &&

        this.storageNumber !== null &&

        this.storageNumber !== undefined &&

        Number(this.storageNumber) < 0

    );

});


// ==========================================================
// VIRTUAL: HAS FEED STOCK
// ==========================================================
//
// This is a logical helper.
//
// The actual stock remains in FeedStock collection.
//
// ==========================================================

dairySchema.virtual(
    "hasFeedStock"
).get(function () {

    return this.isStorageFacility;

});


// ==========================================================
// VIRTUAL: FEED STOCK OWNER
// ==========================================================
//
// FeedStock records belonging to a storage facility should
// use this Dairy document's _id as their owner reference.
//
// ==========================================================

dairySchema.virtual(
    "feedStockOwnerId"
).get(function () {

    if (!this.isStorageFacility) {

        return null;

    }

    return this._id || null;

});


// ==========================================================
// VIRTUAL: PARENT FARM CODE
// ==========================================================
//
// For storage:
//
//     storageNumber
//
// For assets/animals:
//
//     assetCode
//
// ==========================================================

dairySchema.virtual(
    "parentFarmCode"
).get(function () {

    if (this.isDairyFarm) {

        return this.code;

    }

    if (this.isStorageFacility) {

        return this.storageNumber;

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
// HELPER: NORMALIZE PROFILE IMAGE
// ==========================================================

function normalizeProfileImage(
    image,
    name
) {

    if (!image) {

        return (

            `https://ui-avatars.com/api/?name=` +

            `${encodeURIComponent(
                name || "Dairy"
            )}`

        );

    }

    if (

        /^https?:\/\//i.test(
            String(image)
        )

    ) {

        return String(image);

    }

    if (

        String(image).startsWith("/")

    ) {

        return String(image);

    }

    return String(image);

}


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
// VIRTUAL: FEED STOCK RELATIONSHIP
// ==========================================================
//
// FeedStock is an independent model.
//
// The FeedStock document should contain:
//
//     dairy: <storage facility _id>
//
// This virtual allows:
//
//     storage.feedStocks
//
// to populate FeedStock documents.
//
// ==========================================================

dairySchema.virtual(
    "feedStocks",
    {

        ref: "FeedStock",

        localField: "_id",

        foreignField: "dairy",

        justOne: false

    }

);


// ==========================================================
// VIRTUAL: FEED STOCK COUNT
// ==========================================================
//
// This can be populated using:
//
//     {
//         path: "feedStockCount"
//     }
//
// ==========================================================

dairySchema.virtual(
    "feedStockCount",
    {

        ref: "FeedStock",

        localField: "_id",

        foreignField: "dairy",

        count: true

    }

);


// ==========================================================
// PRE VALIDATE
// ==========================================================

dairySchema.pre(
    "validate",
    function (next) {

        // ==================================================
        // PROFILE IMAGES
        // ==================================================

        if (
            !Array.isArray(
                this.profileImages
            )
        ) {

            this.profileImages = [];

        }


        this.profileImages =

            this.profileImages

                .filter(Boolean)

                .map(

                    image =>

                        String(
                            image
                        ).trim()

                )

                .filter(Boolean)

                .slice(

                    0,

                    MAX_PROFILE_IMAGES

                );


        // ==================================================
        // LEGACY PROFILE IMAGE MIGRATION
        // ==================================================

        if (

            this.profileImages.length === 0 &&

            this.profileImage

        ) {

            this.profileImages = [

                String(
                    this.profileImage
                ).trim()

            ];

        }


        // ==================================================
        // PRIMARY PROFILE IMAGE
        // ==================================================

        if (
            this.profileImages.length > 0
        ) {

            this.profileImage =
                this.profileImages[0];

        } else {

            this.profileImage = "";

        }


        // ==================================================
        // NORMALIZE CODE
        // ==================================================

        if (
            this.code === undefined
        ) {

            this.code = null;

        }


        // ==================================================
        // NORMALIZE ASSET CODE
        // ==================================================

        if (
            this.assetCode === undefined
        ) {

            this.assetCode = null;

        }


        // ==================================================
        // NORMALIZE STORAGE NUMBER
        // ==================================================

        if (
            this.storageNumber === undefined
        ) {

            this.storageNumber = null;

        }


        // ==================================================
        // STORAGE FACILITY
        // ==================================================
        //
        // Storage facilities are:
        //
        //     code          = null
        //     assetCode     = null
        //     storageNumber = negative farm code
        //
        // ==================================================

        if (
            this.storageNumber !== null
        ) {

            // ----------------------------------------------
            // Storage cannot have an identity code.
            // ----------------------------------------------

            if (
                this.code !== null
            ) {

                const error =

                    new Error(

                        "A storage facility cannot have a code."

                    );


                error.status = 400;


                return next(error);

            }


            // ----------------------------------------------
            // Storage cannot use assetCode.
            // ----------------------------------------------

            if (
                this.assetCode !== null
            ) {

                const error =

                    new Error(

                        "A storage facility cannot have assetCode. Use storageNumber."

                    );


                error.status = 400;


                return next(error);

            }


            // ----------------------------------------------
            // Storage number must be negative.
            // ----------------------------------------------

            if (

                !Number.isInteger(
                    this.storageNumber
                ) ||

                this.storageNumber >= 0

            ) {

                const error =

                    new Error(

                        "storageNumber must be the negative code of the parent Dairy Farm."

                    );


                error.status = 400;


                return next(error);

            }

        }


        // ==================================================
        // DAIRY FARM
        // ==================================================

        if (
            this.isDairyFarm
        ) {

            this.assetCode = null;

            this.storageNumber = null;

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;


            // ----------------------------------------------
            // Validate farm type.
            // ----------------------------------------------

            if (

                this.type &&

                !DAIRY_FARM_TYPES.includes(
                    this.type
                )

            ) {

                const error =

                    new Error(

                        `Invalid dairy farm type: ${this.type}.`

                    );


                error.status = 400;


                return next(error);

            }

        }


        // ==================================================
        // ANIMAL
        // ==================================================

        if (
            this.isAnimal
        ) {

            // ----------------------------------------------
            // Animal cannot be storage.
            // ----------------------------------------------

            if (
                this.storageNumber !== null
            ) {

                const error =

                    new Error(

                        "An animal cannot have storageNumber."

                    );


                error.status = 400;


                return next(error);

            }


            // ----------------------------------------------
            // Male animals cannot milk.
            // ----------------------------------------------

            if (
                !this.isFemale
            ) {

                this.isMilking = false;

            }


            // ----------------------------------------------
            // Animal must belong to a farm.
            // ----------------------------------------------

            if (

                this.assetCode === null ||

                this.assetCode === undefined

            ) {

                const error =

                    new Error(

                        "Animal must belong to a Dairy Farm. assetCode is required."

                    );


                error.status = 400;


                return next(error);

            }


            // ----------------------------------------------
            // Animal parent must be negative.
            // ----------------------------------------------

            if (
                Number(this.assetCode) >= 0
            ) {

                const error =

                    new Error(

                        "Animal assetCode must be the negative code of its parent Dairy Farm."

                    );


                error.status = 400;


                return next(error);

            }


            // ----------------------------------------------
            // Validate breed.
            // ----------------------------------------------

            if (

                this.type &&

                !DAIRY_BREEDS.includes(
                    this.type
                )

            ) {

                const error =

                    new Error(

                        `Invalid dairy breed: ${this.type}.`

                    );


                error.status = 400;


                return next(error);

            }

        }


        // ==================================================
        // STRUCTURE / ASSET
        // ==================================================

        if (
            this.isStructure
        ) {

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;


            // ----------------------------------------------
            // STORAGE IS A SPECIAL FACILITY
            // ----------------------------------------------

            if (
                this.isStorageFacility
            ) {

                // ==========================================
                // Storage cannot have assetCode.
                // ==========================================

                this.assetCode = null;

                // ==========================================
                // Storage does not need a structure type.
                // ==========================================

            }


            // ----------------------------------------------
            // Validate assigned asset parent.
            // ----------------------------------------------

            if (

                this.assetCode !== null &&

                this.assetCode !== undefined &&

                Number(this.assetCode) >= 0

            ) {

                const error =

                    new Error(

                        "Structure assetCode must be the negative code of its parent Dairy Farm."

                    );


                error.status = 400;


                return next(error);

            }


            // ----------------------------------------------
            // Validate structure type.
            //
            // Storage facilities do not require a type.
            // ----------------------------------------------

            if (

                this.type &&

                !STRUCTURE_TYPES.includes(
                    this.type
                )

            ) {

                const error =

                    new Error(

                        `Invalid structure type: ${this.type}.`

                    );


                error.status = 400;


                return next(error);

            }

        }


        // ==================================================
        // MEDICAL OBJECT
        // ==================================================

        if (
            !this.medicalAttention
        ) {

            this.medicalAttention = {};

        }


        this.medicalAttention.isMarked =

            !!this.medicalAttention.isMarked;


        this.medicalAttention.type =

            String(
                this.medicalAttention.type ||
                ""
            )
            .trim();


        this.medicalAttention.details =

            String(
                this.medicalAttention.details ||
                ""
            )
            .trim();


        this.medicalAttention.charges =

            Math.max(

                0,

                Number(
                    this.medicalAttention.charges
                ) || 0

            );


        this.medicalAttention.description =

            String(
                this.medicalAttention.description ||
                ""
            )
            .trim();


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
    function (next) {

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
        // ==================================================

        if (!this.acquisitionDate) {

            this.acquisitionDate =

                this.createdAt ||

                new Date();

        }


        // ==================================================
        // DAIRY FARM NORMALIZATION
        // ==================================================

        if (
            this.isDairyFarm
        ) {

            this.assetCode = null;

            this.storageNumber = null;

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;

        }


        // ==================================================
        // STRUCTURE NORMALIZATION
        // ==================================================

        if (
            this.isStructure
        ) {

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;

        }


        // ==================================================
        // FINAL STORAGE NORMALIZATION
        // ==================================================

        if (
            this.isStorageFacility
        ) {

            this.code = null;

            this.assetCode = null;

            this.dateOfBirth = null;

            this.mass = 0;

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
// FACILITY TYPE
// ==========================================================

dairySchema.index({

    type: 1,

    status: 1

});


// ==========================================================
// STORAGE NUMBER
// ==========================================================
//
// ONLY ONE STORAGE FACILITY PER FARM.
//
// Example:
//
//     storageNumber = -1
//
// can occur only once.
//
// ==========================================================

dairySchema.index(

    {

        storageNumber: 1

    },

    {

        unique: true,

        partialFilterExpression: {

            storageNumber: {

                $type: "number"

            }

        }

    }

);


// ==========================================================
// CODE UNIQUENESS
// ==========================================================
//
// Numeric codes must be unique.
//
// Structures/facilities use code = null and are excluded.
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
// STATIC: GET STORAGE FACILITY
// ==========================================================
//
// Finds the storage facility belonging to a Dairy Farm.
//
// Example:
//
//     Dairy.getStorageFacility(-1)
//
// ==========================================================

dairySchema.statics.getStorageFacility =

    async function (
        farmCode
    ) {

        const code =
            Number(farmCode);


        if (

            !Number.isInteger(code) ||

            code >= 0

        ) {

            return null;

        }


        return this.findOne({

            storageNumber: code

        });

    };


// ==========================================================
// STATIC: HAS STORAGE FACILITY
// ==========================================================

dairySchema.statics.hasStorageFacility =

    async function (
        farmCode
    ) {

        const code =
            Number(farmCode);


        if (

            !Number.isInteger(code) ||

            code >= 0

        ) {

            return false;

        }


        const storage =

            await this.findOne({

                storageNumber: code

            })

            .select("_id")

            .lean();


        return !!storage;

    };


// ==========================================================
// STATIC: GET FARM ASSETS
// ==========================================================
//
// Returns assets belonging to a farm through assetCode.
//
// Storage facilities are deliberately excluded because
// storage ownership uses storageNumber.
//
// ==========================================================

dairySchema.statics.getFarmAssets =

    function (
        farmCode
    ) {

        const code =
            Number(farmCode);


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
// STATIC: GET FARM STORAGE
// ==========================================================

dairySchema.statics.getFarmStorage =

    function (
        farmCode
    ) {

        const code =
            Number(farmCode);


        if (

            !Number.isInteger(code) ||

            code >= 0

        ) {

            return this.find({

                _id: null

            });

        }


        return this.find({

            storageNumber: code

        });

    };


// ==========================================================
// STATIC: GET STANDALONE ASSETS
// ==========================================================
//
// Standalone assets:
//
//     code = null
//     assetCode = null
//     storageNumber = null
//
// ==========================================================

dairySchema.statics.getStandaloneAssets =

    function () {

        return this.find({

            code: null,

            assetCode: null,

            storageNumber: null

        });

    };


// ==========================================================
// STATIC: GET STORAGE STOCK OWNER
// ==========================================================
//
// Returns the storage facility that should own stock
// belonging to a particular Dairy Farm.
//
// Example:
//
//     Dairy.getStorageStockOwner(-1)
//
// ==========================================================

dairySchema.statics.getStorageStockOwner =

    async function (
        farmCode
    ) {

        const code =
            Number(farmCode);


        if (

            !Number.isInteger(code) ||

            code >= 0

        ) {

            return null;

        }


        return this.findOne({

            storageNumber: code

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

dairySchema.statics.calculateNetWorth =

    async function () {

        const result =

            await this.aggregate([

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

            ]);


        return result.length

            ? Number(

                result[0].totalNetWorth ||
                0

            )

            : 0;

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