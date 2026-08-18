// ==========================================================
// models/Update.js
// ==========================================================
//
// DAIRY UPDATE MODEL
//
// RESPONSIBILITIES:
//
//     • General dairy posts
//     • Comments
//     • Medical updates
//     • Maintenance updates
//     • Asset-added updates
//     • Post images
//     • Likes
//
// IMPORTANT:
//
// FEED STORE / ANIMAL FEED / VETERINARY MEDICINE
// ----------------------------------------------------------
//
// Feed-stock is NOT handled by this model.
//
// Feed-stock belongs entirely to:
//
//     Dairy.feedStocks[]
//
// The feed-store service/controller should handle:
//
//     • Adding stock
//     • Restocking
//     • Reducing stock
//     • Current quantity
//     • Unit price
//     • Stock expenditure
//     • Feed / medicine options
//
// This model must NEVER be used for feed-stock operations.
//
// ==========================================================


const mongoose =
    require("mongoose");


// ==========================================================
// CONSTANTS
// ==========================================================

const MAX_POST_IMAGES = 10;


// ==========================================================
// POST COMMENT SUBDOCUMENT
// ==========================================================

const postCommentSchema =
    new mongoose.Schema(

        {

            // ==================================================
            // USER
            // ==================================================

            userId: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "User",

                required: true

            },


            // ==================================================
            // USER NAME
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

            userImage: {

                type: String,

                default: "",

                trim: true

            },


            // ==================================================
            // COMMENT TEXT
            // ==================================================

            text: {

                type: String,

                required: true,

                trim: true,

                maxlength: 2000

            },


            // ==================================================
            // CREATED AT
            // ==================================================

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

const medicalSchema =
    new mongoose.Schema(

        {

            // ==================================================
            // STATUS
            // ==================================================

            status: {

                type: String,

                default: "",

                trim: true

            },


            // ==================================================
            // MEDICAL TYPE
            // ==================================================

            type: {

                type: String,

                default: "",

                trim: true

            },


            // ==================================================
            // DETAILS
            // ==================================================

            details: {

                type: String,

                default: "",

                trim: true

            },


            // ==================================================
            // MARKED AT
            // ==================================================

            markedAt: {

                type: Date,

                default: null

            },


            // ==================================================
            // MARKED BY
            // ==================================================

            markedBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "User",

                default: null

            },


            // ==================================================
            // CLEARED AT
            // ==================================================

            clearedAt: {

                type: Date,

                default: null

            },


            // ==================================================
            // CLEARED BY
            // ==================================================

            clearedBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "User",

                default: null

            },


            // ==================================================
            // CHARGES
            // ==================================================

            charges: {

                type: Number,

                default: 0,

                min: 0

            },


            // ==================================================
            // CLEAR DESCRIPTION
            // ==================================================

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

const maintenanceSchema =
    new mongoose.Schema(

        {

            // ==================================================
            // STATUS
            // ==================================================

            status: {

                type: String,

                default: "",

                trim: true

            },


            // ==================================================
            // MAINTENANCE TYPE
            // ==================================================

            type: {

                type: String,

                default: "",

                trim: true

            },


            // ==================================================
            // DESCRIPTION
            // ==================================================

            description: {

                type: String,

                default: "",

                trim: true

            },


            // ==================================================
            // MARKED AT
            // ==================================================

            markedAt: {

                type: Date,

                default: null

            },


            // ==================================================
            // MARKED BY
            // ==================================================

            markedBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "User",

                default: null

            },


            // ==================================================
            // CLEARED AT
            // ==================================================

            clearedAt: {

                type: Date,

                default: null

            },


            // ==================================================
            // CLEARED BY
            // ==================================================

            clearedBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "User",

                default: null

            },


            // ==================================================
            // CHARGES
            // ==================================================

            charges: {

                type: Number,

                default: 0,

                min: 0

            },


            // ==================================================
            // CLEAR DESCRIPTION
            // ==================================================

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
// ASSET ADD UPDATE SUBDOCUMENT
// ==========================================================

const assetAddSchema =
    new mongoose.Schema(

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
            // ASSET NAME
            // ==================================================

            name: {

                type: String,

                default: "",

                trim: true,

                maxlength: 150

            },


            // ==================================================
            // ASSET TYPE
            // ==================================================

            type: {

                type: String,

                default: "",

                trim: true,

                maxlength: 100

            },


            // ==================================================
            // BUYING PRICE
            // ==================================================

            buyingPrice: {

                type: Number,

                default: 0,

                min: 0

            },


            // ==================================================
            // CURRENT WORTH
            // ==================================================

            currentWorth: {

                type: Number,

                default: 0,

                min: 0

            },


            // ==================================================
            // DESCRIPTION
            // ==================================================

            description: {

                type: String,

                default: "",

                trim: true,

                maxlength: 2000

            },


            // ==================================================
            // CONDITION
            // ==================================================

            condition: {

                type: String,

                default: "",

                trim: true,

                maxlength: 100

            },


            // ==================================================
            // LOCATION
            // ==================================================

            location: {

                type: String,

                default: "",

                trim: true,

                maxlength: 150

            },


            // ==================================================
            // STATUS
            // ==================================================

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
            // PARENT DAIRY ID
            // ==================================================

            parentDairyId: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "Dairy",

                default: null

            },


            // ==================================================
            // PARENT DAIRY NAME
            // ==================================================

            parentDairyName: {

                type: String,

                default: "",

                trim: true

            },


            // ==================================================
            // PARENT DAIRY CODE
            // ==================================================

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
// UPDATE SCHEMA
// ==========================================================

const updateSchema =
    new mongoose.Schema(

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


            // ==================================================
            // USER NAME
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

            userImage: {

                type: String,

                default: "",

                trim: true

            },


            // ==================================================
            // AUTHOR ROLE
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

                    "assetAdd"

                ],

                required: true,

                index: true

            },


            // ==================================================
            // TITLE
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
            // LIKES
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
            // COMMENTS
            // ==================================================

            comments: {

                type:
                    [postCommentSchema],

                default: []

            },


            // ==================================================
            // MEDICAL UPDATE
            // ==================================================

            medical: {

                type:
                    medicalSchema,

                default: undefined

            },


            // ==================================================
            // MAINTENANCE UPDATE
            // ==================================================

            maintenance: {

                type:
                    maintenanceSchema,

                default: undefined

            },


            // ==================================================
            // ASSET ADD UPDATE
            // ==================================================

            asset: {

                type:
                    assetAddSchema,

                default: undefined

            }

        },

        {

            timestamps: true

        }

    );


