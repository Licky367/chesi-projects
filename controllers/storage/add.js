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

    if (
        !req.session ||
        !req.session.user
    ) {

        res
            .status(401)
            .send("Unauthorized");

        return false;
    }


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
// :id = Dairy._id of the parent farm
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
        // PARENT DAIRY ID
        // ==================================================

        const dairyId =
            String(
                req.params.id || ""
            ).trim();


        // ==================================================
        // GET PARENT FARM
        //
        // dairyId = Dairy._id
        //
        // Service resolves:
        //
        //     Dairy._id
        //          ↓
        //     Dairy.code
        // ==================================================

        const dairy =
            await addService.getParentDairy(
                dairyId
            );


        // ==================================================
        // RENDER
        // ==================================================

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
                // Always define these because add.ejs
                // expects them.
                error:
                    null,

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
//
// POST:
//
//     /storage/:id/add
//
// User provides:
//
//     name
//     type
//
// Server generates:
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
        //
        // Service determines:
        //
        //     dairy.code
        //     farmCode
        //     roomNumber
        // ==================================================

        await addService.createStorage({

            dairyId,

            name,

            type

        });


        // ==================================================
        // SUCCESS
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
        // EXPECTED APPLICATION ERROR
        // ==================================================

        if (
            error.status
        ) {

            // ------------------------------------------------
            // Reload form for validation/conflict errors.
            // ------------------------------------------------

            if (
                error.status >= 400 &&
                error.status < 500
            ) {

                try {

                    const dairy =
                        await addService.getParentDairy(
                            req.params.id
                        );


                    return res
                        .status(
                            error.status
                        )
                        .render(
                            "storage/add",
                            {

                                title:
                                    "Add Storage",

                                dairy,

                                dairyId:
                                    req.params.id,

                                user:
                                    req.session.user,

                                // --------------------------
                                // ERROR MESSAGE
                                // --------------------------

                                error:
                                    error.message,

                                // --------------------------
                                // PRESERVE FORM VALUES
                                // --------------------------

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
// EXPORT
// ==========================================================