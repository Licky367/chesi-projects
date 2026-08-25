// ==========================================================
// routes/extrasRoutes.js
// ASSIGNED ASSETS ROUTES
// ==========================================================
//
// ROUTES
// ---------------------------------------------------------
//
//     GET /extras
//         → logged-in user's assigned assets
//
//     GET /extras/:userId
//         → particular user's assigned assets
//
// ==========================================================


const express =
    require("express");

const router =
    express.Router();

const extrasController =
    require("../controllers/extrasController");


// ==========================================================
// CURRENT USER
// ==========================================================
//
// The authentication middleware should already have populated:
//
//     req.user
//
// If your application has an auth middleware, place it here.
//
// Example:
//
//     router.get(
//         "/",
//         requireAuth,
//         extrasController.getExtras
//     );
//
// ==========================================================

router.get(
    "/",
    extrasController.getExtras
);


// ==========================================================
// PARTICULAR USER
// ==========================================================
//
// Used when an administrator needs to view the assets assigned
// to a particular user.
//
// Example:
//
//     /extras/66xxxxxxxxxxxxxxxxxxxxxxxx
//
// ==========================================================

router.get(
    "/:userId",
    extrasController.getUserExtras
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;