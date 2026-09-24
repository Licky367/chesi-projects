// ==========================================================
// verrah/models/securityKey.js
// SECURITY KEY MODEL
// ==========================================================

const mongoose = require("mongoose");

// ==========================================================
// SECURITY KEY SCHEMA
// ==========================================================

const securityKeySchema = new mongoose.Schema(
    {
        securityKey: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true
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
    "SecurityKey",
    securityKeySchema
);