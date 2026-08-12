const express = require("express");
const router = express.Router();
const controller = require("../controllers/accountsController");


// ==========================================================
// LIST USERS
// GET /accounts
// ==========================================================

router.get(
  "/",
  controller.getAccountsPage
);


// ==========================================================
// USER PROFILE
// GET /accounts/:id
// ==========================================================

router.get(
  "/:id",
  controller.getAccountProfile
);


// ==========================================================
// UPDATE USER ROLE
// POST /accounts/:id/role
// ==========================================================

router.post(
  "/:id/role",
  controller.updateUserRole
);


// ==========================================================
// ASSIGN DAIRY FARM
// POST /accounts/:id/farms
//
// Adds a Dairy Farm to the user's assignedFarm array.
//
// Intended for dairyWorker users.
// ==========================================================

router.post(
  "/:id/farms",
  controller.assignDairyFarm
);


// ==========================================================
// UNASSIGN DAIRY FARM
// POST /accounts/:id/farms/:farmId/unassign
//
// Removes the selected Dairy Farm from the user's
// assignedFarm array.
// ==========================================================

router.post(
  "/:id/farms/:farmId/unassign",
  controller.unassignDairyFarm
);


// ==========================================================
// DELETE ACCOUNT
// POST /accounts/:id/delete
// ==========================================================

router.post(
  "/:id/delete",
  controller.deleteUser
);


module.exports = router;