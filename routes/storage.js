// ==========================================================
// routes/storage.js
// STORAGE ROUTES
// ==========================================================
//
// GET
//     /storage/:id
//     /storage/:id/add
//     /storage/:dairyId/contents/:storageId
//
// POST
//     /storage/:id/add
//     /storage/:dairyId/contents/:storageId/add
//     /storage/:dairyId/contents/:storageId/omit
//     /storage/:dairyId/contents/:storageId/reshuffle
//
// ==========================================================

const express = require("express");

const router = express.Router();

const storageController = require("../controllers/storage");


// ==========================================================
// STORAGE LIST
// ==========================================================

router.get(
    "/:id",
    storageController.list
);


// ==========================================================
// ADD STORAGE FORM
// ==========================================================

router.get(
    "/:id/add",
    storageController.form
);


// ==========================================================
// CREATE STORAGE
// ==========================================================

router.post(
    "/:id/add",
    storageController.create
);


// ==========================================================
// STORAGE CONTENTS
// ==========================================================

router.get(
    "/:dairyId/contents/:storageId",
    storageController.contents
);


// ==========================================================
// ADD ITEMS
// ==========================================================

router.post(
    "/:dairyId/contents/:storageId/add",
    storageController.addItems
);


// ==========================================================
// OMIT ITEMS
// ==========================================================

router.post(
    "/:dairyId/contents/:storageId/omit",
    storageController.omitItems
);


// ==========================================================
// RESHUFFLE ITEMS
// ==========================================================

router.post(
    "/:dairyId/contents/:storageId/reshuffle",
    storageController.reshuffleItems
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports = router;