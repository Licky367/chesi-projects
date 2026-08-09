// ==========================================================
// controllers/networth/updateAsset.js
// ==========================================================

const updateAssetService =
    require("../../services/networth/updateAsset");


// ==========================================================
// UPDATE ASSET
// ==========================================================

async function updateAsset(
    req,
    res
) {

    try {

        // ==================================================
        // ASSET ID
        // ==================================================

        const {
            id
        } = req.params;


        // ==================================================
        // REQUEST BODY
        // ==================================================

        const body =
            req.body || {};


        // ==================================================
        // UPLOADED FILE
        //
        // Supports multer's:
        //
        //     req.file
        //
        // The service decides how the file is stored.
        // ==================================================

        const file =
            req.file || null;


        // ==================================================
        // UPDATE
        // ==================================================

        const updatedAsset =
            await updateAssetService.updateAsset(
                id,
                body,
                file
            );


        // ==================================================
        // RESPONSE
        //
        // The EJS form uses a normal POST request and
        // networth-asset.js can consume JSON.
        // ==================================================

        return res.status(200).json({

            success:
                true,

            message:
                "Asset updated successfully.",

            asset:
                updatedAsset

        });

    }

    catch (error) {

        // ==================================================
        // STATUS CODE
        // ==================================================

        const statusCode =
            Number.isInteger(
                error.statusCode
            )
                ? error.statusCode
                : 500;


        // ==================================================
        // ERROR RESPONSE
        // ==================================================

        console.error(
            "Net Worth asset update error:",
            error
        );


        return res.status(
            statusCode
        ).json({

            success:
                false,

            message:
                error.message ||
                "Failed to update asset."

        });

    }

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    updateAsset

};