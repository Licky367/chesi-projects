// ==========================================================
// routes/storage.js
// STORAGE ROUTES
// =========================================================
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
//     8. Reshuffling items between storage facilities
//     9. Updating storage content items
//    10. Recording quantity changes
//    11. Recording stock update notes
//    12. Uploading images with stock updates
//
// ==========================================================


const express =
    require("express");

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
// PURPOSE:
//
//     Display the complete details of one item currently
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
// SUPPORTED:
//
//     room
//     agroStore
//
// IMPORTANT:
//
//     "agroStore" is case-sensitive.
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
// IMAGE:
//
//     profileImage
//
// The upload middleware executes before the controller.
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
// BODY:
//
//     itemIds
//
// Examples:
//
//     itemIds[]=ID1
//     itemIds[]=ID2
//
// or:
//
//     itemIds=ID1
//
// ==========================================================

router.post(
    "/:dairyId/contents/:storageId/add",
    storageController.addItems
);


// ==========================================================
// OMIT ITEMS FROM ROOM STORAGE
// ==========================================================
//
// POST:
//
//     /storage/:dairyId/contents/:storageId/omit
//
// BODY:
//
//     itemIds
//
// IMPORTANT:
//
//     This is for normal Room storage only.
//
//     AgroStore items are not manually omitted.
//
//     AgroStore items are automatically removed from the
//     storage allocation when quantity becomes zero.
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
// BODY:
//
//     itemIds
//     targetStorageId
//
// PURPOSE:
//
//     Move selected items from the current storage facility
//     into another storage facility of the permitted type.
//
// The service enforces:
//
//     - valid target storage
//     - same storage type
//     - active storage
//     - item ownership
//     - current allocation
//
// ==========================================================

router.post(
    "/:dairyId/contents/:storageId/reshuffle",
    storageController.reshuffleItems
);


// ==========================================================
// UPDATE STORAGE CONTENT ITEM
// ==========================================================
//
// POST:
//
//     /storage/:dairyId/contents/:storageId/update/:itemId
//
// PURPOSE:
//
//     Update one item currently contained in storage.
//
// BODY:
//
//     quantity
//     unit
//     stockUpdateNote
//
// OPTIONAL FILES:
//
//     images
//
// The update records:
//
//     1. New quantity
//     2. Unit
//     3. Stock update note
//     4. Images
//     5. User._id of the person who made the update
//     6. Timestamp of the update
//
// IMPORTANT:
//
//     This route uses multipart/form-data because the update
//     may contain images.
//
// ==========================================================
//
// IMAGE FIELD:
//
//     images
//
// The controller receives:
//
//     req.files
//
// rather than:
//
//     req.file
//
// because an update may contain multiple images.
//
// ==========================================================

router.post(
    "/:dairyId/contents/:storageId/update/:itemId",

    uploadMiddleware.array(
        "images",
        10
    ),

    storageController.updateContentItem
);


// ==========================================================
// LEGACY AGROSTORE QUANTITY UPDATE
// ==========================================================
//
// POST:
//
//     /storage/:dairyId/contents/:storageId/quantity
//
// PURPOSE:
//
//     Retained for compatibility with forms or code that
//     still uses the previous quantity-update architecture.
//
// NEW CODE SHOULD USE:
//
//     /update/:itemId
//
// The same controller/service logic is used.
//
// ==========================================================

router.post(
    "/:dairyId/contents/:storageId/quantity",

    uploadMiddleware.array(
        "images",
        10
    ),

    storageController.updateQuantity
);


// ==========================================================
// EXPORT ROUTER
// ==========================================================

module.exports =
    router;