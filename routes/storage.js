// ==========================================================
// routes/storage.js
// STORAGE ROUTES
// ==========================================================

const express = require("express");

const router =
    express.Router();

const storageController =
    require("../controllers/storage");

const uploadMiddleware =
    require("../middleware/uploadMiddleware");


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
//
//     /storage/:dairyId/contents/:storageId
//
// :dairyId
//     = parent Dairy Farm ID
//
// :storageId
//     = storage facility ID
//
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
//
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
// IMPORTANT:
//
//     storageType is supplied explicitly by the URL.
//
//     "agroStore" is case-sensitive.
//
// ==========================================================

router.get(
    "/:dairyId/contents/:storageId/add/:storageType",
    storageController.addNewForm
);


// ==========================================================
// ADD ITEM DIRECTLY TO STORAGE
// ==========================================================
//
// POST
//
//     /storage/:dairyId/contents/:storageId/add/:storageType
//
// The form uses:
//
//     enctype="multipart/form-data"
//
// Therefore the upload middleware MUST execute before:
//
//     storageController.addNewItem
//
// This allows:
//
//     req.body.name
//     req.body.recordType
//     req.body.type
//     req.body.quantity
//     req.body.unit
//     req.body.mass
//     req.body.buyingPrice
//     req.body.currentWorth
//     req.body.description
//     req.body.condition
//     req.body.location
//     req.body.status
//
// to be populated correctly.
//
// The uploaded profile image is made available through:
//
//     req.file
//
// ==========================================================

router.post(
    "/:dairyId/contents/:storageId/add/:storageType",
    uploadMiddleware.single("profileImage"),
    storageController.addNewItem
);


// ==========================================================
// OMIT ITEMS FROM STORAGE
// ==========================================================
//
// POST
//
//     /storage/:dairyId/contents/:storageId/omit
//
// ==========================================================

router.post(
    "/:dairyId/contents/:storageId/omit",
    storageController.omitItems
);


// ==========================================================
// RESHUFFLE ITEMS
// ==========================================================
//
// POST
//
//     /storage/:dairyId/contents/:storageId/reshuffle
//
// ==========================================================

router.post(
    "/:dairyId/contents/:storageId/reshuffle",
    storageController.reshuffleItems
);


// ==========================================================
// UPDATE STORAGE QUANTITY
// ==========================================================
//
// POST
//
//     /storage/:dairyId/contents/:storageId/quantity
//
// ==========================================================

router.post(
    "/:dairyId/contents/:storageId/quantity",
    storageController.updateQuantity
);


// ==========================================================
// EXPORT ROUTER
// ==========================================================

module.exports =
    router;