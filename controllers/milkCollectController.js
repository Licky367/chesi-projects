// ==========================================================
// controllers/milkCollectController.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Controller for:
//
//     /milk
//
// Handles:
//
//     GET  /milk
//     POST /milk
//
// ==========================================================


const milkCollectService =
    require("../services/milkCollectService");


// ==========================================================
// GET MILK COLLECTION PAGE
// ==========================================================
//
// GET /milk
//
// ==========================================================

exports.getMilkPage =
async function(
    req,
    res
) {

    try {

        // ==================================================
        // AUTHENTICATED USER
        // ==================================================

        const user =
            req.session &&
            req.session.user;


        if (!user) {

            return res.redirect(
                "/login"
            );

        }


        // ==================================================
        // GET PAGE DATA
        // ==================================================

        const data =
            await milkCollectService.getMilkPageData(
                user
            );


        // ==================================================
        // RENDER
        // ==================================================

        return res.render(
            "milk",
            {

                day:
                    data.day,

                month:
                    data.month,

                farms:
                    data.farms,

                isAdmin:
                    user.role === "admin",

                user

            }
        );

    }

    catch (error) {

        console.error(
            "GET /milk error:",
            error
        );


        return res.status(
            500
        ).render(
            "milk",
            {

                day:
                    milkCollectService.getNairobiDay(),

                month:
                    milkCollectService.getNairobiMonth(),

                farms: [],

                isAdmin:
                    req.session?.user?.role ===
                    "admin",

                user:
                    req.session?.user || null,

                error:
                    "Unable to load today's milk collection page."

            }
        );

    }

};


// ==========================================================
// POST MILK COLLECTION
// ==========================================================
//
// POST /milk
//
// ==========================================================

exports.saveMilk =
async function(
    req,
    res
) {

    try {

        // ==================================================
        // AUTHENTICATED USER
        // ==================================================

        const user =
            req.session &&
            req.session.user;


        if (!user) {

            return res.redirect(
                "/login"
            );

        }


        // ==================================================
        // VALID ROLE
        // ==================================================

        if (
            user.role !== "admin" &&
            user.role !== "dairyWorker"
        ) {

            return res.status(
                403
            ).send(
                "You are not authorized to record milk."
            );

        }


        // ==================================================
        // RECORDS
        // ==================================================

        const records =
            req.body?.records || {};


        // ==================================================
        // SAVE
        // ==================================================

        const result =
            await milkCollectService.saveMilk(
                user,
                records
            );


        // ==================================================
        // SUCCESS
        // ==================================================

        const message =
            user.role === "admin"

                ? "Milk records saved successfully."

                : "Today's milk records have been submitted successfully.";


        // ==================================================
        // REDIRECT
        // ==================================================
        //
        // Redirect instead of rendering directly.
        //
        // This prevents accidental duplicate POSTs when the
        // browser refreshes the page.
        //
        // ==================================================

        return res.redirect(
            `/milk?success=${encodeURIComponent(message)}`
        );

    }

    catch (error) {

        console.error(
            "POST /milk error:",
            error
        );


        // ==================================================
        // RELOAD PAGE
        // ==================================================

        try {

            const user =
                req.session?.user;


            if (!user) {

                return res.redirect(
                    "/login"
                );

            }


            const data =
                await milkCollectService.getMilkPageData(
                    user
                );


            return res.status(
                500
            ).render(
                "milk",
                {

                    day:
                        data.day,

                    month:
                        data.month,

                    farms:
                        data.farms,

                    isAdmin:
                        user.role === "admin",

                    user,

                    error:
                        error.message ||
                        "Unable to save today's milk records."

                }
            );

        }

        catch (
            renderError
        ) {

            console.error(
                "Milk error page failed:",
                renderError
            );


            return res.status(
                500
            ).send(
                "Unable to process today's milk records."
            );

        }

    }

};