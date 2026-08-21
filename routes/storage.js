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
//     /storage/:dairyId/contents/:storageId/add
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
// URL:
//
//     GET /storage/:id
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
// URL:
//
//     GET /storage/:id/add
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
// URL:
//
//     POST /storage/:id/add
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
//     assetCode
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
// URL:
//
//     GET /storage/:dairyId/contents/:storageId
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
// ADD ITEMS TO EXISTING STORAGE
// ==========================================================
//
// URL:
//
//     POST /storage/:dairyId/contents/:storageId/add
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
// ADD NEW ITEM DIRECTLY TO STORAGE
// ==========================================================
//
// GET
//
//     /storage/:dairyId/contents/:storageId/add
//
// The controller:
//
//     1. Resolves the parent Dairy.
//     2. Resolves the selected storage.
//     3. Determines the storage type.
//     4. Loads any data required by the form.
//     5. Renders the direct-add-storage-item view.
//
// The browser does NOT select the destination storage.
//
// The destination is determined by:
//
//     dairyId
//     storageId
//
// ==========================================================

router.get(

    "/:dairyId/contents/:storageId/add",

    storageController.getAddItemPage

);


// ==========================================================
// CREATE NEW ITEM DIRECTLY IN STORAGE
// ==========================================================
//
// POST
//
//     /storage/:dairyId/contents/:storageId/add
//
// The controller passes the submitted item data to the
// service.
//
// The service remains responsible for:
//
//     - validating the parent Dairy
//     - validating the storage
//     - validating storage ownership
//     - validating storage type
//     - determining recordType
//     - determining assetCode
//     - determining dwellNumber / roomNumber
//     - validating AgroStore quantity
//     - validating allowed record types
//     - creating the item
//     - preventing invalid assignments
//
// ==========================================================

router.post(

    "/:dairyId/contents/:storageId/add",

    storageController.postAddItem

);


// ==========================================================
// OMIT ITEMS FROM STORAGE
// ==========================================================
//
// URL:
//
//     POST /storage/:dairyId/contents/:storageId/omit
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
// URL:
//
//     POST /storage/:dairyId/contents/:storageId/reshuffle
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
// URL:
//
//     POST /storage/:dairyId/contents/:storageId/quantity
//
// Primarily used for:
//
//     type = "agroStore"
//
// Request body:
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
// EXPORT
// ==========================================================

module.exports =
    router;