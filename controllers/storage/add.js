// ==========================================================
// controllers/storage/add.js
// STORAGE ADD CONTROLLER
// ==========================================================

const addService =
    require("../../services/storage/add");


// ==========================================================
// ADMIN CHECK
// ==========================================================

function requireAdmin(req, res) {

    // ------------------------------------------------------
    // NOT LOGGED IN
    // ------------------------------------------------------

    if (
        !req.session ||
        !req.session.user
    ) {

        res
            .status(401)
            .send("Unauthorized");

        return false;
    }


    // ------------------------------------------------------
    // ADMIN ONLY
    // ------------------------------------------------------

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
// SHOW ADD FORM
//
// GET:
//
//     /storage/:id/add
//
// :id = parent Dairy._id
// ==========================================================

exports.form =
async function (
    req,
    res,
    next
) {

    try {

        // --------------------------------------------------
        // ADMIN CHECK
        // --------------------------------------------------

        if (
            !requireAdmin(
                req,
                res
            )
        ) {

            return;
        }


        // --------------------------------------------------
        // PARENT DAIRY ID
        // --------------------------------------------------

        const dairyId =
            String(
                req.params.id || ""
            ).trim();


        // --------------------------------------------------
        // GET PARENT FARM
        // --------------------------------------------------
        //
        // The service resolves:
        //
        //     dairyId
        //         ↓
        //     Dairy._id
        //         ↓
        //     Dairy.code
        //
        // --------------------------------------------------

        const dairy =
            await addService.getParentDairy(
                dairyId
            );


        // --------------------------------------------------
        // RENDER
        // --------------------------------------------------

        return res.render(
            "storage/add",
            {

                title:
                    "Add Storage",

                dairy,

                dairyId,

                user:
                    req.session.user,

                // IMPORTANT:
                // EJS expects this variable to exist.
                error:
                    null

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
// SERVER PROVIDES:
//
//     farmCode
//     roomNumber
// ==========================================================

exports.create =
async function (
    req,
    res,
    next
) {

    try {

        // --------------------------------------------------
        // ADMIN CHECK
        // --------------------------------------------------

        if (
            !requireAdmin(
                req,
                res
            )
        ) {

            return;
        }


        // --------------------------------------------------
        // PARENT DAIRY ID
        // --------------------------------------------------

        const dairyId =
            String(
                req.params.id || ""
            ).trim();


        // --------------------------------------------------
        // USER INPUT
        // --------------------------------------------------

        const name =
            String(
                req.body.name || ""
            ).trim();


        const type =
            String(
                req.body.type || ""
            ).trim();


        // --------------------------------------------------
        // CREATE STORAGE
        // --------------------------------------------------
        //
        // The service determines:
        //
        //     Dairy.code
        //     farmCode
        //     next roomNumber
        //
        // --------------------------------------------------

        await addService.createStorage({

            dairyId,

            name,

            type

        });


        // --------------------------------------------------
        // RETURN TO STORAGE INDEX
        // --------------------------------------------------

        return res.redirect(
            `/storage/${dairyId}`
        );

    } catch (error) {

        console.error(
            "CREATE STORAGE ERROR:",
            error
        );


        // --------------------------------------------------
        // VALIDATION / EXPECTED ERRORS
        // --------------------------------------------------

        if (
            error.status
        ) {

            // ----------------------------------------------
            // For validation errors, reload the same form
            // rather than destroying the page.
            // ----------------------------------------------

            if (
                error.status >= 400 &&
                error.status < 500
            ) {

                try {

                    const dairy =
                        await addService.getParentDairy(
                            req.params.id
                        );


                    return res.status(
                        error.status
                    ).render(
                        "storage/add",
                        {

                            title:
                                "Add Storage",

                            dairy,

                            dairyId:
                                req.params.id,

                            user:
                                req.session.user,

                            error:
                                error.message,

                            formData: {

                                name:
                                    req.body.name || "",

                                type:
                                    req.body.type || ""

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


            return res
                .status(error.status)
                .send(
                    error.message
                );
        }


        // --------------------------------------------------
        // UNEXPECTED ERROR
        // --------------------------------------------------

        return next(error);
    }
};


// ==========================================================
// EXPORT
// ==========================================================