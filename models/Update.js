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
// ASSET ADDITION UPDATE SUBDOCUMENT
// ==========================================================
//
// This records the information needed by addAsset.ejs.
//
// The actual asset remains stored in Dairy.
//
// This subdocument is only the feed/event record.
// ==========================================================

const assetSchema = new mongoose.Schema(

    {

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

        },

        assetId: {

            type: mongoose.Schema.Types.ObjectId,

            ref: "Dairy",

            default: null

        },

        parentFarmCode: {

            type: Number,

            default: null

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

        // --------------------------------------------------
        // DAIRY
        // --------------------------------------------------

        dairy: {

            type: mongoose.Schema.Types.ObjectId,

            ref: "Dairy",

            required: true,

            index: true

        },


        // --------------------------------------------------
        // USER
        // --------------------------------------------------

        user: {

            type: mongoose.Schema.Types.ObjectId,

            default: null

        },


        userName: {

            type: String,

            default: ""

        },


        // --------------------------------------------------
        // UPDATE TYPE
        // --------------------------------------------------

        type: {

            type: String,

            enum: [

                "post",

                "comment",

                "image",

                "medical",

                "maintenance",

                "asset"

            ],

            required: true

        },


        // --------------------------------------------------
        // POST CONTENT
        // --------------------------------------------------

        text: {

            type: String,

            default: ""

        },


        image: {

            type: String,

            default: null

        },


        // --------------------------------------------------
        // GENERAL COMMENT
        // --------------------------------------------------

        comment: {

            type: String,

            default: ""

        },


        // --------------------------------------------------
        // POST LIKES
        // --------------------------------------------------

        likes: [

            {

                type: mongoose.Schema.Types.ObjectId

            }

        ],


        // --------------------------------------------------
        // POST COMMENTS
        // --------------------------------------------------

        comments: {

            type: [postCommentSchema],

            default: []

        },


        // --------------------------------------------------
        // MEDICAL
        // --------------------------------------------------

        medical: {

            type: medicalSchema,

            default: undefined

        },


        // --------------------------------------------------
        // MAINTENANCE
        // --------------------------------------------------

        maintenance: {

            type: maintenanceSchema,

            default: undefined

        },


        // --------------------------------------------------
        // ASSET
        // --------------------------------------------------

        asset: {

            type: assetSchema,

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