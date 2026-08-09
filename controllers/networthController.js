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
 * This is the creation workflow.
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
 * Creation rules belong to:
 *
 *     networthService.addAsset()
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
                req.body,
                req.file
            );


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
 * The service returns:
 *
 *     dairy
 *     structures
 *     age
 *     ageText
 *     dairyBreeds
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
 * Updates an EXISTING Dairy / Asset record.
 *
 * IMPORTANT:
 *
 * This controller NEVER creates a new document.
 *
 * It only forwards editable fields to:
 *
 *     networthService.updateAsset()
 *
 * Protected identity fields such as:
 *
 *     _id
 *     code
 *
 * are never accepted from the form.
 *
 * ==========================================================
 *
 * IDENTIFIED DAIRY EDITABLE FIELDS
 * ==========================================================
 *
 *     name
 *     dateOfBirth
 *     type
 *     mass
 *     isMilking
 *     buyingPrice
 *     currentWorth
 *     description
 *     condition
 *     location
 *     assetCode
 *     status
 *     valuationDate
 *     profileImage
 *
 * ==========================================================
 *
 * READ-ONLY FIELDS
 * ==========================================================
 *
 *     code
 *     age
 *     acquisitionDate
 *
 */
async function updateAsset(
    req,
    res
) {

    try {

        const {
            id
        } = req.params;


        // ======================================================
        // UPDATE DATA
        // ======================================================

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
        // Kept for backwards compatibility with the service.
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
        // Not required.
        //
        // If omitted:
        //
        //     Existing value remains unchanged.
        //
        // If submitted empty:
        //
        //     Service decides whether to clear it.
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
        // MASS
        //
        // Applies to identified dairies.
        //
        // Example:
        //
        //     428.50
        //
        // The service remains responsible for final validation
        // and persistence.
        // ======================================================

        if (
            req.body.mass !== undefined
        ) {

            updateData.mass =
                req.body.mass;

        }


        // ======================================================
        // MILKING
        //
        // IMPORTANT:
        //
        // A checkbox behaves differently from normal inputs.
        //
        // Checked:
        //
        //     req.body.isMilking === "true"
        //
        // Unchecked:
        //
        //     req.body.isMilking === undefined
        //
        // Therefore, if the field exists in the form structure
        // for an identified female, we must be able to save
        // FALSE when it is unchecked.
        //
        // We do NOT blindly update this field for manual assets.
        //
        // The service should additionally validate that the
        // underlying dairy is eligible for this field.
        // ======================================================

        if (
            req.body.isMilking !== undefined
        ) {

            updateData.isMilking =
                req.body.isMilking === "true";

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
        //     Manual assets
        //     Identified dairies
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
        //
        // The current EJS does NOT submit this field.
        //
        // This compatibility block is retained in case another
        // client submits it.
        //
        // The service remains responsible for deciding whether
        // the field is actually allowed to change.
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
        // If the upload layer has already converted the uploaded
        // image into a URL/path and placed it into req.body,
        // forward it.
        //
        // Otherwise the service should receive the processed
        // image path rather than the raw multer file object.
        // ======================================================

        if (
            req.body.profileImage !== undefined
        ) {

            updateData.profileImage =
                req.body.profileImage;

        }


        // ======================================================
        // UPDATE DATABASE RECORD
        // ======================================================

        const updatedAsset =
            await networthService.updateAsset(
                id,
                updateData
            );


        // ======================================================
        // REFRESH NET WORTH
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
        // Redirect to GET so the page reloads using the actual
        // persisted MongoDB record.
        // ======================================================

        return res.redirect(
            `/networth/asset/${id}`
        );

    } catch (error) {

        console.error(
            "Error updating Net Worth asset:",
            error
        );


        if (
            wantsJSON(req)
        ) {

            return jsonError(
                res,
                error,
                "Unable to update asset."
            );

        }


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