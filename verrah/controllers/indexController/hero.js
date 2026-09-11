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
// Loads all data required by:
//
//     views/index.ejs
//
// Data:
//     - services
//     - categories
//     - substations
//     - currentUser
//     - substation (assigned substation for staff)
//
// ==========================================================

exports.getHome = async function (req, res) {

    try {

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
        // CURRENT USER
        // ------------------------------------------------------

        const currentUser =
            req.session?.user || null;


        // ------------------------------------------------------
        // GET ASSIGNED SUBSTATION
        // ------------------------------------------------------
        //
        // Only staff users with an assignedSubstation need
        // the actual Substation document.
        //
        // assignedSubstation may contain the Substation ID.
        //
        // ------------------------------------------------------

        let substation = null;

        if (
            currentUser &&
            currentUser.role === "staff" &&
            currentUser.assignedSubstation
        ) {

            substation =
                await Substation.findById(
                    currentUser.assignedSubstation
                );

        }


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

                // Assigned Substation document
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