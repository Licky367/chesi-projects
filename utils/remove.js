// ==========================================================
// utils/remove.js
// ==========================================================
// ONE-TIME DATABASE CLEANUP
//
// Removes the obsolete sessionId_1 index from VerrahDB.carts.
//
// Run from the project root:
//
//     node utils/remove.js
//
// After successful execution, this file can be deleted.
// ==========================================================

require("dotenv").config();

const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("❌ MONGO_URI is not defined in .env");
    process.exit(1);
}

async function removeObsoleteCartIndex() {
    try {
        console.log("Connecting to MongoDB...");

        await mongoose.connect(MONGO_URI);

        console.log("✅ Connected to MongoDB");

        const db = mongoose.connection.db;
        const carts = db.collection("carts");

        const indexes = await carts.indexes();

        const oldIndex = indexes.find(
            (index) => index.name === "sessionId_1"
        );

        if (!oldIndex) {
            console.log(
                "ℹ️ sessionId_1 index does not exist. Nothing to remove."
            );

            return;
        }

        console.log("Found obsolete index:");
        console.log(oldIndex);

        await carts.dropIndex("sessionId_1");

        console.log("✅ Removed obsolete index: sessionId_1");
        console.log(
            "✅ The carts collection now uses the current user-based cart architecture."
        );

    } catch (error) {
        console.error("❌ Failed to remove sessionId_1:");
        console.error(error.message);

        process.exitCode = 1;

    } finally {
        await mongoose.disconnect();
        console.log("MongoDB connection closed.");
    }
}

removeObsoleteCartIndex();