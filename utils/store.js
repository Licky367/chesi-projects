// ==========================================================
// utils/store.js
// ==========================================================
//
// PURPOSE:
//     Clear the database while preserving:
//
//     1. The entire "users" collection
//     2. The entire "projectUsers" collection
//     3. Dairy records where ANY of the following is -13:
//
//            code === -13
//            assetCode === -13
//            farmCode === -13
//
// ALL OTHER DOCUMENTS ARE DELETED.
//
// Collections themselves are NOT dropped.
//
// USAGE:
//     node utils/store.js
//
// ==========================================================

require("dotenv").config();

const mongoose = require("mongoose");

// ==========================================================
// CONFIGURATION
// ==========================================================

const MONGO_URI = process.env.MONGO_URI;

const PROTECTED_COLLECTIONS = [
    "users",
    "projectUsers"
];

const DAIRY_PROTECTED_CODE = -13;

// ==========================================================
// CLEAR DATABASE
// ==========================================================

async function clearDatabase() {
    try {
        if (!MONGO_URI) {
            throw new Error("MONGO_URI is not defined in .env");
        }

        console.log("Connecting to MongoDB...");

        await mongoose.connect(MONGO_URI);

        const db = mongoose.connection.db;

        console.log(`Connected to database: ${db.databaseName}`);

        // ------------------------------------------------------
        // Get all collections
        // ------------------------------------------------------

        const collections = await db.listCollections().toArray();

        if (collections.length === 0) {
            console.log("No collections found.");
            return;
        }

        console.log("\n==========================================");
        console.log("DATABASE CLEANUP");
        console.log("==========================================");

        // ------------------------------------------------------
        // Process every collection
        // ------------------------------------------------------

        for (const collection of collections) {
            const name = collection.name;

            // --------------------------------------------------
            // USERS / PROJECT USERS
            // --------------------------------------------------

            if (PROTECTED_COLLECTIONS.includes(name)) {
                console.log(`🛡️  PRESERVED COLLECTION: ${name}`);
                continue;
            }

            // --------------------------------------------------
            // DAIRIES
            // --------------------------------------------------

            if (name === "dairies") {
                console.log("\n🐄 Processing dairies...");

                // ----------------------------------------------
                // Delete dairy documents EXCEPT those where:
                //
                // code      = -13
                // OR
                // assetCode = -13
                // OR
                // farmCode  = -13
                // ----------------------------------------------

                const result = await db.collection("dairies").deleteMany({
                    $nor: [
                        { code: DAIRY_PROTECTED_CODE },
                        { assetCode: DAIRY_PROTECTED_CODE },
                        { farmCode: DAIRY_PROTECTED_CODE }
                    ]
                });

                console.log(
                    `✅ Dairies cleared: ${result.deletedCount} document(s) deleted.`
                );

                // ----------------------------------------------
                // Count preserved dairies
                // ----------------------------------------------

                const remaining = await db
                    .collection("dairies")
                    .countDocuments({
                        $or: [
                            { code: DAIRY_PROTECTED_CODE },
                            { assetCode: DAIRY_PROTECTED_CODE },
                            { farmCode: DAIRY_PROTECTED_CODE }
                        ]
                    });

                console.log(
                    `🛡️  Dairies preserved: ${remaining} document(s).`
                );

                continue;
            }

            // --------------------------------------------------
            // ALL OTHER COLLECTIONS
            // --------------------------------------------------

            try {
                const result = await db
                    .collection(name)
                    .deleteMany({});

                console.log(
                    `🗑️  Cleared ${name}: ${result.deletedCount} document(s)`
                );

            } catch (error) {
                console.error(
                    `❌ Failed to clear ${name}:`,
                    error.message
                );
            }
        }

        // ------------------------------------------------------
        // COMPLETE
        // ------------------------------------------------------

        console.log("\n==========================================");
        console.log("DATABASE CLEANUP COMPLETE");
        console.log("==========================================");

        console.log("\nPreserved:");

        console.log("🛡️  users");
        console.log("🛡️  projectUsers");

        console.log(
            "🛡️  dairies where code = -13"
        );

        console.log(
            "🛡️  dairies where assetCode = -13"
        );

        console.log(
            "🛡️  dairies where farmCode = -13"
        );

        console.log("\nEverything else has been cleared.");

    } catch (error) {
        console.error("\n❌ Database cleanup failed:");
        console.error(error);

        process.exitCode = 1;

    } finally {
        await mongoose.disconnect();

        console.log("\nMongoDB connection closed.");
    }
}

// ==========================================================
// RUN
// ==========================================================

clearDatabase();