// ==========================================================
// routes/storage.js
// STORAGE ROUTES
// ==========================================================

const express =
    require("express");

const router =
    express.Router();


// ==========================================================
// STORAGE INDEX CONTROLLER
// ==========================================================

const storageController =
    require("../controllers/storage/list");


// ==========================================================
// ADD STORAGE CONTROLLER
// ==========================================================

const addController =
    require("../controllers/storage/add");


// ==========================================================
// ADD STORAGE
// ==========================================================
//
// IMPORTANT:
// This MUST come before:
//
//     /:id
//
// Otherwise "add" can be interpreted as :id.
//
// ==========================================================

router.get(
    "/:id/add",
    addController.form
);


router.post(
    "/:id/add",
    addController.create
);


// ==========================================================
// STORAGE INDEX
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