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
// UPDATE ROLE
// POST /accounts/:id/role
// ==========================================================

router.post(
  "/:id/role",
  controller.updateUserRole
);


// ==========================================================
// ASSIGN DAIRY FARM
// POST /accounts/:id/farms
// ==========================================================

router.post(
  "/:id/farms",
  controller.assignDairyFarm
);


// ==========================================================
// UNASSIGN DAIRY FARM
// POST /accounts/:id/farms/:farmId/unassign
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