// ==========================================================
// middleware/substationsUpload.js
// SUBSTATION IMAGE UPLOAD MIDDLEWARE
// ==========================================================

const multer = require("multer");
const path = require("path");
const fs = require("fs");


// ==========================================================
// UPLOAD DIRECTORY
// ==========================================================

const uploadDirectory = path.join(
  process.cwd(),
  "public",
  "uploads",
  "substations"
);


// ==========================================================
// ENSURE UPLOAD DIRECTORY EXISTS
// ==========================================================

fs.mkdirSync(uploadDirectory, {
  recursive: true
});


// ==========================================================
// STORAGE CONFIGURATION
// ==========================================================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory);
  },

  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname);

    const baseName = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();

    const uniqueName =
      `${Date.now()}-${Math.round(Math.random() * 1E9)}-${baseName}${extension.toLowerCase()}`;

    cb(null, uniqueName);
  }
});


// ==========================================================
// FILE FILTER
// ONLY IMAGE FILES ARE ALLOWED
// ==========================================================

const fileFilter = function (req, file, cb) {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif"
  ];

  const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif"
  ];

  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  if (
    allowedMimeTypes.includes(file.mimetype) &&
    allowedExtensions.includes(extension)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only JPG, JPEG, PNG, WEBP, and GIF images are allowed."
      )
    );
  }
};


// ==========================================================
// MULTER CONFIGURATION
// ==========================================================

const substationsUpload = multer({
  storage,

  fileFilter,

  limits: {
    // 10 MB per image
    fileSize: 10 * 1024 * 1024,

    // Maximum number of uploaded files
    files: 21
  }
});


// ==========================================================
// EXPORT
// ==========================================================
//
// substationIcon = one image
// images         = multiple images
//
// Usage:
// substationsUpload.fields([
//   { name: "substationIcon", maxCount: 1 },
//   { name: "images", maxCount: 20 }
// ])
// ==========================================================

module.exports = substationsUpload;