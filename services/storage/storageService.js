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
// Storage creation is restricted to administrators.
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

exports.list =
async function (
    req,
    res,
    next
) {

    try {

        // ==================================================
        // PARENT DAIRY ID
        // ==================================================

        const dairyId =
            String(
                req.params.id || ""
            ).trim();


        // ==================================================
        // REQUIRE ID
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
        // READ TYPE FILTER
        // ==================================================

        let type =
            String(
                req.query.type || "all"
            ).trim();


        // ==================================================
        // NORMALIZE TYPE
        // ==================================================

        type =
            storageService.normalizeType(
                type
            );


        // ==================================================
        // GET STORAGE
        // ==================================================
        //
        // The service resolves:
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
        //
        // result contains:
        //
        //     dairy
        //     farmCode
        //     storage
        //
        // ==================================================

        return res.render(
            "storage/storage",
            {

                title:
                    "Feed Store",

                dairy:
                    result.dairy,

                storage:
                    result.storage || [],

                selectedType:
                    type,

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
};


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
// SERVER GENERATES:
//
//     farmCode
//     roomNumber
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

        await storageService.createStorage({

            dairyId,

            name,

            type

        });


        // ==================================================
        // SUCCESS
        // ==================================================
        //
        // IMPORTANT:
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
            // VALIDATION / CONFLICT ERROR
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

    list:
        exports.list,

    form:
        exports.form,

    create:
        exports.create

};