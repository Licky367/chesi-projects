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
// IMPORTANT ID CONTRACT
// ----------------------------------------------------------
//
//     :id = parent Dairy._id
//
// NEVER:
//
//     :id = Dairy.code
//     :id = DairyStorage._id
//     :id = roomNumber
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
// Only administrators can create storage facilities.
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
// NORMALIZE TYPE
// ==========================================================
//
// We deliberately keep this inside the controller.
//
// The service does its own normalization too.
//
// Allowed:
//
//     all
//     room
//     agroStore
//
// ==========================================================

function normalizeType(
    value
) {

    const type =
        String(
            value || "all"
        )
        .trim();


    if (
        type === "room"
    ) {

        return "room";
    }


    if (
        type === "agroStore"
    ) {

        return "agroStore";
    }


    return "all";
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
        // READ PARENT DAIRY ID
        // ==================================================

        const dairyId =
            String(
                req.params.id || ""
            )
            .trim();


        // ==================================================
        // REQUIRE ID
        // ==================================================

        if (
            !dairyId
        ) {

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
        // STORAGE TYPE FILTER
        // ==================================================

        const type =
            normalizeType(
                req.query.type
            );


        // ==================================================
        // GET PARENT DAIRY
        // ==================================================
        //
        // This resolves:
        //
        //     Dairy._id
        //          ↓
        //     Dairy.code
        //          ↓
        //     farmCode
        //
        // ==================================================

        const {

            dairy,

            farmCode

        } =
            await storageService.getDairyById(
                dairyId
            );


        // ==================================================
        // GET STORAGE
        // ==================================================
        //
        // The merged service returns the STORAGE ARRAY
        // directly.
        //
        // It does NOT return:
        //
        //     {
        //         dairy,
        //         farmCode,
        //         storage
        //     }
        //
        // ==================================================

        const storage =
            await storageService.getStorage({

                dairyId,

                type

            });


        // ==================================================
        // RENDER STORAGE PAGE
        // ==================================================

        return res.render(
            "storage/storage",
            {

                title:
                    "Feed Store",

                // ------------------------------------------
                // Parent Dairy
                // ------------------------------------------

                dairy,

                // ------------------------------------------
                // Storage belonging to this farm
                // ------------------------------------------

                storage:
                    storage || [],

                // ------------------------------------------
                // Selected filter
                // ------------------------------------------

                selectedType:
                    type,

                // ------------------------------------------
                // Parent Dairy MongoDB _id
                // ------------------------------------------

                dairyId:
                    dairy._id,

                // ------------------------------------------
                // Dairy.code used by storage relation
                // ------------------------------------------

                farmCode,

                // ------------------------------------------
                // Logged-in user
                // ------------------------------------------

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
            )
            .trim();


        // ==================================================
        // GET PARENT DAIRY
        // ==================================================
        //
        // Service resolves:
        //
        //     Dairy._id
        //          ↓
        //     Dairy.code
        //          ↓
        //     farmCode
        //
        // ==================================================

        const {

            dairy,

            farmCode

        } =
            await storageService.getDairyById(
                dairyId
            );


        // ==================================================
        // RENDER ADD FORM
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
}


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
// ==========================================================

async function create(
    req,
    res,
    next
) {

    // ======================================================
    // IMPORTANT:
    //
    // These variables are declared OUTSIDE try.
    //
    // The catch block needs access to them when re-rendering
    // the form after a validation error.
    //
    // ======================================================

    const dairyId =
        String(
            req.params.id || ""
        )
        .trim();


    const name =
        String(
            req.body?.name || ""
        )
        .trim();


    const type =
        String(
            req.body?.type || ""
        )
        .trim();


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
        // CREATE STORAGE
        // ==================================================
        //
        // The service resolves:
        //
        //     dairyId
        //          ↓
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

        await storageService.createStorage({

            dairyId,

            name,

            type

        });


        // ==================================================
        // SUCCESS
        // ==================================================
        //
        // Redirect using the SAME Dairy._id.
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
        // KNOWN APPLICATION ERROR
        // ==================================================

        if (
            error.status
        ) {

            // =================================================
            // VALIDATION / CONFLICT / CLIENT ERROR
            // =================================================

            if (
                error.status >= 400 &&
                error.status < 500
            ) {

                try {

                    // ==========================================
                    // RELOAD PARENT DAIRY
                    // ==========================================

                    const {

                        dairy,

                        farmCode

                    } =
                        await storageService.getDairyById(
                            dairyId
                        );


                    // ==========================================
                    // RENDER FORM AGAIN
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
                                // Parent Dairy MongoDB _id
                                // ------------------------------

                                dairyId,

                                // ------------------------------
                                // Parent Dairy code
                                // ------------------------------

                                farmCode,

                                // ------------------------------
                                // Logged-in user
                                // ------------------------------

                                user:
                                    req.session?.user || null,

                                // ------------------------------
                                // Error
                                // ------------------------------

                                error:
                                    error.message,

                                // ------------------------------
                                // Preserve submitted data
                                // ------------------------------

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
}


// ==========================================================
// EXPORT
// ==========================================================
//
// THESE EXACT NAMES MUST MATCH THE ROUTER:
//
//     storageController.list
//     storageController.form
//     storageController.create
//
// ==========================================================

module.exports = {

    list,

    form,

    create

};