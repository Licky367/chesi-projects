// ==========================================================
// verrah/models/substations.js
// SUBSTATION MODEL
// ==========================================================

const mongoose = require("mongoose");

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
    },
    {
        _id: false
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
// GPS SCHEMA
// ==========================================================

// Stores the exact geographical coordinates of the
// substation.
//
// Example:
// latitude:  -1.28333
// longitude: 36.81667
//
// These coordinates can later be used to generate a
// Google Maps "Get Directions" link.

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

        // Can contain human-readable directions or a
        // directions/map URL.
        //
        // Example:
        // "Next to the main shopping centre"
        //
        // Or:
        // "https://www.google.com/maps/..."
        // ------------------------------------------------

        directions: {
            type: String,
            trim: true,
            default: ""
        },

        // ------------------------------------------------
        // GPS LOCATION
        // ------------------------------------------------

        // Stores the actual coordinates separately from
        // the human-readable location/directions.
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
// EXPORT MODEL
// ==========================================================

module.exports = mongoose.model(
    "Substation",
    substationSchema
);