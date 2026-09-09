const express = require("express");

const router = express.Router();

const indexController =
    require("../controllers/indexController");


/* ========================================================
   HOME PAGE
======================================================== */

router.get(
    "/",
    indexController.getHome
);


/* ========================================================
   SERVICES
======================================================== */

/* --------------------------------------------------------
   ADD SERVICE
-------------------------------------------------------- */

router.get(
    "/services/add",
    indexController.getAddService
);


router.post(
    "/services/add",
    indexController.createService
);


/* --------------------------------------------------------
   EDIT SERVICE
-------------------------------------------------------- */

router.get(
    "/services/add/:id",
    indexController.getEditService
);


router.post(
    "/services/add/:id",
    indexController.updateService
);


/* --------------------------------------------------------
   VIEW SERVICE
-------------------------------------------------------- */

router.get(
    "/services/:id",
    indexController.getService
);


/* ========================================================
   EXPORT
======================================================== */

module.exports = router;