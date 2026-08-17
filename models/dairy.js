// ==========================================================
// models/dairy.js
// ==========================================================

const mongoose = require("mongoose");


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
    "feedStore",
    "hayShed",
    "waterSystem",
    "fencing",
    "vehicle",
    "generator",
    "solarSystem",
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
// FEED STORE STOCK SUBDOCUMENT
// ==========================================================
//
// IMPORTANT
// ----------------------------------------------------------
//
// This represents CURRENT feed inventory.
//
// Historical feed-store activity does NOT belong here.
//
// Historical activity belongs to:
//
//     models/Update.js
//
// through:
//
//     update.feedStore
//
// Each Dairy feed store can therefore contain:
//
//     feedStocks: [
//
//         {
//             name,
//             percentageRemaining,
//             feedsAmount
//         }
//
//     ]
//
// The parent Dairy.feedsAmount is always recalculated from
// feedStocks[].feedsAmount.
//
// ==========================================================

const feedStockSchema = new mongoose.Schema(

    {

        // ==================================================
        // FEED NAME
        // ==================================================
        //
        // Examples:
        //
        //     Maize silage
        //     Rhodes grass hay
        //     Dairy meal
        //     Mineral supplement
        //
        // ==================================================

        name: {

            type: String,

            required: true,

            trim: true

        },


        // ==================================================
        // PERCENTAGE REMAINING
        // ==================================================
        //
        // Current estimated stock level.
        //
        //     0   = empty
        //     100 = fully stocked
        //
        // ==================================================

        percentageRemaining: {

            type: Number,

            min: 0,

            max: 100,

            default: 0

        },


        // ==================================================
        // FEEDS AMOUNT
        // ==================================================
        //
        // Current financial value associated with this
        // particular feed stock.
        //
        // The parent Dairy.feedsAmount is the sum of all
        // feedStocks[].feedsAmount values.
        //
        // ==================================================

        feedsAmount: {

            type: Number,

            min: 0,

            default: 0

        }

    },

    {

        _id: true

    }

);


