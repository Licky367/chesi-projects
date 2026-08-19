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
// STORAGE INDEX
// ==========================================================
//
// GET:
//
//     /storage/:id
//
// :id = MongoDB _id of the PARENT DAIRY FARM.
//
// Example:
//
//     /storage/67xxxxxxxxxxxxxxxxxxxxxx
//
// The controller/service resolves:
//
//     Dairy._id
//          ↓
//     Dairy.code
//          ↓
//     DairyStorage.farmCode
//
// ==========================================================

router.get(
    "/:id",
    storageController.index
);


// ==========================================================
// ADD STORAGE FORM
// ==========================================================
//
// GET:
//
//     /storage/:id/add
//
// :id = MongoDB _id of the PARENT DAIRY FARM.
//
// ADMIN ONLY.
//
// The parent farm is identified by :id.
// The user does NOT enter farmCode.
//
// ==========================================================

router.get(
    "/:id/add",
    storageAddController.form
);


// ==========================================================
// CREATE STORAGE
// ==========================================================
//
// POST:
//
//     /storage/:id/add
//
// ADMIN ONLY.
//
// User submits:
//
//     name
//     type
//
// type:
//
//     room
//     agroStore
//
// Server determines:
//
//     farmCode
//     roomNumber
//
// ==========================================================

router.post(
    "/:id/add",
    storageAddController.create
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;