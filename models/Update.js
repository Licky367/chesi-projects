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
// IMPORTANT STOCK RULE
// ----------------------------------------------------------
//
// EVERY stock event is an independent Update document.
//
// Example:
//
//     Admin adds 20kg Dairy Meal
//     Admin adds another 30kg Dairy Meal
//     Worker reports 25kg remaining
//
// These create THREE separate:
//
//     Update documents
//
// They must NEVER overwrite or collapse into one another.
//
// Current inventory belongs to:
//
//     Dairy.feedStocks[]
//
// Historical feed events belong to:
//
//     Update.stock
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

const STOCK_TYPES = [

    "feed",

    "medicine"

];


// ==========================================================
// STOCK ACTIONS
// ==========================================================

const STOCK_ACTIONS = [

    "available",

    "remainder"

];


// ==========================================================
// STOCK UNITS
// ==========================================================
//
// MUST ALIGN WITH:
//
//     services/update/feedsService.js
//
// ==========================================================

const STOCK_UNITS = [

    "kg",

    "bags",

    "tonnes",

    "litres",

    "bottles",

    "packs",

    "units"

];


// ==========================================================
// POST COMMENT SUBDOCUMENT
// ==========================================================

const postCommentSchema =
    new mongoose.Schema(

        {

            userId: {

                type:
                    mongoose.Schema.Types.ObjectId,

                required: true

            },


            userName: {

                type: String,

                default: "",

                trim: true,

                maxlength: 150

            },


            userImage: {

                type: String,

                default: "",

                trim: true

            },


            text: {

                type: String,

                required: true,

                trim: true,

                maxlength: 2000

            },


            createdAt: {

                type: Date,

                default: Date.now

            }

        },

        {

            // Comments need their own IDs.
            _id: true

        }

    );


// ==========================================================
// MEDICAL UPDATE SUBDOCUMENT
// ==========================================================

const medicalSchema =
    new mongoose.Schema(

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

const maintenanceSchema =
    new mongoose.Schema(

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
// ASSET ADD UPDATE
// ==========================================================

const assetAddSchema =
    new mongoose.Schema(

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
// CRITICAL:
//
//     _id: TRUE
//
// Every stock event receives its own ID.
//
// This means:
//
//     Update A
//         stock._id = X
//
//     Update B
//         stock._id = Y
//
//     Update C
//         stock._id = Z
//
// Even when all three concern the same feed.
//
// ==========================================================

const stockSchema =
    new mongoose.Schema(

        {

            // ==================================================
            // STOCK TYPE
            // ==================================================

            stockType: {

                type: String,

                enum:
                    STOCK_TYPES,

                required: true,

                trim: true

            },


            // ==================================================
            // ACTION
            // ==================================================

            action: {

                type: String,

                enum:
                    STOCK_ACTIONS,

                required: true,

                trim: true

            },


            // ==================================================
            // ITEM NAME
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

            category: {

                type: String,

                default: "",

                trim: true,

                maxlength: 100

            },


            // ==================================================
            // QUANTITY
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

                enum:
                    STOCK_UNITS,

                required: true,

                trim: true

            },


            // ==================================================
            // PRICE
            // ==================================================

            price: {

                type: Number,

                default: 0,

                min: 0

            },


            // ==================================================
            // INSTRUCTIONS
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

            expectedDuration: {

                type: String,

                default: "",

                trim: true,

                maxlength: 100

            },


            // ==================================================
            // MESSAGE
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

            // ==================================================
            // VERY IMPORTANT
            // ==================================================
            //
            // DO NOT DISABLE THIS.
            //
            // Each stock event must have its own identifier.
            //
            _id: true

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

                    "assetAdd",

                    "stock"

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
            // ASSET
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
            // Each Update document contains at most one stock
            // event.
            //
            // BUT every Update document is independent.
            //
            // Therefore:
            //
            //     Update.stock[0]
            //
            // is NOT used.
            //
            // Instead:
            //
            //     update.stock
            //
            // represents that particular historical event.
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
// INDEXES
// ==========================================================
//
// These indexes are intentionally NON-UNIQUE.
//
// This is critical.
//
// Multiple stock updates for the same dairy are allowed.
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


updateSchema.index({

    dairy: 1,

    "stock.action": 1,

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

            const legacyImage =
                String(
                    this.image
                ).trim();


            if (legacyImage) {

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
        // NORMALIZE STOCK
        // ==================================================

        if (
            this.stock
        ) {

            // ------------------------------------------------
            // IMAGES
            // ------------------------------------------------

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


            // ------------------------------------------------
            // QUANTITY
            // ------------------------------------------------

            const quantity =
                Number(
                    this.stock.quantity
                );


            this.stock.quantity =
                Number.isFinite(quantity) &&
                quantity >= 0

                    ? quantity

                    : 0;


            // ------------------------------------------------
            // PRICE
            // ------------------------------------------------

            const price =
                Number(
                    this.stock.price
                );


            this.stock.price =
                Number.isFinite(price) &&
                price >= 0

                    ? price

                    : 0;


            // ------------------------------------------------
            // STRING NORMALIZATION
            // ------------------------------------------------

            if (
                this.stock.itemName
            ) {

                this.stock.itemName =
                    String(
                        this.stock.itemName
                    ).trim();

            }


            if (
                this.stock.category
            ) {

                this.stock.category =
                    String(
                        this.stock.category
                    ).trim();

            }


            if (
                this.stock.instructions
            ) {

                this.stock.instructions =
                    String(
                        this.stock.instructions
                    ).trim();

            }


            if (
                this.stock.expectedDuration
            ) {

                this.stock.expectedDuration =
                    String(
                        this.stock.expectedDuration
                    ).trim();

            }


            if (
                this.stock.message
            ) {

                this.stock.message =
                    String(
                        this.stock.message
                    ).trim();

            }

        }


        // ==================================================
        // SYSTEM STOCK
        // ==================================================
        //
        // "available" means the stock was made available
        // by the system after an admin restock.
        //
        // The feed therefore identifies the author as System.
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
        // STOCK TITLE
        // ==================================================

        if (

            this.type === "stock" &&

            this.stock

        ) {

            if (
                !this.title
            ) {

                this.title =

                    this.stock.stockType ===
                        "medicine"

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