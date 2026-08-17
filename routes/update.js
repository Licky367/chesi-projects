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
// Therefore:
//
//     /dairy/:id
//
// means exactly:
//
//     /dairy/:id
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

    if (!req.session.user) {

        return res.status(401).json({

            success: false,

            message: "Unauthorized"

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


// ----------------------------------------------------------
// DAIRY PROJECTS
// ----------------------------------------------------------
//
// GET:
//
//     /dairyProjects
//
// ----------------------------------------------------------

router.get(
    "/dairyProjects",
    controller.viewDairyProjects
);


// ----------------------------------------------------------
// STRUCTURES
// ----------------------------------------------------------
//
// GET:
//
//     /structures
//
// ----------------------------------------------------------

router.get(
    "/structures",
    controller.viewStructures
);


// ==========================================================
// FEED STORE
// ==========================================================
//
// IMPORTANT
// ----------------------------------------------------------
//
// Feed-store routes intentionally use:
//
//     /dairy/feedstore/:id
//
// Therefore:
//
//     /dairy/feedstore/:id
//
//     /dairy/feedstore/:id/update
//
//     /dairy/feedstore/:id/restock
//
// The :id is always the Dairy / Feed Store asset ID.
//
// ==========================================================


// ----------------------------------------------------------
// VIEW FEED STORE
// ----------------------------------------------------------
//
// GET:
//
//     /dairy/feedstore/:id
//
// Example:
//
//     /dairy/feedstore/6a802fb518fcceb7ac81eef1
//
// ----------------------------------------------------------

router.get(
    "/dairy/feedstore/:id",
    isAuth,
    controller.viewFeedStore
);


// ----------------------------------------------------------
// FEED STORE CONDITION UPDATE
// ----------------------------------------------------------
//
// POST:
//
//     /dairy/feedstore/:id/update
//
// Available to:
//
//     admin
//     dairyWorker
//
// Can contain:
//
//     • facility condition
//     • feed quality
//     • percentage remaining
//     • message
//     • multiple images
//
// Upload field:
//
//     images
//
// Maximum:
//
//     10 images
//
// Business logic:
//
//     services/update/feedsService.js
//
// ----------------------------------------------------------

router.post(
    "/dairy/feedstore/:id/update",
    isAuth,
    upload.array(
        "images",
        10
    ),
    controller.updateFeedStore
);


// ----------------------------------------------------------
// FEED STORE RESTOCK
// ----------------------------------------------------------
//
// POST:
//
//     /dairy/feedstore/:id/restock
//
// Intended for:
//
//     admin
//
// Used to:
//
//     • restock existing feed
//     • create new feed stock
//     • update quantities
//     • update financial amounts
//     • record expenditure
//     • recalculate feedsAmount
//
// Business logic:
//
//     services/update/feedsService.js
//
// ----------------------------------------------------------

router.post(
    "/dairy/feedstore/:id/restock",
    isAuth,
    controller.restockFeedStore
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
// This route comes after the more specific feed-store routes.
//
// ----------------------------------------------------------

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
// Changes only:
//
//     dairy.isMilking
//
// ----------------------------------------------------------

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
// ----------------------------------------------------------

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
// ----------------------------------------------------------

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
// Upload field:
//
//     profileImages
//
// Maximum:
//
//     5 images
//
// ----------------------------------------------------------

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
// ----------------------------------------------------------

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
// Upload field:
//
//     images
//
// Maximum:
//
//     10 images
//
// ----------------------------------------------------------

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
// ----------------------------------------------------------

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
// ----------------------------------------------------------

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
// IMPORTANT
// ----------------------------------------------------------
//
// This generic route is deliberately placed AFTER all
// specific /dairy/... routes.
//
// ----------------------------------------------------------

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
// ----------------------------------------------------------

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
// ----------------------------------------------------------

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
// ----------------------------------------------------------

router.delete(
    "/comment/:id",
    isAuth,
    controller.deleteComment
);


// ==========================================================
// MEDICAL
// ==========================================================


// ----------------------------------------------------------
// MARK MEDICAL
// ----------------------------------------------------------
//
// POST:
//
//     /dairy/:id/medical-mark
//
// ----------------------------------------------------------

router.post(
    "/dairy/:id/medical-mark",
    isAuth,
    controller.markMedical
);


// ----------------------------------------------------------
// CLEAR MEDICAL
// ----------------------------------------------------------
//
// POST:
//
//     /dairy/:id/medical-unmark
//
// ----------------------------------------------------------

router.post(
    "/dairy/:id/medical-unmark",
    isAuth,
    controller.unmarkMedical
);


// ==========================================================
// MAINTENANCE
// ==========================================================


// ----------------------------------------------------------
// MARK MAINTENANCE
// ----------------------------------------------------------
//
// POST:
//
//     /dairy/:id/maintenance/mark
//
// ----------------------------------------------------------

router.post(
    "/dairy/:id/maintenance/mark",
    isAuth,
    controller.markMaintenance
);


// ----------------------------------------------------------
// CLEAR MAINTENANCE
// ----------------------------------------------------------
//
// POST:
//
//     /dairy/:id/maintenance/clear
//
// ----------------------------------------------------------

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
// ----------------------------------------------------------

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