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

        console.log(
            "=================================================="
        );

        console.log(
            "NET WORTH ADD ASSET"
        );

        console.log(
            "Farm ID:",
            req.params.id
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


        const body =
            {
                ...req.body
            };


        // --------------------------------------------------
        // PROFILE IMAGE
        // --------------------------------------------------

        if (
            req.file
        ) {

            body.profileImage =
                `/uploads/${req.file.filename}`;

        }


        const asset =
            await networthService.addAsset(
                req.params.id,
                body,
                req.file || null
            );


        // --------------------------------------------------
        // JSON RESPONSE
        // --------------------------------------------------

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


        // --------------------------------------------------
        // NORMAL FORM
        // --------------------------------------------------

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
            "Content type:",
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
        // COPY BODY
        // ======================================================

        const updateData = {

            ...req.body

        };


        // ======================================================
        // PROFILE IMAGE
        //
        // multer.diskStorage saves the file as:
        //
        // public/uploads/<filename>
        //
        // Browser URL therefore becomes:
        //
        // /uploads/<filename>
        // ======================================================

        if (
            req.file
        ) {

            updateData.profileImage =
                `/uploads/${req.file.filename}`;

        }


        // ======================================================
        // NAME
        // ======================================================

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "name"
            )
        ) {

            updateData.name =
                req.body.name;

        }


        // ======================================================
        // DATE OF BIRTH
        // ======================================================

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "dateOfBirth"
            )
        ) {

            updateData.dateOfBirth =
                req.body.dateOfBirth;

        }


        // ======================================================
        // TYPE / BREED
        // ======================================================

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "type"
            )
        ) {

            updateData.type =
                req.body.type;

        }


        // ======================================================
        // MASS
        // ======================================================

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "mass"
            )
        ) {

            updateData.mass =
                req.body.mass;

        }


        // ======================================================
        // MILKING
        //
        // Supports:
        //
        // true
        // false
        // "true"
        // "false"
        // "1"
        // "0"
        // "on"
        //
        // If the browser sends an array because a hidden
        // false input and checkbox are both submitted, use
        // the last value.
        // ======================================================

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "isMilking"
            )
        ) {

            let milking =
                req.body.isMilking;


            if (
                Array.isArray(
                    milking
                )
            ) {

                milking =
                    milking[
                        milking.length - 1
                    ];

            }


            updateData.isMilking =

                milking === true ||

                milking === "true" ||

                milking === "1" ||

                milking === "on";

        }


        // ======================================================
        // BUYING PRICE
        // ======================================================

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "buyingPrice"
            )
        ) {

            updateData.buyingPrice =
                req.body.buyingPrice;

        }


        // ======================================================
        // CURRENT WORTH
        // ======================================================

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "currentWorth"
            )
        ) {

            updateData.currentWorth =
                req.body.currentWorth;

        }


        // ======================================================
        // DESCRIPTION
        // ======================================================

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "description"
            )
        ) {

            updateData.description =
                req.body.description;

        }


        // ======================================================
        // CONDITION
        // ======================================================

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "condition"
            )
        ) {

            updateData.condition =
                req.body.condition;

        }


        // ======================================================
        // LOCATION
        // ======================================================

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "location"
            )
        ) {

            updateData.location =
                req.body.location;

        }


        // ======================================================
        // ASSET CODE
        // ======================================================

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "assetCode"
            )
        ) {

            updateData.assetCode =
                req.body.assetCode;

        }


        // ======================================================
        // STATUS
        // ======================================================

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "status"
            )
        ) {

            updateData.status =
                req.body.status;

        }


        // ======================================================
        // VALUATION DATE
        // ======================================================

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "valuationDate"
            )
        ) {

            updateData.valuationDate =
                req.body.valuationDate;

        }


        // ======================================================
        // ACQUISITION DATE
        //
        // Supported if another form/client sends it.
        // ======================================================

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "acquisitionDate"
            )
        ) {

            updateData.acquisitionDate =
                req.body.acquisitionDate;

        }


        // ======================================================
        // LEGACY ITEM FIELD
        // ======================================================

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "item"
            )
        ) {

            updateData.item =
                req.body.item;

        }


        // ======================================================
        // DIRECT PROFILE IMAGE FIELD
        //
        // Only use this when there was no uploaded file.
        // ======================================================

        if (
            !req.file &&

            Object.prototype.hasOwnProperty.call(
                req.body,
                "profileImage"
            )
        ) {

            updateData.profileImage =
                req.body.profileImage;

        }


        // ======================================================
        // LOG FINAL UPDATE DATA
        // ======================================================

        console.log(
            "Final update data:",
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
        // NORMAL BROWSER SUBMISSION
        // ======================================================

        return res.redirect(
            `/networth/asset/${id}`
        );

    } catch (error) {

        console.error(
            "=================================================="
        );

        console.error(
            "ERROR UPDATING NET WORTH ASSET"
        );

        console.error(
            error
        );

        console.error(
            "=================================================="
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