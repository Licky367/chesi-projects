const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

// ================= ROUTES =================

// SIGNUP
router.get("/signup", authController.renderSignup);
router.post("/signup", authController.signup);

// LOGIN
router.get("/login", authController.renderLogin);
router.post("/login", authController.login);

// LOGOUT
router.get("/logout", authController.logout);

// FORGOT PASSWORD
router.get("/forgot-password", authController.renderForgot);
router.post("/forgot-password", authController.forgotPassword);

// RESET PASSWORD
router.get("/reset-password/:token", authController.renderReset);
router.post("/reset-password/:token", authController.resetPassword);

module.exports = router;