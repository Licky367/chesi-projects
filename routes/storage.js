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
//     GET  /storage/:dairyId/contents/:storageId
//
//     POST /storage/:dairyId/contents/:storageId/add
//     POST /storage/:dairyId/contents/:storageId/omit
//     POST /storage/:dairyId/contents/:storageId/reshuffle
//
// IMPORTANT:
//
//     dairyId:
//         = Dairy._id of the parent Dairy Farm.
//
//     storageId:
//         = DairyStorage._id of the specific Room / AgroStore.
//
//     Allocation is controlled by:
//
//         Dairy.assetCode
//             = parent Dairy.code
//
//         Dairy.dwellNumber
//             = DairyStorage.roomNumber
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
// :id = Dairy Farm._id
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
// :id = Dairy Farm._id
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
// :id = Dairy Farm._id
//
// ==========================================================

router.post(
    "/:id/add",
    storageController.create
);


// ==========================================================
// STORAGE CONTENTS
// ==========================================================
//
// GET:
//
//     /storage/:dairyId/contents/:storageId
//
// dairyId:
//     Parent Dairy Farm._id
//
// storageId:
//     DairyStorage._id
//
// ==========================================================

router.get(
    "/:dairyId/contents/:storageId",
    storageController.contents
);


// ==========================================================
// ADD ITEMS TO STORAGE
// ==========================================================
//
// POST:
//
//     /storage/:dairyId/contents/:storageId/add
//
// PURPOSE:
//
//     Add selected Dairy records to this Room / AgroStore.
//
// RULE:
//
//     Selected records must:
//
//         assetCode = parent Dairy Farm.code
//
//     AND:
//
//         dwellNumber = null
//
//     After validation:
//
//         dwellNumber = storage.roomNumber
//
// The controller/service should validate that the selected
// records actually belong to the parent farm.
//
// ==========================================================

router.post(
    "/:dairyId/contents/:storageId/add",
    storageController.addItems
);


// ==========================================================
// OMIT ITEMS FROM STORAGE
// ==========================================================
//
// POST:
//
//     /storage/:dairyId/contents/:storageId/omit
//
// PURPOSE:
//
//     Remove selected items from this Room / AgroStore.
//
// RULE:
//
//     dwellNumber = null
//
// IMPORTANT:
//
//     assetCode is NOT changed.
//
//     The item therefore remains an asset/animal of the
//     parent farm, but is no longer allocated to a storage
//     facility.
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
// POST:
//
//     /storage/:dairyId/contents/:storageId/reshuffle
//
// PURPOSE:
//
//     Move selected items from the current Room / AgroStore
//     to another storage facility.
//
// RULE:
//
//     If current storage is a Room:
//
//         destination must be a Room.
//
//     If current storage is an AgroStore:
//
//         destination must be an AgroStore.
//
//     Destination must belong to the same parent Dairy Farm.
//
//     Selected items:
//
//         dwellNumber = destination.roomNumber
//
//     assetCode remains unchanged.
//
// ==========================================================

router.post(
    "/:dairyId/contents/:storageId/reshuffle",
    storageController.reshuffleItems
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;