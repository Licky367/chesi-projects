const structuresService =
    require("../../services/networth/structures");


/* ==========================================================
   GET DAIRY FARM STRUCTURE
   GET /networth/structure/:id
========================================================== */

exports.getDairyFarm = async (req, res) => {

    try {

        const { id } = req.params;


        if (!id) {

            return res.status(400).send(
                "Dairy Farm ID is required."
            );

        }


        const result =
            await structuresService.getDairyFarm(id);


        if (!result) {

            return res.status(404).send(
                "Dairy Farm not found."
            );

        }


        return res.render(
            "networth-structures",
            {
                dairy:
                    result.dairy,

                assets:
                    result.assets,

                dairyTotal:
                    result.dairyTotal
            }
        );

    } catch (error) {

        console.error(
            "Error loading Dairy Farm structure:",
            error
        );


        return res.status(500).send(
            "Unable to load Dairy Farm structure."
        );

    }

};


/* ==========================================================
   GET ADD ASSET PAGE
   GET /networth/structure/:id/add
========================================================== */

exports.getAddAsset = async (req, res) => {

    try {

        const { id } = req.params;


        if (!id) {

            return res.status(400).send(
                "Dairy Farm ID is required."
            );

        }


        const result =
            await structuresService.getAddAssetData(id);


        if (!result) {

            return res.status(404).send(
                "Dairy Farm not found."
            );

        }


        return res.render(
            "networth-add-asset",
            {
                dairy:
                    result.dairy,

                structures:
                    result.structures
            }
        );

    } catch (error) {

        console.error(
            "Error loading Add Asset page:",
            error
        );


        return res.status(500).send(
            "Unable to load Add Asset page."
        );

    }

};


/* ==========================================================
   ADD ASSET
   POST /networth/structure/:id/add
========================================================== */

exports.addAsset = async (req, res) => {

    try {

        const { id } = req.params;


        if (!id) {

            return res.status(400).send(
                "Dairy Farm ID is required."
            );

        }


        const asset =
            await structuresService.addAsset(
                id,
                req.body,
                req.file
            );


        if (!asset) {

            return res.status(404).send(
                "Dairy Farm not found."
            );

        }


        /*
         * After creating the asset, return to the
         * Dairy Farm structure page.
         */

        return res.redirect(
            `/networth/structure/${id}`
        );

    } catch (error) {

        console.error(
            "Error adding Net Worth asset:",
            error
        );


        return res.status(500).send(
            error.message ||
            "Unable to add asset."
        );

    }

};