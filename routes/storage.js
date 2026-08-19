// ==========================================================
// routes/storage.js
// STORAGE ROUTES
// ==========================================================

const express =
    require("express");

const router =
    express.Router();

const storageController =
    require("../controllers/storage");


// ==========================================================
// STORAGE INDEX
// ==========================================================
//
// Mounted from server.js as:
//
//     app.use(
//         "/storage",
//         storageRoutes
//     );
//
// Therefore this:
//
//     router.get("/:id")
//
// becomes:
//
//     GET /storage/:id
//
// ----------------------------------------------------------
// :id
// ----------------------------------------------------------
//
// :id is the MongoDB _id of the Dairy.
//
// The Dairy document contains:
//
//     dairy.code
//
// The corresponding DairyStorage documents contain:
//
//     farmCode
//
// Therefore:
//
//     Dairy.code === DairyStorage.farmCode
//
// Example:
//
//     Dairy
//         _id  = 67xxxxxxxxxxxxxxxxxxxxxx
//         code = -1
//
//     DairyStorage
//         farmCode = -1
//
// URL:
//
//     /storage/67xxxxxxxxxxxxxxxxxxxxxx
//
// ----------------------------------------------------------
// OPTIONAL FILTER
// ----------------------------------------------------------
//
// All storage by default:
//
//     GET /storage/:id
//
// Rooms only:
//
//     GET /storage/:id?type=room
//
// AgroStores only:
//
//     GET /storage/:id?type=agroStore
//
// ==========================================================

router.get(
    "/:id",
    storageController.index
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;