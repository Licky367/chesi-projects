// ==========================================================
// controllers/addController.js
// ADD DAIRY / ANIMAL / STRUCTURE CONTROLLER
// ==========================================================

const addService =
    require("../services/addService");


// ==========================================================
// GET ADD PAGE
// ==========================================================

async function getAddPage(req, res) {

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


        return res.status(500).render(
            "error",
            {

                statusCode: 500,

                message:
                    "Unable to load the add record page."

            }
        );

    }

}


// ==========================================================
// CREATE RECORD
// ==========================================================

async function createRecord(req, res) {

    try {

        /*
         * req.body contains the normal form fields.
         *
         * req.file contains profileImage when supplied.
         */

        const result =
            await addService.createRecord({

                body:
                    req.body,

                file:
                    req.file,

                user:
                    req.user

            });


        /*
         * Normal form submission.
         *
         * Redirect back to Net Worth after successful
         * creation.
         */

        return res.redirect(
            "/networth"
        );


    } catch (error) {

        console.error(
            "POST /add error:",
            error
        );


        /*
         * Return the actual validation/service message
         * instead of hiding it behind a generic error.
         */

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