const express = require("express");

const router = express.Router();


/* ==========================================================
   CONTROLLERS
========================================================== */

const indexController =
    require("../controllers/networth/entry");

const structuresController =
    require("../controllers/networth/structures");

const addController =
    require("../controllers/networth/add");

const updateAssetController =
    require("../controllers/networth/updateAsset");


/* ==========================================================
   MIDDLEWARE
========================================================== */

const updateAssetUpload =
    require("../middleware/networthUpload");


/* ==========================================================
   NET WORTH INDEX
========================================================== */

/*
 * GET /networth
 *
 * Displays:
 *
 *   - Total Net Worth
 *   - Standalone Assets
 *   - Dairy Farms
 */

router.get(
    "/",
    indexController.getNetWorth
);


/* ==========================================================
   DAIRY FARM STRUCTURE
========================================================== */

/*
 * GET /networth/structure/:id
 *
 * Displays a Dairy Farm and its assigned assets.
 */

router.get(
    "/structure/:id",
    structuresController.getDairyFarm
);


/* ==========================================================
   ADD ASSET
========================================================== */

/*
 * GET /networth/structure/:id/add
 *
 * Displays the Add Asset page.
 */

router.get(
    "/structure/:id/add",
    addController.getAddAsset
);


/*
 * POST /networth/structure/:id/add
 *
 * Creates a new manual asset for the Dairy Farm.
 */

router.post(
    "/structure/:id/add",
    addController.addAsset
);


/* ==========================================================
   UPDATE ASSET
========================================================== */

/*
 * POST /networth/asset/:id
 *
 * Updates an existing asset.
 *
 * Upload middleware handles profile image replacement.
 */

router.post(
    "/asset/:id",
    updateAssetUpload,
    updateAssetController.updateAsset
);


module.exports = router;