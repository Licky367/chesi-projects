const networthService =
    require("../services/networthService");


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
 *
 * Standalone assets:
 *
 *     code > 0
 *     assetCode === null
 *
 * Dairy Farms:
 *
 *     code < 0
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


        return res
            .status(statusCode)
            .render(
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
 * Displays a Dairy Farm and all assets
 * belonging to that farm.
 *
 * The service determines the farm using
 * its negative dairy.code and retrieves
 * assets whose assetCode matches that code.
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


        return res
            .status(statusCode)
            .render(
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
 *
 * The selected Dairy Farm must have:
 *
 *     code < 0
 *
 * The service provides the farm record to
 * the EJS template.
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


        return res
            .status(statusCode)
            .render(
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
 * Creates a manual asset belonging to a
 * Dairy Farm.
 *
 * The service creates the asset with:
 *
 *     code: null
 *
 *     assetCode:
 *         parent Dairy Farm's negative code
 *
 * The controller does not generate or modify
 * either code.
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


        return res
            .status(statusCode)
            .render(
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
 *
 * The service determines whether the selected
 * record is a valid asset and also provides
 * the available Dairy Farms for assignment.
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


        return res
            .status(statusCode)
            .render(
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
 * Updates an existing asset.
 *
 * The service is responsible for enforcing
 * the asset ownership rules:
 *
 *     code > 0
 *         assetCode may be null
 *         or a valid negative Dairy Farm code
 *
 *     code === null
 *         manual asset
 *         assetCode may identify its parent farm
 *
 *     code < 0
 *         Dairy Farm
 *         assetCode must remain null
 *
 * The controller only passes the submitted
 * form data to the service.
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
            "Unable to load page.",

        statusCode
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