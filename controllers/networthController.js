const networthService =
require("../services/networthService");

/* =========================================================
NET WORTH ENTRY PAGE

Displays:

- Standalone Assets
- Dairy Farms
- Total Net Worth
  ========================================================= */

exports.index = async (req, res, next) => {

try {

    const data =
        await networthService.getNetWorthOverview();


    return res.render(
        "networth",
        {

            title:
                "Net Worth",

            totalNetWorth:
                data.totalNetWorth,

            standaloneAssets:
                data.standaloneAssets,

            structures:
                data.structures

        }
    );

} catch (error) {

    next(error);

}

};

/* =========================================================
DAIRY FARM ASSETS PAGE

:id = dairy._id

The selected Dairy record must be a Dairy Farm,
identified by its negative dairy.code.

The page displays assets belonging to that farm.
========================================================= */

exports.viewStructure = async (req, res, next) => {

try {

    const dairyId =
        req.params.id;


    const data =
        await networthService.getStructureDetails(
            dairyId
        );


    if (!data) {

        return res.status(404).render(
            "404",
            {

                title:
                    "404 - Dairy Farm Not Found",

                user:
                    req.user || null

            }
        );

    }


    const dairyFarm =
        data.structure;


    return res.render(
        "networth-structure",
        {

            title:
                `${dairyFarm.name || dairyFarm.item || "Dairy Farm"} - Net Worth`,

            structure:
                dairyFarm,

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
DAIRY / ASSET DETAILS PAGE

:id = dairy._id

The same page is used for:

- standalone positive-code Dairy records
- assets belonging to a Dairy Farm
- Dairy records without their own code

The service determines the actual Dairy record.
========================================================= */

exports.viewAsset = async (req, res, next) => {

try {

    const dairyId =
        req.params.id;


    const data =
        await networthService.getAssetDetails(
            dairyId
        );


    if (!data) {

        return res.status(404).render(
            "404",
            {

                title:
                    "404 - Dairy Asset Not Found",

                user:
                    req.user || null

            }
        );

    }


    return res.render(
        "networth-asset",
        {

            title:
                `${data.asset.name || data.asset.item || "Asset"} - Net Worth`,

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
UPDATE DAIRY / ASSET

:id = dairy._id

The service is responsible for enforcing the rule that
assetCode can only be manually changed for a Dairy
record that has a positive dairy.code.
========================================================= */

exports.updateAsset = async (req, res, next) => {

try {

    const dairyId =
        req.params.id;


    await networthService.updateAsset(

        dairyId,

        req.body

    );


    /*
     * Stay on the same Dairy record after saving.
     */

    return res.redirect(
        `/networth/asset/${dairyId}`
    );

} catch (error) {

    next(error);

}

};

/* =========================================================
ADD ASSET TO DAIRY FARM — PAGE

:id = dairyFarm._id

The selected Dairy Farm must have a negative code.

No asset code is entered in the form.
========================================================= */

exports.addAssetPage = async (req, res, next) => {

try {

    const dairyFarmId =
        req.params.id;


    const dairyFarm =
        await networthService.getStructureById(
            dairyFarmId
        );


    if (!dairyFarm) {

        return res.status(404).render(
            "404",
            {

                title:
                    "404 - Dairy Farm Not Found",

                user:
                    req.user || null

            }
        );

    }


    return res.render(
        "networth-add",
        {

            title:
                `Add Asset - ${dairyFarm.name || dairyFarm.item || "Dairy Farm"}`,

            structure:
                dairyFarm

        }
    );

} catch (error) {

    next(error);

}

};

/* =========================================================
ADD ASSET TO DAIRY FARM

:id = dairyFarm._id

IMPORTANT:

The submitted form does NOT contain assetCode.

The service must automatically assign:

   assetCode = dairyFarm.code

The new asset does not need its own dairy.code.
========================================================= */

exports.addAsset = async (req, res, next) => {

try {

    const dairyFarmId =
        req.params.id;


    const dairy =
        await networthService.addManualAsset(

            dairyFarmId,

            req.body

        );


    if (!dairy || !dairy._id) {

        throw new Error(
            "Asset was not created."
        );

    }


    return res.redirect(
        `/networth/asset/${dairy._id}`
    );

} catch (error) {

    next(error);

}

};