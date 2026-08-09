// ==========================================================
// routes/networth.js
// ==========================================================

const express = require("express");

const router =
    express.Router();


// ==========================================================
// EXISTING NET WORTH CONTROLLER
//
// Handles the routes that have not yet been migrated.
// ==========================================================

const networthController =
    require("../controllers/networthController");


// ==========================================================
// ASSET UPDATE CONTROLLER
//
// File:
//     controllers/networth/updateAsset.js
// ==========================================================

const updateAssetController =
    require("../controllers/networth/updateAsset");


// ==========================================================
// MAIN NET WORTH
//
// Mounted in server as:
//
//     /networth
//
// Therefore this route becomes:
//
//     GET /networth
// ==========================================================

router.get(
    "/",
    networthController.getNetWorth
);


// ==========================================================
// DAIRY FARM
//
// GET /networth/structure/:id
// ==========================================================

router.get(
    "/structure/:id",
    networthController.getDairyFarm
);


// ==========================================================
// ADD ASSET
//
// GET  /networth/structure/:id/add
// POST /networth/structure/:id/add
// ==========================================================

router.get(
    "/structure/:id/add",
    networthController.getAddAsset
);

router.post(
    "/structure/:id/add",
    networthController.addAsset
);


// ==========================================================
// ASSET DETAILS / EDIT PAGE
//
// GET /networth/asset/:id
// ==========================================================

router.get(
    "/asset/:id",
    networthController.getAsset
);


// ==========================================================
// UPDATE ASSET
//
// POST /networth/asset/:id
//
// The EJS form uses:
//
//     method="POST"
//
// and:
//
//     _method="PUT"
//
// The actual update handler is:
//
//     controllers/networth/updateAsset.js
// ==========================================================

router.post(
    "/asset/:id",
    updateAssetController.updateAsset
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;