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
//     req.params.id
//
// ALWAYS MEANS:
//
//     Dairy._id
//
// NEVER:
//
//     Dairy.code
//
// NEVER:
//
//     DairyStorage._id
//
// NEVER:
//
//     roomNumber
//
// RELATION:
//
//     Dairy._id
//          ↓
//     Dairy.code
//          ↓
//     DairyStorage.farmCode
//
// ==========================================================


const mongoose =
    require("mongoose");

const Dairy =
    require("../../models/dairy");

const storageService =
    require("../../services/storage/storageService");


// ==========================================================
// ADMIN CHECK
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
            .send("Unauthorized");

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
                "Only administrators can manage storage facilities."
            );

        return false;
    }


    return true;
}


// ==========================================================
// GET PARENT DAIRY
// ==========================================================
//
// req.params.id = Dairy._id
//
// This helper is used by both:
//
//     storage page
//     add storage page
//
// ==========================================================

async function getParentDairy(
    dairyId
) {

    // ======================================================
    // REQUIRE ID
    // ======================================================

    if (!dairyId) {

        const error =
            new Error(
                "Dairy Farm ID is required."
            );

        error.status = 400;

        throw error;
    }


    // ======================================================
    // VALIDATE OBJECT ID
    // ======================================================

    if (
        !mongoose.Types.ObjectId.isValid(
            dairyId
        )
    ) {

        const error =
            new Error(
                "Invalid Dairy ID."
            );

        error.status = 400;

        throw error;
    }


    // ======================================================
    // FIND PARENT DAIRY
    // ======================================================

    const dairy =
        await Dairy
            .findById(dairyId)
            .lean();


    // ======================================================
    // NOT FOUND
    // ======================================================

    if (!dairy) {

        const error =
            new Error(
                "Dairy Farm not found."
            );

        error.status = 404;

        throw error;
    }


    // ======================================================
    // VERIFY PARENT DAIRY FARM
    // ======================================================
    //
    // Dairy Farm:
    //
    //     code < 0
    //
    // Animals:
    //
    //     code > 0
    //
    // Structures/assets:
    //
    //     code === null
    //
    // ======================================================

    const farmCode =
        Number(
            dairy.code
        );


    if (
        dairy.code === null ||
        dairy.code === undefined ||
        !Number.isInteger(farmCode) ||
        farmCode >= 0
    ) {

        const error =
            new Error(
                "The supplied ID does not belong to a parent Dairy Farm."
            );

        error.status = 422;

        throw error;
    }


    return {

        dairy,

        farmCode

    };
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

exports.index =
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
        // GET PARENT FARM
        // ==================================================

        const {

            dairy,

            farmCode

        } =
            await getParentDairy(
                dairyId
            );


        // ==================================================
        // STORAGE TYPE FILTER
        // ==================================================

        let type =
            String(
                req.query.type || "all"
            ).trim();


        const allowedTypes = [

            "all",
            "room",
            "agroStore"

        ];


        if (
            !allowedTypes.includes(type)
        ) {

            type = "all";

        }


        // ==================================================
        // GET STORAGE
        // ==================================================
        //
        // storageService uses farmCode to query:
        //
        //     DairyStorage.farmCode
        //
        // ==================================================

        const storage =
            await storageService.getStorage({

                dairyId,

                farmCode,

                type

            });


        // ==================================================
        // RENDER
        // ==================================================

        return res.render(

            "storage/index",

            {

                title:
                    "Feed Store",

                dairy,

                storage:
                    storage || [],

                selectedType:
                    type,

                // IMPORTANT:
                // This is Dairy._id.
                dairyId:
                    String(
                        dairy._id
                    ),

                // This is only used internally/data-wise
                // for DairyStorage.farmCode.
                farmCode,

                user:
                    req.session?.user || null

            }

        );

    } catch (error) {

        console.error(
            "STORAGE PAGE ERROR:",
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
        // GET PARENT FARM
        // ==================================================

        const {

            dairy

        } =
            await getParentDairy(
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

                dairy,

                // IMPORTANT:
                // This remains Dairy._id.
                dairyId,

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
// :id = Dairy._id
//
// USER INPUT:
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
        //
        // Service resolves:
        //
        //     Dairy._id
        //          ↓
        //     Dairy.code
        //
        // Then creates:
        //
        //     DairyStorage.farmCode
        //     DairyStorage.roomNumber
        //
        // ==================================================

        await storageService.createStorage({

            dairyId,

            name,

            type

        });


        // ==================================================
        // SUCCESS REDIRECT
        // ==================================================
        //
        // CRITICAL:
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
        // VALIDATION / APPLICATION ERROR
        // ==================================================

        if (
            error.status
        ) {

            // =================================================
            // RE-RENDER FORM FOR CLIENT ERRORS
            // =================================================

            if (
                error.status >= 400 &&
                error.status < 500
            ) {

                try {

                    const {

                        dairy

                    } =
                        await getParentDairy(
                            String(
                                req.params.id || ""
                            ).trim()
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

                                // --------------------------------
                                // ALWAYS Dairy._id
                                // --------------------------------

                                dairyId:
                                    String(
                                        req.params.id || ""
                                    ).trim(),

                                user:
                                    req.session.user,

                                error:
                                    error.message,

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
//
// All storage routes now use this ONE controller.
//
// ==========================================================

module.exports = {

    index:
        exports.index,

    form:
        exports.form,

    create:
        exports.create

};