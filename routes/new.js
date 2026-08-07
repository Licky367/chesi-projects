const express = require("express");
const router = express.Router();

const fs = require("fs");
const multer = require("multer");
const path = require("path");

const newController = require("../controllers/newController");

const uploadDir = path.join(__dirname, "../public/uploads");
fs.mkdirSync(uploadDir, { recursive: true });

// =========================
// MULTER STORAGE SETUP
// =========================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);

    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });


// =========================
// ROUTES
// =========================

// Show form
router.get("/new", newController.showForm);

// Handle form submission with image upload
router.post("/new", upload.single("profileImage"), newController.createRecord);

module.exports = router;