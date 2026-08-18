// ==========================================================
// routes/update.js
// ==========================================================
//
// DAIRY PROFILE / UPDATE ROUTES
//
// ROUTER MOUNT
// ----------------------------------------------------------
//
// This router is mounted at:
//
//     /
//
// ==========================================================

const express =
    require("express");

const router =
    express.Router();


// ==========================================================
// CONTROLLER
// ==========================================================

const controller =
    require("../controllers/update");


// ==========================================================
// STORAGE CONTROLLER
// ==========================================================

const storageController =
    require("../controllers/update/storageController");


// ==========================================================
// UPLOAD MIDDLEWARE
// ==========================================================

const upload =
    require("../middleware/uploadMiddleware");


// ==========================================================
// AUTH MIDDLEWARE
// ==========================================================

function isAuth(
    req,
    res,
    next
) {

    if (
        !req.session ||
        !req.session.user
    ) {

        return res.status(
            401
        ).json({

            success:
                false,

            message:
                "Unauthorized"

        });

    }


    // ------------------------------------------------------
    // Make logged-in user available to controllers.
    // ------------------------------------------------------

    req.user =
        req.session.user;


    next();

}


// ==========================================================
// LIST PAGES
// ==========================================================


// ==========================================================
// DAIRY PROJECTS
// ==========================================================
//
// GET:
//
//     /dairyProjects
//
// ==========================================================

router.get(
    "/dairyProjects",
    controller.viewDairyProjects
);


// ==========================================================
// STRUCTURES
// ==========================================================
//
// GET:
//
//     /structures
//
// ==========================================================

router.get(
    "/structures",
    controller.viewStructures
);


// ==========================================================
// FEED STORE / STORAGE
// ==========================================================
//
// CONTROLLER:
//
//     controllers/update/storageController.js
//
// SERVICE:
//
//     services/update/storageService.js
//
// ==========================================================


// ==========================================================
// VIEW FEED STOCK
// ==========================================================
//
// GET:
//
//     /dairy/feedstore/:dairyId
//
// CONTROLLER:
//
//     storageController.getFeedStock
//
// ACCESS:
//
//     ADMIN
//     DAIRY WORKER
//
// ==========================================================

router.get(
    "/dairy/feedstore/:dairyId",
    isAuth,
    storageController.getFeedStock
);


// ==========================================================
// ADD STOCK PAGE
// ==========================================================
//
// GET:
//
//     /dairy/:dairyId/feedstore/add
//
// CONTROLLER:
//
//     storageController.getAddStock
//
// ACCESS:
//
//     ADMIN ONLY
//
// ==========================================================

router.get(
    "/dairy/:dairyId/feedstore/add",
    isAuth,
    storageController.getAddStock
);


// ==========================================================
// UPDATE STOCK PAGE
// ==========================================================
//
// GET:
//
//     /dairy/:dairyId/feedstore/:stockId/update
//
// CONTROLLER:
//
//     storageController.getUpdateStock
//
// ACCESS:
//
//     ADMIN
//     DAIRY WORKER
//
// ==========================================================

router.get(
    "/dairy/:dairyId/feedstore/:stockId/update",
    isAuth,
    storageController.getUpdateStock
);


// ==========================================================
// RESTOCK PAGE
// ==========================================================
//
// GET:
//
//     /dairy/:dairyId/feedstore/:stockId/restock
//
// CONTROLLER:
//
//     storageController.getRestock
//
// ACCESS:
//
//     ADMIN ONLY
//
// ==========================================================

router.get(
    "/dairy/:dairyId/feedstore/:stockId/restock",
    isAuth,
    storageController.getRestock
);


// ==========================================================
// GET ONE STOCK
// ==========================================================
//
// GET:
//
//     /dairy/:dairyId/feedstore/:stockId
//
// CONTROLLER:
//
//     storageController.getStock
//
// ACCESS:
//
//     ADMIN
//     DAIRY WORKER
//
// ==========================================================

router.get(
    "/dairy/:dairyId/feedstore/:stockId",
    isAuth,
    storageController.getStock
);


// ==========================================================
// ADD NEW STOCK
// ==========================================================
//
// POST:
//
//     /dairy/:dairyId/feedstore/add
//
// CONTROLLER:
//
//     storageController.addStock
//
// ACCESS:
//
//     ADMIN ONLY
//
// UPLOAD FIELD:
//
//     images
//
// MAXIMUM:
//
//     10 images
//
// ==========================================================

router.post(
    "/dairy/:dairyId/feedstore/add",
    isAuth,
    upload.array(
        "images",
        10
    ),
    storageController.addStock
);


// ==========================================================
// UPDATE EXISTING STOCK
// ==========================================================
//
// PUT:
//
//     /dairy/:dairyId/feedstore/:stockId/update
//
// CONTROLLER:
//
//     storageController.updateStock
//
// ACCESS:
//
//     ADMIN
//     DAIRY WORKER
//
// UPLOAD FIELD:
//
//     images
//
// MAXIMUM:
//
//     10 images
//
// ==========================================================

router.put(
    "/dairy/:dairyId/feedstore/:stockId/update",
    isAuth,
    upload.array(
        "images",
        10
    ),
    storageController.updateStock
);


// ==========================================================
// RESTOCK EXISTING STOCK
// ==========================================================
//
// POST:
//
//     /dairy/:dairyId/feedstore/:stockId/restock
//
// CONTROLLER:
//
//     storageController.restockStock
//
// ACCESS:
//
//     ADMIN ONLY
//
// UPLOAD FIELD:
//
//     images
//
// MAXIMUM:
//
//     10 images
//
// ==========================================================

