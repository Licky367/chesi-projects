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
// PARENT DAIRY
// ----------------------------------------------------------
//
//     :id
//     :dairyId
//
// identify the parent Dairy by MongoDB _id.
//
// IMPORTANT:
//
// The parent Dairy is NEVER identified by its code in the
// URL.
//
// ----------------------------------------------------------
//
// STORAGE
// ----------------------------------------------------------
//
// Every storage facility is a Dairy record with:
//
//     recordType = "structure"
//
// The user chooses:
//
//     type = "room"
//     type = "agroStore"
//
// The service determines:
//
//     assetCode
//     roomNumber
//     recordType
//     status
//
// ----------------------------------------------------------
//
// NORMAL STORAGE
// ----------------------------------------------------------
//
//     room
//
// Supports:
//
//     add
//     omit
//     reshuffle
//
// ----------------------------------------------------------
//
// AGROSTORE
// ----------------------------------------------------------
//
//     agroStore
//
// Supports:
//
//     add
//     update quantity
//
// Quantity reaching zero causes the service to remove the
// item from active AgroStore contents automatically.
//
// Manual omission and reshuffling are not permitted for
// AgroStore.
//
// The service layer remains the final authority and rejects
// invalid operations regardless of which route is called.
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
// Parent Dairy:
//
//     req.params.id
//
// This is the MongoDB _id of the parent Dairy Farm.
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
// Parent Dairy:
//
//     req.params.id
//
// The controller resolves the parent Dairy and renders:
//
//     views/storage/add.ejs
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
// User provides:
//
//     name
//     type
//
// Where:
//
//     type = "room"
//     OR
//     type = "agroStore"
//
// The controller passes those values to the service.
//
// The service determines:
//
//     recordType = "structure"
//     assetCode = parent Dairy.code
//     roomNumber
//     status
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
// :dairyId
//     MongoDB _id of the parent Dairy Farm.
//
// :storageId
//     MongoDB _id of the storage facility.
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
// Applies to storage facilities according to the service
// rules.
//
// The service determines whether the selected storage type
// permits the requested operation.
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
// NORMAL ROOM STORAGE:
//
//     Manual omission is allowed.
//
// AGROSTORE:
//
//     Manual omission is NOT allowed.
//
//     Items are automatically removed from active AgroStore
//     contents when their quantity reaches zero.
//
// The service is responsible for enforcing this distinction.
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
// NORMAL ROOM STORAGE:
//
//     Reshuffling is allowed.
//
// AGROSTORE:
//
//     Reshuffling is NOT allowed.
//
// The service is responsible for enforcing this distinction.
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
// Primarily used for:
//
//     type = "agroStore"
//
// Request:
//
//     POST
//     /storage/:dairyId/contents/:storageId/quantity
//
// Body:
//
//     itemId
//     quantity
//
// Service behavior:
//
//     quantity > 0
//         update the stored quantity
//
//     quantity === 0
//         set quantity to zero
//         clear the relevant allocation/dwell information
//         remove the item from active AgroStore contents
//
// Negative quantities are rejected by the service.
//
// ==========================================================

router.post(

    "/:dairyId/contents/:storageId/quantity",

    storageController.updateQuantity

);
// ==========================================================
// ADD NEW ITEM DIRECTLY TO STORAGE
// ==========================================================

router.get(
    "/storage/:dairyId/contents/:storageId/add",
    storageController.getAddItemPage
);


router.post(
    "/storage/:dairyId/contents/:storageId/add",
    storageController.postAddItem
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;