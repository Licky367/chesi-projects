// ==========================================================
// models/Update.js
// ==========================================================
//
// DAIRY UPDATE / FEED MODEL
//
// Responsibilities:
//
//     • General dairy posts
//     • Medical updates
//     • Maintenance updates
//     • Asset-added updates
//     • Stock/feed-store updates
//
// STOCK SYSTEM
// ----------------------------------------------------------
//
// Admin:
//
//     Adds available animal feed
//     Adds available veterinary medicine
//     Records quantity
//     Records unit
//     Records price
//     Adds instructions
//     Adds expected duration
//     May add images
//
//     The system automatically creates a STOCK update.
//
// Dairy Worker:
//
//     Reports remaining stock
//     May add quantity remaining
//     May add additional information
//     May add images
//
// IMPORTANT
// ----------------------------------------------------------
//
// Admin stock availability posts are SYSTEM posts.
//
//     user      = null
//     userName  = "System"
//     userImage = "/images/h1.png"
//
// Dairy-worker stock reports retain the worker's identity.
//
// ==========================================================

const mongoose =
    require("mongoose");


// ==========================================================
// CONSTANTS
// ==========================================================

const MAX_POST_IMAGES = 10;

const MAX_STOCK_IMAGES = 10;


// ==========================================================
// STOCK TYPES
// ==========================================================
//
// These distinguish:
//
//     feed
//     veterinary medicine
//
// ==========================================================

const STOCK_TYPES = [

    "feed",

    "medicine"

];


// ==========================================================
// STOCK ACTIONS
// ==========================================================
//
// available
//     Admin makes new stock available.
//
// remainder
//     Dairy worker reports stock remaining.
//
// ==========================================================

const STOCK_ACTIONS = [

    "available",

    "remainder"

];


// ==========================================================
// STOCK UNITS
// ==========================================================
//
// The service/controller should normally validate these
// against the same list used by the Dairy model/service.
//
// ==========================================================

const STOCK_UNITS = [

    "kg",

    "bags",

    "tonnes",

    "bales",

    "litres",

    "units",

    "containers",

    "packets",

    "boxes"

];


// ==========================================================
// POST COMMENT SUBDOCUMENT
// ==========================================================

const postCommentSchema = new mongoose.Schema(

    {

        userId: {

            type:
                mongoose.Schema.Types.ObjectId,

            required: true

        },


        userName: {

            type: String,

            default: "",

            trim: true

        },


        userImage: {

            type: String,

            default: "",

            trim: true

        },


        text: {

            type: String,

            required: true,

            trim: true

        },


        createdAt: {

            type: Date,

            default: Date.now

        }

    },

    {

        _id: true

    }

);


// ==========================================================
// MEDICAL UPDATE SUBDOCUMENT
// ==========================================================

const medicalSchema = new mongoose.Schema(

    {

        status: {

            type: String,

            default: "",

            trim: true

        },


        type: {

            type: String,

            default: "",

            trim: true

        },


        details: {

            type: String,

            default: "",

            trim: true

        },


        markedAt: {

            type: Date,

            default: null

        },


        markedBy: {

            type:
                mongoose.Schema.Types.ObjectId,

            default: null

        },


        clearedAt: {

            type: Date,

            default: null

        },


        clearedBy: {

            type:
                mongoose.Schema.Types.ObjectId,

            default: null

        },


        charges: {

            type: Number,

            default: 0,

            min: 0

        },


        clearDescription: {

            type: String,

            default: "",

            trim: true

        }

    },

    {

        _id: false

    }

);


// ==========================================================
// MAINTENANCE UPDATE SUBDOCUMENT
// ==========================================================

const maintenanceSchema = new mongoose.Schema(

    {

        status: {

            type: String,

            default: "",

            trim: true

        },


        type: {

            type: String,

            default: "",

            trim: true

        },


        description: {

            type: String,

            default: "",

            trim: true

        },


        markedAt: {

            type: Date,

            default: null

        },


        markedBy: {

            type:
                mongoose.Schema.Types.ObjectId,

            default: null

        },


        clearedAt: {

            type: Date,

            default: null

        },


        clearedBy: {

            type:
                mongoose.Schema.Types.ObjectId,

            default: null

        },


        charges: {

            type: Number,

            default: 0,

            min: 0

        },


        clearDescription: {

            type: String,

            default: "",

            trim: true

        }

    },

    {

        _id: false

    }

);


