// ==========================================================
// services/update/maintenanceService.js
// ==========================================================

const mongoose = require("mongoose");

const Dairy =
    require("../../models/dairy");

const Update =
    require("../../models/Update");


// ==========================================================
// INTERNAL: VALIDATE DAIRY ID
// ==========================================================

function validateDairyId(dairyId) {

    if (
        !dairyId ||
        !mongoose.Types.ObjectId.isValid(dairyId)
    ) {

        throw new Error(
            "Invalid Dairy ID."
        );

    }

}


// ==========================================================
// 🔧 MARK MAINTENANCE
// ==========================================================

exports.markMaintenance = async ({

    dairyId,

    userId,

    userName,

    type,

    description

}) => {

    // ======================================================
    // VALIDATE INPUT
    // ======================================================

    validateDairyId(dairyId);


    if (!userId) {

        throw new Error(
            "User ID is required."
        );

    }


    if (
        typeof type !== "string" ||
        !type.trim()
    ) {

        throw new Error(
            "Maintenance type is required."
        );

    }


    if (
        typeof description !== "string" ||
        !description.trim()
    ) {

        throw new Error(
            "Maintenance description is required."
        );

    }


    // ======================================================
    // NORMALIZE VALUES
    // ======================================================

    const cleanType =
        type.trim();

    const cleanDescription =
        description.trim();

    const now =
        new Date();


    // ======================================================
    // FIND DAIRY
    // ======================================================

    const dairy =
        await Dairy.findById(
            dairyId
        ).lean();


    if (!dairy) {

        throw new Error(
            "Dairy facility not found."
        );

    }


    // ======================================================
    // SAVE CURRENT STATE
    //
    // This allows us to restore the Dairy record if
    // creating the Update document fails.
    // ======================================================

    const previousNeedsMaintenance =
        !!dairy.needsMaintenance;


    const previousMaintenance = {

        type:
            dairy.maintenance?.type || "",

        description:
            dairy.maintenance?.description || "",

        charges:
            Number(
                dairy.maintenance?.charges
            ) || 0,

        completionDescription:
            dairy.maintenance?.completionDescription || "",

        markedBy:
            dairy.maintenance?.markedBy || null,

        markedAt:
            dairy.maintenance?.markedAt || null,

        clearedBy:
            dairy.maintenance?.clearedBy || null,

        clearedAt:
            dairy.maintenance?.clearedAt || null

    };


    // ======================================================
    // UPDATE DAIRY MAINTENANCE STATUS
    //
    // updateOne() is deliberately used instead of
    // dairy.save().
    //
    // This prevents unrelated fields in an old Dairy
    // document from causing the maintenance operation to
    // fail through full-document validation.
    // ======================================================

    const dairyUpdateResult =
        await Dairy.updateOne(

            {
                _id: dairyId
            },

            {
                $set: {

                    needsMaintenance: true,

                    "maintenance.type":
                        cleanType,

                    "maintenance.description":
                        cleanDescription,

                    "maintenance.charges":
                        0,

                    "maintenance.completionDescription":
                        "",

                    "maintenance.markedBy":
                        userId,

                    "maintenance.markedAt":
                        now,

                    "maintenance.clearedBy":
                        null,

                    "maintenance.clearedAt":
                        null

                }

            }

        );


    // ======================================================
    // ENSURE DAIRY WAS ACTUALLY UPDATED
    // ======================================================

    if (
        !dairyUpdateResult.matchedCount
    ) {

        throw new Error(
            "Dairy facility could not be found."
        );

    }


    // ======================================================
    // CREATE FEED UPDATE
    // ======================================================

    try {

        const update =
            await Update.create({

                dairy:
                    dairyId,

                user:
                    userId,

                userName:
                    userName || "",

                type:
                    "maintenance",

                maintenance: {

                    status:
                        "marked",

                    type:
                        cleanType,

                    description:
                        cleanDescription,

                    markedAt:
                        now,

                    markedBy:
                        userId,

                    clearedAt:
                        null,

                    clearedBy:
                        null,

                    charges:
                        0,

                    clearDescription:
                        ""

                }

            });


        // ==================================================
        // ENSURE UPDATE WAS CREATED
        // ==================================================

        if (!update) {

            throw new Error(
                "Maintenance update could not be created."
            );

        }


        // ==================================================
        // RETURN CREATED UPDATE
        // ==================================================

        return update;

    } catch (err) {

        // ==================================================
        // ROLLBACK DAIRY STATUS
        //
        // If the feed Update fails, don't leave the Dairy
        // permanently marked when no maintenance update
        // exists.
        // ==================================================

        try {

            await Dairy.updateOne(

                {
                    _id: dairyId
                },

                {
                    $set: {

                        needsMaintenance:
                            previousNeedsMaintenance,

                        "maintenance.type":
                            previousMaintenance.type,

                        "maintenance.description":
                            previousMaintenance.description,

                        "maintenance.charges":
                            previousMaintenance.charges,

                        "maintenance.completionDescription":
                            previousMaintenance.completionDescription,

                        "maintenance.markedBy":
                            previousMaintenance.markedBy,

                        "maintenance.markedAt":
                            previousMaintenance.markedAt,

                        "maintenance.clearedBy":
                            previousMaintenance.clearedBy,

                        "maintenance.clearedAt":
                            previousMaintenance.clearedAt

                    }

                }

            );

        } catch (rollbackError) {

            console.error(
                "MAINTENANCE ROLLBACK ERROR:",
                rollbackError
            );

        }


        throw err;

    }

};


