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
// ROOM / DWELLING
// ----------------------------------------------------------
//
// dwellNumber
//     = physical room/location where an animal or asset
//       is accommodated.
//
// Normal rooms:
//
//     dwellNumber >= 0
//
// IMPORTANT:
//
//     Anything having assetCode MUST NEVER have a
//     negative dwellNumber.
//
// Therefore:
//
//     assetCode != null
//         -> dwellNumber must be null or >= 0
//
// Negative room numbers are reserved for special storage
// facilities represented by DairyStorage.
//
// ==========================================================
//
// STORAGE
// ----------------------------------------------------------
//
// Storage is NOT represented by storageNumber anymore.
//
// Storage is represented by:
//
//     models/dairyStorage.js
//
// Normal rooms:
//
//     roomNumber >= 0
//
// Special AgroStores:
//
//     roomNumber < 0
//
// Examples:
//
//     AgroStore -1
//     AgroStore -2
//     AgroStore -3
//
// ==========================================================
//
// ROOM EXISTENCE
// ----------------------------------------------------------
//
// A normal room exists only when a Dairy entity has:
//
//     dwellNumber = roomNumber
//
// Room names are managed by the frontend.
//
// If a room has no configured name:
//
//     Room 1
//     Room 2
//     Room 3
//
// etc.
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
        // Must always be negative when supplied.
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
        // DWELL NUMBER
        // ==================================================
        //
        // Identifies the room/location where this entity
        // is physically accommodated.
        //
        // Normal rooms:
        //
        //     0
        //     1
        //     2
        //     3
        //     ...
        //
        // Negative dwell numbers are NOT permitted for
        // anything having assetCode.
        //
        // ==================================================

        dwellNumber: {

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

                    if (
                        !Number.isInteger(value)
                    ) {

                        return false;

                    }

                    // --------------------------------------
                    // An entity belonging to a farm through
                    // assetCode can NEVER use a negative
                    // dwellNumber.
                    // --------------------------------------

                    if (

                        this.assetCode !== null &&

                        this.assetCode !== undefined &&

                        value < 0

                    ) {

                        return false;

                    }

                    return true;

                },

                message:
                    "An entity with assetCode cannot have a negative dwellNumber."

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
//
// True when the entity has been placed inside a normal
// room.
//
// ==========================================================

dairySchema.virtual(
    "isDwelling"
).get(function () {

    return (

        this.dwellNumber !== null &&

        this.dwellNumber !== undefined &&

        Number(this.dwellNumber) >= 0

    );

});


// ==========================================================
// VIRTUAL: HAS NEGATIVE DWELL
// ==========================================================
//
// Negative dwelling is never permitted for an entity with
// assetCode.
//
// This virtual is mainly useful for diagnostics.
//
// ==========================================================

dairySchema.virtual(
    "hasNegativeDwell"
).get(function () {

    return (

        this.dwellNumber !== null &&

        this.dwellNumber !== undefined &&

        Number(this.dwellNumber) < 0

    );

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
        // NORMALIZE DWELL NUMBER
        // ==================================================

        if (
            this.dwellNumber === undefined
        ) {

            this.dwellNumber = null;

        }


        // ==================================================
        // DAIRY FARM
        // ==================================================

        if (
            this.isDairyFarm
        ) {

            this.assetCode = null;

            this.dwellNumber = null;

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
            // Animal can only dwell in a normal room.
            // ----------------------------------------------

            if (

                this.dwellNumber !== null &&

                Number(this.dwellNumber) < 0

            ) {

                const error =

                    new Error(

                        "An animal with assetCode can never have a negative dwellNumber."

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
            // ASSET WITH A PARENT FARM
            // ----------------------------------------------

            if (

                this.assetCode !== null &&

                this.assetCode !== undefined

            ) {

                if (
                    Number(this.assetCode) >= 0
                ) {

                    const error =

                        new Error(

                            "Structure assetCode must be the negative code of its parent Dairy Farm."

                        );


                    error.status = 400;


                    return next(error);

                }


                // ------------------------------------------
                // CRITICAL RULE
                //
                // Assets with assetCode may NEVER have a
                // negative dwellNumber.
                // ------------------------------------------

                if (

                    this.dwellNumber !== null &&

                    Number(this.dwellNumber) < 0

                ) {

                    const error =

                        new Error(

                            "Anything with assetCode can never have a negative dwellNumber."

                        );


                    error.status = 400;


                    return next(error);

                }

            }


            // ----------------------------------------------
            // Standalone asset with negative dwell is not
            // allowed to represent an AgroStore.
            //
            // AgroStore belongs to DairyStorage.
            // ----------------------------------------------

            if (

                this.dwellNumber !== null &&

                !Number.isInteger(
                    this.dwellNumber
                )

            ) {

                const error =

                    new Error(

                        "dwellNumber must be a whole number or null."

                    );


                error.status = 400;


                return next(error);

            }


            // ----------------------------------------------
            // Validate structure type.
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
        // GLOBAL DWELL VALIDATION
        // ==================================================
        //
        // Anything with assetCode can NEVER have negative
        // dwellNumber.
        //
        // ==================================================

        if (

            this.assetCode !== null &&

            this.assetCode !== undefined &&

            this.dwellNumber !== null &&

            this.dwellNumber !== undefined &&

            Number(this.dwellNumber) < 0

        ) {

            const error =

                new Error(

                    "An entity with assetCode cannot have a negative dwellNumber."

                );


            error.status = 400;


            return next(error);

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

            this.dwellNumber = null;

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
        // FINAL ASSET/DWELL SAFETY
        // ==================================================

        if (

            this.assetCode !== null &&

            this.assetCode !== undefined &&

            this.dwellNumber !== null &&

            this.dwellNumber !== undefined &&

            Number(this.dwellNumber) < 0

        ) {

            const error =

                new Error(

                    "Anything with assetCode can never have a negative dwellNumber."

                );


            error.status = 400;


            return next(error);

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
// DWELLING
// ==========================================================
//
// Used to find everything occupying a room.
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
// Very useful when retrieving all entities belonging to
// a farm that occupy a particular room.
//
// ==========================================================

dairySchema.index({

    assetCode: 1,

    dwellNumber: 1,

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
// STATIC: GET FARM ASSETS
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
// STATIC: GET FARM DWELLINGS
// ==========================================================
//
// Returns all animals/assets belonging to a farm that
// occupy normal rooms.
//
// Negative dwellings are excluded.
//
// ==========================================================

dairySchema.statics.getFarmDwellings =

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

            assetCode: code,

            dwellNumber: {

                $gte: 0

            }

        });

    };


// ==========================================================
// STATIC: GET FARM ROOM CONTENT
// ==========================================================
//
// Returns everything in a particular room.
//
// Example:
//
//     Dairy.getFarmRoomContent(-1, 1)
//
// ==========================================================

dairySchema.statics.getFarmRoomContent =

    function (
        farmCode,
        roomNumber
    ) {

        const farm =
            Number(farmCode);

        const room =
            Number(roomNumber);


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
// Returns the normal room numbers currently occupied by
// entities belonging to the farm.
//
// A room exists only when something has that dwellNumber.
//
// ==========================================================

dairySchema.statics.getActiveRoomNumbers =

    async function (
        farmCode
    ) {

        const farm =
            Number(farmCode);


        if (

            !Number.isInteger(farm) ||

            farm >= 0

        ) {

            return [];

        }


        const result =

            await this.aggregate([

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

                        _id:
                            "$dwellNumber"

                    }

                },

                {

                    $sort: {

                        _id: 1

                    }

                }

            ]);


        return result.map(

            item =>
                item._id

        );

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