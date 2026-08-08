const networthService = require("../services/networthService");


/* =========================================================
   NET WORTH ENTRY PAGE
========================================================= */

exports.index = async (req, res, next) => {

    try {

        const data =
            await networthService.getNetWorthOverview();

        return res.render("networth", {

            title: "Net Worth",

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

        const data =
            await networthService.getStructureDetails(
                req.params.id
            );

        if (!data) {

            return res.status(404).render("404", {

                title: "404 - Structure Not Found",

                user: req.user || null

            });

        }

        return res.render("networth-structure", {

            title:
                `${data.structure.item} - Net Worth`,

            structure:
                data.structure,

            assets:
                data.assets,

            structureTotal:
                data.structureTotal

        });

    } catch (error) {

        next(error);

    }

};


/* =========================================================
   ASSET DETAILS PAGE
========================================================= */

exports.viewAsset = async (req, res, next) => {

    try {

        const data =
            await networthService.getAssetDetails(
                req.params.id
            );

        if (!data) {

            return res.status(404).render("404", {

                title: "404 - Asset Not Found",

                user: req.user || null

            });

        }

        return res.render("networth-asset", {

            title:
                `${data.asset.item} - Net Worth`,

            asset:
                data.asset,

            dairy:
                data.dairy,

            structures:
                data.structures

        });

    } catch (error) {

        next(error);

    }

};


/* =========================================================
   UPDATE ASSET
========================================================= */

exports.updateAsset = async (req, res, next) => {

    try {

        await networthService.updateAsset(

            req.params.id,

            req.body

        );

        return res.redirect(
            `/networth/asset/${req.params.id}`
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

        const structure =
            await networthService.getStructureById(
                req.params.id
            );

        if (!structure) {

            return res.status(404).render("404", {

                title: "404 - Structure Not Found",

                user: req.user || null

            });

        }

        return res.render("networth-add", {

            title:
                `Add Asset - ${structure.item}`,

            structure

        });

    } catch (error) {

        next(error);

    }

};


/* =========================================================
   ADD MANUAL ASSET
========================================================= */

exports.addAsset = async (req, res, next) => {

    try {

        const asset =
            await networthService.addManualAsset(

                req.params.id,

                req.body

            );

        return res.redirect(
            `/networth/asset/${asset._id}`
        );

    } catch (error) {

        next(error);

    }

};