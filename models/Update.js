// ==========================================================
// models/Update.js
// ==========================================================

const mongoose =
    require("mongoose");


// ==========================================================
// CONSTANTS
// ==========================================================

const MAX_POST_IMAGES = 10;

const MAX_FEED_IMAGES = 10;


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
// Created whenever a manual asset is added to a Dairy Farm.
//
// The Update belongs to the PARENT DAIRY FARM.
//
// ==========================================================

const assetAddSchema = new mongoose.Schema(

    {

        // ==================================================
        // ASSET ID
        // ==================================================

        assetId: {

            type:
                mongoose.Schema.Types.ObjectId,

            ref: "Dairy",

            default: null

        },


        // ==================================================
        // ASSET DETAILS
        // ==================================================

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


        // ==================================================
        // ASSET CODE
        // ==================================================

        assetCode: {

            type: Number,

            default: null

        },


        // ==================================================
        // PARENT DAIRY
        // ==================================================

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
// FEED STORE UPDATE SUBDOCUMENT
// ==========================================================
//
// Used by:
//
//     • dairyWorker
//     • admin
//
// This represents an ACTIVITY / REPORT concerning the
// feed store.
//
// The current feed-store state itself belongs to Dairy.
//
// This subdocument provides the historical record explaining
// what happened.
//
// ==========================================================

const feedStoreSchema = new mongoose.Schema(

    {

        // ==================================================
        // ACTION
        // ==================================================
        //
        // condition
        //     General facility / feed-condition report.
        //
        // consumption
        //     Feed consumed/used.
        //
        // restock
        //     Existing or new stock added.
        //
        // ==================================================

        action: {

            type: String,

            enum: [

                "condition",

                "consumption",

                "restock"

            ],

            required: true,

            trim: true

        },


        // ==================================================
        // FEED NAME
        // ==================================================
        //
        // Examples:
        //
        //     Maize silage
        //     Rhodes grass hay
        //     Dairy meal
        //
        // ==================================================

        feedName: {

            type: String,

            default: "",

            trim: true

        },


        // ==================================================
        // FEED CATEGORY
        // ==================================================
        //
        // Examples:
        //
        //     fodder
        //     silage
        //     hay
        //     concentrates
        //     minerals
        //     other
        //
        // ==================================================

        feedCategory: {

            type: String,

            default: "",

            trim: true

        },


        // ==================================================
        // NEW STOCK INDICATOR
        // ==================================================
        //
        // true:
        //     A new feed type/name was introduced.
        //
        // false:
        //     Existing feed stock was updated.
        //
        // ==================================================

        isNewStock: {

            type: Boolean,

            default: false

        },


        // ==================================================
        // QUANTITY
        // ==================================================
        //
        // Quantity involved in the operation.
        //
        // ==================================================

        quantity: {

            type: Number,

            default: 0,

            min: 0

        },


        // ==================================================
        // UNIT
        // ==================================================
        //
        // Examples:
        //
        //     kg
        //     bags
        //     tonnes
        //     bales
        //     litres
        //
        // ==================================================

        unit: {

            type: String,

            default: "",

            trim: true

        },


        // ==================================================
        // PERCENTAGE REMAINING
        // ==================================================
        //
        // Worker's estimate of remaining feed stock.
        //
        // 0 - 100
        //
        // ==================================================

        percentageRemaining: {

            type: Number,

            default: null,

            min: 0,

            max: 100

        },


        // ==================================================
        // FEEDS AMOUNT
        // ==================================================
        //
        // IMPORTANT:
        //
        // This field records the financial amount associated
        // with this feed activity.
        //
        // For consumption:
        //
        //     amount of feed value consumed.
        //
        // For restocking:
        //
        //     amount financially committed/spent.
        //
        // This value is also used when calculating the
        // aggregate Dairy.feedsAmount.
        //
        // ==================================================

        feedsAmount: {

            type: Number,

            default: 0,

            min: 0

        },


        // ==================================================
        // UNIT COST
        // ==================================================
        //
        // Primarily useful for administrative restocking.
        //
        // ==================================================

        unitCost: {

            type: Number,

            default: 0,

            min: 0

        },


        // ==================================================
        // TOTAL COST
        // ==================================================
        //
        // Explicit financial value for the transaction.
        //
        // Kept separately from feedsAmount so that financial
        // calculations can distinguish transaction cost from
        // the aggregate feed-value amount.
        //
        // ==================================================

        totalCost: {

            type: Number,

            default: 0,

            min: 0

        },


        // ==================================================
        // STOCK BALANCE AFTER OPERATION
        // ==================================================
        //
        // Snapshot of the affected feed's quantity after
        // this operation.
        //
        // ==================================================

        stockBalance: {

            type: Number,

            default: null,

            min: 0

        },


        // ==================================================
        // STOCK UNIT
        // ==================================================

        stockUnit: {

            type: String,

            default: "",

            trim: true

        },


        // ==================================================
        // MESSAGE
        // ==================================================
        //
        // General observations from the worker/admin.
        //
        // Can describe:
        //
        //     • facility condition
        //     • feed quality
        //     • storage conditions
        //     • consumption
        //     • restocking
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
        //
        // Feed-store condition / quality images.
        //
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
                                MAX_FEED_IMAGES

                        );

                    },

                message:
                    `A maximum of ${MAX_FEED_IMAGES} feed-store images is allowed.`

            }

        },


        // ==================================================
        // ADMIN FINANCIAL NOTE
        // ==================================================

        financialNote: {

            type: String,

            default: "",

            trim: true,

            maxlength: 1000

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

        user: {

            type:
                mongoose.Schema.Types.ObjectId,

            ref: "User",

            default: null

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

                "feedStore"

            ],

            required: true,

            index: true

        },


        // ==================================================
        // POST TITLE
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
        // FEED STORE
        // ==================================================
        //
        // Feed-store activity/report.
        //
        // The current stock itself is NOT stored here.
        //
        // This is a historical snapshot of what the user
        // reported or what the admin changed.
        //
        // ==================================================

        feedStore: {

            type:
                feedStoreSchema,

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
//
// Normalize post images and feed-store images while keeping
// the legacy `image` field available.
//
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
        // NORMALIZE FEED STORE IMAGES
        // ==================================================

        if (
            this.feedStore &&
            !Array.isArray(
                this.feedStore.images
            )
        ) {

            this.feedStore.images = [];

        }


        if (
            this.feedStore
        ) {

            this.feedStore.images =
                this.feedStore.images

                    .filter(Boolean)

                    .map(
                        image =>
                            String(image).trim()
                    )

                    .filter(Boolean)

                    .slice(
                        0,
                        MAX_FEED_IMAGES
                    );

        }


        // ==================================================
        // NORMALIZE FEED FINANCIAL VALUES
        // ==================================================

        if (
            this.feedStore
        ) {

            this.feedStore.feedsAmount =
                Number(
                    this.feedStore.feedsAmount
                ) || 0;


            this.feedStore.unitCost =
                Number(
                    this.feedStore.unitCost
                ) || 0;


            this.feedStore.totalCost =
                Number(
                    this.feedStore.totalCost
                ) || 0;


            this.feedStore.quantity =
                Number(
                    this.feedStore.quantity
                ) || 0;

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
// STATIC: MAX FEED IMAGES
// ==========================================================

updateSchema.statics.getMaxFeedImages =
function() {

    return MAX_FEED_IMAGES;

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

Update.MAX_FEED_IMAGES =
    MAX_FEED_IMAGES;


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    Update;