const express = require("express");

const router = express.Router();

const liabilityController = require("../controllers/liabilityController");


/* =========================================================
   ADMIN ACCESS
========================================================= */

function isAdmin(req, res, next) {

    if (
        !req.session ||
        !req.session.user ||
        req.session.user.role !== "admin"
    ) {

        return res.status(403).send("Access denied");

    }

    next();

}


/* =========================================================
   LIABILITY PAGE
========================================================= */

router.get(
    "/liability",
    isAdmin,
    liabilityController.showLiabilityPage
);


/* =========================================================
   SAVE LIABILITY
========================================================= */

router.post(
    "/liability",
    isAdmin,
    liabilityController.createLiability
);


/* =========================================================
   LIABILITY SUMMARY
========================================================= */

router.get(
    "/liabilitysummary",
    isAdmin,
    liabilityController.showLiabilitySummary
);


/* =========================================================
   EXPORT
========================================================= */

module.exports = router;