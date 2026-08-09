// ==========================================================
// controllers/networthController.js
// ==========================================================

const networthService =
    require("../services/networthService");


// ==========================================================
// HELPERS
// ==========================================================

/**
 * Determine whether the request expects a JSON response.
 *
 * The frontend should send:
 *
 *     Accept: application/json
 *
 * when using fetch().
 *
 * Normal browser form submissions can continue to
 * receive redirects.
 */
function wantsJSON(req) {

    return (
        req.xhr === true ||
        (
            typeof req.headers.accept === "string" &&
            req.headers.accept.includes("application/json")
        )
    );

}


/**
 * Render the standard application error page.
 */
function renderError(
    res,
    error,
    fallbackMessage
) {

    const statusCode =
        error.statusCode || 500;


    return res
        .status(statusCode)
        .render(
            "error",
            {
                message:
                    error.message ||
                    fallbackMessage,

                statusCode

            }
        );

}


/**
 * Return a JSON error response.
 */
function jsonError(
    res,
    error,
    fallbackMessage
) {

    const statusCode =
        error.statusCode || 500;


    return res
        .status(statusCode)
        .json({

            success: false,

            message:
                error.message ||
                fallbackMessage

        });

}


// ==========================================================
// GET /networth
// ==========================================================

/**
 * Main Net Worth page.
 *
 * Provides:
 *
 *     totalNetWorth
 *     standaloneAssets
 *     structures
 *
 * The service reads directly from MongoDB.
 *
 * Therefore every normal page load receives the
 * latest database state.
 */
async function getNetWorth(
    req,
    res
) {

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


        if (
            wantsJSON(req)
        ) {

            return jsonError(
                res,
                error,
                "Unable to load Net Worth."
            );

        }


        return renderError(
            res,
            error,
            "Unable to load Net Worth."
        );

    }

}


// ==========================================================
// GET /networth/structure/:id
// ==========================================================

/**
 * Displays a Dairy Farm and all assets belonging
 * to that farm.
 *
 * The service:
 *
 *     1. Finds the Dairy Farm.
 *     2. Reads its negative code.
 *     3. Finds all records whose assetCode matches
 *        that farm code.
 *     4. Calculates the farm's current asset value.
 *
 * Every request therefore reads fresh data from MongoDB.
 */
async function getDairyFarm(
    req,
    res
) {

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


        if (
            wantsJSON(req)
        ) {

            return jsonError(
                res,
                error,
                "Unable to load Dairy Farm."
            );

        }


        return renderError(
            res,
            error,
            "Unable to load Dairy Farm."
        );

    }

}


// ==========================================================
// GET /networth/structure/:id/add
// ==========================================================

/**
 * Displays the Add Asset page.
 *
 * This remains separate from editing an existing
 * asset.
 */
async function getAddAsset(
    req,
    res
) {

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


        if (
            wantsJSON(req)
        ) {

            return jsonError(
                res,
                error,
                "Unable to load Add Asset page."
            );

        }


        return renderError(
            res,
            error,
            "Unable to load Add Asset page."
        );

    }

}


// ==========================================================
// POST /networth/structure/:id/add
// ==========================================================

/**
 * Creates a NEW manual Net Worth asset.
 *
 * This endpoint is intentionally different from:
 *
 *     updateAsset()
 *
 * because this endpoint really is creating something
 * from scratch.
 *
 * The service is responsible for:
 *
 *     code = null
 *
 *     assetCode = parent Dairy Farm code
 *
 * and all other creation rules.
 */
async function addAsset(
    req,
    res
) {

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
         * ======================================================
         * AJAX / FETCH
         * ======================================================
         *
         * Return the newly-created asset plus refreshed
         * Net Worth information.
         *
         * This allows the frontend to update immediately.
         */

        if (
            wantsJSON(req)
        ) {

            const netWorth =
                await networthService.getNetWorth();


            return res.json({

                success: true,

                message:
                    "Asset created successfully.",

                asset,

                netWorth

            });

        }


        /*
         * ======================================================
         * NORMAL BROWSER REQUEST
         * ======================================================
         */

        return res.redirect(
            `/networth/structure/${id}`
        );

    } catch (error) {

        console.error(
            "Error adding Net Worth asset:",
            error
        );


        if (
            wantsJSON(req)
        ) {

            return jsonError(
                res,
                error,
                "Unable to add asset."
            );

        }


        return renderError(
            res,
            error,
            "Unable to add asset."
        );

    }

}


// ==========================================================
// GET /networth/asset/:id
// ==========================================================

/**
 * Displays an existing asset's details/edit page.
 *
 * IMPORTANT:
 *
 * This is an EDIT operation.
 *
 * It must never behave like addAsset().
 *
 * Existing database values are supplied by the service
 * and displayed by networth-asset.ejs.
 *
 * No "required field" validation should be imposed merely
 * because an existing optional database field is empty.
 */
