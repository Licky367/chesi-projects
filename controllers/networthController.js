const networthService = require("../services/networthService");


/* ==========================================================
   NET WORTH
========================================================== */

/**
 * GET /networth
 *
 * Main Net Worth page.
 *
 * Provides:
 *   - totalNetWorth
 *   - standaloneAssets
 *   - structures
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

        return res.status(500).render(
            "error",
            {
                message: "Unable to load Net Worth."
            }
        );

    }

}


/* ==========================================================
   DAIRY FARM
========================================================== */

/**
 * GET /networth/structure/:id
 *
 * Displays one Dairy Farm and its assigned assets.
 */
async function getDairyFarm(req, res) {

    try {

        const {
            id
        } = req.params;


        const data =
            await networthService.getDairyFarm(id);


        return res.render(
            "networth-structures",
            data
        );

    } catch (error) {

        console.error(
            "Error loading Dairy Farm:",
            error
        );

        const status =
            error.statusCode || 500;


        return res.status(status).render(
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
   ADD ASSET FORM
========================================================== */

/**
 * GET /networth/structure/:id/add
 *
 * Displays the Add Asset form for a Dairy Farm.
 */
async function getAddAsset(req, res) {

    try {

        const {
            id
        } = req.params;


        const data =
            await networthService.getAddAsset(id);


        return res.render(
            "networth-add",
            data
        );

    } catch (error) {

        console.error(
            "Error loading Add Asset page:",
            error
        );

        const status =
            error.statusCode || 500;


        return res.status(status).render(
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
   ADD ASSET
========================================================== */

/**
 * POST /networth/structure/:id/add
 *
 * Creates an asset belonging to the selected Dairy Farm.
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

        const status =
            error.statusCode || 500;


        return res.status(status).render(
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
   ASSET DETAILS
========================================================== */

/**
 * GET /networth/asset/:id
 *
 * Displays an asset's details/edit page.
 */
async function getAsset(req, res) {

    try {

        const {
            id
        } = req.params;


        const data =
            await networthService.getAsset(id);


        return res.render(
            "networth-asset",
            data
        );

    } catch (error) {

        console.error(
            "Error loading Net Worth asset:",
            error
        );

        const status =
            error.statusCode || 500;


        return res.status(status).render(
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
   UPDATE ASSET
========================================================== */

/**
 * POST /networth/asset/:id
 *
 * Updates an existing Net Worth asset.
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

        const status =
            error.statusCode || 500;


        return res.status(status).render(
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