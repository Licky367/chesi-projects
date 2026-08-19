// ==========================================================
// controllers/storage/add.js
// ADD STORAGE CONTROLLER
// ==========================================================
//
// ROUTES:
//
//     GET  /storage/:id/add
//     POST /storage/:id/add
//
// :id = parent Dairy._id
//
// IMPORTANT
// ----------------------------------------------------------
//
// The controller NEVER treats :id as farmCode.
//
// The relationship is:
//
//     :id
//       ↓
//     Dairy._id
//       ↓
//     Dairy.code
//       ↓
//     DairyStorage.farmCode
//
// The server generates roomNumber.
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
//
// ACCESS:
//
//     ADMIN ONLY
//
// ==========================================================


const mongoose =
    require("mongoose");

const storageAddService =
    require("../../services/storage/add");


// ==========================================================
// ADMIN CHECK
// ==========================================================

function isAdmin(
    req
) {

    return (

        req.session &&

        req.session.user &&

        req.session.user.role === "admin"

    );

}


// ==========================================================
// GET ADD PAGE
// ==========================================================
//
// GET:
//
//     /storage/:id/add
//
// ==========================================================

exports.showAdd =
async function (
    req,
    res,
    next
) {

    try {

        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (
            !req.session?.user
        ) {

            return res
                .status(401)
                .send(
                    "Unauthorized"
                );

        }


        // ==================================================
        // ADMIN ONLY
        // ==================================================

        if (
            !isAdmin(req)
        ) {

            return res
                .status(403)
                .send(
                    "Only administrators can add storage facilities."
                );

        }


        // ==================================================
        // PARENT DAIRY ID
        // ==================================================

        const dairyId =
            String(
                req.params.id || ""
            ).trim();


        // ==================================================
        // VALIDATE DAIRY ID
        // ==================================================

        if (
            !mongoose.Types.ObjectId.isValid(
                dairyId
            )
        ) {

            return res
                .status(400)
                .render(
                    "400",
                    {

                        title:
                            "Invalid Dairy ID",

                        error:
                            "The supplied Dairy ID is not valid.",

                        user:
                            req.session.user

                    }
                );

        }


        // ==================================================
        // FIND PARENT FARM
        // ==================================================

        const dairy =
            await storageAddService
                .getParentDairy(
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

                user:
                    req.session.user,

                error:
                    null,

                formData: {}

            }

        );


    } catch (error) {

        console.error(
            "SHOW ADD STORAGE ERROR:",
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
// ==========================================================

exports.create =
async function (
    req,
    res,
    next
) {

    try {

        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (
            !req.session?.user
        ) {

            return res
                .status(401)
                .send(
                    "Unauthorized"
                );

        }


        // ==================================================
        // ADMIN ONLY
        // ==================================================

        if (
            !isAdmin(req)
        ) {

            return res
                .status(403)
                .send(
                    "Only administrators can add storage facilities."
                );

        }


        // ==================================================
        // PARENT DAIRY ID
        // ==================================================

        const dairyId =
            String(
                req.params.id || ""
            ).trim();


        // ==================================================
        // VALIDATE ID
        // ==================================================

        if (
            !mongoose.Types.ObjectId.isValid(
                dairyId
            )
        ) {

            return res
                .status(400)
                .send(
                    "Invalid Dairy ID."
                );

        }


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
        // FORM VALIDATION
        // ==================================================

        if (!name) {

            const dairy =
                await storageAddService
                    .getParentDairy(
                        dairyId
                    );


            return res.status(400).render(

                "storage/add",

                {

                    title:
                        "Add Storage",

                    dairy,

                    user:
                        req.session.user,

                    error:
                        "Storage name is required.",

                    formData: {

                        name,

                        type

                    }

                }

            );

        }


        if (
            ![
                "room",
                "agroStore"
            ].includes(type)
        ) {

            const dairy =
                await storageAddService
                    .getParentDairy(
                        dairyId
                    );


            return res.status(400).render(

                "storage/add",

                {

                    title:
                        "Add Storage",

                    dairy,

                    user:
                        req.session.user,

                    error:
                        "Please select either Room or AgroStore.",

                    formData: {

                        name,

                        type

                    }

                }

            );

        }


        // ==================================================
        // CREATE
        // ==================================================

        await storageAddService.createStorage({

            dairyId,

            name,

            type

        });


        // ==================================================
        // RETURN TO FARM STORAGE
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
        // DISPLAY EXPECTED VALIDATION ERRORS
        // ==================================================

        if (
            error.status &&
            error.status < 500
        ) {

            try {

                const dairy =
                    await storageAddService
                        .getParentDairy(
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

                            user:
                                req.session?.user ||
                                null,

                            error:
                                error.message,

                            formData: {

                                name:
                                    req.body?.name ||
                                    "",

                                type:
                                    req.body?.type ||
                                    ""

                            }

                        }

                    );

            } catch (
                renderError
            ) {

                return next(
                    renderError
                );

            }

        }


        return next(error);

    }

};