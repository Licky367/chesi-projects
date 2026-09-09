// ==========================================================
// verrah/controllers/indexController/branches.js
// HOME PAGE BRANCH / SUBSTATION CONTROLLER
// ==========================================================

const indexService =
    require("../../services/indexService");


// ==========================================================
// GET ACTIVE SUBSTATIONS
// ==========================================================
//
// Loads substations for the home page.
//
// NOTE:
// The actual home page is rendered by:
//
//     controllers/indexController/hero.js
//
// Therefore this function is available to the index
// controller but does not independently render index.ejs.
//
// ==========================================================

exports.getSubstations = async function () {

    try {

        const substations =
            await indexService
                .getActiveSubstations();


        return substations;

    } catch (error) {

        console.error(
            "GET SUBSTATIONS ERROR:",
            error
        );

        throw error;

    }

};