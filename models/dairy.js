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
//     • Aggregate feed-store financial value
//
// IMPORTANT FEED-STORE STRUCTURE
// ----------------------------------------------------------
//
// CURRENT STOCK:
//
//     dairy.feeds
//
// HISTORICAL ACTIVITY:
//
//     models/Update.js
//
// `feeds` contains CURRENT inventory only.
//
// `Update` contains the history / visible feed-store posts.
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
// FEED STORE STOCK CATEGORIES
// ==========================================================
//
// These correspond to the categories accepted by
// feedsService.js.
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
//
// Keep these aligned with feedsService.js.
//
// ==========================================================

const STOCK_UNITS = [

    "kg",
    "bags",
    "tonnes",
    "litres",
    "bottles",
    "packs",
    "units",
    "bales",
    "containers",
    "packets",
    "boxes"

];


// ==========================================================
// PROFILE IMAGE LIMIT
// ==========================================================

const MAX_PROFILE_IMAGES = 5;


// ==========================================================
// FEED STORE STOCK SUBDOCUMENT
// ==========================================================
//
// THIS IS THE CURRENT INVENTORY RECORD.
//
// Historical feed-store activity does NOT belong here.
//
// Historical activity is stored in:
//
//     models/Update.js
//
// Each current stock item contains:
//
//     category
//     name
//     quantity
//     unit
//     price
//     instructions
//     expectedDuration
//     images
//     addedAt
//     updatedAt
//
// ==========================================================

const feedSchema =
    new mongoose.Schema(

        {

            // ==================================================
            // CATEGORY
            // ==================================================
            //
            //     feed
            //     medicine
            //
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
            // STOCK NAME
            // ==================================================

            name: {

                type: String,

                required: true,

                trim: true,

                maxlength: 150

            },


            // ==================================================
            // CURRENT QUANTITY
            // ==================================================

            quantity: {

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
            // PRICE / FINANCIAL VALUE
            // ==================================================
            //
            // This is the value recorded when stock is added.
            //
            // It is NOT changed by a worker's quantity update.
            //
            // ==================================================

            price: {

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
            // IMAGES
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

                    validator:
                        function(images) {

                            return (

                                Array.isArray(images) &&

                                images.length <= 10

                            );

                        },

                    message:
                        "A maximum of 10 stock images is allowed."

                }

            },


            // ==================================================
            // DATE STOCK WAS ADDED
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

            _id: true

        }

    );


// ==========================================================
// SCHEMA
// ==========================================================

