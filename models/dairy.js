// ==========================================================
// models/dairy.js
// ==========================================================
//
// DAIRY / ANIMAL / ASSET MODEL
//
// Responsibilities:
//
//     • Dairy farms
//     • Dairy animals
//     • Structures / facilities
//     • Assets
//     • Milking status
//     • Maintenance
//     • Medical attention
//     • Profile images
//     • Current feed-store stock
//     • Feed-store financial values
//
// FEED-STORE STRUCTURE
// ----------------------------------------------------------
//
// CURRENT INVENTORY:
//
//     dairy.feedStocks[]
//
// HISTORY:
//
//     models/Update.js
//
// Every feedStocks item is an independent subdocument and
// therefore has its own MongoDB `_id`.
//
// Update.stock.stockId points to:
//
//     dairy.feedStocks._id
//
// IMPORTANT:
//
// `feedStocks` represents CURRENT inventory.
//
// `feedsAmount` represents the money associated with the
// latest stock addition represented by that stock record.
//
// It is NOT calculated from the current quantity remaining.
//
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
// FEED TYPES
// ==========================================================
//
// These are MASTER OPTIONS.
//
// They are NOT generated from existing feedStocks.
//
// ==========================================================

const FEED_TYPES = [

    "Fodder",
    "Silage",
    "Hay",
    "Dairy Meal",
    "Calf Starter",
    "Calf Grower",
    "Maize Bran",
    "Wheat Bran",
    "Pollard",
    "Maize Germ",
    "Cotton Seed Cake",
    "Sunflower Cake",
    "Soybean Meal",
    "Mineral Supplement",
    "Molasses",
    "Salt",
    "Other"

];


// ==========================================================
// VETERINARY MEDICINES
// ==========================================================
//
// MASTER OPTIONS.
//
// ==========================================================

const VETERINARY_MEDICINES = [

    "Antibiotics",
    "Dewormer",
    "Acaricide",
    "Antiseptic",
    "Wound Treatment",
    "Mastitis Treatment",
    "Anti-inflammatory",
    "Pain Relief",
    "Vitamin Supplement",
    "Mineral Supplement",
    "Calcium Supplement",
    "Rehydration Treatment",
    "Vaccines",
    "Other"

];


// ==========================================================
// STOCK UNITS
// ==========================================================

const STOCK_UNITS = [

    "kg",
    "bags",
    "tonnes",
    "bales",
    "litres",
    "bottles",
    "packs",
    "units"

];


// ==========================================================
// PROFILE IMAGE LIMIT
// ==========================================================

const MAX_PROFILE_IMAGES = 5;


// ==========================================================
// STOCK IMAGE LIMIT
// ==========================================================

const MAX_STOCK_IMAGES = 10;


// ==========================================================
// FEED-STORE STOCK SUBDOCUMENT
// ==========================================================
//
// This represents ONE CURRENT STOCK RECORD.
//
// Each record receives its own `_id`.
//
// CANONICAL FIELDS:
//
//     category
//     feedName
//     medicineName
//     quantityRemaining
//     initialQuantity
//     percentageRemaining
//     unit
//     unitPrice
//     feedsAmount
//     instructions
//     expectedDuration
//     message
//     images
//     addedAt
//     updatedAt
//
// ==========================================================

