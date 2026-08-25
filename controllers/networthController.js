// ==========================================================
// controllers/networthController.js
// ==========================================================
//
// NET WORTH CONTROLLER
//
// Handles:
//
//     GET  /networth
//     GET  /networth/structure/:id
//     GET  /networth/structure/:id/add
//     POST /networth/structure/:id/add
//     GET  /networth/asset/:id
//     POST /networth/asset/:id
//     GET  /networth/data
//     GET  /networth/structure/:id/data
//
// SPECIAL STRUCTURE / FACILITY FIELDS
// ----------------------------------------------------------
//
// When a Dairy record has NO numeric code:
//
//     code === null
//
// it is treated as a structure / facility / equipment record.
//
// Such records may now edit:
//
//     about
//     mission
//     refNo
//     vision
//
// These fields are intentionally preserved and passed to
// networthService.updateAsset().
//
// IMPORTANT:
//
// The controller never allows the browser to modify:
//
//     _id
//     code
//     assetCode
//     __v
//     createdAt
//     updatedAt
//
// ==========================================================


const networthService =
    require("../services/networthService");


// ==========================================================
// HELPERS
// ==========================================================


// ==========================================================
// DETERMINE WHETHER CLIENT EXPECTS JSON
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
// RENDER ERROR
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


// ==========================================================
// JSON ERROR
// ==========================================================

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
// REMOVE PROTECTED ASSET FIELDS
// ==========================================================
//
// These fields are controlled by the application:
//
//     _id
//     code
//     assetCode
//     __v
//     createdAt
//     updatedAt
//
// DO NOT allow the browser to change them.
//
// code:
//
//     negative = Dairy Farm
//     positive = Animal
//     null     = Structure / Facility
//
// assetCode:
//
//     derived from the parent Dairy Farm.
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

    if (
        value === undefined ||
        value === null
    ) {

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
// NORMALIZE TEXT
// ==========================================================
//
// Used for:
//
//     about
//     mission
//     refNo
//     vision
//
// Empty strings are preserved as empty strings so that the
// user can intentionally clear a field.
//

function normalizeText(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }


    return String(value).trim();

}


// ==========================================================
// NORMALIZE STRUCTURE INFORMATION
// ==========================================================
//
// Explicitly prepares the four additional fields.
//
// These are only meaningful for records whose code is null.
// The service/model remains responsible for final validation.
//

function normalizeStructureFields(data) {

    if (!data) {

        return data;

    }


    // ------------------------------------------------------
    // ABOUT
    // ------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "about"
        )
    ) {

        data.about =
            normalizeText(
                data.about
            );

    }


    // ------------------------------------------------------
    // MISSION
    // ------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "mission"
        )
    ) {

        data.mission =
            normalizeText(
                data.mission
            );

    }


    // ------------------------------------------------------
    // REFERENCE NUMBER
    //
    // Database field:
    //
    //     refNo
    //
    // NOT:
    //
    //     ref.no
    //     refNumber
    //     referenceNumber
    // ------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "refNo"
        )
    ) {

        data.refNo =
            normalizeText(
                data.refNo
            );

    }


    // ------------------------------------------------------
    // VISION
    // ------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "vision"
        )
    ) {

        data.vision =
            normalizeText(
                data.vision
            );

    }


    return data;

}


// ==========================================================
// GET /networth
// ==========================================================
//
// MAIN NET WORTH PAGE.
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
// :id = Parent Dairy Farm _id
//
// Creates the data required by the Add Asset page.
//
// The created record is a STRUCTURE.
//
// The browser does NOT control:
//
//     code
//     assetCode
//
// The service derives:
//
//     code = null
//     assetCode = parent Dairy Farm negative code
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
// Parent Dairy Farm:
//
//     req.params.id
//
// System-controlled:
//
//     code
//     assetCode
//
// The service is responsible for creating the record.
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
        // NORMALIZE STRUCTURE FIELDS
        // ======================================================
        //
        // These fields are allowed to be created for
        // structure / facility records.
        //
        // They are deliberately retained.
        //

        normalizeStructureFields(
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
        // Structures cannot be milking animals.
        //
        // This normalization remains for compatibility with
        // older forms that might still submit the field.
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
// Protected:
//
//     code
//     assetCode
//
// Allowed structure fields:
//
//     about
//     mission
//     refNo
//     vision
//
// These four fields are explicitly retained and passed to:
//
//     networthService.updateAsset()
//
// IMPORTANT:
//
// The controller does NOT silently discard them.
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
        // STRUCTURE / FACILITY FIELDS
        // ======================================================
        //
        // IMPORTANT:
        //
        // These are the fields requested for records with
        // no numeric code.
        //
        // They are explicitly normalized here and remain
        // inside updateData.
        //
        //     updateData.about
        //     updateData.mission
        //     updateData.refNo
        //     updateData.vision
        //
        // They are then sent directly to the service below.
        //

        normalizeStructureFields(
            updateData
        );


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
        // JSON / FETCH RESPONSE
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
// JSON DATA FOR MAIN NET WORTH PAGE.
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
// JSON DATA FOR A DAIRY FARM STRUCTURE PAGE.
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