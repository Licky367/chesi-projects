// ==========================================================
// controllers/milkController.js
// ==========================================================

const milkService =
    require("../services/milkService");


// ==========================================================
// GET MILK COLLECTION PAGE
// ==========================================================

exports.getMilkPage =
async function(req, res) {

    try {

        const user =
            req.session.user;


        if (!user) {

            return res.redirect("/login");

        }


        const data =
            await milkService.getMilkCollectionPage(
                user
            );


        return res.render(
            "milk",
            {
                ...data,

                user,

                session:
                    data.session,

                success:
                    req.query.success === "1",

                error:
                    req.query.error || ""
            }
        );

    }

    catch (error) {

        console.error(
            "GET /milk error:",
            error
        );


        return res.status(500).render(
            "milk",
            {
                milkDairyTables: [],

                user:
                    req.session.user,

                session: "closed",

                success: false,

                error:
                    "Unable to load milk collection."
            }
        );

    }

};


// ==========================================================
// SAVE MILK RECORD
// ==========================================================

exports.submitMilk =
async function(req, res) {

    try {

        const user =
            req.session.user;


        if (!user) {

            return res.redirect("/login");

        }


        if (
            user.role !== "admin" &&
            user.role !== "dairyWorker"
        ) {

            return res.status(403).send(
                "You are not authorized to record milk."
            );

        }


        await milkService.saveMilkRecord(
            req.body,
            user
        );


        return res.redirect(
            "/milk?success=1"
        );

    }

    catch (error) {

        console.error(
            "POST /milk error:",
            error
        );


        return res.redirect(
            "/milk?error=" +
            encodeURIComponent(
                error.message ||
                "Unable to save milk record."
            )
        );

    }

};


// ==========================================================
// ADMIN EDIT MILK RECORD
// ==========================================================

exports.updateMilkRecord =
async function(req, res) {

    try {

        const user =
            req.session.user;


        if (!user) {

            return res.redirect("/login");

        }


        if (user.role !== "admin") {

            return res.status(403).send(
                "Only administrators can edit milk records."
            );

        }


        await milkService.updateMilkRecord(
            req.params.recordId,
            req.body,
            user
        );


        return res.redirect(
            "/milk?success=1"
        );

    }

    catch (error) {

        console.error(
            "POST /milk/:recordId error:",
            error
        );


        return res.redirect(
            "/milk?error=" +
            encodeURIComponent(
                error.message ||
                "Unable to update milk record."
            )
        );

    }

};