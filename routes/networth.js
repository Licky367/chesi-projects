const express = require("express");

const router = express.Router();


const updateAssetController =
    require("../controllers/networth/updateAsset");


/* ==========================================================
   MAIN NET WORTH
========================================================== */

router.get(
    "/",
    networthController.getNetWorth
);


/* ==========================================================
   DAIRY FARM
========================================================== */

router.get(
    "/structure/:id",
    networthController.getDairyFarm
);


/* ==========================================================
   ADD ASSET TO DAIRY FARM
========================================================== */

router.get(
    "/structure/:id/add",
    networthController.getAddAsset
);

router.post(
    "/structure/:id/add",
    networthController.addAsset
);


/* ==========================================================
   ASSET DETAILS / EDIT PAGE
========================================================== */

router.get(
    "/asset/:id",
    networthController.getAsset
);


/* ==========================================================
   UPDATE ASSET
========================================================== */

router.post(
    "/asset/:id",
    updateAssetController.updateAsset
);


module.exports = router;