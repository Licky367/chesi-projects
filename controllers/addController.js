// ==========================================================
// controllers/addController.js
// ADD DAIRY / ANIMAL / STRUCTURE CONTROLLER
// ==========================================================

const addService =
    require("../services/addService");


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
// POST /add
// ==========================================================
//
// ADMIN ONLY
//
// Creates:
//
//     Dairy Farm
//     + automatic Storage Facility
//
// OR:
//
//     Animal
//
// OR:
//
//     Structure / Facility
//
// All creation logic remains inside addService.
//
// When a Dairy Farm is created, the service automatically
// creates its corresponding Storage Facility.
//

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