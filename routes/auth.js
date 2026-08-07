const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const authController = require("../controllers/authController");

const uploadDir = path.join(__dirname, "../public/uploads");
fs.mkdirSync(uploadDir, { recursive: true });

// ===== FILE UPLOAD CONFIG =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// ================= ROUTES =================

// SIGNUP
router.get("/signup", authController.renderSignup);
router.post("/signup", upload.single("profileImage"), authController.signup);

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