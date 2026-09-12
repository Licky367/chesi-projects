// ==========================================================
// verrah/controllers/indexController/hero.js
// HOME PAGE CONTROLLER
// ==========================================================

const indexService =
    require("../../services/indexService");

const Substation =
    require("../../models/substations");


// ==========================================================
// GET HOME PAGE
// ==========================================================
//
// GET /
//
// STAFF REDIRECT:
//
// If the logged-in user is:
//
//     role === "staff"
//     AND
//     assignedSubstation exists
//
// then:
//
//     /
//
// is ALWAYS redirected to:
//
//     /branch/:assignedSubstation
//
// Example:
//
//     assignedSubstation = 66f123abc456...
//
//     /  →  /branch/66f123abc456...
//
// Other users continue to receive the normal home page.
//
// ==========================================================

exports.getHome = async function (req, res) {

    try {

        // ------------------------------------------------------
        // CURRENT USER
        // ------------------------------------------------------

        const currentUser =
            req.session?.user || null;


        // ------------------------------------------------------
        // STAFF ASSIGNED TO A SUBSTATION
        // ------------------------------------------------------
        //
        // Do this BEFORE loading home-page data.
        //
        // assignedSubstation is expected to contain the
        // MongoDB _id of the assigned substation.
        //
        // ------------------------------------------------------

        if (
            currentUser &&
            currentUser.role === "staff" &&
            currentUser.assignedSubstation
        ) {

            return res.redirect(
                `/branch/${currentUser.assignedSubstation}`
            );

        }


        // ------------------------------------------------------
        // GET ACTIVE SERVICES
        // ------------------------------------------------------

        const services =
            await indexService
                .getActiveServices();


        // ------------------------------------------------------
        // GET ACTIVE CATEGORIES
        // ------------------------------------------------------

        const categories =
            await indexService
                .getActiveCategories();


        // ------------------------------------------------------
        // GET ACTIVE SUBSTATIONS
        // ------------------------------------------------------

        const substations =
            await indexService
                .getActiveSubstations();


        // ------------------------------------------------------
        // NO ASSIGNED SUBSTATION
        // ------------------------------------------------------
        //
        // For non-staff users, or staff without an assigned
        // substation, no assigned substation document is needed.
        //
        // ------------------------------------------------------

        let substation = null;


        // ------------------------------------------------------
        // RENDER HOME PAGE
        // ------------------------------------------------------

        return res.render(
            "index",
            {

                title:
                    "Verrah Cosmetics",

                services,

                categories,

                substations,

                currentUser,

                substation,

                error:
                    null

            }
        );

    } catch (error) {

        console.error(
            "GET HOME ERROR:",
            error
        );


        // ------------------------------------------------------
        // SAFE FALLBACK
        // ------------------------------------------------------

        return res
            .status(500)
            .render(
                "index",
                {

                    title:
                        "Verrah Cosmetics",

                    services: [],

                    categories: [],

                    substations: [],

                    currentUser:
                        req.session?.user || null,

                    substation:
                        null,

                    error:
                        "Unable to load home page."

                }
            );

    }

};