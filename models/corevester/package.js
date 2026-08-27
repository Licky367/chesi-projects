// ==========================================================
// models/corevester/package.js
// PACKAGE / CUSTOMER ORDER MODEL
// ==========================================================

const mongoose = require("mongoose");

const packageProductSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        units: {
            type: Number,
            required: true,
            min: 1
        }
    },
    {
        _id: false
    }
);

const packageSchema = new mongoose.Schema(
    {
        // ----------------------------------------------------
        // CUSTOMER
        // ----------------------------------------------------

        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true
        },

        // ----------------------------------------------------
        // PRODUCTS IN THIS PACKAGE
        // ----------------------------------------------------

        products: {
            type: [packageProductSchema],
            required: true,

            validate: {
                validator: function (value) {
                    return Array.isArray(value) && value.length > 0;
                },
                message: "A package must contain at least one product."
            }
        },

        // ----------------------------------------------------
        // TOTAL PACKAGE COST
        // ----------------------------------------------------
        //
        // Calculated as:
        //
        // product.unitSellPrice × packageProduct.units
        //
        // for every product in the package.
        //

        cost: {
            type: Number,
            required: true,
            min: 0
        },

        // ----------------------------------------------------
        // CUSTOMER GPS LOCATION
        // ----------------------------------------------------
        //
        // GeoJSON:
        // [longitude, latitude]
        //

        GPSlocation: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point"
            },

            coordinates: {
                type: [Number],
                required: true,

                validate: {
                    validator: function (value) {
                        return (
                            Array.isArray(value) &&
                            value.length === 2 &&
                            value[0] >= -180 &&
                            value[0] <= 180 &&
                            value[1] >= -90 &&
                            value[1] <= 90
                        );
                    },
                    message:
                        "GPSlocation.coordinates must be [longitude, latitude]."
                }
            }
        }
    },
    {
        timestamps: true
    }
);

// ----------------------------------------------------------
// GEO INDEX
// ----------------------------------------------------------

packageSchema.index({
    GPSlocation: "2dsphere"
});

module.exports = mongoose.model("Package", packageSchema);