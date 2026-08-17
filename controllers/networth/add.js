// ==========================================================
// controllers/networth/add.js
// ==========================================================

const addAssetService =
    require("../../services/networth/add");


// ==========================================================
// GET ADD ASSET PAGE
// ==========================================================

async function getAddAsset(
    req,
    res
) {

    try {

        const {
            id
        } = req.params;


        // ==================================================
        // VALIDATE DAIRY FARM ID
        // ==================================================

        if (!id) {

            return res.status(400).send(
                "Dairy Farm ID is required."
            );

        }


        // ==================================================
        // GET PARENT DAIRY FARM
        // ==================================================

        const dairy =
            await addAssetService.getParentDairyFarm(
                id
            );


        // ==================================================
        // DAIRY FARM NOT FOUND
        // ==================================================

        if (!dairy) {

            return res.status(404).send(
                "Dairy Farm not found."
            );

        }


        // ==================================================
        // RENDER ADD ASSET PAGE
        // ==================================================

        return res.render(
            "networth-add",
            {

                dairy

            }
        );

    } catch (error) {

        console.error(
            "Net Worth Add Asset GET Error:",
            error
        );


        return res.status(500).send(
            "Unable to load the Add Asset page."
        );

    }

}


// ==========================================================
// ADD ASSET
// ==========================================================

async function addAsset(
    req,
    res
) {

    try {

        const {
            id
        } = req.params;


        // ==================================================
        // VALIDATE DAIRY FARM ID
        // ==================================================

        if (!id) {

            return res.status(400).json({

                success: false,

                message:
                    "Dairy Farm ID is required."

            });

        }


        // ==================================================
        // BUILD ASSET DATA
        // ==================================================
        //
        // The parent Dairy Farm is intentionally NOT taken
        // from req.body.
        //
        // It comes from req.params.id.
        //
        // ==================================================

        const assetData = {

            name:
                req.body.name,

            type:
                req.body.type,

            buyingPrice:
                req.body.buyingPrice,

            currentWorth:
                req.body.currentWorth,

            description:
                req.body.description,

            condition:
                req.body.condition,

            location:
                req.body.location,

            status:
                req.body.status

        };


        // ==================================================
        // CREATE ASSET
        // ==================================================
        //
        // The service creates BOTH:
        //
        //     1. Dairy asset
        //     2. Update/feed record
        //
        // The authenticated user is passed through so the
        // feed update can record who added the asset.
        //
        // ==================================================

        const result =
            await addAssetService.createAsset(
                id,
                assetData,
                req.user
            );


        // ==================================================
        // EXTRACT CREATED ASSET
        // ==================================================

        const asset =
            result.asset;


        // ==================================================
        // SUCCESS RESPONSE
        // ==================================================

        return res.status(201).json({

            success: true,

            message:
                "Asset added successfully.",

            asset: {

                id:
                    asset._id,

                name:
                    asset.name,

                type:
                    asset.type,

                buyingPrice:
                    asset.buyingPrice,

                currentWorth:
                    asset.currentWorth,

                description:
                    asset.description,

                condition:
                    asset.condition,

                location:
                    asset.location,

                status:
                    asset.status,

                assetCode:
                    asset.assetCode

            }

        });

    } catch (error) {

        console.error(
            "Net Worth Add Asset POST Error:",
            error
        );


        // ==================================================
        // VALIDATION ERROR
        // ==================================================

        if (
            error.name ===
            "ValidationError"
        ) {

            const messages =
                Object.values(
                    error.errors || {}
                )
                .map(
                    item =>
                        item.message
                );


            return res.status(400).json({

                success: false,

                message:

                    messages.length > 0

                        ? messages.join(" ")

                        : "Invalid asset data."

            });

        }


        // ==================================================
        // INVALID OBJECT ID
        // ==================================================

        if (
            error.name ===
            "CastError"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid Dairy Farm ID."

            });

        }


        // ==================================================
        // PARENT DAIRY FARM NOT FOUND
        // ==================================================

        if (
            error.name ===
            "NotFoundError"
        ) {

            return res.status(404).json({

                success: false,

                message:
                    error.message ||
                    "Dairy Farm not found."

            });

        }


        // ==================================================
        // GENERAL SERVER ERROR
        // ==================================================

        return res.status(500).json({

            success: false,

            message:
                "Unable to add the asset."

        });

    }

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getAddAsset,

    addAsset

};