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


    req.user =
        req.session.user;


    next();

}


// ==========================================================
// LIST PAGES
// ==========================================================

router.get(
    "/dairyProjects",
    controller.viewDairyProjects
);


router.get(
    "/structures",
    controller.viewStructures
);


// ==========================================================
// DAIRY PROFILE
// ==========================================================

router.get(
    "/dairy/:id",
    controller.viewPage
);


// ==========================================================
// TOGGLE MILKING
// ==========================================================

router.post(
    "/dairy/:id/toggle-milking",
    isAuth,
    controller.toggleMilking
);


// ==========================================================
// SWITCH DAIRY
// ==========================================================

router.get(
    "/dairy/:id/switch",
    isAuth,
    controller.switchDairy
);


// ==========================================================
// GENERAL DAIRY COMMENT
// ==========================================================

router.post(
    "/dairy/:id/comment",
    isAuth,
    controller.comment
);


// ==========================================================
// PROFILE IMAGES
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
// UPDATE DAIRY PROFILE
// ==========================================================

router.put(
    "/dairy/:id/update",
    isAuth,
    controller.updateProfile
);


// ==========================================================
// CONTENT ITEM CARD
// ==========================================================
//
// The content-item card is part of:
//
//     views/dairySet.ejs
//
// It updates the Dairy document represented by
// the content item.
//
// ROUTE:
//
//     PUT /dairy/:id/content-item
//
// CONTROLLER:
//
//     contentsItemController.updateContentItem
//
// SERVICE:
//
//     contentItemService
//
// ==========================================================

router.put(
    "/dairy/:id/content-item",
    isAuth,
    controller.updateContentItem
);


// ==========================================================
// GET CONTENT ITEM
// ==========================================================
//
// Used when the content-item data needs to be loaded
// independently.
//
// GET:
//
//     /dairy/:id/content-item
//
// ==========================================================

router.get(
    "/dairy/:id/content-item",
    isAuth,
    controller.getContentItem
);


// ==========================================================
// CREATE GENERAL POST
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

router.post(
    "/post/:id/like",
    isAuth,
    controller.likePost
);


// ==========================================================
// POST COMMENT
// ==========================================================

router.post(
    "/post/:id/comment",
    isAuth,
    controller.addPostComment
);


// ==========================================================
// GENERIC UPDATE LIKE
// ==========================================================

router.post(
    "/:type/:id/like",
    isAuth,
    controller.likePost
);


// ==========================================================
// GENERIC UPDATE COMMENT
// ==========================================================

router.post(
    "/:type/:id/comment",
    isAuth,
    controller.addPostComment
);


// ==========================================================
// DELETE POST
// ==========================================================

router.delete(
    "/post/:id",
    isAuth,
    controller.deletePost
);


// ==========================================================
// DELETE COMMENT
// ==========================================================

router.delete(
    "/comment/:id",
    isAuth,
    controller.deleteComment
);


// ==========================================================
// MEDICAL
// ==========================================================

router.post(
    "/dairy/:id/medical-mark",
    isAuth,
    controller.markMedical
);


router.post(
    "/dairy/:id/medical-unmark",
    isAuth,
    controller.unmarkMedical
);


// ==========================================================
// MAINTENANCE
// ==========================================================

router.post(
    "/dairy/:id/maintenance/mark",
    isAuth,
    controller.markMaintenance
);


router.post(
    "/dairy/:id/maintenance/clear",
    isAuth,
    controller.clearMaintenance
);


// ==========================================================
// DELETE DAIRY
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