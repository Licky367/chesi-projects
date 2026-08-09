const express = require("express");

const router = express.Router();

const updateAssetController =
    require("../controllers/networth/updateAsset");


/* ==========================================================
   UPDATE ASSET

   Mounted as:
       /networth

   Final endpoint:
       POST /networth/asset/:id
========================================================== */

router.post(
    "/asset/:id",
    updateAssetController.updateAsset
);


module.exports = router;