const dairySchema =
    new mongoose.Schema(

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

                    validator:
                        function(images) {

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

                    validator:
                        function(value) {

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
            // Structures:
            //
            //     feedStore
            //     hayShed
            //     cowshed
            //
            // Animals:
            //
            //     Friesian
            //     Jersey
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
            // THIS is what feedsService.js uses.
            //
            //     dairy.feeds
            //
            // ==================================================

            feeds: {

                type: [

                    feedSchema

                ],

                default: []

            },


            // ==================================================
            // LEGACY FEED STOCKS
            // ==================================================
            //
            // Older versions of the application used:
            //
            //     feedStocks
            //
            // The field is retained temporarily so old records
            // can be migrated safely.
            //
            // New code MUST use `feeds`.
            //
            // ==================================================

            feedStocks: {

                type: [

                    {

                        name: {

                            type: String,

                            trim: true,

                            default: ""

                        },

                        percentageRemaining: {

                            type: Number,

                            min: 0,

                            max: 100,

                            default: 0

                        },

                        feedsAmount: {

                            type: Number,

                            min: 0,

                            default: 0

                        }

                    }

                ],

                default: []

            },


            // ==================================================
            // TOTAL FEEDS AMOUNT
            // ==================================================
            //
            // Current total financial value of feed/medicine
            // stock.
            //
            // Derived from:
            //
            //     feeds[].price
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
).get(function() {

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
).get(function() {

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
).get(function() {

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
).get(function() {

    return this.isStructure;

});


// ==========================================================
// VIRTUAL: IS ASSIGNED ASSET
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
// VIRTUAL: IS STANDALONE ASSET
// ==========================================================

dairySchema.virtual(
    "isStandaloneAsset"
).get(function() {

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
).get(function() {

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
).get(function() {

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
).get(function() {

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
).get(function() {

    return this.isAnimal;

});


// ==========================================================
// VIRTUAL: AGE TEXT
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
).get(function() {

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
).get(function() {

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
).get(function() {

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
).get(function() {

    return !!this.needsMaintenance;

});


// ==========================================================
// VIRTUAL: NEEDS MEDICAL ATTENTION
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
// VIRTUAL: ASSET VALUE
// ==========================================================

dairySchema.virtual(
    "assetValue"
).get(function() {

    return Number(
        this.currentWorth
    ) || 0;

});


// ==========================================================
// VIRTUAL: ACTIVE ASSET
// ==========================================================

dairySchema.virtual(
    "isActiveAsset"
).get(function() {

    return this.status === "active";

});


// ==========================================================
// VIRTUAL: IDENTIFIED DAIRY
// ==========================================================

dairySchema.virtual(
    "isIdentifiedDairy"
).get(function() {

    return this.isAnimal;

});


// ==========================================================
// PRE INIT
// ==========================================================
//
// LEGACY FEED-STOCK COMPATIBILITY
//
// Older database records may still contain:
//
//     feedStocks
//
// while the current application uses:
//
//     feeds
//
// When an old document is loaded, convert the old structure
// into the new current-stock structure in memory.
//
// This prevents old records from appearing empty simply
// because the schema structure changed.
//
// ==========================================================

dairySchema.pre(
    "init",
    function(data) {

        if (

            data &&

            Array.isArray(
                data.feedStocks
            ) &&

            (

                !Array.isArray(
                    data.feeds
                ) ||

                data.feeds.length === 0

            )

        ) {

            data.feeds =
                data.feedStocks.map(
                    stock => {

                        const percentage =
                            Number(
                                stock.percentageRemaining
                            ) || 0;


                        const feedsAmount =
                            Number(
                                stock.feedsAmount
                            ) || 0;


                        return {

                            category:
                                "feed",

                            name:
                                String(
                                    stock.name || ""
                                ).trim(),

                            // Legacy records only stored
                            // percentage, not quantity.
                            //
                            // Keep the record visible.
                            quantity:
                                percentage,

                            unit:
                                "units",

                            price:
                                feedsAmount,

                            instructions:
                                "",

                            expectedDuration:
                                "",

                            images:
                                [],

                            addedAt:
                                stock.addedAt ||
                                new Date(),

                            updatedAt:
                                stock.updatedAt ||
                                new Date()

                        };

                    }

                );

        }

    }
);


// ==========================================================
// PRE VALIDATE
// ==========================================================

dairySchema.pre(
    "validate",
    function(next) {

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
        // NORMALIZE FEEDS
        // ==================================================

        if (
            !Array.isArray(
                this.feeds
            )
        ) {

            this.feeds = [];

        }


        this.feeds =

            this.feeds

                .filter(Boolean)

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
                        // CATEGORY
                        // ==================================

                        stock.category =
                            String(
                                stock.category || "feed"
                            )
                            .trim()
                            .toLowerCase();


                        // ==================================
                        // QUANTITY
                        // ==================================

                        stock.quantity =
                            Number(
                                stock.quantity
                            ) || 0;


                        if (
                            stock.quantity < 0
                        ) {

                            stock.quantity = 0;

                        }


                        // ==================================
                        // PRICE
                        // ==================================

                        stock.price =
                            Number(
                                stock.price
                            ) || 0;


                        if (
                            stock.price < 0
                        ) {

                            stock.price = 0;

                        }


                        // ==================================
                        // INSTRUCTIONS
                        // ==================================

                        stock.instructions =
                            String(
                                stock.instructions || ""
                            ).trim();


                        // ==================================
                        // EXPECTED DURATION
                        // ==================================

                        stock.expectedDuration =
                            String(
                                stock.expectedDuration || ""
                            ).trim();


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
                                    10
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
                )

                .filter(
                    stock =>
                        stock.name.length > 0
                );


        // ==================================================
        // CALCULATE TOTAL FEEDS AMOUNT
        // ==================================================
        //
        // IMPORTANT:
        //
        // This matches feedsService.js:
        //
        //     calculateFeedsAmount(dairy.feeds)
        //
        // and therefore sums:
        //
        //     feeds[].price
        //
        // ==================================================

        this.feedsAmount =

            this.feeds.reduce(

                (
                    total,
                    feed
                ) => {

                    const price =
                        Number(
                            feed.price
                        ) || 0;


                    return (
                        total +
                        Math.max(
                            0,
                            price
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
        // UPDATE STOCK DATES
        // ==================================================

        if (
            Array.isArray(
                this.feeds
            )
        ) {

            this.feeds.forEach(
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
                this.feeds
            )

                ? this.feeds.reduce(

                    (
                        total,
                        stock
                    ) => {

                        return (

                            total +

                            Math.max(

                                0,

                                Number(
                                    stock.price
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
// STATIC: GET FEED TYPES
// ==========================================================

dairySchema.statics.getFeedTypes =
function() {

    return [

        ...FEED_TYPES

    ];

};


// ==========================================================
// STATIC: GET VETERINARY MEDICINES
// ==========================================================

dairySchema.statics.getVeterinaryMedicines =
function() {

    return [

        ...VETERINARY_MEDICINES

    ];

};


// ==========================================================
// STATIC: GET STOCK UNITS
// ==========================================================

dairySchema.statics.getStockUnits =
function() {

    return [

        ...STOCK_UNITS

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


Dairy.FEED_TYPES =
    FEED_TYPES;


Dairy.VETERINARY_MEDICINES =
    VETERINARY_MEDICINES;


Dairy.STOCK_UNITS =
    STOCK_UNITS;


Dairy.MAX_PROFILE_IMAGES =
    MAX_PROFILE_IMAGES;


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    Dairy;