// ==========================================================
// ✅ CLEAR MAINTENANCE
// ==========================================================

exports.clearMaintenance = async ({

    dairyId,

    userId,

    userName,

    charges = 0,

    description = ""

}) => {

    // ======================================================
    // VALIDATE INPUT
    // ======================================================

    validateDairyId(dairyId);


    if (!userId) {

        throw new Error(
            "User ID is required."
        );

    }


    const cleanCharges =
        Number(charges);


    if (
        !Number.isFinite(cleanCharges) ||
        cleanCharges < 0
    ) {

        throw new Error(
            "Valid maintenance charges are required."
        );

    }


    const cleanDescription =
        typeof description === "string"
            ? description.trim()
            : "";


    if (!cleanDescription) {

        throw new Error(
            "Maintenance completion description is required."
        );

    }


    const now =
        new Date();


    // ======================================================
    // FIND DAIRY
    // ======================================================

    const dairy =
        await Dairy.findById(
            dairyId
        ).lean();


    if (!dairy) {

        throw new Error(
            "Dairy facility not found."
        );

    }


    // ======================================================
    // SAVE CURRENT STATE
    //
    // Used if the Update document cannot be created.
    // ======================================================

    const previousNeedsMaintenance =
        !!dairy.needsMaintenance;


    const previousMaintenance = {

        type:
            dairy.maintenance?.type || "",

        description:
            dairy.maintenance?.description || "",

        charges:
            Number(
                dairy.maintenance?.charges
            ) || 0,

        completionDescription:
            dairy.maintenance?.completionDescription || "",

        markedBy:
            dairy.maintenance?.markedBy || null,

        markedAt:
            dairy.maintenance?.markedAt || null,

        clearedBy:
            dairy.maintenance?.clearedBy || null,

        clearedAt:
            dairy.maintenance?.clearedAt || null

    };


    // ======================================================
    // CLEAR DAIRY MAINTENANCE STATUS
    //
    // updateOne() avoids full Dairy document validation.
    // ======================================================

    const dairyUpdateResult =
        await Dairy.updateOne(

            {
                _id: dairyId
            },

            {
                $set: {

                    needsMaintenance:
                        false,

                    "maintenance.charges":
                        cleanCharges,

                    "maintenance.completionDescription":
                        cleanDescription,

                    "maintenance.clearedBy":
                        userId,

                    "maintenance.clearedAt":
                        now

                }

            }

        );


    // ======================================================
    // ENSURE DAIRY WAS ACTUALLY UPDATED
    // ======================================================

    if (
        !dairyUpdateResult.matchedCount
    ) {

        throw new Error(
            "Dairy facility could not be found."
        );

    }


    // ======================================================
    // CREATE CLEAR-MAINTENANCE FEED UPDATE
    // ======================================================

    try {

        const update =
            await Update.create({

                dairy:
                    dairyId,

                user:
                    userId,

                userName:
                    userName || "",

                type:
                    "maintenance",

                maintenance: {

                    status:
                        "cleared",

                    type:
                        previousMaintenance.type ||
                        "maintenance",

                    description:
                        previousMaintenance.description,

                    markedAt:
                        previousMaintenance.markedAt,

                    markedBy:
                        previousMaintenance.markedBy,

                    clearedAt:
                        now,

                    clearedBy:
                        userId,

                    charges:
                        cleanCharges,

                    clearDescription:
                        cleanDescription

                }

            });


        // ==================================================
        // ENSURE UPDATE WAS CREATED
        // ==================================================

        if (!update) {

            throw new Error(
                "Maintenance clearance update could not be created."
            );

        }


        // ==================================================
        // RETURN CREATED UPDATE
        // ==================================================

        return update;

    } catch (err) {

        // ==================================================
        // ROLLBACK
        // ==================================================

        try {

            await Dairy.updateOne(

                {
                    _id: dairyId
                },

                {
                    $set: {

                        needsMaintenance:
                            previousNeedsMaintenance,

                        "maintenance.type":
                            previousMaintenance.type,

                        "maintenance.description":
                            previousMaintenance.description,

                        "maintenance.charges":
                            previousMaintenance.charges,

                        "maintenance.completionDescription":
                            previousMaintenance.completionDescription,

                        "maintenance.markedBy":
                            previousMaintenance.markedBy,

                        "maintenance.markedAt":
                            previousMaintenance.markedAt,

                        "maintenance.clearedBy":
                            previousMaintenance.clearedBy,

                        "maintenance.clearedAt":
                            previousMaintenance.clearedAt

                    }

                }

            );

        } catch (rollbackError) {

            console.error(
                "MAINTENANCE CLEAR ROLLBACK ERROR:",
                rollbackError
            );

        }


        throw err;

    }

};