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
// multer.diskStorage() stores files in:
//
//     public/uploads/<filename>
//
// Browser URL:
//
//     /uploads/<filename>
//
// Never save req.file.path directly.
//

function getUploadedImageUrl(
    file
) {

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
// IMPORTANT:
//
// These values are NEVER user-assigned.
//
// code:
//
//     Dairy Farm  -> negative auto-generated code
//     Animal      -> positive auto-generated code
//     Structure   -> null
//
// assetCode:
//
//     Automatically derived from the selected parent
//     Dairy Farm's negative code.
//
// Therefore neither field may come from req.body.
//

function removeProtectedAssetFields(
    data
) {

    delete data.code;

    delete data.assetCode;

    delete data._id;

    delete data.__v;

    delete data.createdAt;

    delete data.updatedAt;

    return data;

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
// :id identifies the Dairy Farm being viewed.
//
// The service is responsible for resolving the farm.
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
// :id identifies the selected parent Dairy Farm.
//
// The user does NOT enter assetCode.
//
// The service will obtain the parent's negative code.
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
// CREATE ASSET
//
// The :id is the selected parent Dairy Farm.
//
// IMPORTANT:
//
// The client does NOT provide:
//
//     code
//     assetCode
//
// The backend/service determines:
//
//     Animal
//         -> positive auto-generated code
//         -> assetCode = parent's negative Dairy Farm code
//
//     Structure / Facility
//         -> code = null
//         -> assetCode = parent's negative Dairy Farm code
//
// The controller therefore passes only legitimate form data
// to the service.
//

async function addAsset(
    req,
    res
) {

    try {

        const body =
            {
                ...(req.body || {})
            };


        // ======================================================
        // NEVER TRUST CLIENT-SUPPLIED SYSTEM IDENTITY
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
        // MILKING CHECKBOX
        // ======================================================

        if (
            body.isMilking !== undefined
        ) {

            const value =
                String(
                    body.isMilking
                )
                    .trim()
                    .toLowerCase();


            body.isMilking =
                (
                    value === "true" ||
                    value === "1" ||
                    value === "yes" ||
                    value === "on"
                );

        }


        // ======================================================
        // CREATE ASSET
        // ======================================================
        //
        // The parent Dairy Farm is identified by :id.
        //
        // The service must resolve that Dairy Farm and derive
        // the correct negative assetCode from its code.
        //

        const asset =
            await networthService.addAsset(
                req.params.id,
                body,
                req.file || null
            );


        // ======================================================
        // JSON / FETCH
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
            `/networth/structure/${req.params.id}`
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
//
// UPDATE EXISTING ASSET
// ==========================================================
//
// IMPORTANT:
//
// code and assetCode are protected.
//
// The user cannot:
//
//     change an animal's code
//     change an animal into another identity
//     manually assign a structure code
//     forge an assetCode
//     attach an asset to an arbitrary farm by typing a code
//
// If parent reassignment is supported by the service/UI,
// it must happen through an explicit parent-selection mechanism
// that the service resolves into the parent's negative code.
//
// This controller itself never accepts assetCode as authoritative.
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
        // DEBUG
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
            "Content-Type:",
            req.headers["content-type"]
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
        //
        // code:
        //
        //     Never editable.
        //
        // assetCode:
        //
        //     Never manually editable.
        //
        // If a future parent-selection field is introduced,
        // the service should resolve it into the correct
        // negative parent code.
        //

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
        // MILKING CHECKBOX
        // ======================================================

        if (
            updateData.isMilking !== undefined
        ) {

            const value =
                String(
                    updateData.isMilking
                )
                    .trim()
                    .toLowerCase();


            updateData.isMilking =
                (
                    value === "true" ||
                    value === "1" ||
                    value === "yes" ||
                    value === "on"
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