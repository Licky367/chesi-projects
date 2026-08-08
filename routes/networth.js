const express = require("express");

const router = express.Router();

const networthController = require("../controllers/networthController");


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
===============================.=========================== */

router.get(
    "/structure/:id/add",
    networthController.getAddAsset
);

router.post(
    "/structure/:id/add",
    networthController.addAsset
);


/* ==========================================================
   ASSET
========================================================== */

router.get(
    "/asset/:id",
    networthController.getAsset
);

router.post(
    "/asset/:id",
    networthController.updateAsset
);


module.exports = router;