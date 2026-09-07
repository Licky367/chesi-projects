const mongoose = require("mongoose");

/* =========================================================
   SERVICE SCHEMA
========================================================= */

const servicesSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        duration: {
            type: String,
            trim: true,
            default: ""
        },

        active: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

/* =========================================================
   MODEL
========================================================= */

module.exports =
    mongoose.model("Services", servicesSchema);
