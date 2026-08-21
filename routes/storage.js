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

router.get(
    "/:dairyId/contents/:storageId",
    storageController.contents
);


// ==========================================================
// ADD ITEM DIRECTLY TO STORAGE - FORM
// ==========================================================
//
// GET
//     /storage/:dairyId/contents/:storageId/add
//
// The parent Dairy and selected storage are resolved by the
// controller/service. The browser does not choose destination.
// ==========================================================

router.get(
    "/:dairyId/contents/:storageId/add",
    storageController.addNewForm
);


// ==========================================================
// ADD ITEMS TO STORAGE
// ==========================================================

router.post(
    "/:dairyId/contents/:storageId/add",
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