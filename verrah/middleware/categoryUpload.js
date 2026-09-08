// ==========================================================
// verrah/middleware/categoryUpload.js
// CATEGORY IMAGE UPLOAD MIDDLEWARE
// ==========================================================

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ----------------------------------------------------------
// UPLOAD DIRECTORY
// ----------------------------------------------------------

const uploadDirectory = path.join(
  process.cwd(),
  "public",
  "uploads",
  "categories"
);

// Ensure the directory exists.
fs.mkdirSync(uploadDirectory, {
  recursive: true
});

// ----------------------------------------------------------
// STORAGE
// ----------------------------------------------------------

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory);
  },

  filename: function (req, file, cb) {
    const extension =
      path.extname(file.originalname).toLowerCase();

    const baseName =
      path
        .basename(file.originalname, extension)
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .replace(/-+/g, "-")
        .toLowerCase();

    const uniqueName =
      `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}-${baseName}${extension}`;

    cb(null, uniqueName);
  }
});

// ----------------------------------------------------------
// IMAGE FILTER
// ----------------------------------------------------------

function imageFilter(req, file, cb) {
  const allowedMimeTypes = [
    "image/jpeg",
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

  const extension =
    path.extname(file.originalname).toLowerCase();

  if (
    allowedMimeTypes.includes(file.mimetype) &&
    allowedExtensions.includes(extension)
  ) {
    return cb(null, true);
  }

  return cb(
    new multer.MulterError("LIMIT_UNEXPECTED_FILE"),
    false
  );
}

// ----------------------------------------------------------
// MULTER INSTANCE
// ----------------------------------------------------------

const categoryUpload = multer({
  storage,

  fileFilter: imageFilter,

  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

// ----------------------------------------------------------
// EXPORT
// ----------------------------------------------------------

module.exports = categoryUpload;