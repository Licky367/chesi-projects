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
 *
 * The frontend should send:
 *
 *     Accept: application/json
 *
 * when using fetch().
 *
 * Normal browser form submissions continue to receive
 * redirects.
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
 * Data is read directly from MongoDB.
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
 *
 * This is the ONLY controller here that opens the
 * creation workflow.
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
 * IMPORTANT:
 *
 * This is a creation operation.
 *
 * Creation rules belong to:
 *
 *     networthService.addAsset()
 *
 * and are intentionally separate from updateAsset().
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
         *
         * The service owns all creation rules.
         */

        const asset =
            await networthService.addAsset(
                id,
                req.body,
                req.file
            );


        /*
         * ------------------------------------------------------
         * JSON / FETCH RESPONSE
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
         * NORMAL BROWSER RESPONSE
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
 * Displays an EXISTING Dairy record.
 *
 * ==========================================================
 * IMPORTANT
 * ==========================================================
 *
 * This is an EDIT page.
 *
 * It does NOT create anything.
 *
 * It does NOT validate creation requirements.
 *
 * It does NOT require dateOfBirth.
 *
 * It simply asks the service for the existing database
 * record and renders it.
 *
 * The service returns:
 *
 *     dairy
 *     structures
 *     age
 *     ageText
 *     dairyBreeds
 *
 * Therefore networth-asset.ejs can display the actual
 * database values.
 */
