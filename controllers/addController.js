// ==========================================================
// controllers/addController.js
// ==========================================================

const addService =
    require("../services/addService");


// ==========================================================
// JSON DETECTION
// ==========================================================

function wantsJSON(req) {

    return (

        req.xhr === true ||

        (
            typeof req.headers.accept === "string" &&
            req.headers.accept.includes(
                "application/json"
            )
        )

    );

}


// ==========================================================
// JSON ERROR
// ==========================================================

function jsonError(
    res,
    error,
    fallbackMessage
) {

    const statusCode =
        error.statusCode || 500;


    return res
        .status(statusCode)
        .json({

            success: false,

            message:
                error.message ||
                fallbackMessage

        });

}


// ==========================================================
// HTML ERROR
// ==========================================================

function renderError(
    res,
    error,
    fallbackMessage
) {

    const statusCode =
        error.statusCode || 500;


    return res
        .status(statusCode)
        .render(
            "error",
            {

                message:
                    error.message ||
                    fallbackMessage,

                statusCode

            }
        );

}


// ==========================================================
// GET /add
// ==========================================================

async function getAddPage(
    req,
    res
) {

    try {

        const data =
            await addService.getAddPage();


        return res.render(
            "add",
            data
        );

    } catch (error) {

        console.error(
            "Error loading Add Dairy page:",
            error
        );


        if (
            wantsJSON(req)
        ) {

            return jsonError(
                res,
                error,
                "Unable to load Add Dairy page."
            );

        }


        return renderError(
            res,
            error,
            "Unable to load Add Dairy page."
        );

    }

}


// ==========================================================
// POST /add
// ==========================================================

async function createDairy(
    req,
    res
) {

    try {

        console.log(
            "=================================================="
        );

        console.log(
            "CREATE DAIRY / ASSET"
        );

        console.log(
            "Request body:",
            req.body
        );

        console.log(
            "Uploaded file:",
            req.file
        );

        console.log(
            "=================================================="
        );


        const dairy =
            await addService.createDairy(
                req.body,
                req.file || null
            );


        // ==================================================
        // JSON CLIENT
        // ==================================================

        if (
            wantsJSON(req)
        ) {

            return res.status(201).json({

                success: true,

                message:
                    "Dairy / asset created successfully.",

                dairy

            });

        }


        // ==================================================
        // NORMAL BROWSER
        // ==================================================

        /*
         * Send the user to the newly created
         * record's edit/details page.
         *
         * This also makes it immediately possible
         * to verify that the saved values are actually
         * present in MongoDB.
         */

        return res.redirect(
            `/networth/asset/${dairy._id}`
        );

    } catch (error) {

        console.error(
            "Error creating Dairy / Asset:",
            error
        );


        if (
            wantsJSON(req)
        ) {

            return jsonError(
                res,
                error,
                "Unable to create Dairy / Asset."
            );

        }


        return renderError(
            res,
            error,
            "Unable to create Dairy / Asset."
        );

    }

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getAddPage,

    createDairy

};