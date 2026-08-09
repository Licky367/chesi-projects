const express = require("express");

const router = express.Router();

const updateAssetController =
    require("../controllers/networth/updateAsset");

const updateAssetUpload =
    require("../middleware/networthUpload");


router.post(
    "/asset/:id",
    updateAssetUpload,
    updateAssetController.updateAsset
);


module.exports = router;