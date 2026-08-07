const express = require("express");
const router = express.Router();
const controller = require("../controllers/accountsController");

// ================= LIST =================
router.get("/", controller.getAccountsPage);

// ================= PROFILE =================
router.get("/:id", controller.getAccountProfile);

// ================= UPDATE ROLE =================
router.post("/:id/role", controller.updateUserRole);

// ================= DELETE ACCOUNT =================
router.post("/:id/delete", controller.deleteUser);

module.exports = router;