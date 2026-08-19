// ==========================================================
// routes/storage.js
// STORAGE ROUTES
// ==========================================================

const express =
    require("express");

const router =
    express.Router();

const storageController =
    require("../controllers/storage/list");

const storageAddController =
    require("../controllers/storage/add");


// ==========================================================
// STORAGE INDEX
//
// GET:
//
//     /storage/:id
//
// :id = parent Dairy._id
// ==========================================================

router.get(
    "/:id",
    storageController.index
);


// ==========================================================
// ADD STORAGE FORM
//
// GET:
//
//     /storage/:id/add
//
// :id = parent Dairy._id
// ==========================================================

router.get(
    "/:id/add",
    storageAddController.form
);


// ==========================================================
// CREATE STORAGE
//
// POST:
//
//     /storage/:id/add
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