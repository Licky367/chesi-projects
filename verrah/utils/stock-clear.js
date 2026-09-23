// ==========================================================
// verrah/utils/salesSubstation.js
// VERRAH COSMETICS
//
// Assign salesSubstation to existing StaffSale records.
//
// SOURCE:
//     VerrahUser.assignedSubstation
//
// TARGET:
//     StaffSale.salesSubstation
//
// Run:
//     node utils/salesSubstation.js
//
// This script only updates StaffSale records where
// salesSubstation is currently missing.
// ==========================================================

const mongoose = require("mongoose");

// ==========================================================
// MODELS
// ==========================================================

const User = require("../models/user");
const StaffSale = require("../models/staff-sales");


// ==========================================================
// DATABASE CONNECTION
// ==========================================================

const MONGO_URI =
    process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error(
        "ERROR: MONGO_URI environment variable is not set."
    );

    process.exit(1);
}


// ==========================================================
// MAIN
// ==========================================================

async function assignSalesSubstations() {

    try {

        console.log(
            "Connecting to MongoDB..."
        );

        await mongoose.connect(
            MONGO_URI
        );

        console.log(
            "Connected to MongoDB."
        );


        // --------------------------------------------------
        // FIND STAFF SALES WITHOUT SALES SUBSTATION
        // --------------------------------------------------

        const sales =
            await StaffSale.find({
                $or: [
                    {
                        salesSubstation: {
                            $exists: false
                        }
                    },
                    {
                        salesSubstation: null
                    }
                ]
            })
            .select(
                "_id salesName soldBy salesSubstation"
            )
            .lean();


        console.log(
            `Found ${sales.length} StaffSale record(s) without salesSubstation.`
        );


        if (!sales.length) {

            console.log(
                "Nothing to update."
            );

            return;
        }


        // --------------------------------------------------
        // PROCESS SALES
        // --------------------------------------------------

        let updated = 0;
        let skipped = 0;


        for (const sale of sales) {

            if (!sale.soldBy) {

                console.warn(
                    `SKIPPED ${sale._id}: soldBy is missing.`
                );

                skipped++;

                continue;
            }


            // ----------------------------------------------
            // GET STAFF USER
            // ----------------------------------------------

            const user =
                await User.findById(
                    sale.soldBy
                )
                .select(
                    "_id name email role assignedSubstation"
                )
                .lean();


            if (!user) {

                console.warn(
                    `SKIPPED ${sale._id}: user ${sale.soldBy} was not found.`
                );

                skipped++;

                continue;
            }


            // ----------------------------------------------
            // STAFF MUST HAVE ASSIGNED SUBSTATION
            // ----------------------------------------------

            if (!user.assignedSubstation) {

                console.warn(
                    `SKIPPED ${sale._id}: ${user.name || user.email || user._id} has no assignedSubstation.`
                );

                skipped++;

                continue;
            }


            // ----------------------------------------------
            // ASSIGN SALES SUBSTATION
            // ----------------------------------------------

            await StaffSale.updateOne(
                {
                    _id: sale._id,

                    $or: [
                        {
                            salesSubstation: {
                                $exists: false
                            }
                        },
                        {
                            salesSubstation: null
                        }
                    ]
                },
                {
                    $set: {
                        salesSubstation:
                            user.assignedSubstation
                    }
                }
            );


            updated++;

            console.log(
                `UPDATED ${sale._id} | ${sale.salesName} | substation: ${user.assignedSubstation}`
            );
        }


        // --------------------------------------------------
        // SUMMARY
        // --------------------------------------------------

        console.log("");
        console.log(
            "=========================================="
        );
        console.log(
            "SALES SUBSTATION ASSIGNMENT COMPLETE"
        );
        console.log(
            "=========================================="
        );

        console.log(
            `Found:   ${sales.length}`
        );

        console.log(
            `Updated: ${updated}`
        );

        console.log(
            `Skipped: ${skipped}`
        );

    } catch (error) {

        console.error("");
        console.error(
            "ERROR ASSIGNING SALES SUBSTATIONS:"
        );

        console.error(
            error
        );

        process.exitCode = 1;

    } finally {

        await mongoose.disconnect();

        console.log(
            "MongoDB connection closed."
        );
    }
}


// ==========================================================
// RUN SCRIPT
// ==========================================================

assignSalesSubstations();