// ==========================================================
// ASSET ADDED UPDATE SUBDOCUMENT
// ==========================================================
//
// Created whenever an asset is added to a dairy.
//
// ==========================================================

const assetAddSchema = new mongoose.Schema(

    {

        assetId: {

            type:
                mongoose.Schema.Types.ObjectId,

            ref: "Dairy",

            default: null

        },


        name: {

            type: String,

            default: "",

            trim: true

        },


        type: {

            type: String,

            default: "",

            trim: true

        },


        buyingPrice: {

            type: Number,

            default: 0,

            min: 0

        },


        currentWorth: {

            type: Number,

            default: 0,

            min: 0

        },


        description: {

            type: String,

            default: "",

            trim: true

        },


        condition: {

            type: String,

            default: "",

            trim: true

        },


        location: {

            type: String,

            default: "",

            trim: true

        },


        status: {

            type: String,

            default: "active",

            trim: true

        },


        assetCode: {

            type: Number,

            default: null

        },


        parentDairyId: {

            type:
                mongoose.Schema.Types.ObjectId,

            ref: "Dairy",

            default: null

        },


        parentDairyName: {

            type: String,

            default: "",

            trim: true

        },


        parentDairyCode: {

            type: Number,

            default: null

        }

    },

    {

        _id: false

    }

);


// ==========================================================
// STOCK UPDATE SUBDOCUMENT
// ==========================================================
//
// This replaces the old feedStoreSchema.
//
// It represents a visible STOCK FEED ITEM.
//
// There are two possible actions:
//
//     available
//         Created automatically when admin adds stock.
//
//     remainder
//         Created when dairyWorker reports remaining stock.
//
// ==========================================================

const stockSchema = new mongoose.Schema(

    {

        // ==================================================
        // STOCK TYPE
        // ==================================================
        //
        // feed
        // medicine
        //
        // ==================================================

        stockType: {

            type: String,

            enum: STOCK_TYPES,

            required: true,

            trim: true

        },


        // ==================================================
        // ACTION
        // ==================================================
        //
        // available
        // remainder
        //
        // ==================================================

        action: {

            type: String,

            enum: STOCK_ACTIONS,

            required: true,

            trim: true

        },


        // ==================================================
        // ITEM NAME
        // ==================================================
        //
        // Examples:
        //
        // Feed:
        //
        //     Fodder
        //     Silage
        //     Hay
        //     Dairy Meal
        //
        // Medicine:
        //
        //     Multivitamin
        //     Dewormer
        //     Antibiotic
        //
        // ==================================================

        itemName: {

            type: String,

            required: true,

            trim: true,

            maxlength: 150

        },


        // ==================================================
        // CATEGORY
        // ==================================================
        //
        // Backend-provided category.
        //
        // Examples:
        //
        //     fodder
        //     silage
        //     hay
        //
        // or medicine categories.
        //
        // ==================================================

        category: {

            type: String,

            default: "",

            trim: true,

            maxlength: 100

        },


        // ==================================================
        // QUANTITY
        // ==================================================
        //
        // For ADMIN:
        //
        //     quantity made available.
        //
        // For WORKER:
        //
        //     quantity remaining.
        //
        // ==================================================

        quantity: {

            type: Number,

            required: true,

            min: 0

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
        // PRICE
        // ==================================================
        //
        // ADMIN ONLY / SYSTEM STOCK AVAILABILITY.
        //
        // This represents the financial value of the stock
        // being added.
        //
        // Worker reports do not create financial values.
        //
        // ==================================================

        price: {

            type: Number,

            default: 0,

            min: 0

        },


        // ==================================================
        // INSTRUCTIONS
        // ==================================================
        //
        // Primarily entered by admin.
        //
        // Example:
        //
        //     Give 2kg per animal twice daily.
        //
        // ==================================================

        instructions: {

            type: String,

            default: "",

            trim: true,

            maxlength: 2000

        },


        // ==================================================
        // EXPECTED DURATION
        // ==================================================
        //
        // Example:
        //
        //     14 days
        //     3 weeks
        //     2 months
        //
        // Kept as text because consumption duration does
        // not necessarily need to be represented numerically.
        //
        // ==================================================

        expectedDuration: {

            type: String,

            default: "",

            trim: true,

            maxlength: 100

        },


        // ==================================================
        // ADDITIONAL INFORMATION
        // ==================================================
        //
        // Particularly useful for dairyWorker reports.
        //
        // ==================================================

        message: {

            type: String,

            default: "",

            trim: true,

            maxlength: 2000

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

                            images.length <=
                                MAX_STOCK_IMAGES

                        );

                    },

                message:
                    `A maximum of ${MAX_STOCK_IMAGES} stock images is allowed.`

            }

        }

    },

    {

        _id: false

    }

);


