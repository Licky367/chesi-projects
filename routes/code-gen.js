// ==========================================================
// routes/code-gen.js
// STORAGE URL CODE GENERATOR ROUTES
// ==========================================================
//
// PURPOSE:
//
//     Provides a diagnostic page showing all storage URLs
//     generated from the Dairy model.
//
// ROUTE:
//
//     GET /update/storage/code-gen
//
// CONTROLLER:
//
//     controllers/update/storage/code-gen.js
//
// ==========================================================

const express = require("express");

const router = express.Router();

const controller = require("../controllers/update/storage/code-gen");

// ==========================================================
// CODE GENERATOR PAGE
// ==========================================================
//
// Displays all generated storage URLs.
//
// ==========================================================

router.get(
    "/storage/code-gen",
    controller.index
);

// ==========================================================
// EXPORT
// ==========================================================

module.exports = router;