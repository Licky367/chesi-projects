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
//     • Animal-feed / stock updates
//     • Post images
//     • Likes
//
// IMPORTANT:
//
// ANIMAL FEED / STOCK UPDATES
// ----------------------------------------------------------
//
// Feed STOCK itself belongs to:
//
//     Dairy
//
// The Update model stores the HISTORY / FEED CARD generated
// when an animal-feed stock record is updated.
//
// IMPORTANT RELATIONSHIP:
//
//     AgroStore._id
//         = storageId
//
//     AgroStore.roomNumber
//         = negative number
//
//     Stock Dairy.dwellNumber
//         = same negative number
//
// Therefore:
//
//     stock.dwellNumber === agroStore.roomNumber
//
// The Update belongs to the STOCK DAIRY:
//
//     Update.dairy = stockDairy._id
//
// NOT:
//
//     Update.dairy = agroStore._id
//
// ==========================================================


const mongoose =
    require("mongoose");


// ==========================================================
// CONSTANTS
// ==========================================================

const MAX_POST_IMAGES = 10;

const MAX_STOCK_UPDATE_IMAGES = 10;


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
// ASSET ADD UPDATE SUBDOCUMENT
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
// ANIMAL FEED / STOCK UPDATE SUBDOCUMENT
// ==========================================================
//
// This describes one historical UPDATE to an existing
// animal-feed / fodder / hay / silage / veterinary-stock
// Dairy record.
//
// IMPORTANT:
//
//     feedId
//         = Dairy._id of the stock item
//
//     storageId
//         = AgroStore._id
//
//     roomNumber
//         = AgroStore.roomNumber
//         = stock.dwellNumber
//
//     previousQuantity
//         = quantity BEFORE this stock update
//
//     quantity
//         = quantity AFTER this stock update
//
//     quantityChange
//         = quantity - previousQuantity
//
// The Update model also stores a snapshot of the person who
// performed the stock update:
//
//     recordedBy
//     recordedByName
//     recordedByImage
//     recordedAt
//
// This means the feed card can display the updater directly
// without depending on a future User record change.
//
// ==========================================================

