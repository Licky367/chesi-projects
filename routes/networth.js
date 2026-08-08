const express = require("express");

const router = express.Router();

const controller =
    require("../controllers/networthController");


/* =========================================================
   AUTHORIZATION
   ONLY ADMIN CAN ACCESS NET WORTH
========================================================= */

function adminOnly(req, res, next) {

    /* -----------------------------------------------------
       USER SESSION CHECK
    ----------------------------------------------------- */

    if (
        !req.session ||
        !req.session.user
    ) {

        return res.status(401).render(
            "401",
            {
                title: "401 - Unauthorized",

                user:
                    req.user || null
            }
        );

    }


    /* -----------------------------------------------------
       ADMIN ROLE CHECK
    ----------------------------------------------------- */

    if (
        req.session.user.role !== "admin"
    ) {

        return res.status(403).render(
            "403",
            {
                title: "403 - Forbidden",

                user:
                    req.user || null
            }
        );

    }


    next();

}


/* =========================================================
   NET WORTH OVERVIEW

   Displays:
   - Standalone Assets
   - Dairy Farms
========================================================= */

router.get(
    "/",
    adminOnly,
    controller.index
);


/* =========================================================
   DAIRY FARM DETAILS

   Uses:
       Dairy._id

   The selected Dairy Farm is identified by its negative
   Dairy code.

   The page displays assets assigned to that farm.
========================================================= */

router.get(
    "/structure/:id",
    adminOnly,
    controller.viewStructure
);


/* =========================================================
   ADD ASSET TO DAIRY FARM — PAGE

   The Dairy Farm is identified by:
       Dairy._id

   When an asset is created, its assetCode will be
   automatically assigned from the Dairy Farm's code.

   The new asset does NOT require its own Dairy code.
========================================================= */

router.get(
    "/structure/:id/add",
    adminOnly,
    controller.addAssetPage
);


/* =========================================================
   ADD ASSET TO DAIRY FARM — SUBMIT

   The controller is responsible for automatically setting:

       assetCode = dairyFarm.code

   No asset code is submitted by the form.
========================================================= */

router.post(
    "/structure/:id/add",
    adminOnly,
    controller.addAsset
);


/* =========================================================
   ASSET / DAIRY DETAILS

   Uses:
       Dairy._id

   This is the same details page whether the Dairy record
   is:

   - a standalone positive-code Dairy, or
   - an asset belonging to a Dairy Farm.
========================================================= */

router.get(
    "/asset/:id",
    adminOnly,
    controller.viewAsset
);


/* =========================================================
   UPDATE ASSET / DAIRY

   Uses:
       Dairy._id

   Asset code may only be edited when the Dairy record
   contains a positive Dairy code.
========================================================= */

router.put(
    "/asset/:id",
    adminOnly,
    controller.updateAsset
);


/* =========================================================
   EXPORT
========================================================= */

module.exports = router;