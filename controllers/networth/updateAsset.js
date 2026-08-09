// =========================================================
// controllers/networth/updateAsset.js
// ==========================================================

const updateAssetService =
    require("../../services/networth/updateAsset");


// ==========================================================
// UPDATE ASSET
// ==========================================================

async function updateAsset(req, res) {

    try {

        const assetId =
            req.params.id;

        const body =
            req.body || {};

        const file =
            req.file || null;


        // ==================================================
        // CALL SERVICE
        // ==================================================

        const updatedAsset =
            await updateAssetService.updateAsset(
                assetId,
                body,
                file
            );


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.status(200).json({

            success: true,

            message:
                "Asset updated successfully.",

            asset:
                updatedAsset

        });

    }

    catch (error) {

        console.error(
            "UPDATE NET WORTH ASSET ERROR:",
            error
        );


        const statusCode =
            Number.isInteger(
                error.statusCode
            )
                ? error.statusCode
                : 500;


        return res.status(
            statusCode
        ).json({

            success: false,

            message:
                error.message ||
                "Failed to update asset."

        });

    }

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    updateAsset

};