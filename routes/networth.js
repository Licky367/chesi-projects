const express = require("express");

const router = express.Router();

const controller = require("../controllers/networthController");


/* =========================================================
   AUTHORIZATION
   ONLY ADMIN CAN ACCESS NET WORTH
========================================================= */

function adminOnly(req, res, next) {

    if (!req.session || !req.session.user) {

        return res.status(401).render("401", {
            title: "401 - Unauthorized",
            user: req.user || null
        });

    }

    if (req.session.user.role !== "admin") {

        return res.status(403).render("403", {
            title: "403 - Forbidden",
            user: req.user || null
        });

    }

    next();

}


/* =========================================================
   NET WORTH ENTRY PAGE
========================================================= */

router.get(
    "/",
    adminOnly,
    controller.index
);


/* =========================================================
   STRUCTURE ASSETS PAGE
========================================================= */

router.get(
    "/structure/:id",
    adminOnly,
    controller.viewStructure
);


/* =========================================================
   ASSET DETAILS / UPDATE PAGE
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
   ADD MANUAL ASSET TO STRUCTURE
========================================================= */

router.get(
    "/structure/:id/add",
    adminOnly,
    controller.addAssetPage
);

router.post(
    "/structure/:id/add",
    adminOnly,
    controller.addAsset
);


/* =========================================================
   EXPORT
========================================================= */

module.exports = router;