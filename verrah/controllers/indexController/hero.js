// ==========================================================
// verrah/controllers/indexController/hero.js
// HOME PAGE CONTROLLER
// ==========================================================

const indexService =
    require("../../services/indexService");


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

                currentUser:
                    req.session?.user || null,

                error: null

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

                    error:
                        "Unable to load home page."

                }
            );

    }

};