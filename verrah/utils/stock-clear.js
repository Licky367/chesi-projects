// ==========================================================
// verrah/utils/security.js
// VERRAH COSMETICS
// SECURITY KEY SETUP UTILITY
//
// Run:
// node utils/security.js
// ==========================================================

const mongoose = require("mongoose");
const SecurityKey = require("../models/securityKey");

// ==========================================================
// DATABASE CONNECTION
// ==========================================================

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("MONGO_URI is not defined.");
    process.exit(1);
}

// ==========================================================
// SECURITY KEY
// ==========================================================

const SECURITY_KEY = "Verrah@123";

// ==========================================================
// MAIN
// ==========================================================

async function setSecurityKey() {

    try {

        await mongoose.connect(MONGO_URI);

        console.log("Connected to MongoDB.");

        const existingKey =
            await SecurityKey.findOne({});

        if (existingKey) {

            existingKey.securityKey = SECURITY_KEY;

            await existingKey.save();

            console.log(
                "Security key updated successfully."
            );

        } else {

            await SecurityKey.create({
                securityKey: SECURITY_KEY
            });

            console.log(
                "Security key created successfully."
            );
        }

        console.log(
            "Security key is set to: Verrah@123"
        );

    } catch (error) {

        console.error(
            "Failed to set security key:"
        );

        console.error(error);

        process.exitCode = 1;

    } finally {

        await mongoose.disconnect();

        console.log(
            "Disconnected from MongoDB."
        );
    }
}

// ==========================================================
// RUN
// ==========================================================

setSecurityKey();