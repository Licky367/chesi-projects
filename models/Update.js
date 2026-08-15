// ==========================================================
// models/Update.js
// ==========================================================

const mongoose = require("mongoose");


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

            default: ""

        },

        userImage: {

            type: String,

            default: ""

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

            default: ""

        },

        type: {

            type: String,

            default: ""

        },

        details: {

            type: String,

            default: ""

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

            default: 0

        },

        clearDescription: {

            type: String,

            default: ""

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

            default: ""

        },

        type: {

            type: String,

            default: ""

        },

        description: {

            type: String,

            default: ""

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

            default: 0

        },

        clearDescription: {

            type: String,

            default: ""

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
// The Update belongs to the PARENT DAIRY FARM, not the newly
// created asset.
//
// ==========================================================

const assetAddSchema = new mongoose.Schema(

    {

        assetId: {

            type: mongoose.Schema.Types.ObjectId,

            ref: "Dairy",

            default: null

        },

        name: {

            type: String,

            default: ""

        },

        type: {

            type: String,

            default: ""

        },

        buyingPrice: {

            type: Number,

            default: 0

        },

        currentWorth: {

            type: Number,

            default: 0

        },

        description: {

            type: String,

            default: ""

        },

        condition: {

            type: String,

            default: ""

        },

        location: {

            type: String,

            default: ""

        },

        status: {

            type: String,

            default: "active"

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

            type: mongoose.Schema.Types.ObjectId,

            ref: "Dairy",

            required: true,

            index: true

        },


        // ==================================================
        // USER
        // ==================================================

        user: {

            type: mongoose.Schema.Types.ObjectId,

            default: null

        },


        userName: {

            type: String,

            default: ""

        },


        userImage: {

            type: String,

            default: ""

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

            required: true

        },


        // ==================================================
        // POST TITLE
        // ==================================================
        //
        // Used for normal user-created posts.
        //
        // Example:
        //
        // "Morning activities at the farm"
        //
        // Other update types can simply leave this empty.
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
        //
        // Main body/content of a normal post.
        //
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
        // A post can contain multiple uploaded images.
        //
        // Example:
        //
        // images: [
        //     "image-1.jpg",
        //     "image-2.jpg",
        //     "image-3.jpg"
        // ]
        //
        // ==================================================

        images: {

            type: [String],

            default: []

        },


        // ==================================================
        // LEGACY SINGLE IMAGE
        // ==================================================
        //
        // Kept temporarily so older posts that were created
        // using the previous single-image system continue
        // to work.
        //
        // New posts should use `images`.
        //
        // ==================================================

        image: {

            type: String,

            default: null

        },


        // ==================================================
        // GENERAL COMMENT
        // ==================================================

        comment: {

            type: String,

            default: ""

        },


        // ==================================================
        // POST LIKES
        // ==================================================

        likes: [

            {

                type: mongoose.Schema.Types.ObjectId

            }

        ],


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
// MODEL
// ==========================================================

module.exports =

    mongoose.models.Update ||

    mongoose.model(
        "Update",
        updateSchema
    );