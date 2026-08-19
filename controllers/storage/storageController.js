// ==========================================================
// controllers/storage/storageController.js
// STORAGE CONTROLLER
// ==========================================================
//
// HANDLES:
//
//     GET  /storage/:id
//     GET  /storage/:id/add
//     POST /storage/:id/add
//
// IMPORTANT ID CONTRACT:
//
//     :id = parent Dairy._id
//
// RELATION:
//
//     req.params.id
//          ↓
//     Dairy._id
//          ↓
//     Dairy.code
//          ↓
//     DairyStorage.farmCode
//
// ==========================================================


const storageService =
    require("../../services/storage/storageService");


// ==========================================================
// ADMIN CHECK
// ==========================================================
//
// Only administrators can create storage.
//
// Viewing storage remains available according to the
// application's normal route access.
//
// ==========================================================

function requireAdmin(
    req,
    res
) {

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
// GET STORAGE PAGE
// ==========================================================
//
// GET:
//
//     /storage/:id
//
// :id = Dairy._id
//
// ==========================================================

async function list(
    req,
    res,
    next
) {

    try {

        // ==================================================
        // GET DAIRY ID
        // ==================================================

        const dairyId =
            String(
                req.params.id || ""
            ).trim();


        // ==================================================
        // REQUIRE DAIRY ID
        // ==================================================

        if (!dairyId) {

            return res
                .status(400)
                .render(
                    "400",
                    {

                        title:
                            "Invalid Dairy ID",

                        error:
                            "Dairy Farm ID is required.",

                        user:
                            req.session?.user || null

                    }
                );
        }


        // ==================================================
        // GET TYPE FILTER
        // ==================================================

        const type =
            storageService.normalizeType(
                req.query.type
            );


        // ==================================================
        // GET STORAGE
        // ==================================================
        //
        // Service resolves:
        //
        //     Dairy._id
        //          ↓
        //     Dairy.code
        //          ↓
        //     DairyStorage.farmCode
        //
        // ==================================================

        const result =
            await storageService.getStorage({

                dairyId,

                type

            });


        // ==================================================
        // RENDER
        // ==================================================

        return res.render(
            "storage/storage",
            {

                title:
                    "Feed Store",

                dairy:
                    result.dairy,

                storage:
                    result.storage,

                selectedType:
                    result.type,

                dairyId:
                    result.dairy._id,

                farmCode:
                    result.farmCode,

                user:
                    req.session?.user || null

            }
        );

    } catch (error) {

        console.error(
            "STORAGE LIST ERROR:",
            error
        );

        return next(error);
    }
}


// ==========================================================
// GET ADD STORAGE FORM
// ==========================================================
//
// GET:
//
//     /storage/:id/add
//
// :id = Dairy._id
//
// ==========================================================

async function form(
    req,
    res,
    next
) {

    try {

        // ==================================================
        // ADMIN CHECK
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
        // GET DAIRY ID
        // ==================================================

        const dairyId =
            String(
                req.params.id || ""
            ).trim();


        // ==================================================
        // GET PARENT DAIRY
        // ==================================================

        const {

            dairy,

            farmCode

        } =
            await storageService.getParentDairy(
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

                farmCode,

                user:
                    req.session.user,

                error:
                    null,

                formData: {

                    name:
                        "",

                    type:
                        "room"

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
}


// ==========================================================
// CREATE STORAGE
// ==========================================================
//
// POST:
//
//     /storage/:id/add
//
// USER:
//
//     name
//     type
//
// SERVER:
//
//     farmCode
//     roomNumber
//
// ==========================================================

async function create(
    req,
    res,
    next
) {

    // ======================================================
    // THESE ARE DECLARED OUTSIDE try
    // ======================================================
    //
    // This is important because the catch block needs them
    // when redisplaying the form after validation errors.
    //
    // ======================================================

    const dairyId =
        String(
            req.params.id || ""
        ).trim();


    const name =
        String(
            req.body?.name || ""
        ).trim();


    const type =
        String(
            req.body?.type || ""
        ).trim();


    try {

        // ==================================================
        // ADMIN CHECK
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
        // CREATE STORAGE
        // ==================================================
        //
        // IMPORTANT:
        //
        // We do NOT send farmCode or roomNumber from the
        // browser.
        //
        // The service generates both.
        //
        // ==================================================

        await storageService.createStorage({

            dairyId,

            name,

            type

        });


        // ==================================================
        // SUCCESS
        // ==================================================
        //
        // Redirect using Dairy._id.
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
        // EXPECTED APPLICATION ERROR
        // ==================================================

        if (
            error.status
        ) {

            // =================================================
            // VALIDATION / CONFLICT
            // =================================================

            if (
                error.status >= 400 &&
                error.status < 500
            ) {

                try {

                    const {

                        dairy,

                        farmCode

                    } =
                        await storageService.getParentDairy(
                            dairyId
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

                                dairyId,

                                farmCode,

                                user:
                                    req.session?.user || null,

                                error:
                                    error.message,

                                formData: {

                                    name,

                                    type

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
            // OTHER APPLICATION ERROR
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
}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    list,

    form,

    create

};