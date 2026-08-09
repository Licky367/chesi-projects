const express = require("express");

const router = express.Router();

const updateNetController =
    require("../controllers/networthUpdate");


/* ==========================================================
   MAIN NET WORTH
========================================================== */

router.get(
    "/",
    updateNetController.getNetWorth
);


/* ==========================================================
   DAIRY FARM
========================================================== */

router.get(
    "/structure/:id",
    updateNetController.getDairyFarm
);


/* ==========================================================
   ADD ASSET TO DAIRY FARM
========================================================== */

router.get(
    "/structure/:id/add",
    updateNetController.getAddAsset
);

router.post(
    "/structure/:id/add",
    updateNetController.addAsset
);


/* ==========================================================
   ASSET
========================================================== */

router.get(
    "/asset/:id",
    updateNetController.getAsset
);


/* ==========================================================
   UPDATE ASSET
========================================================== */

router.post(
    "/asset/:id",
    updateNetController.updateAsset
);


module.exports = router;