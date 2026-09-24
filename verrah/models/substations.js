// ==========================================================
// verrah/models/substations.js
// SUBSTATION MODEL
// ==========================================================

const mongoose = require("mongoose");
const SecurityKey = require("./securityKey");

// ==========================================================
// PRODUCT INVENTORY SCHEMA
// ==========================================================

const productInventorySchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        productName: {
            type: String,
            required: true,
            trim: true
        },

        category: {
            type: String,
            default: "",
            trim: true
        },

        subcategory: {
            type: String,
            default: "",
            trim: true
        },

        days: {
            type: Number,
            min: 0,
            default: 0
        },

        units: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        updatedAt: {
            type: Date,
            default: Date.now
        }
    }
);

// ==========================================================
// PRODUCT REDUCTION SCHEMA
// ==========================================================

const substationProductReductionSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        productName: {
            type: String,
            required: true,
            trim: true
        },

        category: {
            type: String,
            default: "",
            trim: true
        },

        unitsReduced: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        lastReducedAt: {
            type: Date,
            default: null
        }
    },
    {
        _id: false
    }
);

// ==========================================================
// DAILY CASH SALES SCHEMA
// ==========================================================
//
// Each record represents one day's cumulative cash sales.
//
// Mongoose automatically creates an _id for every record.
//
// ==========================================================

const dailyCashSaleSchema = new mongoose.Schema(
    {
        amount: {
            type: Number,
            required: true,
            default: 0
        },

        date: {
            type: Date,
            required: true
        },

        isDeposited: {
            type: Boolean,
            default: false
        }
    }
);

// ==========================================================
// GPS SCHEMA
// ==========================================================

const gpsSchema = new mongoose.Schema(
    {
        latitude: {
            type: Number,
            default: null,
            min: -90,
            max: 90
        },

        longitude: {
            type: Number,
            default: null,
            min: -180,
            max: 180
        }
    },
    {
        _id: false
    }
);

// ==========================================================
// SUBSTATION SCHEMA
// ==========================================================

const substationSchema = new mongoose.Schema(
    {
        // ------------------------------------------------
        // BASIC INFORMATION
        // ------------------------------------------------

        name: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            index: true
        },

        substationKey: {
            type: String,
            required: true,
            trim: true
        },

        location: {
            type: String,
            trim: true,
            default: ""
        },

        phoneNumber: {
            type: Number,
            default: null
        },

        // ------------------------------------------------
        // SUBSTATION MEDIA
        // ------------------------------------------------

        substationIcon: {
            type: String,
            trim: true,
            default: ""
        },

        images: {
            type: [String],
            default: []
        },

        // ------------------------------------------------
        // DESCRIPTION
        // ------------------------------------------------

        description: {
            type: String,
            default: ""
        },

        // ------------------------------------------------
        // DIRECTIONS
        // ------------------------------------------------

        directions: {
            type: String,
            trim: true,
            default: ""
        },

        // ------------------------------------------------
        // GPS LOCATION
        // ------------------------------------------------

        gps: {
            type: gpsSchema,
            default: () => ({
                latitude: null,
                longitude: null
            })
        },

        // ------------------------------------------------
        // STATUS
        // ------------------------------------------------

        isActive: {
            type: Boolean,
            default: true
        },

        // ------------------------------------------------
        // DAILY CASH SALES
        // ------------------------------------------------

        dailyCashSales: {
            type: [dailyCashSaleSchema],
            default: []
        },

        // ------------------------------------------------
        // PRODUCT INVENTORY
        // ------------------------------------------------

        productInventory: {
            type: [productInventorySchema],
            default: []
        },

        // ------------------------------------------------
        // PRODUCT REDUCTIONS
        // ------------------------------------------------

        productReductions: {
            type: [substationProductReductionSchema],
            default: []
        }
    },
    {
        timestamps: true
    }
);

// ==========================================================
// DEFAULT SUBSTATION KEY
// ==========================================================
//
// New substations inherit the CURRENT securityKey from:
//
//     models/securityKey.js
//
// An explicitly supplied substationKey is preserved.
//
// Existing substations are not changed.
//
// ==========================================================

substationSchema.pre(
    "validate",
    async function(next) {

        try {

            if (
                this.isNew &&
                !this.substationKey
            ) {

                const securityKey =
                    await SecurityKey.findOne()
                        .select("securityKey")
                        .lean();

                if (securityKey) {

                    this.substationKey =
                        securityKey.securityKey;
                }
            }

            next();

        } catch (error) {

            next(error);
        }
    }
);

// ==========================================================
// EXPORT MODEL
// ==========================================================

module.exports = mongoose.model(
    "Substation",
    substationSchema
);