// ==========================================================
// UPDATE SCHEMA
// ==========================================================

const updateSchema = new mongoose.Schema(

    {

        // ==================================================
        // DAIRY
        // ==================================================

        dairy: {

            type:
                mongoose.Schema.Types.ObjectId,

            ref: "Dairy",

            required: true,

            index: true

        },


        // ==================================================
        // USER
        // ==================================================
        //
        // null is VALID for System-generated stock posts.
        //
        // ==================================================

        user: {

            type:
                mongoose.Schema.Types.ObjectId,

            ref: "User",

            default: null

        },


        // ==================================================
        // USER NAME
        // ==================================================
        //
        // Normal update:
        //
        //     actual user name
        //
        // System stock:
        //
        //     System
        //
        // ==================================================

        userName: {

            type: String,

            default: "",

            trim: true,

            maxlength: 150

        },


        // ==================================================
        // USER IMAGE
        // ==================================================
        //
        // Normal update:
        //
        //     actual profile image
        //
        // System stock:
        //
        //     /images/h1.png
        //
        // ==================================================

        userImage: {

            type: String,

            default: "",

            trim: true

        },


        // ==================================================
        // AUTHOR ROLE
        // ==================================================
        //
        // Stored explicitly because a System-generated
        // update does not have a User document.
        //
        // Possible values:
        //
        //     admin
        //     dairyWorker
        //     system
        //
        // ==================================================

        authorRole: {

            type: String,

            enum: [

                "admin",

                "dairyWorker",

                "system",

                ""

            ],

            default: "",

            trim: true

        },


        // ==================================================
        // UPDATE TYPE
        // ==================================================

        type: {

            type: String,

            enum: [

                "post",

                "comment",

                "image",

                "medical",

                "maintenance",

                "assetAdd",

                "stock"

            ],

            required: true,

            index: true

        },


        // ==================================================
        // TITLE
        // ==================================================
        //
        // Used by stock cards.
        //
        // Examples:
        //
        //     More Animal Feed Available
        //
        //     More Veterinary Meds Available
        //
        // ==================================================

        title: {

            type: String,

            default: "",

            trim: true,

            maxlength: 200

        },


        // ==================================================
        // POST TEXT
        // ==================================================

        text: {

            type: String,

            default: "",

            trim: true,

            maxlength: 1000

        },


        // ==================================================
        // POST IMAGES
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

                            images.length <=
                                MAX_POST_IMAGES

                        );

                    },

                message:
                    `A maximum of ${MAX_POST_IMAGES} images is allowed per post.`

            }

        },


        // ==================================================
        // LEGACY SINGLE IMAGE
        // ==================================================

        image: {

            type: String,

            default: null,

            trim: true

        },


        // ==================================================
        // GENERAL COMMENT
        // ==================================================

        comment: {

            type: String,

            default: "",

            trim: true

        },


        // ==================================================
        // POST LIKES
        // ==================================================

        likes: {

            type: [

                {

                    type:
                        mongoose.Schema.Types.ObjectId,

                    ref: "User"

                }

            ],

            default: []

        },


        // ==================================================
        // POST COMMENTS
        // ==================================================

        comments: {

            type:
                [postCommentSchema],

            default: []

        },


        // ==================================================
        // MEDICAL
        // ==================================================

        medical: {

            type:
                medicalSchema,

            default: undefined

        },


        // ==================================================
        // MAINTENANCE
        // ==================================================

        maintenance: {

            type:
                maintenanceSchema,

            default: undefined

        },


        // ==================================================
        // ASSET ADDED
        // ==================================================

        asset: {

            type:
                assetAddSchema,

            default: undefined

        },


        // ==================================================
        // STOCK
        // ==================================================
        //
        // Used for both:
        //
        //     admin availability
        //     dairy-worker remainder reports
        //
        // ==================================================

        stock: {

            type:
                stockSchema,

            default: undefined

        }

    },

    {

        timestamps: true

    }

);


