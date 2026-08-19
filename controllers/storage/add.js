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

        if (
            !requireAdmin(
                req,
                res
            )
        ) {

            return;

        }


        const dairyId =
            String(
                req.params.id || ""
            ).trim();


        const data =
            await addService
                .getAddPageData(
                    dairyId
                );


        return res.render(
            "storage/add",
            {

                title:
                    "Add Storage",

                dairy:
                    data.dairy,

                user:
                    req.session.user

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
// User supplies:
//
//     name
//     type
//
// Server determines:
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

        if (
            !requireAdmin(
                req,
                res
            )
        ) {

            return;

        }


        const dairyId =
            String(
                req.params.id || ""
            ).trim();


        const name =
            String(
                req.body.name || ""
            ).trim();


        const type =
            String(
                req.body.type || ""
            ).trim();


        await addService.createStorage({

            dairyId,

            name,

            type

        });


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
// EXPORT
// ==========================================================