// ==========================================================
// INDEXES
// ==========================================================
//
// These indexes are only for the actual Update model.
//
// There are NO feed-stock indexes.
//
// ==========================================================

updateSchema.index({

    dairy: 1,

    createdAt: -1

});


updateSchema.index({

    dairy: 1,

    type: 1,

    createdAt: -1

});


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
            !Array.isArray(
                this.images
            )
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

            const legacyImage =
                String(
                    this.image
                ).trim();


            if (
                legacyImage
            ) {

                this.images = [

                    legacyImage

                ];

            }

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
        // NORMALIZE GENERAL TEXT
        // ==================================================

        if (
            this.title
        ) {

            this.title =
                String(
                    this.title
                ).trim();

        }


        if (
            this.text
        ) {

            this.text =
                String(
                    this.text
                ).trim();

        }


        if (
            this.comment
        ) {

            this.comment =
                String(
                    this.comment
                ).trim();

        }


        // ==================================================
        // NORMALIZE MEDICAL
        // ==================================================

        if (
            this.medical
        ) {

            if (
                this.medical.status
            ) {

                this.medical.status =
                    String(
                        this.medical.status
                    ).trim();

            }


            if (
                this.medical.type
            ) {

                this.medical.type =
                    String(
                        this.medical.type
                    ).trim();

            }


            if (
                this.medical.details
            ) {

                this.medical.details =
                    String(
                        this.medical.details
                    ).trim();

            }


            if (
                this.medical.clearDescription
            ) {

                this.medical.clearDescription =
                    String(
                        this.medical.clearDescription
                    ).trim();

            }

        }


        // ==================================================
        // NORMALIZE MAINTENANCE
        // ==================================================

        if (
            this.maintenance
        ) {

            if (
                this.maintenance.status
            ) {

                this.maintenance.status =
                    String(
                        this.maintenance.status
                    ).trim();

            }


            if (
                this.maintenance.type
            ) {

                this.maintenance.type =
                    String(
                        this.maintenance.type
                    ).trim();

            }


            if (
                this.maintenance.description
            ) {

                this.maintenance.description =
                    String(
                        this.maintenance.description
                    ).trim();

            }


            if (
                this.maintenance.clearDescription
            ) {

                this.maintenance.clearDescription =
                    String(
                        this.maintenance.clearDescription
                    ).trim();

            }

        }


        // ==================================================
        // NORMALIZE ASSET
        // ==================================================

        if (
            this.asset
        ) {

            if (
                this.asset.name
            ) {

                this.asset.name =
                    String(
                        this.asset.name
                    ).trim();

            }


            if (
                this.asset.type
            ) {

                this.asset.type =
                    String(
                        this.asset.type
                    ).trim();

            }


            if (
                this.asset.description
            ) {

                this.asset.description =
                    String(
                        this.asset.description
                    ).trim();

            }


            if (
                this.asset.condition
            ) {

                this.asset.condition =
                    String(
                        this.asset.condition
                    ).trim();

            }


            if (
                this.asset.location
            ) {

                this.asset.location =
                    String(
                        this.asset.location
                    ).trim();

            }


            if (
                this.asset.parentDairyName
            ) {

                this.asset.parentDairyName =
                    String(
                        this.asset.parentDairyName
                    ).trim();

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