const feedStockSchema = new mongoose.Schema(

    {

        // ==================================================
        // CATEGORY
        // ==================================================

        category: {

            type: String,

            enum: [

                "feed",
                "medicine"

            ],

            required: true,

            trim: true

        },


        // ==================================================
        // FEED NAME
        // ==================================================
        //
        // Used when category === "feed".
        //
        // ==================================================

        feedName: {

            type: String,

            default: "",

            trim: true,

            maxlength: 150

        },


        // ==================================================
        // MEDICINE NAME
        // ==================================================
        //
        // Used when category === "medicine".
        //
        // ==================================================

        medicineName: {

            type: String,

            default: "",

            trim: true,

            maxlength: 150

        },


        // ==================================================
        // CURRENT QUANTITY
        // ==================================================
        //
        // Quantity currently available.
        //
        // ==================================================

        quantityRemaining: {

            type: Number,

            min: 0,

            default: 0

        },


        // ==================================================
        // INITIAL QUANTITY
        // ==================================================
        //
        // Baseline for percentageRemaining.
        //
        // This value is NOT reduced when stock is consumed.
        //
        // ==================================================

        initialQuantity: {

            type: Number,

            min: 0,

            default: 0

        },


        // ==================================================
        // PERCENTAGE REMAINING
        // ==================================================

        percentageRemaining: {

            type: Number,

            min: 0,

            max: 100,

            default: 0

        },


        // ==================================================
        // UNIT
        // ==================================================

        unit: {

            type: String,

            enum: STOCK_UNITS,

            required: true,

            trim: true

        },


        // ==================================================
        // UNIT PRICE
        // ==================================================
        //
        // Price per unit for the latest stock addition.
        //
        // ==================================================

        unitPrice: {

            type: Number,

            min: 0,

            default: 0

        },


        // ==================================================
        // FEEDS AMOUNT
        // ==================================================
        //
        // ACTUAL MONEY SPENT ON THE LATEST STOCK ADDITION.
        //
        // NEW STOCK:
        //
        //     quantity × unitPrice
        //
        // RESTOCK:
        //
        //     quantityAdded × unitPrice
        //
        // STOCK REDUCTION:
        //
        //     value remains unchanged
        //
        // IMPORTANT:
        //
        // This field must NOT be recalculated from
        // quantityRemaining.
        //
        // ==================================================

        feedsAmount: {

            type: Number,

            min: 0,

            default: 0

        },


        // ==================================================
        // INSTRUCTIONS
        // ==================================================

        instructions: {

            type: String,

            trim: true,

            default: "",

            maxlength: 2000

        },


        // ==================================================
        // EXPECTED DURATION
        // ==================================================

        expectedDuration: {

            type: String,

            trim: true,

            default: "",

            maxlength: 100

        },


        // ==================================================
        // MESSAGE
        // ==================================================

        message: {

            type: String,

            trim: true,

            default: "",

            maxlength: 2000

        },


        // ==================================================
        // STOCK IMAGES
        // ==================================================

        images: {

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
                            MAX_STOCK_IMAGES

                    );

                },

                message:
                    `A maximum of ${MAX_STOCK_IMAGES} stock images is allowed.`

            }

        },


        // ==================================================
        // STOCK CREATED / ADDED DATE
        // ==================================================

        addedAt: {

            type: Date,

            default: Date.now

        },


        // ==================================================
        // LAST STOCK UPDATE
        // ==================================================

        updatedAt: {

            type: Date,

            default: Date.now

        }

    },

    {

        // Every stock record must have its own ID.
        _id: true

    }

);


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
        // =========================================================
        //
        // NEGATIVE = DAIRY FARM
        // POSITIVE = ANIMAL
        // NULL     = STRUCTURE / FACILITY
        //
        // ==========================================================

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
        //
        // Negative code of the parent Dairy Farm.
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
        // Farm:
        //
        //     DAIRY_FARM_TYPES
        //
        // Animal:
        //
        //     DAIRY_BREEDS
        //
        // Structure:
        //
        //     STRUCTURE_TYPES
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

        feedStocks: {

            type: [

                feedStockSchema

            ],

            default: []

        },


        // ==================================================
        // TOTAL CURRENT FEED-STORE AMOUNT
        // ==================================================
        //
        // Sum of feedsAmount across current feedStocks.
        //
        // NOT:
        //
        //     quantityRemaining × unitPrice
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
// VIRTUAL: IS FEED STORE
// ==========================================================

