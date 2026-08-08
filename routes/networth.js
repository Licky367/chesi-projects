const express = require("express");

const router = express.Router();

const networkController = require("../controllers/networkController");


/* ==========================================================
   NET WORTH
========================================================== */

/*
 * GET /networth
 *
 * Main Net Worth page.
 *
 * Displays:
 *   - Total Net Worth
 *   - Standalone Assets
 *   - Dairy Farms
 */
router.get(
    "/",
    networkController.getNetWorth
);


/* ==========================================================
   DAIRY FARM
========================================================== */

/*
 * GET /networth/structure/:id
 *
 * Displays a specific Dairy Farm and all assets
 * assigned to that farm.
 */
router.get(
    "/structure/:id",
    networkController.getDairyFarm
);


/* ==========================================================
   ADD ASSET
========================================================== */

/*
 * GET /networth/structure/:id/add
 *
 * Displays the Add Asset form for a specific
 * Dairy Farm.
 */
router.get(
    "/structure/:id/add",
    networkController.getAddAsset
);


/*
 * POST /networth/structure/:id/add
 *
 * Creates a new asset directly under the specified
 * Dairy Farm.
 */
router.post(
    "/structure/:id/add",
    networkController.addAsset
);


/* ==========================================================
   ASSET
========================================================== */

/*
 * GET /networth/asset/:id
 *
 * Displays the details/edit page for a Dairy asset.
 */
router.get(
    "/asset/:id",
    networkController.getAsset
);


/*
 * POST /networth/asset/:id
 *
 * Updates an existing Dairy asset.
 *
 * The supplied EJS form uses:
 *
 *     _method=PUT
 *
 * Therefore this route is compatible with either:
 *
 *   - method-override
 *   - a controller that handles the POST directly
 *
 * We keep the route POST-based to match the actual
 * HTML form submission.
 */
router.post(
    "/asset/:id",
    networkController.updateAsset
);


module.exports = router;