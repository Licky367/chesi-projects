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
// ERROR HELPERS
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


        return res.redirect(
            `/networth/structure/${id}`
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
// EDIT EXISTING ASSET
//
// This controller:
//
//   1. Gets the existing record by :id through the service.
//   2. Accepts only known editable fields.
//   3. Never accepts _id.
//   4. Never accepts code.
//   5. Allows individual fields to be changed independently.
//   6. Passes the update object to the service.
//   7. Supports both normal forms and fetch/AJAX.
//
// ==========================================================

async function updateAsset(
    req,
    res
) {

    try {

        const {
            id
        } = req.params;


        const body =
            req.body || {};


        // ======================================================
        // UPDATE DATA
        //
        // ONLY EDITABLE FIELDS ARE COPIED.
        //
        // _id and code are deliberately absent.
        // ======================================================

        const updateData = {};


        // ======================================================
        // PROFILE IMAGE
        // ======================================================
        //
        // If upload middleware has already placed the resulting
        // image path/URL in req.body.profileImage, forward it.
        //
        // req.file is also passed separately below so that the
        // service/controller remains compatible with upload
        // middleware.
        // ======================================================

        if (
            body.profileImage !== undefined
        ) {

            updateData.profileImage =
                body.profileImage;

        }


        // ======================================================
        // NAME
        // ======================================================

        if (
            body.name !== undefined
        ) {

            updateData.name =
                body.name;

        }


        // ======================================================
        // ITEM
        //
        // Backwards compatibility.
        // ======================================================

        if (
            body.item !== undefined
        ) {

            updateData.item =
                body.item;

        }


        // ======================================================
        // DATE OF BIRTH
        // ======================================================

        if (
            body.dateOfBirth !== undefined
        ) {

            updateData.dateOfBirth =
                body.dateOfBirth;

        }


        // ======================================================
        // TYPE / BREED
        // ======================================================

        if (
            body.type !== undefined
        ) {

            updateData.type =
                body.type;

        }


        // ======================================================
        // MASS
        // ======================================================

        if (
            body.mass !== undefined
        ) {

            updateData.mass =
                body.mass;

        }


        // ======================================================
        // MILKING
        // ======================================================
        //
        // The frontend may submit:
        //
        //     true
        //     false
        //     "true"
        //     "false"
        //     "1"
        //     "0"
        //     "on"
        //
        // We normalize it here.
        //
        // IMPORTANT:
        // The service only applies this to identified dairies.
        // ======================================================

        if (
            body.isMilking !== undefined
        ) {

            if (
                typeof body.isMilking === "boolean"
            ) {

                updateData.isMilking =
                    body.isMilking;

            } else {

                const value =
                    String(
                        body.isMilking
                    ).toLowerCase();


                updateData.isMilking =
                    (
                        value === "true" ||
                        value === "1" ||
                        value === "on" ||
                        value === "yes"
                    );

            }

        }


        // ======================================================
        // BUYING PRICE
        // ======================================================

        if (
            body.buyingPrice !== undefined
        ) {

            updateData.buyingPrice =
                body.buyingPrice;

        }


        // ======================================================
        // CURRENT WORTH
        // ======================================================

        if (
            body.currentWorth !== undefined
        ) {

            updateData.currentWorth =
                body.currentWorth;

        }


        // ======================================================
        // DESCRIPTION
        // ======================================================

        if (
            body.description !== undefined
        ) {

            updateData.description =
                body.description;

        }


        // ======================================================
        // CONDITION
        // ======================================================

        if (
            body.condition !== undefined
        ) {

            updateData.condition =
                body.condition;

        }


        // ======================================================
        // LOCATION
        // ======================================================

        if (
            body.location !== undefined
        ) {

            updateData.location =
                body.location;

        }


        // ======================================================
        // PARENT DAIRY FARM
        //
        // Identified dairies:
        //
        //     empty value = standalone
        //     farm code   = assigned
        //
        // Manual assets:
        //
        //     must remain assigned to a farm
        //
        // The service performs the actual validation.
        // ======================================================

        if (
            body.assetCode !== undefined
        ) {

            updateData.assetCode =
                body.assetCode;

        }


        // ======================================================
        // STATUS
        // ======================================================

        if (
            body.status !== undefined
        ) {

            updateData.status =
                body.status;

        }


        // ======================================================
        // VALUATION DATE
        // ======================================================

        if (
            body.valuationDate !== undefined
        ) {

            updateData.valuationDate =
                body.valuationDate;

        }


        // ======================================================
        // ACQUISITION DATE
        // ======================================================
        //
        // Only included because the existing controller/service
        // already support it.
        //
        // If the browser does not submit it, nothing changes.
        // ======================================================

        if (
            body.acquisitionDate !== undefined
        ) {

            updateData.acquisitionDate =
                body.acquisitionDate;

        }


        // ======================================================
        // UPDATE DATABASE
        // ======================================================

        const updatedAsset =
            await networthService.updateAsset(
                id,
                updateData,
                req.file
            );


        // ======================================================
        // REFRESH NET WORTH
        // ======================================================

        const netWorth =
            await networthService.getNetWorth();


        // ======================================================
        // FETCH / AJAX
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
        // NORMAL FORM SUBMISSION
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