dairySchema.virtual(
    "isFeedStore"
).get(function () {

    return (

        this.isStructure &&

        this.type === "feedStore"

    );

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
        new Date(this.dateOfBirth);

    const now =
        new Date();


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
        new Date(this.dateOfBirth);

    const now =
        new Date();


    if (
        Number.isNaN(dob.getTime())
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


    return `/uploads/${String(image)}`;

}


// ==========================================================
// VIRTUAL: DISPLAY IMAGES
// ==========================================================

dairySchema.virtual(
    "displayImages"
).get(function () {

    let images = [];


    if (
        Array.isArray(this.profileImages)
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
            !Array.isArray(this.profileImages)
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
        // PRIMARY IMAGE
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
            !Array.isArray(this.feedStocks)
        ) {

            this.feedStocks = [];

        }


        this.feedStocks =

            this.feedStocks

                .filter(Boolean)

                .map(

                    stock => {

                        // ==================================
                        // CATEGORY
                        // ==================================

                        stock.category =

                            String(
                                stock.category ||
                                "feed"
                            )
                            .trim()
                            .toLowerCase();


                        // ==================================
                        // FEED NAME
                        // ==================================

                        stock.feedName =

                            String(
                                stock.feedName || ""
                            )
                            .trim();


                        // ==================================
                        // MEDICINE NAME
                        // ==================================

                        stock.medicineName =

                            String(
                                stock.medicineName || ""
                            )
                            .trim();


                        // ==================================
                        // CURRENT QUANTITY
                        // ==================================

                        let quantityRemaining =

                            Number(
                                stock.quantityRemaining
                            );


                        if (

                            !Number.isFinite(
                                quantityRemaining
                            ) ||

                            quantityRemaining < 0

                        ) {

                            quantityRemaining = 0;

                        }


                        stock.quantityRemaining =
                            quantityRemaining;


                        // ==================================
                        // INITIAL QUANTITY
                        // ==================================

                        let initialQuantity =

                            Number(
                                stock.initialQuantity
                            );


                        if (

                            !Number.isFinite(
                                initialQuantity
                            ) ||

                            initialQuantity < 0

                        ) {

                            initialQuantity =
                                quantityRemaining;

                        }


                        if (

                            initialQuantity <
                            quantityRemaining

                        ) {

                            initialQuantity =
                                quantityRemaining;

                        }


                        stock.initialQuantity =
                            initialQuantity;


                        // ==================================
                        // PERCENTAGE
                        // ==================================

                        let percentage = 0;


                        if (
                            initialQuantity > 0
                        ) {

                            percentage =

                                (

                                    quantityRemaining /

                                    initialQuantity

                                ) * 100;

                        } else if (
                            quantityRemaining > 0
                        ) {

                            percentage = 100;

                        }


                        stock.percentageRemaining =

                            Math.max(

                                0,

                                Math.min(

                                    100,

                                    Number(
                                        percentage
                                    ) || 0

                                )

                            );


                        // ==================================
                        // UNIT PRICE
                        // ==================================

                        let unitPrice =

                            Number(
                                stock.unitPrice
                            );


                        if (

                            !Number.isFinite(
                                unitPrice
                            ) ||

                            unitPrice < 0

                        ) {

                            unitPrice = 0;

                        }


                        stock.unitPrice =
                            unitPrice;


                        // ==================================
                        // FEEDS AMOUNT
                        // ==================================
                        //
                        // IMPORTANT:
                        //
                        // Do NOT calculate this from
                        // quantityRemaining.
                        //
                        // storageService is responsible
                        // for determining the amount when
                        // stock is added/restocked.
                        //
                        // ==================================

                        let feedsAmount =

                            Number(
                                stock.feedsAmount
                            );


                        if (

                            !Number.isFinite(
                                feedsAmount
                            ) ||

                            feedsAmount < 0

                        ) {

                            feedsAmount = 0;

                        }


                        stock.feedsAmount =
                            feedsAmount;


                        // ==================================
                        // INSTRUCTIONS
                        // ==================================

                        stock.instructions =

                            String(
                                stock.instructions || ""
                            )
                            .trim();


                        // ==================================
                        // EXPECTED DURATION
                        // ==================================

                        stock.expectedDuration =

                            String(
                                stock.expectedDuration || ""
                            )
                            .trim();


                        // ==================================
                        // MESSAGE
                        // ==================================

                        stock.message =

                            String(
                                stock.message || ""
                            )
                            .trim();


                        // ==================================
                        // IMAGES
                        // ==================================

                        if (
                            !Array.isArray(
                                stock.images
                            )
                        ) {

                            stock.images = [];

                        }


                        stock.images =

                            stock.images

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

                                    MAX_STOCK_IMAGES

                                );


                        // ==================================
                        // DATES
                        // ==================================

                        if (
                            !stock.addedAt
                        ) {

                            stock.addedAt =
                                new Date();

                        }


                        if (
                            !stock.updatedAt
                        ) {

                            stock.updatedAt =
                                new Date();

                        }


                        return stock;

                    }

                );


        // ==================================================
        // VALIDATE STOCK
        // ==================================================

        for (
            const stock of this.feedStocks
        ) {

            // ==============================================
            // CATEGORY
            // ==============================================

            if (

                stock.category !== "feed" &&

                stock.category !== "medicine"

            ) {

                const error =

                    new Error(
                        "Stock category must be either feed or medicine."
                    );


                error.status = 400;


                return next(error);

            }


            // ==============================================
            // FEED NAME
            // ==============================================

            if (

                stock.category === "feed" &&

                !stock.feedName

            ) {

                const error =

                    new Error(
                        "Feed name is required for feed stock."
                    );


                error.status = 400;


                return next(error);

            }


            // ==============================================
            // MEDICINE NAME
            // ==============================================

            if (

                stock.category === "medicine" &&

                !stock.medicineName

            ) {

                const error =

                    new Error(
                        "Medicine name is required for medicine stock."
                    );


                error.status = 400;


                return next(error);

            }

        }


        // ==================================================
        // TOTAL CURRENT FEED-STORE VALUE
        // ==================================================

        this.feedsAmount =

            this.feedStocks.reduce(

                (

                    total,

                    stock

                ) => {

                    return (

                        total +

                        Math.max(

                            0,

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

        if (
            this.isDairyFarm
        ) {

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

        if (
            this.isAnimal
        ) {

            // ----------------------------------------------
            // Male animals cannot be milking.
            // ----------------------------------------------

            if (
                !this.isFemale
            ) {

                this.isMilking = false;

            }


            // ----------------------------------------------
            // Animal must belong to a Dairy Farm.
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

        if (
            this.isStructure
        ) {

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

        if (
            !this.medicalAttention
        ) {

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

            if (this.medicalAttention) {

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
        // DAIRY FARM
        // ==================================================

        if (
            this.isDairyFarm
        ) {

            this.assetCode = null;

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;

        }


        // ==================================================
        // STRUCTURE
        // ==================================================

        if (
            this.isStructure
        ) {

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;

        }


        // ==================================================
        // STOCK DATES
        // ==================================================

        if (
            Array.isArray(
                this.feedStocks
            )
        ) {

            this.feedStocks.forEach(

                stock => {

                    if (
                        !stock.addedAt
                    ) {

                        stock.addedAt =
                            new Date();

                    }


                    stock.updatedAt =
                        new Date();

                }

            );

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

                            Math.max(

                                0,

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
// FEED STOCK CATEGORY
// ==========================================================

dairySchema.index({

    "feedStocks.category": 1

});


// ==========================================================
// FEED STOCK NAME
// ==========================================================

dairySchema.index({

    "feedStocks.feedName": 1

});


// ==========================================================
// MEDICINE STOCK NAME
// ==========================================================

dairySchema.index({

    "feedStocks.medicineName": 1

});


// ==========================================================
// CODE
// ==========================================================
//
// Only numeric codes are indexed uniquely.
//
// Structures have code = null and are therefore excluded
// from the unique constraint.
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
// STATIC: GET BREEDS
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
// STATIC: GET MAX STOCK IMAGES
// ==========================================================

dairySchema.statics.getMaxStockImages =
    function () {

        return MAX_STOCK_IMAGES;

    };


// ==========================================================
// STATIC: GET FEED TYPES
// ==========================================================
//
// Used by:
//
//     storageService.getStorageOptions()
//
// ==========================================================

dairySchema.statics.getFeedTypes =
    function () {

        return [

            ...FEED_TYPES

        ];

    };


// ==========================================================
// STATIC: GET VETERINARY MEDICINES
// ==========================================================
//
// Used by:
//
//     storageService.getStorageOptions()
//
// ==========================================================

dairySchema.statics.getVeterinaryMedicines =
    function () {

        return [

            ...VETERINARY_MEDICINES

        ];

    };


// ==========================================================
// STATIC: GET STOCK UNITS
// ==========================================================
//
// Used by:
//
//     storageService.getStorageOptions()
//
// ==========================================================

dairySchema.statics.getStockUnits =
    function () {

        return [

            ...STOCK_UNITS

        ];

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

                result[0].totalNetWorth || 0

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


Dairy.FEED_TYPES =
    FEED_TYPES;


Dairy.VETERINARY_MEDICINES =
    VETERINARY_MEDICINES;


Dairy.STOCK_UNITS =
    STOCK_UNITS;


Dairy.MAX_PROFILE_IMAGES =
    MAX_PROFILE_IMAGES;


Dairy.MAX_STOCK_IMAGES =
    MAX_STOCK_IMAGES;


// ==========================================================
// EXPORT
// ==========================================================

module.exports = Dairy;