const express = require("express");


const authController = require("../controllers/auth");

const router = express.Router();

router.get("/login", authController.showLogin);
router.post("/login", authController.login);

router.get("/register", authController.showRegister);
router.post("/register", authController.register);

// ----------------------------------------------------------
// ADMIN USER MANAGEMENT
// ----------------------------------------------------------

router.get(
    "/users",
    ...authController.showUsers
);

router.get(
    "/users/invitation",
    ...authController.showInvitation
);

router.post(
    "/users/invite",
    ...authController.inviteUser
);

router.post(
    "/users/:id/role",
    ...authController.changeRole
);

router.post(
    "/users/:id/substation",
    ...authController.assignSubstation
);

router.get("/logout", authController.logout);
router.post("/logout", authController.logout);

module.exports = router;