// ==========================================================
// PRE VALIDATE
// ==========================================================

updateSchema.pre(

    "validate",

    function(next) {

        // ==================================================
        // NORMALIZE POST IMAGES
        // ==================================================

        if (
            !Array.isArray(this.images)
        ) {

            this.images = [];

        }


        this.images =
            this.images

                .filter(Boolean)

                .map(
                    image =>
                        String(image).trim()
                )

                .filter(Boolean)

                .slice(
                    0,
                    MAX_POST_IMAGES
                );


        // ==================================================
        // LEGACY IMAGE FALLBACK
        // ==================================================

        if (

            this.images.length === 0 &&

            this.image

        ) {

            this.images = [

                String(
                    this.image
                ).trim()

            ];

        }


        // ==================================================
        // KEEP LEGACY IMAGE SYNCHRONIZED
        // ==================================================

        if (
            this.images.length > 0
        ) {

            this.image =
                this.images[0];

        } else {

            this.image = null;

        }


        // ==================================================
        // NORMALIZE STOCK IMAGES
        // ==================================================

        if (
            this.stock
        ) {

            if (
                !Array.isArray(
                    this.stock.images
                )
            ) {

                this.stock.images = [];

            }


            this.stock.images =
                this.stock.images

                    .filter(Boolean)

                    .map(
                        image =>
                            String(image).trim()
                    )

                    .filter(Boolean)

                    .slice(
                        0,
                        MAX_STOCK_IMAGES
                    );

        }


        // ==================================================
        // NORMALIZE STOCK FINANCIAL VALUES
        // ==================================================

        if (
            this.stock
        ) {

            this.stock.quantity =
                Number(
                    this.stock.quantity
                ) || 0;


            this.stock.price =
                Number(
                    this.stock.price
                ) || 0;

        }


        // ==================================================
        // SYSTEM STOCK NORMALIZATION
        // ==================================================
        //
        // Admin availability updates are system-generated.
        //
        // This protects the feed from accidentally displaying
        // the admin as the author of the automatic stock post.
        //
        // ==================================================

        if (

            this.type === "stock" &&

            this.stock &&

            this.stock.action === "available"

        ) {

            this.authorRole =
                "system";


            this.userName =
                "System";


            this.userImage =
                "/images/h1.png";


            this.user =
                null;

        }


        // ==================================================
        // STOCK TITLE NORMALIZATION
        // ==================================================
        //
        // Only generate the title automatically when the
        // service has not already supplied one.
        //
        // ==================================================

        if (

            this.type === "stock" &&

            this.stock

        ) {

            if (
                !this.title
            ) {

                this.title =
                    this.stock.stockType === "medicine"

                        ? "More Veterinary Meds Available"

                        : "More Animal Feed Available";

            }

        }


        next();

    }

);


// ==========================================================
// STATIC: MAX POST IMAGES
// ==========================================================

updateSchema.statics.getMaxPostImages =
function() {

    return MAX_POST_IMAGES;

};


// ==========================================================
// STATIC: MAX STOCK IMAGES
// ==========================================================

updateSchema.statics.getMaxStockImages =
function() {

    return MAX_STOCK_IMAGES;

};


// ==========================================================
// STATIC: STOCK TYPES
// ==========================================================

updateSchema.statics.getStockTypes =
function() {

    return STOCK_TYPES;

};


// ==========================================================
// STATIC: STOCK ACTIONS
// ==========================================================

updateSchema.statics.getStockActions =
function() {

    return STOCK_ACTIONS;

};


// ==========================================================
// STATIC: STOCK UNITS
// ==========================================================

updateSchema.statics.getStockUnits =
function() {

    return STOCK_UNITS;

};


// ==========================================================
// MODEL
// ==========================================================

const Update =

    mongoose.models.Update ||

    mongoose.model(
        "Update",
        updateSchema
    );


// ==========================================================
// CONSTANT EXPORTS
// ==========================================================

Update.MAX_POST_IMAGES =
    MAX_POST_IMAGES;

Update.MAX_STOCK_IMAGES =
    MAX_STOCK_IMAGES;

Update.STOCK_TYPES =
    STOCK_TYPES;

Update.STOCK_ACTIONS =
    STOCK_ACTIONS;

Update.STOCK_UNITS =
    STOCK_UNITS;


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    Update;