// ==========================================================
// SCHEMA
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

                validator: function(images) {

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
        // LEGACY / PRIMARY PROFILE IMAGE
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
        // NULL     = STRUCTURE / FACILITY
        //
        // Assigned by the backend.
        //
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

        assetCode: {

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
        // ==================================================
        //
        // For structures:
        //
        //     feedStore
        //     hayShed
        //     cowshed
        //     etc.
        //
        // For animals:
        //
        //     Friesian
        //     Jersey
        //     etc.
        //
        // ==================================================

        type: {

            type: String,

            trim: true,

            default: ""

        },


        // ==================================================
        // CURRENT FEED STORE STOCK
        // ==================================================
        //
        // IMPORTANT:
        //
        // This is CURRENT STATE.
        //
        // It is not the feed activity/history.
        //
        // Activity/history is stored in Update.feedStore.
        //
        // ==================================================

        feedStocks: {

            type: [

                feedStockSchema

            ],

            default: []

        },


        // ==================================================
        // TOTAL FEEDS AMOUNT
        // ==================================================
        //
        // This MUST always equal:
        //
        //     SUM(
        //         feedStocks[].feedsAmount
        //     )
        //
        // Controllers should update individual stock entries.
        //
        // The model then synchronizes this aggregate.
        //
        // ==================================================

        feedsAmount: {

            type: Number,

            min: 0,

            default: 0

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
// VIRTUAL: IS DAIRY FARM
// ==========================================================

dairySchema.virtual("isDairyFarm").get(function() {

    return (

        this.code !== null &&
        this.code !== undefined &&
        Number(this.code) < 0

    );

});


// ==========================================================
// VIRTUAL: IS ANIMAL
// ==========================================================

dairySchema.virtual("isAnimal").get(function() {

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

        this.code === null ||
        this.code === undefined

    );

});


// ==========================================================
// VIRTUAL: IS MANUAL ASSET
// ==========================================================

dairySchema.virtual("isManualAsset").get(function() {

    return this.isStructure;

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
// VIRTUAL: IS STANDALONE ASSET
// ==========================================================

dairySchema.virtual("isStandaloneAsset").get(function() {

    return (

        this.isStructure &&

        (
            this.assetCode === null ||
            this.assetCode === undefined
        )

    );

});


// ==========================================================
// VIRTUAL: IS FEED STORE
// ==========================================================

dairySchema.virtual("isFeedStore").get(function() {

    return (

        this.isStructure &&
        this.type === "feedStore"

    );

});


// ==========================================================
// VIRTUAL: GENDER
// ==========================================================

dairySchema.virtual("gender").get(function() {

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

dairySchema.virtual("isFemale").get(function() {

    return (

        this.isAnimal &&
        Number(this.code) % 2 === 0

    );

});


// ==========================================================
// VIRTUAL: HAS IDENTITY
// ==========================================================

dairySchema.virtual("hasIdentity").get(function() {

    return this.isAnimal;

});


// ==========================================================
// VIRTUAL: AGE TEXT
// ==========================================================

dairySchema.virtual("ageText").get(function() {

    if (!this.dateOfBirth) {

        return "";

    }

    const dob =
        new Date(this.dateOfBirth);

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
        new Date(this.dateOfBirth);

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


    return `/uploads/${String(image)}`;

}


// ==========================================================
// VIRTUAL: DISPLAY IMAGES
// ==========================================================

dairySchema.virtual("displayImages").get(function() {

    let images = [];


    // ======================================================
    // PROFILE IMAGE ARRAY
    // ======================================================

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


    // ======================================================
    // LEGACY FALLBACK
    // ======================================================

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


    // ======================================================
    // DEFAULT IMAGE
    // ======================================================

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

dairySchema.virtual("displayImage").get(function() {

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
// VIRTUAL: IDENTIFIED DAIRY
// ==========================================================

dairySchema.virtual("isIdentifiedDairy").get(function() {

    return this.isAnimal;

});


// ==========================================================
// PRE VALIDATE
// ==========================================================

dairySchema.pre(
    "validate",
    function(next) {

        // ==================================================
        // NORMALIZE PROFILE IMAGES
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
                        String(image).trim()
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
        // SYNCHRONIZE PRIMARY IMAGE
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
        // NORMALIZE FEED STOCKS
        // ==================================================

        if (
            !Array.isArray(
                this.feedStocks
            )
        ) {

            this.feedStocks = [];

        }


        this.feedStocks =

            this.feedStocks

                .filter(
                    stock =>
                        stock
                )

                .map(
                    stock => {

                        // ==================================
                        // NAME
                        // ==================================

                        stock.name =
                            String(
                                stock.name || ""
                            ).trim();


                        // ==================================
                        // PERCENTAGE
                        // ==================================

                        stock.percentageRemaining =
                            Number(
                                stock.percentageRemaining
                            ) || 0;


                        stock.percentageRemaining =
                            Math.max(
                                0,
                                Math.min(
                                    100,
                                    stock.percentageRemaining
                                )
                            );


                        // ==================================
                        // FEEDS AMOUNT
                        // ==================================

                        stock.feedsAmount =
                            Number(
                                stock.feedsAmount
                            ) || 0;


                        if (
                            stock.feedsAmount < 0
                        ) {

                            stock.feedsAmount = 0;

                        }


                        return stock;

                    }
                )

                .filter(
                    stock =>
                        stock.name.length > 0
                );


        // ==================================================
        // CALCULATE TOTAL FEEDS AMOUNT
        // ==================================================
        //
        // NEVER trust a manually supplied Dairy.feedsAmount.
        //
        // It is derived from feedStocks.
        //
        // ==================================================

        this.feedsAmount =

            this.feedStocks.reduce(

                (
                    total,
                    stock
                ) => {

                    return (

                        total +

                        (
                            Number(
                                stock.feedsAmount
                            ) || 0
                        )

                    );

                },

                0

            );


        // ==================================================
        // DAIRY FARM
        // ==================================================

        if (this.isDairyFarm) {

            this.assetCode = null;

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;


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

        if (this.isAnimal) {

            if (!this.isFemale) {

                this.isMilking = false;

            }


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
        // STRUCTURE / FACILITY
        // ==================================================

        if (this.isStructure) {

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;


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
        // DAIRY FARM
        // ==================================================

        if (this.isDairyFarm) {

            this.assetCode = null;

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;

        }


        // ==================================================
        // STRUCTURE
        // ==================================================

        if (this.isStructure) {

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;

        }


        // ==================================================
        // FINAL FEED AMOUNT SYNCHRONIZATION
        // ==================================================

        this.feedsAmount =

            Array.isArray(
                this.feedStocks
            )

                ? this.feedStocks.reduce(

                    (
                        total,
                        stock
                    ) => {

                        return (

                            total +

                            (
                                Number(
                                    stock.feedsAmount
                                ) || 0
                            )

                        );

                    },

                    0

                )

                : 0;


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
// FEED STORE
// ==========================================================

dairySchema.index({

    type: 1,

    status: 1

});


// ==========================================================
// CODE
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
// STATIC: GET DAIRY FARM TYPES
// ==========================================================

dairySchema.statics.getDairyFarmTypes =
function() {

    return [

        ...DAIRY_FARM_TYPES

    ];

};


// ==========================================================
// STATIC: GET STRUCTURE TYPES
// ==========================================================

dairySchema.statics.getStructureTypes =
function() {

    return [

        ...STRUCTURE_TYPES

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
// STATIC: GET MAX PROFILE IMAGES
// ==========================================================

dairySchema.statics.getMaxProfileImages =
function() {

    return MAX_PROFILE_IMAGES;

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


    return result.length

        ? Number(
            result[0].totalNetWorth || 0
        )

        : 0;

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