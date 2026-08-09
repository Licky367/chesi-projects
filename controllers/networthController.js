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
 * Creates a manual Net Worth asset.
 *
 * IMPORTANT:
 *
 * The manual asset remains:
 *
 *     code = null
 *
 *     assetCode =
 *         parent Dairy Farm's negative code
 *
 * assetCode is NOT changed by the controller.
 *
 * The service is responsible for creating
 * the correct manual asset.
 *
 *
 * After creation:
 *
 *     The service returns the newly created
 *     asset.
 *
 *     The controller redirects to the parent
 *     Dairy Farm page.
 *
 * The page can then use the normal automatic
 * update mechanism on the client side.
 */
async function addAsset(req, res) {

    try {

        const {
            id
        } = req.params;


        const asset =
            await networthService.addAsset(
                id,
                req.body
            );


        /*
         * Normal browser request.
         *
         * Redirect back to the Dairy Farm
         * after the asset has been successfully
         * created.
         */

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
 * record is a valid asset.
 *
 * It also supplies the available Dairy Farms
 * so the asset's location can be displayed/changed.
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
 * Updates an existing Net Worth asset.
 *
 * The controller does NOT manipulate:
 *
 *     code
 *     assetCode
 *
 * Those rules belong to networthService.
 *
 *
 * The service handles:
 *
 *     identified dairy:
 *         code > 0
 *
 *     manual asset:
 *         code === null
 *
 *     Dairy Farm:
 *         code < 0
 *
 *
 * For a manual asset:
 *
 *     code remains null
 *
 *     assetCode remains the negative code
 *     of its parent Dairy Farm.
 *
 *
 * The important point here is that once the
 * service successfully saves the change,
 * the response tells the client that the
 * update has completed.
 */
async function updateAsset(req, res) {

    try {

        const {
            id
        } = req.params;


        const updatedAsset =
            await networthService.updateAsset(
                id,
                req.body
            );


        /*
         * Successful update.
         *
         * For a normal browser form submission,
         * return to the asset page.
         *
         * The client-side automatic update logic
         * can also use the returned updated record
         * when this endpoint is called through fetch.
         */

        if (
            req.headers.accept &&
            req.headers.accept.includes(
                "application/json"
            )
        ) {

            return res.json({

                success: true,

                message:
                    "Asset updated successfully.",

                asset:
                    updatedAsset

            });

        }


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


        /*
         * If the request came through fetch/AJAX,
         * return JSON so the page can update
         * immediately without navigating away.
         */

        if (
            req.headers.accept &&
            req.headers.accept.includes(
                "application/json"
            )
        ) {

            return res
                .status(statusCode)
                .json({

                    success: false,

                    message:
                        error.message ||
                        "Unable to update asset."

                });

        }


        return res
            .status(statusCode)
            .render(
                "error",
                {
                    message:
                        error.message ||
                        "Unable to update asset.",

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