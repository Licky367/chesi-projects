// ==========================================================
// routes/storage.js
// STORAGE ROUTES
// ==========================================================
//
// CONTROLLER:
//
//     controllers/storage/storageController.js
//
// ALL ROUTE IDS:
//
//     :id = parent Dairy._id
//
// IMPORTANT:
//
//     :id is NEVER Dairy.code.
//
// Relationship:
//
//     :id
//       ↓
//     Dairy._id
//       ↓
//     Dairy.code
//       ↓
//     DairyStorage.farmCode
//
// ==========================================================


const express =
    require("express");


const router =
    express.Router();


// ==========================================================
// STORAGE CONTROLLER
// ==========================================================
//
// All storage operations are handled by:
//
//     controllers/storage/storageController.js
//
// This includes:
//
//     storage listing
//     add storage form
//     create storage
//
// ==========================================================

const storageController =
    require("../controllers/storage/storageController");


// ==========================================================
// ADD STORAGE FORM
// ==========================================================
//
// GET:
//
//     /storage/:id/add
//
// :id:
//
//     Parent Dairy._id
//
// Example:
//
//     /storage/67xxxxxxxxxxxxxxxxxxxxxx/add
//
// IMPORTANT:
//
// This route MUST come before:
//
//     /storage/:id
//
// Otherwise "add" could potentially be interpreted
// as the :id parameter.
//
// ==========================================================

router.get(
    "/:id/add",
    storageController.addForm
);


// ==========================================================
// CREATE STORAGE
// ==========================================================
//
// POST:
//
//     /storage/:id/add
//
// :id:
//
//     Parent Dairy._id
//
// User submits:
//
//     name
//     type
//
// Server determines:
//
//     farmCode
//     roomNumber
//
// ==========================================================

router.post(
    "/:id/add",
    storageController.create
);


// ==========================================================
// STORAGE PAGE
// ==========================================================
//
// GET:
//
//     /storage/:id
//
// :id:
//
//     Parent Dairy._id
//
// This displays the storage facilities belonging to
// that specific Dairy Farm.
//
// ==========================================================

router.get(
    "/:id",
    storageController.index
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;