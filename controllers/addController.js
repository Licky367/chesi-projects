// ==========================================================
// controllers/addController.js
// ADD DAIRY / ANIMAL / STRUCTURE CONTROLLER
// ==========================================================

const addService =
    require("../services/addService");

const Dairy =
    require("../models/dairy");


// ==========================================================
// ADMIN ACCESS
// ==========================================================
//
// The Add page is strictly for administrators.
//
// This check is intentionally performed in the controller
// so users cannot bypass the restriction by manually visiting
// /add or submitting POST /add.
//

function requireAdmin(
    req,
    res
) {

    if (
        !req.user ||
        req.user.role !== "admin"
    ) {

        return res.status(403).render(
            "error",
            {

                statusCode: 403,

                message:
                    "You are not authorized to access this page."

            }
        );

    }


    return null;

}


// ==========================================================
// GET /add
// ==========================================================
//
// ADMIN ONLY
//
// Loads the Add Dairy / Animal / Structure page.
//

async function getAddPage(
    req,
    res
) {

    const accessDenied =
        requireAdmin(
            req,
            res
        );


    if (
        accessDenied
    ) {

        return accessDenied;

    }


    try {

        const data =
            await addService.getAddPageData();


        return res.render(
            "add",
            {

                dairyBreeds:
                    data.dairyBreeds,

                structures:
                    data.dairyFarms,

                user:
                    req.user

            }
        );

    } catch (error) {

        console.error(
            "GET /add error:",
            error
        );


        return res.status(
            error.statusCode || 500
        ).render(
            "error",
            {

                statusCode:
                    error.statusCode || 500,

                message:
                    error.message ||
                    "Unable to load the add record page."

            }
        );

    }

}


// ==========================================================
// CREATE STORAGE FACILITY FOR DAIRY FARM
// ==========================================================
//
// Every Dairy Farm must have exactly ONE storage facility.
//
// FARM:
//
//     code = negative farm code
//
// STORAGE:
//
//     code          = null
//     assetCode     = null
//     storageNumber = negative farm code
//
// Example:
//
//     Farm:
//
//         code = -1
//
//     Storage:
//
//         code = null
//         assetCode = null
//         storageNumber = -1
//
// FeedStock documents will later reference the STORAGE
// FACILITY _id through:
//
//     FeedStock.dairy
//
// ==========================================================

async function createStorageForFarm(
    farm
) {

    // ======================================================
    // SAFETY CHECK
    // ======================================================

    if (
        !farm
    ) {

        throw new Error(
            "Dairy Farm was created but the created record could not be identified."
        );

    }


    // ======================================================
    // CONFIRM THIS IS A DAIRY FARM
    // ======================================================

    const farmCode =
        Number(
            farm.code
        );


    if (

        !Number.isInteger(
            farmCode
        ) ||

        farmCode >= 0

    ) {

        return null;

    }


    // ======================================================
    // CHECK WHETHER STORAGE ALREADY EXISTS
    // ======================================================
    //
    // This makes the operation safe if the controller is
    // ever called again for an already-created farm.
    //
    // ======================================================

    const existingStorage =
        await Dairy.findOne({

            storageNumber:
                farmCode

        });


    if (
        existingStorage
    ) {

        return existingStorage;

    }


    // ======================================================
    // CREATE STORAGE FACILITY
    // ======================================================

    const storage =
        new Dairy({

            // ------------------------------------------------
            // Storage has NO identity code.
            // ------------------------------------------------

            code:
                null,

            // ------------------------------------------------
            // Storage does not use assetCode.
            // ------------------------------------------------

            assetCode:
                null,

            // ------------------------------------------------
            // This connects the storage to the parent farm.
            // ------------------------------------------------

            storageNumber:
                farmCode,

            // ------------------------------------------------
            // Human-readable name.
            // ------------------------------------------------

            name:
                `${farm.name || "Dairy Farm"} Storage`,

            // ------------------------------------------------
            // Storage facilities do not require a structure
            // type according to the Dairy model.
            // ------------------------------------------------

            type:
                "",

            // ------------------------------------------------
            // Storage is not an animal.
            // ------------------------------------------------

            dateOfBirth:
                null,

            mass:
                0,

            isMilking:
                false,

            // ------------------------------------------------
            // Initial financial values.
            // ------------------------------------------------

            buyingPrice:
                0,

            sellingPrice:
                0,

            revenue:
                0,

            currentWorth:
                0,

            // ------------------------------------------------
            // Description.
            // ------------------------------------------------

            description:
                `Feed and veterinary medicine storage facility for ${farm.name || "Dairy Farm"} (Farm ${farmCode}).`,

            // ------------------------------------------------
            // Storage starts active.
            // ------------------------------------------------

            status:
                "active"

        });


    return storage.save();

}


// ==========================================================
// POST /add
// ==========================================================
//
// ADMIN ONLY
//
// Creates:
//
//     Dairy Farm
//     Animal
//     Structure / Facility
//
// ADDITIONAL DAIRY FARM LOGIC:
//
// Whenever a new Dairy Farm is created:
//
//     1. The farm is created.
//     2. A corresponding storage facility is created.
//
// The storage facility:
//
//     code          = null
//     assetCode     = null
//     storageNumber = farm.code
//
// FeedStock remains in the independent FeedStock collection
// and will reference the storage facility's _id.
//
// ==========================================================

async function createRecord(
    req,
    res
) {

    const accessDenied =
        requireAdmin(
            req,
            res
        );


    if (
        accessDenied
    ) {

        return accessDenied;

    }


    try {

        // ==================================================
        // CREATE THE REQUESTED RECORD
        // ==================================================

        const result =
            await addService.createRecord({

                body:
                    req.body || {},

                file:
                    req.file || null,

                user:
                    req.user

            });


        // ==================================================
        // IDENTIFY THE CREATED RECORD
        // ==================================================
        //
        // addService.createRecord() should return the
        // created Dairy document.
        //
        // The first option is result itself.
        //
        // If the service wraps the record, these common
        // properties are also supported.
        //
        // ==================================================

        const createdRecord =

            result &&
            (
                result.record ||
                result.dairy ||
                result.created ||
                result
            );


        // ==================================================
        // DAIRY FARM -> CREATE STORAGE
        // ==================================================
        //
        // A Dairy Farm is identified by:
        //
        //     code < 0
        //
        // We deliberately do NOT use req.body here to
        // determine whether the record is a farm.
        //
        // The actual saved Dairy record is the authority.
        //
        // ==================================================

        if (
            createdRecord &&
            createdRecord.code !== null &&
            createdRecord.code !== undefined &&
            Number(createdRecord.code) < 0
        ) {

            await createStorageForFarm(
                createdRecord
            );

        }


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.redirect(
            "/networth"
        );

    } catch (error) {

        console.error(
            "POST /add error:",
            error
        );


        return res.status(
            error.statusCode || 500
        ).render(
            "error",
            {

                statusCode:
                    error.statusCode || 500,

                message:
                    error.message ||
                    "Unable to create record."

            }
        );

    }

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getAddPage,

    createRecord

};