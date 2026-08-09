const addAssetService =
    require("../../services/networth/add");


/* =========================================================
   GET ADD ASSET PAGE
========================================================== */

async function getAddAsset(req, res) {

    try {

        const {
            id
        } = req.params;


        if (!id) {

            return res.status(400).send(
                "Dairy Farm ID is required."
            );

        }


        const dairy =
            await addAssetService.getParentDairyFarm(id);


        if (!dairy) {

            return res.status(404).send(
                "Dairy Farm not found."
            );

        }


        /*
         * The EJS only needs the parent Dairy Farm.
         *
         * The parent relationship is determined by
         * the URL /structure/:id/add.
         */

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


/* ==========================================================
   ADD ASSET
========================================================== */

async function addAsset(req, res) {

    try {

        const {
            id
        } = req.params;


        if (!id) {

            return res.status(400).json({

                success: false,

                message:
                    "Dairy Farm ID is required."

            });

        }


        /*
         * Only values actually submitted by the form
         * are accepted here.
         *
         * The parent Dairy Farm is NOT taken from
         * req.body.
         *
         * It comes from req.params.id.
         */

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


        const asset =
            await addAssetService.createAsset(
                id,
                assetData
            );


        /*
         * The external networth-add.js can handle
         * this JSON response.
         */

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
                    asset.status

            }

        });

    } catch (error) {

        console.error(
            "Net Worth Add Asset POST Error:",
            error
        );


        /*
         * Validation errors.
         */

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


        /*
         * Invalid ObjectId or malformed ID.
         */

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


        return res.status(500).json({

            success: false,

            message:
                "Unable to add the asset."

        });

    }

}


module.exports = {

    getAddAsset,

    addAsset

};