router.post(
    "/dairy/:dairyId/feedstore/:stockId/restock",
    isAuth,
    upload.array(
        "images",
        10
    ),
    storageController.restockStock
);


// ==========================================================
// DELETE STOCK
// ==========================================================
//
// DELETE:
//
//     /dairy/:dairyId/feedstore/:stockId
//
// CONTROLLER:
//
//     storageController.deleteStock
//
// ACCESS:
//
//     ADMIN ONLY
//
// ==========================================================

router.delete(
    "/dairy/:dairyId/feedstore/:stockId",
    isAuth,
    storageController.deleteStock
);


// ==========================================================
// DAIRY PROFILE
// ==========================================================
//
// GET:
//
//     /dairy/:id
//
// IMPORTANT
// ----------------------------------------------------------
//
// This remains after the specific feed-store routes.
//
// ==========================================================

router.get(
    "/dairy/:id",
    controller.viewPage
);


// ==========================================================
// TOGGLE MILKING STATUS
// ==========================================================
//
// POST:
//
//     /dairy/:id/toggle-milking
//
// ==========================================================

router.post(
    "/dairy/:id/toggle-milking",
    isAuth,
    controller.toggleMilking
);


// ==========================================================
// SWITCH DAIRY FARM
// ==========================================================
//
// GET:
//
//     /dairy/:id/switch
//
// ==========================================================

router.get(
    "/dairy/:id/switch",
    isAuth,
    controller.switchDairy
);


// ==========================================================
// GENERAL DAIRY COMMENT
// ==========================================================
//
// POST:
//
//     /dairy/:id/comment
//
// ==========================================================

router.post(
    "/dairy/:id/comment",
    isAuth,
    controller.comment
);


// ==========================================================
// DAIRY PROFILE IMAGES
// ==========================================================
//
// PUT:
//
//     /dairy/:id/image
//
// UPLOAD FIELD:
//
//     profileImages
//
// MAXIMUM:
//
//     5 images
//
// ==========================================================

router.put(
    "/dairy/:id/image",
    isAuth,
    upload.array(
        "profileImages",
        5
    ),
    controller.image
);


// ==========================================================
// UPDATE DAIRY PROFILE INFORMATION
// ==========================================================
//
// PUT:
//
//     /dairy/:id/update
//
// ==========================================================

router.put(
    "/dairy/:id/update",
    isAuth,
    controller.updateProfile
);


// ==========================================================
// CREATE GENERAL DAIRY POST
// ==========================================================
//
// POST:
//
//     /dairy/:id/post
//
// UPLOAD FIELD:
//
//     images
//
// MAXIMUM:
//
//     10 images
//
// ==========================================================

router.post(
    "/dairy/:id/post",
    isAuth,
    upload.array(
        "images",
        10
    ),
    controller.createPost
);


// ==========================================================
// POST LIKE
// ==========================================================
//
// POST:
//
//     /post/:id/like
//
// ==========================================================

router.post(
    "/post/:id/like",
    isAuth,
    controller.likePost
);


// ==========================================================
// POST COMMENT
// ==========================================================
//
// POST:
//
//     /post/:id/comment
//
// ==========================================================

router.post(
    "/post/:id/comment",
    isAuth,
    controller.addPostComment
);


// ==========================================================
// GENERIC UPDATE LIKE
// ==========================================================
//
// Examples:
//
//     POST /medical/:id/like
//     POST /maintenance/:id/like
//     POST /milk/:id/like
//
// ==========================================================

router.post(
    "/:type/:id/like",
    isAuth,
    controller.likePost
);


// ==========================================================
// GENERIC UPDATE COMMENT
// ==========================================================
//
// Examples:
//
//     POST /medical/:id/comment
//     POST /maintenance/:id/comment
//     POST /milk/:id/comment
//
// ==========================================================

router.post(
    "/:type/:id/comment",
    isAuth,
    controller.addPostComment
);


// ==========================================================
// DELETE POST
// ==========================================================
//
// DELETE:
//
//     /post/:id
//
// ==========================================================

router.delete(
    "/post/:id",
    isAuth,
    controller.deletePost
);


// ==========================================================
// DELETE COMMENT
// ==========================================================
//
// DELETE:
//
//     /comment/:id
//
// ==========================================================

router.delete(
    "/comment/:id",
    isAuth,
    controller.deleteComment
);


// ==========================================================
// MEDICAL
// ==========================================================


// ==========================================================
// MARK MEDICAL
// ==========================================================
//
// POST:
//
//     /dairy/:id/medical-mark
//
// ==========================================================

router.post(
    "/dairy/:id/medical-mark",
    isAuth,
    controller.markMedical
);


// ==========================================================
// CLEAR MEDICAL
// ==========================================================
//
// POST:
//
//     /dairy/:id/medical-unmark
//
// ==========================================================

router.post(
    "/dairy/:id/medical-unmark",
    isAuth,
    controller.unmarkMedical
);


// ==========================================================
// MAINTENANCE
// ==========================================================


// ==========================================================
// MARK MAINTENANCE
// ==========================================================
//
// POST:
//
//     /dairy/:id/maintenance/mark
//
// ==========================================================

router.post(
    "/dairy/:id/maintenance/mark",
    isAuth,
    controller.markMaintenance
);


// ==========================================================
// CLEAR MAINTENANCE
// ==========================================================
//
// POST:
//
//     /dairy/:id/maintenance/clear
//
// ==========================================================

router.post(
    "/dairy/:id/maintenance/clear",
    isAuth,
    controller.clearMaintenance
);


// ==========================================================
// DELETE DAIRY PROFILE
// ==========================================================
//
// DELETE:
//
//     /dairy/:id
//
// ==========================================================

router.delete(
    "/dairy/:id",
    isAuth,
    controller.deleteProfile
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;