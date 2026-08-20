// ==========================================================
// routes/storage.js
// STORAGE ROUTES
// ==========================================================
//
// ROUTES:
//
//     GET  /storage/:id
//     GET  /storage/:id/add
//     POST /storage/:id/add
//
// IMPORTANT:
//
//     :id = Dairy._id
//
// NEVER:
//
//     :id = Dairy.code
//     :id = DairyStorage._id
//     :id = roomNumber
//
// ==========================================================

const express =
    require("express");

const router =
    express.Router();

const storageController =
    require("../controllers/storage");


// ==========================================================
// STORAGE LIST
// ==========================================================
//
// GET:
//
//     /storage/:id
//
// Example:
//
//     /storage/68abc123...
//
// ==========================================================

router.get(
    "/:id",
    storageController.list
);


// ==========================================================
// ADD STORAGE FORM
// ==========================================================
//
// GET:
//
//     /storage/:id/add
//
// ==========================================================

router.get(
    "/:id/add",
    storageController.form
);


// ==========================================================
// CREATE STORAGE
// ==========================================================
//
// POST:
//
//     /storage/:id/add
//
// ==========================================================

router.post(
    "/:id/add",
    storageController.create
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;