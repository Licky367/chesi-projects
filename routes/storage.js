// ==========================================================
// routes/storage.js
// STORAGE ROUTES
// ==========================================================

const express =
    require("express");

const router =
    express.Router();

const storageController =
    require("../controllers/storage");

const storageAddController =
    require("../controllers/storage/add");


// ==========================================================
// STORAGE ADD
// ==========================================================
//
// GET:
//
//     /storage/:id/add
//
// :id = MongoDB _id of the PARENT DAIRY FARM.
//
// The controller will:
//
//     1. Verify the logged-in user is an admin.
//     2. Find the parent Dairy using Dairy._id.
//     3. Read the parent's dairy.code.
//     4. Pass that farm code to the add service.
//
// The user does NOT enter:
//
//     farmCode
//
// The server determines it automatically.
//
// ==========================================================

router.get(
    "/:id/add",
    storageAddController.form
);


// ==========================================================
// STORAGE CREATE
// ==========================================================
//
// POST:
//
//     /storage/:id/add
//
// The user submits:
//
//     name
//     type
//
// Allowed type:
//
//     room
//     agroStore
//
// The server determines:
//
//     farmCode
//     roomNumber
//
// Automatically.
//
// Example:
//
//     Parent Dairy:
//
//         _id  = 67xxxxxxxxxxxxxxxxxxxxxx
//         code = -1
//
//     First room:
//
//         farmCode   = -1
//         roomNumber = 1
//
//     First AgroStore:
//
//         farmCode   = -1
//         roomNumber = -1
//
// ==========================================================

router.post(
    "/:id/add",
    storageAddController.create
);


// ==========================================================
// STORAGE INDEX
// ==========================================================
//
// GET:
//
//     /storage/:id
//
// :id = MongoDB _id of the PARENT DAIRY FARM.
//
// The service resolves:
//
//     Dairy._id
//          ↓
//     Dairy.code
//          ↓
//     DairyStorage.farmCode
//
// ==========================================================
//
// DEFAULT:
//
//     /storage/:id
//
// ALL ACTIVE STORAGE
//
// ----------------------------------------------------------
//
// ROOMS ONLY:
//
//     /storage/:id?type=room
//
// ----------------------------------------------------------
//
// AGROSTORES ONLY:
//
//     /storage/:id?type=agroStore
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