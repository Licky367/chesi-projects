const networthService = require("../services/networthService");


/* ==========================================================
   GET /networth
========================================================== */

/**
 * Main Net Worth page.
 *
 * Provides:
 *
 *     totalNetWorth
 *     standaloneAssets
 *     structures
 */
async function getNetWorth(req, res) {

    try {

        const data =
            await networthService.getNetWorth();


        return res.render(
            "networth",
            data
        );

    } catch (error) {

        console.error(
            "Error loading Net Worth:",
            error
        );


        const statusCode =
            error.statusCode || 500;


        return res.status(statusCode).render(
            "error",
            {
                message:
                    error.message ||
                    "Unable to load Net Worth."
            }
        );

    }

}


/* ==========================================================
   GET /networth/structure/:id
========================================================== */

/**
 * Displays a Dairy Farm and all assets assigned to it.
 */
async function getDairyFarm(req, res) {

    try {

        const {
            id
        } = req.params;


        const data =
            await networthService.getDairyFarm(
                id
            );


        return res.render(
            "networth-structures",
            data
        );

    } catch (error) {

        console.error(
            "Error loading Dairy Farm:",
            error
        );


        const statusCode =
            error.statusCode || 500;


        return res.status(statusCode).render(
            "error",
            {
                message:
                    error.message ||
                    "Unable to load Dairy Farm."
            }
        );

    }

}


/* ==========================================================
   GET /networth/structure/:id/add
========================================================== */

/**
 * Displays the Add Asset form for a Dairy Farm.
 */
async function getAddAsset(req, res) {

    try {

        const {
            id
        } = req.params;


        const data =
            await networthService.getAddAsset(
                id
            );


        return res.render(
            "networth-add",
            data
        );

    } catch (error) {

        console.error(
            "Error loading Add Asset page:",
            error
        );


        const statusCode =
            error.statusCode || 500;


        return res.status(statusCode).render(
            "error",
            {
                message:
                    error.message ||
                    "Unable to load Add Asset page."
            }
        );

    }

}


/* ==========================================================
   POST /networth/structure/:id/add
========================================================== */

/**
 * Creates a new asset belonging to the selected
 * Dairy Farm.
 */
async function addAsset(req, res) {

    try {

        const {
            id
        } = req.params;


        await networthService.addAsset(
            id,
            req.body
        );


        return res.redirect(
            `/networth/structure/${id}`
        );

    } catch (error) {

        console.error(
            "Error adding Net Worth asset:",
            error
        );


        const statusCode =
            error.statusCode || 500;


        return res.status(statusCode).render(
            "error",
            {
                message:
                    error.message ||
                    "Unable to add asset."
            }
        );

    }

}


/* ==========================================================
   GET /networth/asset/:id
========================================================== */

/**
 * Displays an asset's details/edit page.
 */
async function getAsset(req, res) {

    try {

        const {
            id
        } = req.params;


        const data =
            await networthService.getAsset(
                id
            );


        return res.render(
            "networth-asset",
            data
        );

    } catch (error) {

        console.error(
            "Error loading Net Worth asset:",
            error
        );


        const statusCode =
            error.statusCode || 500;


        return res.status(statusCode).render(
            "error",
            {
                message:
                    error.message ||
                    "Unable to load asset."
            }
        );

    }

}


/* ==========================================================
   POST /networth/asset/:id
========================================================== */

/**
 * Updates an existing Dairy asset.
 *
 * The EJS form submits POST and includes:
 *
 *     _method=PUT
 *
 * This controller intentionally accepts the POST route
 * defined in routes/networth.js.
 */
async function updateAsset(req, res) {

    try {

        const {
            id
        } = req.params;


        await networthService.updateAsset(
            id,
            req.body
        );


        return res.redirect(
            `/networth/asset/${id}`
        );

    } catch (error) {

        console.error(
            "Error updating Net Worth asset:",
            error
        );


        const statusCode =
            error.statusCode || 500;


        return res.status(statusCode).render(
            "error",
            {
                message:
                    error.message ||
                    "Unable to update asset."
            }
        );

    }

}


/* ==========================================================
   EXPORTS
========================================================== */

module.exports = {

    getNetWorth,

    getDairyFarm,

    getAddAsset,

    addAsset,

    getAsset,

    updateAsset

};