// ==========================================================
// controllers/networthController.js
// ==========================================================

const networthService =
    require("../services/networthService");


// ==========================================================
// HELPERS
// ==========================================================

/**
 * Determine whether the request expects JSON.
 *
 * Used by fetch/AJAX requests.
 */
function wantsJSON(req) {

    return (

        req.xhr === true ||

        (
            typeof req.headers.accept === "string" &&

            req.headers.accept.includes(
                "application/json"
            )
        )

    );

}


// ==========================================================
// ERROR RESPONSE HELPERS
// ==========================================================

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
        .json(
            {

                success: false,

                message:
                    error.message ||
                    fallbackMessage

            }
        );

}


// ==========================================================
// GET /networth
// ==========================================================

/**
 * Main Net Worth page.
 *
 * Service provides:
 *
 *     totalNetWorth
 *     standaloneAssets
 *     structures
 *
 * The service reads the current state directly
 * from MongoDB.
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
 * Displays a Dairy Farm and all assets assigned
 * to that farm.
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
 * Creates a NEW manual asset.
 *
 * The service is responsible for enforcing the
 * Dairy model's creation rules.
 *
 * For manual assets:
 *
 *     code      = null
 *     assetCode = parent Dairy Farm code
 */
async function addAsset(
    req,
    res
) {

    try {

        const {
            id
        } = req.params;


        /*
         * ------------------------------------------------------
         * CREATE ASSET
         * ------------------------------------------------------
         */

        const asset =
            await networthService.addAsset(
                id,
                req.body,
                req.file
            );


        /*
         * ------------------------------------------------------
         * JSON / FETCH
         * ------------------------------------------------------
         */

        if (
            wantsJSON(req)
        ) {

            const netWorth =
                await networthService.getNetWorth();


            return res.json(
                {

                    success: true,

                    message:
                        "Asset created successfully.",

                    asset,

                    netWorth

                }
            );

        }


        /*
         * ------------------------------------------------------
         * NORMAL BROWSER REQUEST
         * ------------------------------------------------------
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
 * Displays an existing Dairy record for editing.
 *
 * IMPORTANT:
 *
 * This method does NOT create anything.
 *
 * The service must return:
 *
 *     dairy
 *     structures
 *
 * for networth-asset.ejs.
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
 * Updates an EXISTING Dairy record.
 *
 * This is the most important edit-page controller.
 *
 * It deliberately does NOT construct a new Dairy document.
 *
 * It passes the submitted editable values to the service.
 *
 *
 * Editable fields from networth-asset.ejs:
 *
 *     profileImage
 *     name
 *     dateOfBirth
 *     type
 *     buyingPrice
 *     currentWorth
 *     description
 *     condition
 *     location
 *     assetCode
 *     status
 *     valuationDate
 *
 *
 * Fields deliberately NOT accepted from the edit form:
 *
 *     _id
 *     code
 *     acquisitionDate
 *     needsMaintenance
 *     maintenance
 *     medicalAttention
 *
 * The service/model remains responsible for enforcing
 * all Dairy business rules.
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
         * BUILD EDIT DATA
         * ======================================================
         *
         * Do NOT simply pass req.body directly.
         *
         * Explicitly selecting editable fields prevents
         * a client from modifying protected fields such as:
         *
         *     code
         *     acquisitionDate
         *     maintenance
         *     medicalAttention
         *
         * This is especially important because the model
         * contains several business rules based on `code`.
         */

        const updateData = {

            name:
                req.body.name,

            dateOfBirth:
                req.body.dateOfBirth,

            type:
                req.body.type,

            buyingPrice:
                req.body.buyingPrice,

            currentWorth:
                req.body.currentWorth,

            description:
                req.body.description,

            condition:
                req.body.condition,

            location:
                req.body.location,

            assetCode:
                req.body.assetCode,

            status:
                req.body.status,

            valuationDate:
                req.body.valuationDate

        };


        /*
         * ======================================================
         * PROFILE IMAGE
         * ======================================================
         *
         * Multer should place the uploaded file in:
         *
         *     req.file
         *
         * The service decides how the image is stored and
         * what value is written into Dairy.profileImage.
         */

        if (
            req.file
        ) {

            updateData.profileImage =
                req.file;

        }


        /*
         * ======================================================
         * UPDATE EXISTING RECORD
         * ======================================================
         */

        const updatedAsset =
            await networthService.updateAsset(
                id,
                updateData
            );


        /*
         * ======================================================
         * REFRESH NET WORTH
         * ======================================================
         *
         * Recalculate AFTER the update.
         */

        const netWorth =
            await networthService.getNetWorth();


        /*
         * ======================================================
         * JSON / FETCH RESPONSE
         * ======================================================
         */

        if (
            wantsJSON(req)
        ) {

            return res.json(
                {

                    success: true,

                    message:
                        "Asset updated successfully.",

                    asset:
                        updatedAsset,

                    netWorth

                }
            );

        }


        /*
         * ======================================================
         * NORMAL FORM SUBMISSION
         * ======================================================
         *
         * The GET page will load the fresh record again
         * from MongoDB.
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
         * JSON / FETCH ERROR
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
         * NORMAL FORM ERROR
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
// GET /networth/data
// ==========================================================

/**
 * Returns current Net Worth data as JSON.
 */
async function getNetWorthData(
    req,
    res
) {

    try {

        const data =
            await networthService.getNetWorth();


        return res.json(
            {

                success: true,

                ...data

            }
        );

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
// GET /networth/structure/:id/data
// ==========================================================

/**
 * Returns the current Dairy Farm and its assets
 * as JSON.
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


        return res.json(
            {

                success: true,

                ...data

            }
        );

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