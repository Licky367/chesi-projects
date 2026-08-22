// ==========================================================
// routes/storage.js
// STORAGE ROUTES
// ==========================================================
//
// PURPOSE:
//
//     Routes for:
//
//     1. Listing storage facilities
//     2. Creating storage facilities
//     3. Viewing storage contents
//     4. Viewing individual storage items
//     5. Adding new items directly into storage
//     6. Adding existing items into storage
//     7. Omitting items from Room storage
//     8. Reshuffling items between Room storages
//     9. Updating AgroStore feed quantities
//
// ==========================================================


const express = require("express");

const router =
    express.Router();


const storageController =
    require("../controllers/storage");


const uploadMiddleware =
    require("../middleware/uploadMiddleware");


// ==========================================================
// STORAGE FACILITY LIST
// ==========================================================
//
// GET:
//
//     /storage/:id
//
// :id
//     = parent Dairy._id
//
// PURPOSE:
//
//     Display all storage facilities belonging to the
//     selected dairy.
//
// ==========================================================

router.get(
    "/:id",
    storageController.list
);


// ==========================================================
// ADD STORAGE FACILITY - FORM
// ==========================================================
//
// GET:
//
//     /storage/:id/add
//
// :id
//     = parent Dairy._id
//
// PURPOSE:
//
//     Display the form used to create a new Room or
//     AgroStore.
//
// ==========================================================

router.get(
    "/:id/add",
    storageController.form
);


// ==========================================================
// CREATE STORAGE FACILITY
// ==========================================================
//
// POST:
//
//     /storage/:id/add
//
// :id
//     = parent Dairy._id
//
// PURPOSE:
//
//     Create a new storage facility.
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
// :dairyId
//     = parent Dairy._id
//
// :storageId
//     = storage facility Dairy._id
//
// PURPOSE:
//
//     Display everything currently allocated inside the
//     selected storage facility.
//
// SUPPORTED STORAGE TYPES:
//
//     room
//     agroStore
//
// ==========================================================

router.get(
    "/:dairyId/contents/:storageId",
    storageController.contents
);


// ==========================================================
// STORAGE CONTENT ITEM DETAILS
// ==========================================================
//
// GET:
//
//     /storage/:dairyId/contents/:storageId/details/:itemId
//
// Example:
//
//     /storage/DAIRY_ID/contents/STORAGE_ID/details/ITEM_ID
//
// :dairyId
//     = parent Dairy._id
//
// :storageId
//     = storage facility Dairy._id
//
// :itemId
//     = Dairy._id of the item inside the storage
//
// PURPOSE:
//
//     Display complete details of one item currently
//     contained inside the selected storage facility.
//
// VIEW:
//
//     views/storage/content-item.ejs
//
// ==========================================================

router.get(
    "/:dairyId/contents/:storageId/details/:itemId",
    storageController.contentItem
);


// ==========================================================
// ADD NEW ITEM DIRECTLY TO STORAGE - FORM
// ==========================================================
//
// GET:
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
//     = parent Dairy._id
//
// :storageId
//     = selected storage facility Dairy._id
//
// :storageType
//     = storage facility type
//
// SUPPORTED VALUES:
//
//     room
//     agroStore
//
// IMPORTANT:
//
//     agroStore is case-sensitive and must remain:
//
//         agroStore
//
// ==========================================================

router.get(
    "/:dairyId/contents/:storageId/add/:storageType",
    storageController.addNewForm
);


// ==========================================================
// ADD NEW ITEM DIRECTLY TO STORAGE
// ==========================================================
//
// POST:
//
//     /storage/:dairyId/contents/:storageId/add/:storageType
//
// FORM:
//
//     enctype="multipart/form-data"
//
// IMAGE FIELD:
//
//     profileImage
//
// The upload middleware MUST execute before the controller
// so that:
//
//     req.body
//
// and:
//
//     req.file
//
// are available to storageController.addNewItem.
//
// ==========================================================

router.post(
    "/:dairyId/contents/:storageId/add/:storageType",

    uploadMiddleware.single(
        "profileImage"
    ),

    storageController.addNewItem
);


// ==========================================================
// ADD EXISTING ITEMS TO STORAGE
// ==========================================================
//
// POST:
//
//     /storage/:dairyId/contents/:storageId/add
//
// PURPOSE:
//
//     Add already-existing Dairy records to the selected
//     storage facility.
//
// BODY:
//
//     itemIds
//
// itemIds may be:
//
//     itemIds[]=ID1
//     itemIds[]=ID2
//
// or:
//
//     itemIds=ID1
//
// SUPPORTED:
//
//     room
//     agroStore
//
// The service is responsible for enforcing the storage
// type rules.
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
//     Remove selected items from a Room storage.
//
// BODY:
//
//     itemIds
//
// SUPPORTED:
//
//     room
//
// IMPORTANT:
//
//     AgroStore does NOT use manual omission.
//
//     AgroStore items are automatically omitted when their
//     quantity reaches zero.
//
// The service is responsible for enforcing this rule.
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
//     Move selected items from one Room storage facility
//     to another Room storage facility.
//
// BODY:
//
//     itemIds
//     targetStorageId
//
// SUPPORTED:
//
//     room
//
// NOT SUPPORTED:
//
//     agroStore
//
// The service is responsible for enforcing the rule.
//
// ==========================================================

router.post(
    "/:dairyId/contents/:storageId/reshuffle",
    storageController.reshuffleItems
);


// ==========================================================
// UPDATE AGROSTORE QUANTITY
// ==========================================================
//
// POST:
//
//     /storage/:dairyId/contents/:storageId/quantity
//
// PURPOSE:
//
//     Update the quantity of a feed item inside an
//     AgroStore.
//
// BODY:
//
//     itemId
//     quantity
//     unit
//
// EXAMPLE:
//
//     itemId=ITEM_ID
//     quantity=25
//     unit=kg
//
// AUTOMATIC OMISSION:
//
//     If quantity becomes zero, the storage service
//     automatically removes the item from the AgroStore.
//
// SUPPORTED:
//
//     agroStore
//
// The service is responsible for enforcing the storage
// type.
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