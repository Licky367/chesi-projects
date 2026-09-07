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

router.get(
    "/services/add",
    indexController.getAddService
);


router.post(
    "/services/add",
    indexController.createService
);


router.get(
    "/services/:id",
    indexController.getService
);


router.put(
    "/services/:id",
    indexController.updateService
);


/* ========================================================
   EXPORT
======================================================== */

module.exports = router;