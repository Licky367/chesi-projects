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
// IMPORTANT:
//
//     The first :id for the normal storage routes
//     represents Dairy._id.
//
//     Contents route:
//
//         :dairyId   = parent Dairy._id
//         :storageId = DairyStorage._id
//
// NEVER:
//
//     Dairy.code as the route farm identifier.
//     roomNumber as the route farm identifier.
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
// Example:
//
//     /storage/68abc123...
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
// URL SHAPE:
//
//     /storage/:id/contents/:id
//
// The parameter names are different internally so Express
// can distinguish the two IDs.
//
// dairyId:
//     Dairy._id of the parent farm.
//
// storageId:
//     DairyStorage._id of the room / AgroStore.
//
// ==========================================================

router.get(
    "/:dairyId/contents/:storageId",
    storageController.contents
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;