// ==========================================================
// controllers/storage/add.js
// STORAGE ADD CONTROLLER
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Handles:
//
//     GET  /storage/:id/add
//     POST /storage/:id/add
//
// IMPORTANT:
//
//     :id = Dairy._id
//
// The controller ALWAYS uses the parent Dairy's:
//
//     MongoDB _id
//
// The service is responsible for resolving:
//
//     Dairy._id
//          ↓
//     Dairy.code
//          ↓
//     DairyStorage.farmCode
//
// The controller never uses Dairy.code as the URL id.
//
// ==========================================================


const addService =
    require("../../services/storage/add");


// ==========================================================
// ADMIN CHECK
// ==========================================================
//
// Only users with:
//
//     role = "admin"
//
// can access storage creation.
//
// ==========================================================

function requireAdmin(
    req,
    res
) {

    // ======================================================
    // NOT LOGGED IN
    // ======================================================

    if (
        !req.session ||
        !req.session.user
    ) {

        res
            .status(401)
            .send(
                "Unauthorized"
            );

        return false;
    }


    // ======================================================
    // NOT ADMIN
    // ======================================================

    if (
        req.session.user.role !== "admin"
    ) {

        res
            .status(403)
            .send(
                "Only administrators can add storage facilities."
            );

        return false;
    }


    return true;
}


// ==========================================================
// GET ADD FORM
// ==========================================================
//
// GET:
//
//     /storage/:id/add
//
// IMPORTANT:
//
//     :id = Dairy._id
//
// Example:
//
//     /storage/67xxxxxxxxxxxxxxxxxxxxxx/add
//
// ==========================================================

exports.form =
async function (
    req,
    res,
    next
) {

    try {

        // ==================================================
        // ADMIN ONLY
        // ==================================================

        if (
            !requireAdmin(
                req,
                res
            )
        ) {

            return;
        }


        // ==================================================
        // GET PARENT DAIRY ID
        // ==================================================
        //
        // This MUST remain the MongoDB Dairy._id.
        //
        // Do NOT replace this with dairy.code.
        //
        // ==================================================

        const dairyId =
            String(
                req.params.id || ""
            ).trim();


        // ==================================================
        // LOAD PARENT DAIRY
        // ==================================================
        //
        // The service validates the ID and finds:
        //
        //     Dairy._id
        //
        // It also verifies that the Dairy is a farm.
        //
        // ==================================================

        const dairy =
            await addService.getParentDairy(
                dairyId
            );


        // ==================================================
        // RENDER FORM
        // ==================================================

        return res.render(
            "storage/add",
            {

                title:
                    "Add Storage",

                // ------------------------------------------
                // Parent Dairy document
                // ------------------------------------------

                dairy,

                // ------------------------------------------
                // Keep the actual MongoDB _id available
                // ------------------------------------------

                dairyId,

                // ------------------------------------------
                // Logged-in user
                // ------------------------------------------

                user:
                    req.session.user,

                // ------------------------------------------
                // Always define error
                // ------------------------------------------

                error:
                    null,

                // ------------------------------------------
                // Always define formData
                // ------------------------------------------

                formData: {

                    name:
                        "",

                    type:
                        ""

                }

            }
        );

    } catch (error) {

        console.error(
            "STORAGE ADD FORM ERROR:",
            error
        );

        return next(error);
    }
};


// ==========================================================
// CREATE STORAGE
// ==========================================================
//
// POST:
//
//     /storage/:id/add
//
// USER PROVIDES:
//
//     name
//     type
//
// SERVER DETERMINES:
//
//     farmCode
//     roomNumber
//
// IMPORTANT:
//
//     req.params.id remains Dairy._id.
//
// ==========================================================

exports.create =
async function (
    req,
    res,
    next
) {

    try {

        // ==================================================
        // ADMIN ONLY
        // ==================================================

        if (
            !requireAdmin(
                req,
                res
            )
        ) {

            return;
        }


        // ==================================================
        // PARENT DAIRY ID
        // ==================================================
        //
        // This is the MongoDB _id.
        //
        // It is the same ID used by:
        //
        //     /storage/:id
        //
        //     /storage/:id/add
        //
        //     /storage/:id/...
        //
        // ==================================================

        const dairyId =
            String(
                req.params.id || ""
            ).trim();


        // ==================================================
        // USER INPUT
        // ==================================================

        const name =
            String(
                req.body.name || ""
            ).trim();


        const type =
            String(
                req.body.type || ""
            ).trim();


        // ==================================================
        // CREATE STORAGE
        // ==================================================
        //
        // The service handles:
        //
        //     Dairy._id
        //          ↓
        //     Dairy.code
        //          ↓
        //     farmCode
        //
        // and generates:
        //
        //     roomNumber
        //
        // ==================================================

        await addService.createStorage({

            dairyId,

            name,

            type

        });


        // ==================================================
        // SUCCESS
        // ==================================================
        //
        // Redirect using the SAME parent Dairy._id.
        //
        // NEVER use dairy.code here.
        //
        // ==================================================

        return res.redirect(
            `/storage/${dairyId}`
        );

    } catch (error) {

        console.error(
            "CREATE STORAGE ERROR:",
            error
        );


        // ==================================================
        // APPLICATION ERROR
        // ==================================================

        if (
            error.status
        ) {

            // =================================================
            // VALIDATION / CLIENT ERRORS
            // =================================================

            if (
                error.status >= 400 &&
                error.status < 500
            ) {

                try {

                    // ==========================================
                    // Re-load the parent Dairy using
                    // the SAME MongoDB _id.
                    // ==========================================

                    const dairy =
                        await addService.getParentDairy(
                            req.params.id
                        );


                    // ==========================================
                    // Render form again while preserving
                    // the user's submitted values.
                    // ==========================================

                    return res
                        .status(
                            error.status
                        )
                        .render(
                            "storage/add",
                            {

                                title:
                                    "Add Storage",

                                // ------------------------------
                                // Parent Dairy
                                // ------------------------------

                                dairy,

                                // ------------------------------
                                // IMPORTANT:
                                //
                                // This remains Dairy._id.
                                // ------------------------------

                                dairyId:
                                    String(
                                        req.params.id || ""
                                    ).trim(),

                                // ------------------------------
                                // Logged-in user
                                // ------------------------------

                                user:
                                    req.session.user,

                                // ------------------------------
                                // Error message
                                // ------------------------------

                                error:
                                    error.message,

                                // ------------------------------
                                // Preserve submitted values
                                // ------------------------------

                                formData: {

                                    name:
                                        String(
                                            req.body.name || ""
                                        ).trim(),

                                    type:
                                        String(
                                            req.body.type || ""
                                        ).trim()

                                }

                            }
                        );

                } catch (renderError) {

                    console.error(
                        "STORAGE ADD ERROR PAGE:",
                        renderError
                    );

                    return next(
                        renderError
                    );
                }
            }


            // =================================================
            // OTHER KNOWN ERROR
            // =================================================

            return res
                .status(
                    error.status
                )
                .send(
                    error.message
                );
        }


        // ==================================================
        // UNEXPECTED ERROR
        // ==================================================

        return next(error);
    }
};


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    form:
        exports.form,

    create:
        exports.create

};