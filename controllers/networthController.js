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
// multer.diskStorage() stores files here:
//
//     public/uploads/<filename>
//
// Browser URL:
//
//     /uploads/<filename>
//
// We therefore DO NOT save req.file.path directly.
//

function getUploadedImageUrl(
    file
) {

    if (
        !file
    ) {

        return null;

    }


    if (
        file.filename
    ) {

        return `/uploads/${file.filename}`;

    }


    return null;

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

        const body =
            {
                ...(req.body || {})
            };


        // ------------------------------------------------------
        // PROFILE IMAGE
        // ------------------------------------------------------

        const uploadedImage =
            getUploadedImageUrl(
                req.file
            );


        if (
            uploadedImage
        ) {

            body.profileImage =
                uploadedImage;

        }


        // ------------------------------------------------------
        // CREATE ASSET
        // ------------------------------------------------------

        const asset =
            await networthService.addAsset(
                req.params.id,
                body,
                req.file || null
            );


        // ------------------------------------------------------
        // JSON / FETCH
        // ------------------------------------------------------

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


        // ------------------------------------------------------
        // NORMAL FORM SUBMISSION
        // ------------------------------------------------------

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
//
// IMPORTANT:
//
// The EJS form uses:
//
//     method="POST"
//
//     enctype="multipart/form-data"
//
// Therefore multer MUST run before this controller.
//
// The controller supports:
//
//     name
//     dateOfBirth
//     type
//     mass
//     isMilking
//     buyingPrice
//     currentWorth
//     description
//     condition
//     location
//     assetCode
//     status
//     valuationDate
//     acquisitionDate
//     profileImage
//
// Protected fields:
//
//     _id
//     code
//
// are never sent to the service for modification.
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
        //
        // Never mutate req.body directly.
        //

        const updateData =
            {
                ...(req.body || {})
            };


        // ======================================================
        // REMOVE METHOD OVERRIDE
        // ======================================================
        //
        // Your EJS contains:
        //
        //     <input
        //         type="hidden"
        //         name="_method"
        //         value="PUT"
        //     >
        //
        // This is not an actual asset field.
        //

        delete updateData._method;


        // ======================================================
        // PROFILE IMAGE
        // ======================================================
        //
        // The browser sends the image as:
        //
        //     req.file
        //
        // multer stores it in:
        //
        //     public/uploads/
        //
        // Save the browser-accessible URL instead.
        //

        const uploadedImage =
            getUploadedImageUrl(
                req.file
            );


        if (
            uploadedImage
        ) {

            updateData.profileImage =
                uploadedImage;

        }


        // ======================================================
        // MILKING CHECKBOX
        // ======================================================
        //
        // The EJS contains:
        //
        //     <input
        //         type="checkbox"
        //         name="isMilking"
        //         value="true"
        //     >
        //
        // When checked:
        //
        //     req.body.isMilking === "true"
        //
        // When unchecked:
        //
        //     req.body.isMilking === undefined
        //
        // For an identified female, absence means FALSE.
        //
        // We deliberately do NOT add the field for every asset
        // because the service already restricts isMilking to
        // identified dairy records.
        //
        // If the checkbox was present, pass its value.
        //

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
        // JSON / FETCH REQUEST
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