const animalFeedSchema =
    new mongoose.Schema(

        {

            // ==================================================
            // STOCK ITEM
            // ==================================================
            //
            // This is the Dairy record representing the actual
            // stock item.
            //
            // It is NOT the AgroStore ID.
            //
            // ==================================================

            feedId: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "Dairy",

                default: null

            },


            // ==================================================
            // AGROSTORE
            // ==================================================
            //
            // Reference to the AgroStore where the stock item
            // resides.
            //
            // This is contextual information only.
            //
            // It does NOT become Update.dairy.
            //
            // ==================================================

            storageId: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "Dairy",

                default: null

            },


            // ==================================================
            // AGROSTORE NAME
            // ==================================================
            //
            // Snapshot of the storage name at the time the
            // feed update was generated.
            //
            // ==================================================

            storageName: {

                type: String,

                default: "",

                trim: true,

                maxlength: 200

            },


            // ==================================================
            // STOCK ITEM NAME
            // ==================================================

            feedName: {

                type: String,

                default: "",

                trim: true,

                maxlength: 200

            },


            // ==================================================
            // STOCK TYPE
            // ==================================================

            feedType: {

                type: String,

                default: "",

                trim: true,

                maxlength: 100

            },


            // ==================================================
            // ROOM / DWELL NUMBER
            // ==================================================
            //
            // This records the relationship used to locate
            // the stock inside the AgroStore.
            //
            // Example:
            //
            //     AgroStore.roomNumber = -2
            //
            //     Stock.dwellNumber   = -2
            //
            // ==================================================

            roomNumber: {

                type: Number,

                default: null

            },


            // ==================================================
            // PREVIOUS QUANTITY
            // ==================================================
            //
            // Quantity immediately BEFORE this update.
            //
            // ==================================================

            previousQuantity: {

                type: Number,

                default: 0,

                min: 0

            },


            // ==================================================
            // CURRENT QUANTITY
            // ==================================================
            //
            // Quantity remaining AFTER this update.
            //
            // ==================================================

            quantity: {

                type: Number,

                default: 0,

                min: 0

            },


            // ==================================================
            // QUANTITY CHANGE
            // ==================================================
            //
            // Difference produced by this stock update.
            //
            //     quantityChange =
            //         quantity - previousQuantity
            //
            // Positive:
            //
            //     stock increased
            //
            // Negative:
            //
            //     stock decreased
            //
            // Zero:
            //
            //     stock quantity unchanged
            //
            // ==================================================

            quantityChange: {

                type: Number,

                default: 0

            },


            // ==================================================
            // UNIT
            // ==================================================

            unit: {

                type: String,

                default: "",

                trim: true,

                maxlength: 50

            },


            // ==================================================
            // STOCK UPDATE NOTE
            // ==================================================

            stockUpdateNote: {

                type: String,

                default: "",

                trim: true,

                maxlength: 5000

            },


            // ==================================================
            // STOCK UPDATE IMAGES
            // ==================================================
            //
            // These are the images attached to the specific
            // stock update.
            //
            // They are copied from the stockUpdateSchema so
            // the feed card has everything it needs without
            // querying the current stock history.
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
                                    MAX_STOCK_UPDATE_IMAGES

                            );

                        },

                    message:
                        `A maximum of ${MAX_STOCK_UPDATE_IMAGES} images is allowed per stock update.`

                }

            },


            // ==================================================
            // RECORDED BY
            // ==================================================
            //
            // The User who performed this stock update.
            //
            // ==================================================

            recordedBy: {

                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "User",

                default: null

            },


            // ==================================================
            // RECORDED BY NAME
            // ==================================================
            //
            // Snapshot of the user's name.
            //
            // This is intentionally stored so historical feed
            // cards remain correct even if the User changes
            // their name later.
            //
            // ==================================================

            recordedByName: {

                type: String,

                default: "",

                trim: true,

                maxlength: 150

            },


            // ==================================================
            // RECORDED BY IMAGE
            // ==================================================
            //
            // Snapshot of the user's profile image.
            //
            // This is what the feed header uses for the updater
            // avatar.
            //
            // ==================================================

            recordedByImage: {

                type: String,

                default: "",

                trim: true,

                maxlength: 1000

            },


            // ==================================================
            // RECORDED AT
            // ==================================================
            //
            // Exact time at which the stock update was made.
            //
            // ==================================================

            recordedAt: {

                type: Date,

                default: Date.now

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
            //
            // IMPORTANT:
            //
            // For animal-feed updates this is the STOCK
            // DAIRY record's _id.
            //
            // It is NOT the AgroStore _id.
            //
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

                trim: true,

                maxlength: 1000

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

                    "animalFeed"

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

            },


            // ==================================================
            // ANIMAL FEED / STOCK UPDATE
            // ==================================================
            //
            // This contains the complete historical snapshot
            // required to render a STOCK UPDATED feed card.
            //
            // The card can therefore display:
            //
            //     🌾 STOCK UPDATED
            //
            //     Dairy Meal
            //     Main AgroStore
            //
            //     120 kg → 175 kg
            //
            //     +55 kg
            //
            //     Received new delivery...
            //
            //     [images]
            //
            //     John
            //     [profile image]
            //
            //     23 Aug 2026, 7:42 AM
            //
            // ==================================================

            animalFeed: {

                type:
                    animalFeedSchema,

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
// Normal Update queries
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
// ANIMAL FEED UPDATE INDEX
// ==========================================================
//
// Useful when retrieving animal-feed updates belonging to
// a particular AgroStore.
//
// ==========================================================

updateSchema.index({

    "animalFeed.storageId": 1,

    createdAt: -1

});


updateSchema.index({

    "animalFeed.feedId": 1,

    createdAt: -1

});


updateSchema.index({

    "animalFeed.roomNumber": 1,

    createdAt: -1

});


updateSchema.index({

    "animalFeed.recordedBy": 1,

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


        // ==================================================
        // NORMALIZE ANIMAL FEED / STOCK UPDATE
        // ==================================================

        if (
            this.animalFeed
        ) {

            // ==================================================
            // STOCK NAME
            // ==================================================

            if (
                this.animalFeed.feedName
            ) {

                this.animalFeed.feedName =
                    String(
                        this.animalFeed.feedName
                    ).trim();

            }


            // ==================================================
            // STOCK TYPE
            // ==================================================

            if (
                this.animalFeed.feedType
            ) {

                this.animalFeed.feedType =
                    String(
                        this.animalFeed.feedType
                    ).trim();

            }


            // ==================================================
            // STORAGE NAME
            // ==================================================

            if (
                this.animalFeed.storageName
            ) {

                this.animalFeed.storageName =
                    String(
                        this.animalFeed.storageName
                    ).trim();

            }


            // ==================================================
            // UNIT
            // ==================================================

            if (
                this.animalFeed.unit
            ) {

                this.animalFeed.unit =
                    String(
                        this.animalFeed.unit
                    ).trim();

            }


            // ==================================================
            // STOCK UPDATE NOTE
            // ==================================================

            if (
                this.animalFeed.stockUpdateNote
            ) {

                this.animalFeed.stockUpdateNote =
                    String(
                        this.animalFeed.stockUpdateNote
                    ).trim();

            }


            // ==================================================
            // RECORDED BY NAME
            // ==================================================

            if (
                this.animalFeed.recordedByName
            ) {

                this.animalFeed.recordedByName =
                    String(
                        this.animalFeed.recordedByName
                    ).trim();

            }


            // ==================================================
            // RECORDED BY IMAGE
            // ==================================================

            if (
                this.animalFeed.recordedByImage
            ) {

                this.animalFeed.recordedByImage =
                    String(
                        this.animalFeed.recordedByImage
                    ).trim();

            }


            // ==================================================
            // NORMALIZE STOCK UPDATE IMAGES
            // ==================================================

            if (
                !Array.isArray(
                    this.animalFeed.images
                )
            ) {

                this.animalFeed.images = [];

            }


            this.animalFeed.images =

                this.animalFeed.images

                    .filter(Boolean)

                    .map(
                        image =>
                            String(image).trim()
                    )

                    .filter(Boolean)

                    .slice(
                        0,
                        MAX_STOCK_UPDATE_IMAGES
                    );


            // ==================================================
            // KEEP PREVIOUS QUANTITY VALID
            // ==================================================

            if (
                this.animalFeed.previousQuantity !== null &&
                this.animalFeed.previousQuantity !== undefined
            ) {

                const previousQuantity =
                    Number(
                        this.animalFeed.previousQuantity
                    );


                if (
                    Number.isFinite(
                        previousQuantity
                    ) &&
                    previousQuantity >= 0
                ) {

                    this.animalFeed.previousQuantity =
                        previousQuantity;

                }

            }


            // ==================================================
            // KEEP CURRENT QUANTITY VALID
            // ==================================================

            if (
                this.animalFeed.quantity !== null &&
                this.animalFeed.quantity !== undefined
            ) {

                const quantity =
                    Number(
                        this.animalFeed.quantity
                    );


                if (
                    Number.isFinite(
                        quantity
                    ) &&
                    quantity >= 0
                ) {

                    this.animalFeed.quantity =
                        quantity;

                }

            }


            // ==================================================
            // CALCULATE QUANTITY CHANGE
            // ==================================================
            //
            // Always derive this from the two quantities.
            //
            // This prevents the feed card from displaying an
            // incorrect difference.
            //
            // ==================================================

            const previousQuantity =
                Number(
                    this.animalFeed.previousQuantity
                );


            const quantity =
                Number(
                    this.animalFeed.quantity
                );


            if (

                Number.isFinite(
                    previousQuantity
                ) &&

                Number.isFinite(
                    quantity
                )

            ) {

                this.animalFeed.quantityChange =
                    quantity -
                    previousQuantity;

            }


            // ==================================================
            // RECORDED AT
            // ==================================================

            if (
                !this.animalFeed.recordedAt
            ) {

                this.animalFeed.recordedAt =
                    this.createdAt ||
                    new Date();

            }

        }


        // ==================================================
        // NEXT
        // ==================================================

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
// STATIC: MAX STOCK UPDATE IMAGES
// ==========================================================

updateSchema.statics.getMaxStockUpdateImages =
function() {

    return MAX_STOCK_UPDATE_IMAGES;

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


Update.MAX_STOCK_UPDATE_IMAGES =
    MAX_STOCK_UPDATE_IMAGES;


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    Update;