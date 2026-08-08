const express = require("express");

const router =
    express.Router();

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

                title:
                    "401 - Unauthorized",

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

                title:
                    "403 - Forbidden",

                user:
                    req.user || null

            }
        );

    }


    next();

}


/* =========================================================
   NET WORTH OVERVIEW
========================================================= */

router.get(
    "/",
    adminOnly,
    controller.index
);


/* =========================================================
   STRUCTURE DETAILS
========================================================= */

router.get(
    "/structure/:id",
    adminOnly,
    controller.viewStructure
);


/* =========================================================
   ADD ASSET TO STRUCTURE — PAGE
========================================================= */

router.get(
    "/structure/:id/add",
    adminOnly,
    controller.addAssetPage
);


/* =========================================================
   ADD ASSET TO STRUCTURE — SUBMIT
========================================================= */

router.post(
    "/structure/:id/add",
    adminOnly,
    controller.addAsset
);


/* =========================================================
   ASSET DETAILS / EDIT PAGE
========================================================= */

router.get(
    "/asset/:id",
    adminOnly,
    controller.viewAsset
);


/* =========================================================
   UPDATE ASSET
========================================================= */

router.put(
    "/asset/:id",
    adminOnly,
    controller.updateAsset
);


/* =========================================================
   EXPORT
========================================================= */

module.exports =
    router;