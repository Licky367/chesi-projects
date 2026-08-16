// ==========================================================
// models/Update.js
// ==========================================================

const mongoose = require("mongoose");


// ==========================================================
// CONSTANTS
// ==========================================================

const MAX_POST_IMAGES = 10;


// ==========================================================
// POST COMMENT SUBDOCUMENT
// ==========================================================

const postCommentSchema = new mongoose.Schema(

    {

        userId: {

            type: mongoose.Schema.Types.ObjectId,

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

            type: mongoose.Schema.Types.ObjectId,

            default: null

        },


        clearedAt: {

            type: Date,

            default: null

        },


        clearedBy: {

            type: mongoose.Schema.Types.ObjectId,

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

            type: mongoose.Schema.Types.ObjectId,

            default: null

        },


        clearedAt: {

            type: Date,

            default: null

        },


        clearedBy: {

            type: mongoose.Schema.Types.ObjectId,

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

                "assetAdd"

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
        //
        // New multi-image post system.
        //
        // Maximum:
        //
        //     10 images per post.
        //
        // The order is preserved.
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

                validator: function(images) {

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
        //
        // Kept for older records and older code.
        //
        // New posts should use `images`.
        //
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

            type: [postCommentSchema],

            default: []

        },


        // ==================================================
        // MEDICAL
        // ==================================================

        medical: {

            type: medicalSchema,

            default: undefined

        },


        // ==================================================
        // MAINTENANCE
        // ==================================================

        maintenance: {

            type: maintenanceSchema,

            default: undefined

        },


        // ==================================================
        // ASSET ADDED
        // ==================================================

        asset: {

            type: assetAddSchema,

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
// Normalize post images while keeping the legacy `image`
// field available.
//
// ==========================================================

updateSchema.pre(

    "validate",

    function(next) {

        // ==================================================
        // NORMALIZE IMAGES
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
        //
        // If an old record has only `image`, expose it
        // through the new `images` array as well.
        //
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
        //
        // The first image is the primary image.
        //
        // Older code using `update.image` therefore
        // continues to work.
        //
        // ==================================================

        if (
            this.images.length > 0
        ) {

            this.image =
                this.images[0];

        } else {

            this.image = null;

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
// MODEL
// ==========================================================

const Update =

    mongoose.models.Update ||

    mongoose.model(
        "Update",
        updateSchema
    );


// ==========================================================
// CONSTANT EXPORT
// ==========================================================

Update.MAX_POST_IMAGES =
    MAX_POST_IMAGES;


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    Update;