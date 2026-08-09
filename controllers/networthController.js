// ==========================================================
// controllers/networthController.js
// ==========================================================

const networthService =
    require("../services/networthService");


// ==========================================================
// HELPERS
// ==========================================================

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
// ERROR RESPONSE
// ==========================================================

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

async function getDairyFarm(
    req,
    res
) {

    try {

        const data =
            await networthService.getDairyFarm(
                req.params.id
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

async function getAddAsset(
    req,
    res
) {

    try {

        const data =
            await networthService.getAddAsset(
                req.params.id
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

async function addAsset(
    req,
    res
) {

    try {

        const asset =
            await networthService.addAsset(
                req.params.id,
                req.body,
                req.file || null
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
            `/networth/structure/${req.params.id}`
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

async function getAsset(
    req,
    res
) {

    try {

        const data =
            await networthService.getAsset(
                req.params.id
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
//
// UPDATE EXISTING ASSET
// ==========================================================

async function updateAsset(
    req,
    res
) {

    try {

        const {
            id
        } = req.params;


        // ======================================================
        // DEBUG
        //
        // Useful while fixing the form submission.
        // ======================================================

        console.log(
            "=================================================="
        );

        console.log(
            "NET WORTH ASSET UPDATE"
        );

        console.log(
            "Asset ID:",
            id
        );

        console.log(
            "Request method:",
            req.method
        );

        console.log(
            "Request body:",
            req.body
        );

        console.log(
            "Uploaded file:",
            req.file
        );

        console.log(
            "=================================================="
        );


        // ======================================================
        // BUILD UPDATE DATA
        //
        // Only fields actually submitted by the browser
        // are forwarded.
        // ======================================================

        const updateData = {};


        // ======================================================
        // PROFILE IMAGE
        // ======================================================

        /*
         * If multer/upload middleware provides req.file,
         * the upload middleware should have a path/url
         * available on the file object.
         *
         * We support the common possibilities.
         */

        if (
            req.file
        ) {

            const imagePath =
                req.file.path ||
                req.file.location ||
                req.file.filename;


            if (
                imagePath
            ) {

                updateData.profileImage =
                    imagePath;

            }

        }


        /*
         * Also support profileImage being supplied directly
         * by another upload layer.
         */

        if (
            req.body.profileImage !== undefined &&
            req.body.profileImage !== ""
        ) {

            updateData.profileImage =
                req.body.profileImage;

        }


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
        // DATE OF BIRTH
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
        // Checkbox handling is IMPORTANT.
        //
        // Checked:
        //     "true"
        //
        // Unchecked:
        //     field is normally absent.
        //
        // The EJS should therefore include a hidden false
        // value before the checkbox, or the controller needs
        // to know that the field belongs to the form.
        // ======================================================

        if (
            req.body.isMilking !== undefined
        ) {

            updateData.isMilking =
                (
                    req.body.isMilking === true ||
                    req.body.isMilking === "true" ||
                    req.body.isMilking === "1" ||
                    req.body.isMilking === "on"
                );

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
        // ASSET CODE / PARENT FARM
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
        // The current EJS does not submit this field because
        // it is readonly and has no name.
        //
        // We nevertheless support it if another browser client
        // sends it.
        // ======================================================

        if (
            req.body.acquisitionDate !== undefined
        ) {

            updateData.acquisitionDate =
                req.body.acquisitionDate;

        }


        // ======================================================
        // UPDATE DATABASE
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
        // FETCH / AJAX
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
        // NORMAL BROWSER FORM
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

async function getDairyFarmData(
    req,
    res
) {

    try {

        const data =
            await networthService.getDairyFarm(
                req.params.id
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