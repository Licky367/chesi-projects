// ==========================================================
// models/Update.js
// ==========================================================
//
// DAIRY UPDATE / FEED STORE HISTORY MODEL
//
// RESPONSIBILITIES:
//
//     • General dairy posts
//     • Medical updates
//     • Maintenance updates
//     • Asset-added updates
//     • Feed-store stock additions
//     • Feed-store remaining-stock updates
//
// ==========================================================
//
// IMPORTANT FOODSTOCK ARCHITECTURE
// ----------------------------------------------------------
//
// CURRENT INVENTORY:
//
//     Dairy.feedStocks[]
//
// HISTORICAL EVENTS:
//
//     Update.stock
//
// EVERY STOCK EVENT IS A SEPARATE Update DOCUMENT.
//
// Example:
//
//     Admin adds 20kg Dairy Meal
//         -> Update #1
//
//     Admin adds another 30kg Dairy Meal
//         -> Update #2
//
//     Worker reports 40kg remaining
//         -> Update #3
//
// These documents MUST NEVER overwrite one another.
//
// ==========================================================
//
// IMPORTANT STOCK IDENTIFICATION
// ----------------------------------------------------------
//
// Every stock history record stores:
//
//     stock.stockId
//
// This is the _id of the corresponding:
//
//     Dairy.feedStocks[] subdocument
//
// Therefore the application can:
//
//     1. Display available stock.
//     2. User clicks one stock item.
//     3. Open that stock's update/remainder section.
//     4. Display its current backend quantity.
//     5. Display only history belonging to that stock.
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
//
// available
//     Admin makes stock available / restocks.
//
// remainder
//     Admin or dairyWorker records remaining stock.
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
// These are the units allowed when ADMIN adds/restocks stock.
//
// IMPORTANT:
//
// During a remainder update:
//
//     dairyWorker does NOT change the unit.
//
// The remainder event uses the unit already stored on:
//
//     Dairy.feedStocks[]
//
// Admin may change the unit when using the restock form.
//
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
// POST COMMENT SUBDOCUMENT
// ==========================================================

const postCommentSchema =
    new mongoose.Schema(

        {

            userId: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "User",

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

                ref: "User",

                default: null

            },


            clearedAt: {

                type: Date,

                default: null

            },


            clearedBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "User",

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

                ref: "User",

                default: null

            },


            clearedAt: {

                type: Date,

                default: null

            },


            clearedBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "User",

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

                trim: true,

                maxlength: 150

            },


            type: {

                type: String,

                default: "",

                trim: true,

                maxlength: 100

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

                trim: true,

                maxlength: 2000

            },


            condition: {

                type: String,

                default: "",

                trim: true,

                maxlength: 100

            },


            location: {

                type: String,

                default: "",

                trim: true,

                maxlength: 150

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
// IMPORTANT:
//
// This is ONE historical stock event.
//
// Each Update document has ONE stock subdocument.
//
// stock._id is intentionally enabled.
//
// Additionally:
//
//     stock.stockId
//
// identifies the CURRENT inventory item inside:
//
//     Dairy.feedStocks[]
//
// Example:
//
//     Dairy.feedStocks:
//
//         {
//             _id: A,
//             name: "Dairy Meal"
//         }
//
// History:
//
//     Update #1
//         stock.stockId = A
//         stock.action = "available"
//         stock.quantity = 20
//
//     Update #2
//         stock.stockId = A
//         stock.action = "available"
//         stock.quantity = 30
//
//     Update #3
//         stock.stockId = A
//         stock.action = "remainder"
//         stock.quantity = 40
//
// This makes it possible to query:
//
//     {
//         dairy: dairyId,
//         type: "stock",
//         "stock.stockId": stockId
//     }
//
// and obtain ONLY the history for that stock item.
//
// ==========================================================

const stockSchema =
    new mongoose.Schema(

        {

            // ==================================================
            // CURRENT INVENTORY STOCK ID
            // ==================================================

            stockId: {

                type:
                    mongoose.Schema.Types.ObjectId,

                default: null

            },


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
            //
            // For "available":
            //
            //     quantity = quantity being added
            //
            // For "remainder":
            //
            //     quantity = new quantity remaining
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
            //
            // This records the unit used by the stock event.
            //
            // Remainder events should receive the unit already
            // stored in Dairy.feedStocks[].
            //
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
            //
            // Financial information belongs to ADMIN stock
            // events.
            //
            // Worker remainder events should use 0.
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
            // ADDITIONAL INFORMATION
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
            // IMPORTANT
            // ==================================================
            //
            // Every historical stock event receives its own
            // subdocument ID.
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
// NONE OF THESE ARE UNIQUE.
//
// Multiple events for the same stock are REQUIRED.
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
// STOCK-SPECIFIC HISTORY INDEX
// ==========================================================
//
// This is important for:
//
//     "show only updates for the clicked stock"
//
// ==========================================================

updateSchema.index({

    dairy: 1,

    type: 1,

    "stock.stockId": 1,

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
            // STOCK ID
            // ------------------------------------------------

            if (
                this.stock.stockId
            ) {

                this.stock.stockId =
                    new mongoose.Types.ObjectId(
                        this.stock.stockId
                    );

            }


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
                    ).trim()
                    .toLowerCase();

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
        // SYSTEM STOCK EVENT
        // ==================================================
        //
        // AVAILABLE STOCK events are generated by the admin
        // restock operation but represented in the history as
        // a system stock event.
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

                if (
                    this.stock.action ===
                    "remainder"
                ) {

                    this.title =
                        "Foodstock Remaining Updated";

                } else {

                    this.title =

                        this.stock.stockType ===
                            "medicine"

                            ? "More Veterinary Meds Available"

                            : "More Animal Feed Available";

                }

            }

        }


        // ==================================================
        // STOCK TEXT
        // ==================================================

        if (

            this.type === "stock" &&

            this.stock

        ) {

            if (
                !this.text
            ) {

                this.text =
                    this.stock.message ||
                    this.stock.instructions ||
                    "";

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