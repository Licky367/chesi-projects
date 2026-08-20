// ==========================================================
// routes/storage.js
// STORAGE ROUTES
// ==========================================================
//
// GET
//
//     /storage/:id
//     /storage/:id/add
//     /storage/:dairyId/contents/:storageId
//
// POST
//
//     /storage/:id/add
//
//     /storage/:dairyId/contents/:storageId/add
//
//     /storage/:dairyId/contents/:storageId/omit
//
//     /storage/:dairyId/contents/:storageId/reshuffle
//
//     /storage/:dairyId/contents/:storageId/quantity
//
// ==========================================================
//
// ARCHITECTURE
//
// NORMAL STORAGE
//     add
//     omit
//     reshuffle
//
// AGROSTORE (type === "feeds")
//     add
//     update quantity
//     automatic omission when quantity reaches 0
//
// The service layer is the final authority and will reject
// invalid AgroStore operations even if someone manually calls
// the normal-storage routes.
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
//
// NORMAL STORAGE ONLY.
//
// For AgroStore:
//
//     manual omission is NOT allowed.
//
// Feed items are automatically omitted when quantity reaches
// zero.
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
// NORMAL STORAGE ONLY.
//
// AgroStore does NOT support reshuffling.
//
// ==========================================================

router.post(

    "/:dairyId/contents/:storageId/reshuffle",

    storageController.reshuffleItems

);


// ==========================================================
// UPDATE FEED QUANTITY
// ==========================================================
//
// Primarily used by AgroStore.
//
// Example:
//
//     POST
//     /storage/:dairyId/contents/:storageId/quantity
//
// Body:
//
//     itemId
//     quantity
//
// The service will:
//
//     quantity > 0
//         -> update quantity
//
//     quantity === 0
//         -> set quantity to 0
//         -> clear dwellNumber
//         -> item leaves AgroStore
//
// ==========================================================

router.post(

    "/:dairyId/contents/:storageId/quantity",

    storageController.updateQuantity

);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;