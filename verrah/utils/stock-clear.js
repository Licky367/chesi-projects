const mongoose = require("mongoose");

const Category = require("../models/category");
const Substation = require("../models/substations");

// ==========================================================
// BUSINESS TYPE
// ==========================================================
//
// Creates/reuses one shared business type:
//
// {
//     id: ObjectId("..."),
//     name: "Cosmetics"
// }
//
// Then assigns it to ALL existing categories and
// ALL existing substations.
//
// ==========================================================

async function assignCosmeticsBusinessType() {
    try {
        // --------------------------------------------------
        // FIND EXISTING COSMETICS BUSINESS TYPE
        // --------------------------------------------------

        const existingCategory = await Category.findOne({
            "businessType.name": "Cosmetics"
        }).lean();

        let businessTypeId;

        if (
            existingCategory &&
            existingCategory.businessType &&
            existingCategory.businessType.id
        ) {
            businessTypeId = existingCategory.businessType.id;
        } else {
            businessTypeId = new mongoose.Types.ObjectId();
        }

        // --------------------------------------------------
        // BUSINESS TYPE OBJECT
        // --------------------------------------------------

        const businessType = {
            id: businessTypeId,
            name: "Cosmetics"
        };

        // --------------------------------------------------
        // ASSIGN TO ALL CATEGORIES
        // --------------------------------------------------

        const categoryResult = await Category.updateMany(
            {},
            {
                $set: {
                    businessType
                }
            }
        );

        // --------------------------------------------------
        // ASSIGN TO ALL SUBSTATIONS
        // --------------------------------------------------

        const substationResult = await Substation.updateMany(
            {},
            {
                $set: {
                    businessType
                }
            }
        );

        // --------------------------------------------------
        // RESULT
        // --------------------------------------------------

        console.log("==========================================");
        console.log("BUSINESS TYPE ASSIGNMENT COMPLETE");
        console.log("==========================================");

        console.log(
            "Business Type ID:",
            businessTypeId.toString()
        );

        console.log(
            "Business Type Name:",
            businessType.name
        );

        console.log(
            "Categories matched:",
            categoryResult.matchedCount
        );

        console.log(
            "Categories modified:",
            categoryResult.modifiedCount
        );

        console.log(
            "Substations matched:",
            substationResult.matchedCount
        );

        console.log(
            "Substations modified:",
            substationResult.modifiedCount
        );

        console.log("==========================================");

        return {
            businessType,
            categories: {
                matched: categoryResult.matchedCount,
                modified: categoryResult.modifiedCount
            },
            substations: {
                matched: substationResult.matchedCount,
                modified: substationResult.modifiedCount
            }
        };
    } catch (error) {
        console.error(
            "Failed to assign Cosmetics business type:",
            error
        );

        throw error;
    }
}

// ==========================================================
// RUN DIRECTLY
// ==========================================================

if (require.main === module) {
    require("dotenv").config();

    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        console.error(
            "MONGO_URI is not defined in environment variables."
        );

        process.exit(1);
    }

    mongoose
        .connect(mongoUri)
        .then(async () => {
            console.log("MongoDB connected.");

            await assignCosmeticsBusinessType();

            await mongoose.disconnect();

            console.log("MongoDB disconnected.");
            process.exit(0);
        })
        .catch(async (error) => {
            console.error(
                "MongoDB connection failed:",
                error
            );

            try {
                await mongoose.disconnect();
            } catch (_) {}

            process.exit(1);
        });
}

// ==========================================================
// EXPORT
// ==========================================================

module.exports = assignCosmeticsBusinessType;