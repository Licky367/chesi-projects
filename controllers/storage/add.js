// ==========================================================
// controllers/storage/add.js
// STORAGE ADD CONTROLLER
// ==========================================================

const addService =
    require("../../services/storage/add");


// ==========================================================
// GET ADD STORAGE PAGE
// ==========================================================
//
// GET:
//
//     /storage/:id/add
//
// :id = parent Dairy Farm _id
//
// ONLY ADMIN
//
// ==========================================================

exports.page =
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
            !req.session ||
            !req.session.user
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
            req.session.user.role !== "admin"
        ) {

            return res
                .status(403)
                .send(
                    "Only administrators can add storage."
                );

        }


        // ==================================================
        // PARENT FARM ID
        // ==================================================

        const dairyId =
            req.params.id;


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

                nextRoomNumber:
                    data.nextRoomNumber,

                nextAgroStoreNumber:
                    data.nextAgroStoreNumber,

                user:
                    req.session.user

            }

        );

    } catch (error) {

        console.error(
            "STORAGE ADD PAGE ERROR:",
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
            !req.session ||
            !req.session.user
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
            req.session.user.role !== "admin"
        ) {

            return res
                .status(403)
                .send(
                    "Only administrators can add storage."
                );

        }


        // ==================================================
        // PARENT FARM ID
        // ==================================================

        const dairyId =
            req.params.id;


        // ==================================================
        // USER INPUT
        // ==================================================

        const name =
            req.body.name;

        const type =
            req.body.type;


        // ==================================================
        // CREATE
        // ==================================================

        await addService.addStorage(

            dairyId,

            name,

            type

        );


        // ==================================================
        // RETURN TO STORAGE PAGE
        // ==================================================

        return res.redirect(
            `/storage/${dairyId}`
        );

    } catch (error) {

        console.error(
            "CREATE STORAGE ERROR:",
            error
        );

        return next(error);

    }

};