// ==========================================================
// corevester/roots/auth.js
// COREVESTER AUTH ROUTES
// ==========================================================

const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth");

// ==========================================================
// LOGIN
// ==========================================================

router.get(
    "/login",
    authController.showLogin
);

router.post(
    "/login",
    authController.login
);

// ==========================================================
// REGISTER
// ==========================================================

router.get(
    "/register",
    authController.showRegister
);

router.post(
    "/register",
    authController.register
);

// ==========================================================
// LOGOUT
// ==========================================================

router.get(
    "/logout",
    authController.logout
);

router.post(
    "/logout",
    authController.logout
);

module.exports = router;