async function getAsset(
    req,
    res
) {

    try {

        const {
            id
        } = req.params;


        /*
         * ------------------------------------------------------
         * READ EXISTING DATABASE RECORD
         * ------------------------------------------------------
         */

        const data =
            await networthService.getAsset(
                id
            );


        /*
         * ------------------------------------------------------
         * RENDER EDIT PAGE
         * ------------------------------------------------------
         */

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
 * ==========================================================
 * IMPORTANT EDIT RULE
 * ==========================================================
 *
 * This controller NEVER creates a new Dairy document.
 *
 * It sends changes to:
 *
 *     networthService.updateAsset()
 *
 * The service performs a PATCH-style update:
 *
 *     undefined
 *         -> leave existing DB value unchanged
 *
 *     supplied value
 *         -> update that field
 *
 *     empty value
 *         -> service decides whether it means clear
 *            or preserve, according to the field
 *
 *
 * The controller does NOT impose creation validation.
 *
 * In particular:
 *
 *     dateOfBirth is NOT required here.
 *
 * An existing record with no dateOfBirth can therefore
 * still be opened and edited.
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
         * UPDATE DATA
         * ======================================================
         *
         * Only fields supported by the service are forwarded.
         *
         * Protected identity fields such as:
         *
         *     _id
         *     code
         *
         * are deliberately excluded.
         *
         * The service itself protects `code`.
         */


        const updateData = {};


        // ======================================================
        // NAME
        // ======================================================

        if (
            req.body.name !== undefined
        ) {

            updateData.name =
                req.body.name;

        }


        // ======================================================
        // ITEM
        //
        // Service supports item as an alternative name
        // for backwards compatibility.
        // ======================================================

        if (
            req.body.item !== undefined
        ) {

            updateData.item =
                req.body.item;

        }


        // ======================================================
        // DATE OF BIRTH
        //
        // NOT REQUIRED.
        //
        // If omitted:
        //
        //     existing DB value remains untouched.
        //
        // If submitted empty:
        //
        //     service interprets it as an explicit clear.
        // ======================================================

        if (
            req.body.dateOfBirth !== undefined
        ) {

            updateData.dateOfBirth =
                req.body.dateOfBirth;

        }


        // ======================================================
        // TYPE / BREED
        // ======================================================

        if (
            req.body.type !== undefined
        ) {

            updateData.type =
                req.body.type;

        }


        // ======================================================
        // BUYING PRICE
        // ======================================================

        if (
            req.body.buyingPrice !== undefined
        ) {

            updateData.buyingPrice =
                req.body.buyingPrice;

        }


        // ======================================================
        // CURRENT WORTH
        // ======================================================

        if (
            req.body.currentWorth !== undefined
        ) {

            updateData.currentWorth =
                req.body.currentWorth;

        }


        // ======================================================
        // DESCRIPTION
        // ======================================================

        if (
            req.body.description !== undefined
        ) {

            updateData.description =
                req.body.description;

        }


        // ======================================================
        // CONDITION
        // ======================================================

        if (
            req.body.condition !== undefined
        ) {

            updateData.condition =
                req.body.condition;

        }


        // ======================================================
        // LOCATION
        // ======================================================

        if (
            req.body.location !== undefined
        ) {

            updateData.location =
                req.body.location;

        }


        // ======================================================
        // ASSET CODE
        // ======================================================
        //
        // Used for:
        //
        //     manual assets
        //
        //     identified dairies
        //
        // The service validates the selected Dairy Farm.
        // ======================================================

        if (
            req.body.assetCode !== undefined
        ) {

            updateData.assetCode =
                req.body.assetCode;

        }


        // ======================================================
        // STATUS
        // ======================================================

        if (
            req.body.status !== undefined
        ) {

            updateData.status =
                req.body.status;

        }


        // ======================================================
        // VALUATION DATE
        // ======================================================

        if (
            req.body.valuationDate !== undefined
        ) {

            updateData.valuationDate =
                req.body.valuationDate;

        }


        // ======================================================
        // ACQUISITION DATE
        // ======================================================
        //
        // The service supports this field.
        //
        // It is NOT required.
        //
        // If the edit form does not submit it, the database
        // value remains unchanged.
        // ======================================================

        if (
            req.body.acquisitionDate !== undefined
        ) {

            updateData.acquisitionDate =
                req.body.acquisitionDate;

        }


        // ======================================================
        // PROFILE IMAGE
        // ======================================================
        //
        // IMPORTANT:
        //
        // The current service expects:
        //
        //     body.profileImage
        //
        // to be a string.
        //
        // Therefore we must NOT pass:
        //
        //     req.file
        //
        // directly into updateAsset().
        //
        // If your image upload middleware already converts
        // the uploaded file to a URL/path, pass that string
        // here.
        //
        // If req.body.profileImage already contains the
        // image path/URL, use it.
        // ======================================================

        if (
            req.body.profileImage !== undefined
        ) {

            updateData.profileImage =
                req.body.profileImage;

        }


        /*
         * ======================================================
         * IMPORTANT IMAGE NOTE
         * ======================================================
         *
         * If multer provides req.file and there is no
         * image-processing/upload middleware converting it
         * to a string URL/path, do NOT send req.file to the
         * current service.
         *
         * The current service contains:
         *
         *     String(body.profileImage).trim()
         *
         * so passing a file object would be incorrect.
         *
         * Image storage should be handled by the upload layer,
         * after which the resulting path/URL should be placed
         * in updateData.profileImage.
         */


        // ======================================================
        // UPDATE EXISTING DATABASE RECORD
        // ======================================================

        const updatedAsset =
            await networthService.updateAsset(
                id,
                updateData
            );


        // ======================================================
        // REFRESH NET WORTH
        // ======================================================
        //
        // This happens AFTER the database update.
        // ======================================================

        const netWorth =
            await networthService.getNetWorth();


        // ======================================================
        // JSON / FETCH RESPONSE
        // ======================================================

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


        // ======================================================
        // NORMAL FORM SUBMISSION
        // ======================================================
        //
        // Redirect to GET.
        //
        // GET then reads the actual persisted record
        // from MongoDB.
        // ======================================================

        return res.redirect(
            `/networth/asset/${id}`
        );

    } catch (error) {

        console.error(
            "Error updating Net Worth asset:",
            error
        );


        // ======================================================
        // JSON / FETCH ERROR
        // ======================================================

        if (
            wantsJSON(req)
        ) {

            return jsonError(
                res,
                error,
                "Unable to update asset."
            );

        }


        // ======================================================
        // NORMAL BROWSER ERROR
        // ======================================================

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