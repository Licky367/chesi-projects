const express = require("express");

const router = express.Router();

const structuresController =
    require("../controllers/networth/structures");


/* ==========================================================
   DAIRY FARM STRUCTURE
========================================================== */

router.get(
    "/structure/:id",
    structuresController.getDairyFarm
);


/* ==========================================================
   ADD ASSET TO DAIRY FARM
========================================================== */

router.get(
    "/structure/:id/add",
    structuresController.getAddAsset
);


router.post(
    "/structure/:id/add",
    structuresController.addAsset
);


module.exports = router;