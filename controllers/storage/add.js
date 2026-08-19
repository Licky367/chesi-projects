// ==========================================================
// controllers/storage/add.js
// STORAGE ADD CONTROLLER
// ==========================================================

const addService =
    require("../../services/storage/add");


// ==========================================================
// ADMIN CHECK
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
            .send(
                "Unauthorized"
            );

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
// GET ADD STORAGE PAGE
//
// GET:
//
//     /storage/:id/add
//
// :id = parent Dairy._id
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
        // GET PAGE DATA
        // ==================================================

        const data =
            await addService.getAddPageData(
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

                dairy:
                    data.dairy,

                farmCode:
                    data.farmCode,

                user:
                    req.session.user

            }

        );

    } catch (error) {

        console.error(
            "STORAGE ADD FORM ERROR:",
            error
        );


        if (
            error.status
        ) {

            return res
                .status(error.status)
                .send(
                    error.message
                );

        }


        return next(error);

    }

};


// ==========================================================
// POST ADD STORAGE
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
        // CREATE
        // ==================================================

        await addService.createStorage({

            dairyId,

            name,

            type

        });


        // ==================================================
        // RETURN TO PARENT FARM STORAGE
        // ==================================================

        return res.redirect(
            `/storage/${dairyId}`
        );

    } catch (error) {

        console.error(
            "CREATE STORAGE ERROR:",
            error
        );


        if (
            error.status
        ) {

            return res
                .status(error.status)
                .send(
                    error.message
                );

        }


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