const express = require("express");

const router = express.Router();


// ==========================================================
// CONTROLLERS
// ==========================================================

const storageController =
    require("../controllers/update/storage");


// ==========================================================
// AGROSTORE INVENTORY
// ==========================================================
//
// GET
// /dairy/:parentId/agroStore/:roomNumber
//
// parentId:
//     _id of the parent Dairy Farm
//
// roomNumber:
//     roomNumber of the AgroStore
//
// Example:
//
// /dairy/68a123456789/agroStore/-2
//
// ==========================================================

router.get(
    "/:parentId/agroStore/:roomNumber",
    storageController.list
);


// ==========================================================
// UPDATE AGROSTORE INVENTORY
// ==========================================================
//
// POST
// /dairy/:parentId/agroStore/:roomNumber/inventory/:inventoryId/update
//
// Quantity may ONLY be reduced.
//
// stockUpdateNote may be added/changed.
//
// ==========================================================

router.post(
    "/:parentId/agroStore/:roomNumber/inventory/:inventoryId/update",
    storageController.update
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports = router;