// ==========================================================
// routes/storage.js
// STORAGE ROUTES
// ==========================================================

const express = require("express");

const router = express.Router();

const storageController =
    require("../controllers/storage");


// ==========================================================
// STORAGE INDEX
// ==========================================================
//
// GET /storage
//
// Optional filter:
//
//     /storage?type=all
//     /storage?type=room
//     /storage?type=agroStore
//
// Default:
//
//     /storage
//
// displays everything.
// ==========================================================

router.get(
    "/storage",
    storageController.index
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports = router;