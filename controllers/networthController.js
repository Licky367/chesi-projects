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
// BUILD IMAGE URL
// ==========================================================
//
// multer stores:
//
//     public/uploads/<filename>
//
// Browser URL:
//
//     /uploads/<filename>
//
// Never store req.file.path directly.
//

function getUploadedImageUrl(file) {

    if (!file) {

        return null;

    }


    if (file.filename) {

        return `/uploads/${file.filename}`;

    }


    return null;

}


// ==========================================================
// REMOVE PROTECTED SYSTEM FIELDS
// ==========================================================
//
// These fields are never trusted from the browser:
//
//     _id
//     code
//     assetCode
//     __v
//     createdAt
//     updatedAt
//
// code:
//
//     Dairy Farm -> negative generated code
//     Animal     -> positive generated code
//     Structure  -> null
//
// assetCode:
//
//     Derived from the selected parent Dairy Farm.
//

function removeProtectedAssetFields(data) {

    if (!data) {

        return {};

    }


    delete data._id;

    delete data.code;

    delete data.assetCode;

    delete data.__v;

    delete data.createdAt;

    delete data.updatedAt;


    return data;

}


// ==========================================================
// NORMALIZE BOOLEAN
// ==========================================================

function normalizeBoolean(value) {

    if (value === undefined || value === null) {

        return false;

    }


    const normalized =
        String(value)
            .trim()
            .toLowerCase();


    return (

        normalized === "true" ||

        normalized === "1" ||

        normalized === "yes" ||

        normalized === "on"

    );

}


// ==========================================================
// GET /networth
// ==========================================================
//
// MAIN NET WORTH PAGE
//

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


        if (wantsJSON(req)) {

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
//
// :id = Dairy Farm _id
//
// The service resolves the Dairy Farm and its assets.
//

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


        if (wantsJSON(req)) {

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
//
// :id = parent Dairy Farm _id
//
// The Add Asset page creates a STRUCTURE.
//
// The browser submits:
//
//     name
//     type
//     buyingPrice
//     currentWorth
//     description
//     condition
//     location
//     status
//
// The browser does NOT submit:
//
//     code
//     assetCode
//
// The service derives:
//
//     code = null
//     assetCode = parent Dairy Farm's negative code
//

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


        if (wantsJSON(req)) {

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
//
// CREATE STRUCTURE ASSET
//
// The selected Dairy Farm is identified by:
//
//     req.params.id
//
// The service is responsible for:
//
//     1. Finding the Dairy Farm.
//     2. Verifying that it is actually a Dairy Farm.
//     3. Obtaining its negative code.
//     4. Creating the structure with:
//            code = null
//            assetCode = parent farm code
//
// The controller never accepts those system fields.
//

async function addAsset(
    req,
    res
) {

    try {

        const dairyFarmId =
            req.params.id;


        // ======================================================
        // COPY FORM DATA
        // ======================================================

        const body =
            {
                ...(req.body || {})
            };


        // ======================================================
        // REMOVE METHOD OVERRIDE
        // ======================================================

        delete body._method;


        // ======================================================
        // REMOVE PROTECTED SYSTEM FIELDS
        // ======================================================

        removeProtectedAssetFields(
            body
        );


        // ======================================================
        // PROFILE IMAGE
        // ======================================================

        const uploadedImage =
            getUploadedImageUrl(
                req.file
            );


        if (uploadedImage) {

            body.profileImage =
                uploadedImage;

        }


        // ======================================================
        // MILKING
        // ======================================================
        //
        // The current networth-add.ejs does not submit this
        // field because structures cannot be milking animals.
        //
        // If an older form still sends it, normalize it.
        //

        if (
            body.isMilking !== undefined
        ) {

            body.isMilking =
                normalizeBoolean(
                    body.isMilking
                );

        }


        // ======================================================
        // CREATE STRUCTURE
        // ======================================================

        const asset =
            await networthService.addAsset(
                dairyFarmId,
                body,
                req.file || null
            );


        // ======================================================
        // JSON / FETCH RESPONSE
        // ======================================================

        if (wantsJSON(req)) {

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


        // ======================================================
        // NORMAL FORM SUBMISSION
        // ======================================================

        return res.redirect(
            `/networth/structure/${dairyFarmId}`
        );

    } catch (error) {

        console.error(
            "Error adding Net Worth asset:",
            error
        );


        if (wantsJSON(req)) {

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
//
// :id = Dairy document _id
//
// Loads the individual asset page.
//

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


        if (wantsJSON(req)) {

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
//
// UPDATE EXISTING ASSET
//
// Protected identity fields cannot be changed:
//
//     code
//     assetCode
//
// This is particularly important because:
//
//     code > 0
//         = animal identity
//
//     code === null
//         = structure identity
//
//     code < 0
//         = Dairy Farm identity
//
// The update controller therefore only passes editable
// properties to the service.
//

async function updateAsset(
    req,
    res
) {

    try {

        const {
            id
        } = req.params;


        // ======================================================
        // COPY FORM DATA
        // ======================================================

        const updateData =
            {
                ...(req.body || {})
            };


        // ======================================================
        // REMOVE METHOD OVERRIDE
        // ======================================================

        delete updateData._method;


        // ======================================================
        // REMOVE PROTECTED SYSTEM FIELDS
        // ======================================================

        removeProtectedAssetFields(
            updateData
        );


        // ======================================================
        // PROFILE IMAGE
        // ======================================================

        const uploadedImage =
            getUploadedImageUrl(
                req.file
            );


        if (uploadedImage) {

            updateData.profileImage =
                uploadedImage;

        }


        // ======================================================
        // MILKING
        // ======================================================

        if (
            updateData.isMilking !== undefined
        ) {

            updateData.isMilking =
                normalizeBoolean(
                    updateData.isMilking
                );

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
        // JSON / FETCH
        // ======================================================

        if (wantsJSON(req)) {

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


        if (wantsJSON(req)) {

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
//
// JSON DATA FOR MAIN NET WORTH PAGE
//

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
//
// JSON DATA FOR A DAIRY FARM STRUCTURE PAGE
//

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