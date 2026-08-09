// ==========================================================
// routes/add.js
// ADD DAIRY / ANIMAL / STRUCTURE ROUTES
// ==========================================================

const express = require("express");

const router = express.Router();


// ==========================================================
// CONTROLLER
// ==========================================================

const {

    getAddPage,

    createRecord

} = require("../controllers/addController");


// ==========================================================
// OPTIONAL UPLOAD MIDDLEWARE
// ==========================================================
//
// Keep this import if your project already has an upload
// middleware for profileImage.
//
// If your existing middleware has a different path/name,
// change ONLY this import.
//
// ==========================================================

const upload =
    require("../middleware/uploadMiddleware");


// ==========================================================
// GET ADD PAGE
// ==========================================================

router.get(
    "/",
    getAddPage
);


// ==========================================================
// CREATE RECORD
// ==========================================================
//
// The EJS form uses:
//
// enctype="multipart/form-data"
//
// Therefore multer must process profileImage before
// the controller receives the request.
//
// ==========================================================

router.post(
    "/",
    upload.single("profileImage"),
    createRecord
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports = router;