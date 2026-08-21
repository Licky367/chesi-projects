// ==========================================================
// routes/storage.js
// STORAGE ROUTES
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
//
// GET
//     /storage/:dairyId/contents/:storageId
//
// :dairyId
//     = parent Dairy Farm ID
//
// :storageId
//     = storage facility ID
// ==========================================================

router.get(
    "/:dairyId/contents/:storageId",
    storageController.contents
);


// ==========================================================
// ADD ITEM DIRECTLY TO STORAGE - FORM
// ==========================================================
//
// GET
//     /storage/:dairyId/contents/:storageId/add/:storageType
//
// Examples:
//
//     /storage/DAIRY_ID/contents/STORAGE_ID/add/room
//
//     /storage/DAIRY_ID/contents/STORAGE_ID/add/agroStore
//
// :dairyId
//     = parent Dairy Farm ID
//
// :storageId
//     = selected storage facility ID
//
// :storageType
//     = exact storage type
//
// Supported values:
//
//     room
//     agroStore
//
// The storage type is supplied explicitly by the URL.
// ==========================================================

router.get(
    "/:dairyId/contents/:storageId/add/:storageType",
    storageController.addNewForm
);


// ==========================================================
// ADD ITEM TO STORAGE
// ==========================================================
//
// POST
//     /storage/:dairyId/contents/:storageId/add/:storageType
//
// The storage type is supplied explicitly by the URL.
// ==========================================================

router.post(
    "/:dairyId/contents/:storageId/add/:storageType",
    storageController.addNewItem
);


// ==========================================================
// OMIT ITEMS FROM STORAGE
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
// UPDATE STORAGE QUANTITY
// ==========================================================

router.post(
    "/:dairyId/contents/:storageId/quantity",
    storageController.updateQuantity
);


module.exports = router;