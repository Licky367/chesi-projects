const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const authController = require("../../controllers/corevester/auth");

// ==========================================================
// MULTER - PROFILE IMAGE (optional for Corevester)
// ==========================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/profiles");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"), false);
  },
});

// ==========================================================
// PAGE ROUTES
// ==========================================================
router.get("/signup", authController.renderSignup);
router.get("/login", authController.renderLogin);
router.get("/forgot-password", authController.renderForgot);
router.get("/reset-password/:token", authController.renderReset);

// ==========================================================
// API ROUTES
// ==========================================================
router.post("/signup", upload.single("profileImage"), authController.signup);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password/:token", authController.resetPassword);

// ==========================================================
// LOGOUT
// ==========================================================
router.get("/logout", authController.logout);

module.exports = router;