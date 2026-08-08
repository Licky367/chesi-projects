const networthService =
    require("../services/networthService");


/* =========================================================
   NET WORTH ENTRY PAGE
========================================================= */

exports.index = async (req, res, next) => {

    try {

        const data =
            await networthService.getNetWorthOverview();


        return res.render("networth", {

            title:
                "Net Worth",

            totalNetWorth:
                data.totalNetWorth,

            standaloneAssets:
                data.standaloneAssets,

            structures:
                data.structures

        });

    } catch (error) {

        next(error);

    }

};


/* =========================================================
   STRUCTURE ASSETS PAGE
========================================================= */

exports.viewStructure = async (req, res, next) => {

    try {

        const structureId =
            req.params.id;


        const data =
            await networthService.getStructureDetails(
                structureId
            );


        if (!data) {

            return res.status(404).render("404", {

                title:
                    "404 - Structure Not Found",

                user:
                    req.user || null

            });

        }


        return res.render(
            "networth-structure",
            {

                title:
                    `${data.structure.name} - Net Worth`,

                structure:
                    data.structure,

                assets:
                    data.assets,

                structureTotal:
                    data.structureTotal

            }
        );

    } catch (error) {

        next(error);

    }

};


/* =========================================================
   ASSET DETAILS PAGE
========================================================= */

exports.viewAsset = async (req, res, next) => {

    try {

        const assetId =
            req.params.id;


        const data =
            await networthService.getAssetDetails(
                assetId
            );


        if (!data) {

            return res.status(404).render("404", {

                title:
                    "404 - Asset Not Found",

                user:
                    req.user || null

            });

        }


        return res.render(
            "networth-asset",
            {

                title:
                    `${data.asset.name} - Net Worth`,

                asset:
                    data.asset,

                dairy:
                    data.dairy,

                structures:
                    data.structures

            }
        );

    } catch (error) {

        next(error);

    }

};


/* =========================================================
   UPDATE ASSET
========================================================= */

exports.updateAsset = async (req, res, next) => {

    try {

        const assetId =
            req.params.id;


        /*
         * The ID comes directly from:
         *
         * /networth/asset/:id
         *
         * The service is responsible for resolving
         * the corresponding Dairy document.
         */

        await networthService.updateAsset(

            assetId,

            req.body

        );


        /*
         * Stay on the same asset after saving.
         */

        return res.redirect(
            `/networth/asset/${assetId}`
        );

    } catch (error) {

        next(error);

    }

};


/* =========================================================
   ADD MANUAL ASSET PAGE
========================================================= */

exports.addAssetPage = async (req, res, next) => {

    try {

        const structureId =
            req.params.id;


        const structure =
            await networthService.getStructureById(
                structureId
            );


        if (!structure) {

            return res.status(404).render("404", {

                title:
                    "404 - Structure Not Found",

                user:
                    req.user || null

            });

        }


        return res.render(
            "networth-add",
            {

                title:
                    `Add Asset - ${structure.name}`,

                structure

            }
        );

    } catch (error) {

        next(error);

    }

};


/* =========================================================
   ADD MANUAL ASSET
========================================================= */

exports.addAsset = async (req, res, next) => {

    try {

        const structureId =
            req.params.id;


        const asset =
            await networthService.addManualAsset(

                structureId,

                req.body

            );


        if (!asset || !asset._id) {

            throw new Error(
                "Asset was not created."
            );

        }


        return res.redirect(
            `/networth/asset/${asset._id}`
        );

    } catch (error) {

        next(error);

    }

};