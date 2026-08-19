// ==========================================================
// models/dairy.js
// ==========================================================
//
// DAIRY / ANIMAL / FACILITY / ASSET MODEL
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
// Structures / Facilities:
//     assetCode = negative Dairy Farm code
//     OR null for standalone structures/assets
//
// ==========================================================
//
// FEED STORE
// ----------------------------------------------------------
//
// A feedStore is a FACILITY used for storing:
//
//     • animal feed
//     • veterinary medicine
//     • farm supplies
//
// It is NOT an animal dwelling.
//
// A Dairy Farm may have:
//
//     ZERO feed stores
//     ONE feed store
//
// MongoDB enforces:
//
//     maximum ONE feedStore per Dairy Farm
//
// Feed-store inventory:
//
//     feedStocks[]
//
// Every feedStocks item has its own MongoDB `_id`.
//
// storageService uses:
//
//     dairy.feedStocks._id
//
// ==========================================================
//
// FEED STOCK FINANCIAL SEMANTICS
// ----------------------------------------------------------
//
// quantityRemaining
//     = current physical stock
//
// initialQuantity
//     = original quantity when the stock record was created
//
// percentageRemaining
//     = quantityRemaining / initialQuantity × 100
//
// IMPORTANT:
//
// Restocking does NOT replace initialQuantity.
//
// Therefore percentageRemaining MAY exceed 100.
//
// Example:
//
//     initialQuantity   = 100
//     quantityRemaining = 150
//
//     percentageRemaining = 150%
//
// ==========================================================
//
// unitPrice
//     = latest purchase unit price
//
// feedsAmount
//     = money associated with the LATEST stock addition
//
// It is NOT:
//
//     quantityRemaining × unitPrice
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
// Represents ONE CURRENT inventory item.
//
// MongoDB automatically creates:
//
//     _id
//
// for every stock item.
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

            trim: true,

            lowercase: true

        },


        // ==================================================
        // FEED NAME
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

        medicineName: {

            type: String,

            default: "",

            trim: true,

            maxlength: 150

        },


        // ==================================================
        // CURRENT QUANTITY
        // ==================================================

        quantityRemaining: {

            type: Number,

            min: 0,

            default: 0

        },


        // ==================================================
        // ORIGINAL QUANTITY
        // ==================================================
        //
        // This is the baseline used to calculate
        // percentageRemaining.
        //
        // IMPORTANT:
        //
        // Restocking does NOT increase this value.
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
        //
        // May exceed 100 after restocking.
        //
        // Example:
        //
        // initialQuantity   = 100
        // quantityRemaining = 150
        //
        // percentageRemaining = 150
        //
        // ==================================================

        percentageRemaining: {

            type: Number,

            min: 0,

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
        // LATEST UNIT PRICE
        // ==================================================

        unitPrice: {

            type: Number,

            min: 0,

            default: 0

        },


        // ==================================================
        // LATEST STOCK ADDITION AMOUNT
        // ==================================================
        //
        // This represents:
        //
        //     quantityAdded × unitPrice
        //
        // for the latest stock addition.
        //
        // It is NOT current inventory value.
        //
        // It must NOT be recalculated from
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
        // STOCK CREATION / FIRST ADDITION
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

        _id: true,

        id: true

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
        // ==================================================
        //
        // NEGATIVE = DAIRY FARM
        //
        // POSITIVE = ANIMAL
        //
        // NULL     = STRUCTURE / FACILITY / ASSET
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
        // Animals:
        //
        //     negative Dairy Farm code
        //
        // Structures:
        //
        //     negative Dairy Farm code
        //
        // Standalone structures/assets:
        //
        //     null
        //
        // Dairy Farms:
        //
        //     null
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
        // Dairy Farm:
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
        // FEED STORE STOCK
        // ==================================================
        //
        // Only feedStore facilities may contain this array.
        //
        // ==================================================

        feedStocks: {

            type: [

                feedStockSchema

            ],

            default: []

        },


        // ==================================================
        // FEED STORE FINANCIAL TOTAL
        // ==================================================
        //
        // This is the sum of feedsAmount from feedStocks.
        //
        // Since each stock's feedsAmount represents its
        // latest addition, this parent value represents
        // the aggregate of those latest addition amounts.
        //
        // It is NOT current inventory valuation.
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
//
// A structure is treated as a manual asset entity.
//
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
//
// Existing identity convention:
//
//     even positive code = Female
//     odd positive code  = Male
//
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
        // NORMALIZE FEED STOCK ARRAY
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
                                stock.feedName ||
                                ""
                            )
                            .trim();


                        // ==================================
                        // MEDICINE NAME
                        // ==================================

                        stock.medicineName =

                            String(
                                stock.medicineName ||
                                ""
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

                            Math.round(

                                quantityRemaining *
                                100

                            ) / 100;


                        // ==================================
                        // ORIGINAL QUANTITY
                        // ==================================
                        //
                        // IMPORTANT:
                        //
                        // Do NOT replace an existing
                        // initialQuantity with the current
                        // quantity.
                        //
                        // This preserves the original
                        // baseline during restocking.
                        //
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
                                stock.quantityRemaining;

                        }


                        stock.initialQuantity =

                            Math.round(

                                initialQuantity *
                                100

                            ) / 100;


                        // ==================================
                        // PERCENTAGE REMAINING
                        // ==================================
                        //
                        // Unlike the previous model,
                        // this is NOT capped at 100.
                        //
                        // Restocking can therefore produce:
                        //
                        //     125%
                        //     150%
                        //     etc.
                        //
                        // ==================================

                        let percentage = 0;


                        if (
                            stock.initialQuantity > 0
                        ) {

                            percentage =

                                (

                                    stock.quantityRemaining /

                                    stock.initialQuantity

                                ) * 100;

                        } else if (

                            stock.quantityRemaining > 0

                        ) {

                            percentage = 100;

                        }


                        if (
                            !Number.isFinite(
                                percentage
                            )
                        ) {

                            percentage = 0;

                        }


                        stock.percentageRemaining =

                            Math.round(

                                Math.max(
                                    0,
                                    percentage
                                ) * 100

                            ) / 100;


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

                            Math.round(

                                unitPrice *
                                100

                            ) / 100;


                        // ==================================
                        // FEEDS AMOUNT
                        // ==================================
                        //
                        // NEVER calculate this from
                        // quantityRemaining.
                        //
                        // It represents the latest
                        // stock addition amount.
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

                            Math.round(

                                feedsAmount *
                                100

                            ) / 100;


                        // ==================================
                        // INSTRUCTIONS
                        // ==================================

                        stock.instructions =

                            String(
                                stock.instructions ||
                                ""
                            )
                            .trim();


                        // ==================================
                        // EXPECTED DURATION
                        // ==================================

                        stock.expectedDuration =

                            String(
                                stock.expectedDuration ||
                                ""
                            )
                            .trim();


                        // ==================================
                        // MESSAGE
                        // ==================================

                        stock.message =

                            String(
                                stock.message ||
                                ""
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
                        // ADDED DATE
                        // ==================================

                        if (
                            !stock.addedAt
                        ) {

                            stock.addedAt =
                                new Date();

                        }


                        // ==================================
                        // UPDATED DATE
                        // ==================================

                        if (
                            !stock.updatedAt
                        ) {

                            stock.updatedAt =
                                new Date();

                        }


                        // ==================================
                        // CATEGORY-SPECIFIC NAME CLEANUP
                        // ==================================

                        if (
                            stock.category === "feed"
                        ) {

                            stock.medicineName = "";

                        }


                        if (
                            stock.category === "medicine"
                        ) {

                            stock.feedName = "";

                        }


                        return stock;

                    }

                );


        // ==================================================
        // VALIDATE STOCK ITEMS
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


            // ==============================================
            // QUANTITY
            // ==============================================

            if (

                !Number.isFinite(
                    Number(
                        stock.quantityRemaining
                    )
                ) ||

                Number(
                    stock.quantityRemaining
                ) < 0

            ) {

                const error =

                    new Error(
                        "Stock quantity cannot be negative."
                    );


                error.status = 400;


                return next(error);

            }


            // ==============================================
            // INITIAL QUANTITY
            // ==============================================

            if (

                !Number.isFinite(
                    Number(
                        stock.initialQuantity
                    )
                ) ||

                Number(
                    stock.initialQuantity
                ) < 0

            ) {

                const error =

                    new Error(
                        "Initial stock quantity cannot be negative."
                    );


                error.status = 400;


                return next(error);

            }


            // ==============================================
            // PRICE
            // ==============================================

            if (

                !Number.isFinite(
                    Number(
                        stock.unitPrice
                    )
                ) ||

                Number(
                    stock.unitPrice
                ) < 0

            ) {

                const error =

                    new Error(
                        "Stock unit price cannot be negative."
                    );


                error.status = 400;


                return next(error);

            }


            // ==============================================
            // FEEDS AMOUNT
            // ==============================================

            if (

                !Number.isFinite(
                    Number(
                        stock.feedsAmount
                    )
                ) ||

                Number(
                    stock.feedsAmount
                ) < 0

            ) {

                const error =

                    new Error(
                        "Stock feeds amount cannot be negative."
                    );


                error.status = 400;


                return next(error);

            }

        }


        // ==================================================
        // FEED STOCK ONLY ON FEED STORE
        // ==================================================

        if (

            this.feedStocks.length > 0 &&

            !this.isFeedStore

        ) {

            const error =

                new Error(

                    "Feed stock can only belong to a feedStore facility."

                );


            error.status = 400;


            return next(error);

        }


        // ==================================================
        // FEED STORE VALIDATION
        // ==================================================

        if (
            this.isFeedStore
        ) {

            // ----------------------------------------------
            // Must belong to a Dairy Farm.
            // ----------------------------------------------

            if (

                this.assetCode === null ||

                this.assetCode === undefined

            ) {

                const error =

                    new Error(

                        "Feed Store must belong to a Dairy Farm. assetCode is required."

                    );


                error.status = 400;


                return next(error);

            }


            // ----------------------------------------------
            // Parent must be a negative Dairy Farm code.
            // ----------------------------------------------

            if (
                Number(this.assetCode) >= 0
            ) {

                const error =

                    new Error(

                        "Feed Store assetCode must be the negative code of its parent Dairy Farm."

                    );


                error.status = 400;


                return next(error);

            }

        }


        // ==================================================
        // PARENT FEED AMOUNT
        // ==================================================
        //
        // This is the aggregate of stock-level
        // feedsAmount values.
        //
        // It is NOT inventory valuation.
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


        this.feedsAmount =

            Math.round(

                this.feedsAmount *
                100

            ) / 100;


        // ==================================================
        // DAIRY FARM
        // ==================================================

        if (
            this.isDairyFarm
        ) {

            // ----------------------------------------------
            // Farms cannot belong to another farm.
            // ----------------------------------------------

            this.assetCode = null;


            // ----------------------------------------------
            // Farm-specific animal fields.
            // ----------------------------------------------

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;


            // ----------------------------------------------
            // Farm cannot be feed store.
            // ----------------------------------------------

            if (
                this.type === "feedStore"
            ) {

                const error =

                    new Error(

                        "A Dairy Farm cannot have type feedStore."

                    );


                error.status = 400;


                return next(error);

            }


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
            // Animal cannot be feed store.
            // ----------------------------------------------

            if (
                this.type === "feedStore"
            ) {

                const error =

                    new Error(

                        "An animal cannot have type feedStore."

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
        // STRUCTURE / FACILITY
        // ==================================================

        if (
            this.isStructure
        ) {

            // ----------------------------------------------
            // Structures do not have animal fields.
            // ----------------------------------------------

            this.dateOfBirth = null;

            this.mass = 0;

            this.isMilking = false;


            // ----------------------------------------------
            // Validate assigned structure parent.
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
        // STOCK ADDED DATES
        // ==================================================
        //
        // IMPORTANT:
        //
        // We intentionally DO NOT overwrite updatedAt here.
        //
        // storageService.touchStock() controls the stock's
        // actual last-update timestamp.
        //
        // Otherwise saving unrelated Dairy fields would make
        // every stock item appear newly updated.
        //
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


                    if (
                        !stock.updatedAt
                    ) {

                        stock.updatedAt =
                            new Date();

                    }

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


        this.feedsAmount =

            Math.round(

                this.feedsAmount *
                100

            ) / 100;


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
// FEED STORE UNIQUENESS
// ==========================================================
//
// Only ONE feedStore may belong to a given Dairy Farm.
//
// Example:
//
//     assetCode = -1
//     type      = feedStore
//
// can occur only once.
//
// Other structures are unaffected.
//
// ==========================================================

dairySchema.index(

    {

        assetCode: 1,

        type: 1

    },

    {

        unique: true,

        partialFilterExpression: {

            type: "feedStore",

            assetCode: {

                $type: "number"

            }

        }

    }

);


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
// CODE UNIQUENESS
// ==========================================================
//
// Numeric codes must be unique.
//
// Structures use code = null and are therefore excluded.
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
// STATIC: GET FEED STORE
// ==========================================================
//
// Finds the feed store belonging to a Dairy Farm.
//
// ==========================================================

dairySchema.statics.getFeedStore =

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

            type: "feedStore",

            assetCode: code

        });

    };


// ==========================================================
// STATIC: HAS FEED STORE
// ==========================================================

dairySchema.statics.hasFeedStore =

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


        const feedStore =

            await this.findOne({

                type: "feedStore",

                assetCode: code

            })

            .select("_id")

            .lean();


        return !!feedStore;

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
// STATIC: GET MAX STOCK IMAGES
// ==========================================================

dairySchema.statics.getMaxStockImages =

    function () {

        return MAX_STOCK_IMAGES;

    };


// ==========================================================
// STATIC: GET FEED TYPES
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

dairySchema.statics.getVeterinaryMedicines =

    function () {

        return [

            ...VETERINARY_MEDICINES

        ];

    };


// ==========================================================
// STATIC: GET STOCK UNITS
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