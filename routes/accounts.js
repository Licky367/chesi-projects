// ==========================================================
// routes/accounts.js
// ==========================================================

const express =
  require("express");

const router =
  express.Router();

const accountsController =
  require("../controllers/accountsController");


// ==========================================================
// USERS
// ==========================================================

router.get(
  "/",
  accountsController.getAccountsPage
);


// ==========================================================
// USER PROFILE
// ==========================================================

router.get(
  "/:id",
  accountsController.getAccountProfile
);


// ==========================================================
// UPDATE ROLE
// ==========================================================

router.post(
  "/:id/role",
  accountsController.updateUserRole
);


// ==========================================================
// ASSIGN DAIRY FARMS
// ==========================================================

router.post(
  "/:id/farms",
  accountsController.assignDairyFarms
);


// ==========================================================
// UNASSIGN DAIRY FARM
// ==========================================================

router.post(
  "/:id/farms/:farmId/unassign",
  accountsController.unassignDairyFarm
);


// ==========================================================
// ASSIGN STANDALONE ASSETS
// ==========================================================

router.post(
  "/:id/assets",
  accountsController.assignDairyAssets
);


// ==========================================================
// UNASSIGN STANDALONE ASSET
// ==========================================================

router.post(
  "/:id/assets/:assetId/unassign",
  accountsController.unassignDairyAsset
);


// ==========================================================
// DELETE USER
// ==========================================================

router.post(
  "/:id/delete",
  accountsController.deleteUser
);


module.exports = router;