async function getAsset(
    req,
    res
) {

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


        if (
            wantsJSON(req)
        ) {

            return jsonError(
                res,
                error,
                "Unable to load asset."
            );

        }


        return renderError(
            res,
            error,
            "Unable to load asset."
        );

    }

}


// ==========================================================
// POST /networth/asset/:id
// ==========================================================

/**
 * Updates an EXISTING asset.
 *
 * This endpoint must NOT recreate the asset.
 *
 * The service updates only the fields that are actually
 * editable.
 *
 * Existing database identity is preserved:
 *
 *     _id
 *     code
 *
 * The service also handles:
 *
 *     assetCode
 *
 *     dateOfBirth
 *
 *     profileImage
 *
 *     financial fields
 *
 *     descriptive fields
 *
 *     status
 *
 *     valuation date
 *
 *
 * IMPORTANT:
 *
 * The controller does NOT perform creation validation.
 *
 * It simply passes the submitted changes to the service.
 */
async function updateAsset(
    req,
    res
) {

    try {

        const {
            id
        } = req.params;


        /*
         * ======================================================
         * UPDATE EXISTING RECORD
         * ======================================================
         */

        const updatedAsset =
            await networthService.updateAsset(
                id,
                req.body
            );


        /*
         * ======================================================
         * REFRESH NET WORTH DATA
         * ======================================================
         *
         * This is deliberately calculated AFTER the update.
         *
         * Therefore:
         *
         *     currentWorth changes
         *
         *     status changes
         *
         *     asset location changes
         *
         * are immediately reflected in the returned data.
         */

        const netWorth =
            await networthService.getNetWorth();


        /*
         * ======================================================
         * AJAX / FETCH RESPONSE
         * ======================================================
         *
         * networth-asset.js can use this response to:
         *
         *     - show "Saved"
         *     - update displayed values
         *     - refresh Net Worth totals
         *     - navigate/reload if necessary
         */

        if (
            wantsJSON(req)
        ) {

            return res.json({

                success: true,

                message:
                    "Asset updated successfully.",

                asset:
                    updatedAsset,

                netWorth

            });

        }


        /*
         * ======================================================
         * NORMAL BROWSER SUBMISSION
         * ======================================================
         *
         * Redirect back to the same asset page.
         *
         * The GET request will read the updated record
         * directly from MongoDB.
         */

        return res.redirect(
            `/networth/asset/${id}`
        );

    } catch (error) {

        console.error(
            "Error updating Net Worth asset:",
            error
        );


        /*
         * ======================================================
         * AJAX ERROR
         * ======================================================
         */

        if (
            wantsJSON(req)
        ) {

            return jsonError(
                res,
                error,
                "Unable to update asset."
            );

        }


        /*
         * ======================================================
         * NORMAL BROWSER ERROR
         * ======================================================
         */

        return renderError(
            res,
            error,
            "Unable to update asset."
        );

    }

}


// ==========================================================
// OPTIONAL JSON REFRESH ENDPOINT
// ==========================================================

/**
 * GET /networth/data
 *
 * This endpoint is useful for frontend automatic refresh.
 *
 * It returns the current Net Worth data without rendering
 * an EJS page.
 *
 * A frontend script can periodically call this endpoint,
 * or we can later replace polling with Socket.IO.
 */
async function getNetWorthData(
    req,
    res
) {

    try {

        const data =
            await networthService.getNetWorth();


        return res.json({

            success: true,

            ...data

        });

    } catch (error) {

        console.error(
            "Error loading Net Worth data:",
            error
        );


        return jsonError(
            res,
            error,
            "Unable to load Net Worth data."
        );

    }

}


// ==========================================================
// OPTIONAL JSON STRUCTURE REFRESH ENDPOINT
// ==========================================================

/**
 * GET /networth/structure/:id/data
 *
 * Returns the current Dairy Farm and its assets
 * without rendering the EJS page.
 *
 * This will allow networth-structures.js to refresh
 * the page after an asset is changed elsewhere.
 */
async function getDairyFarmData(
    req,
    res
) {

    try {

        const {
            id
        } = req.params;


        const data =
            await networthService.getDairyFarm(
                id
            );


        return res.json({

            success: true,

            ...data

        });

    } catch (error) {

        console.error(
            "Error loading Dairy Farm data:",
            error
        );


        return jsonError(
            res,
            error,
            "Unable to load Dairy Farm data."
        );

    }

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getNetWorth,

    getDairyFarm,

    getAddAsset,

    addAsset,

    getAsset,

    updateAsset,

    getNetWorthData,

    getDairyFarmData

};