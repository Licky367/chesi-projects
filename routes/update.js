// ==========================================================
// routes/update.js
// ==========================================================

const express = require("express");

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

function isAuth(req, res, next) {

    if (!req.session.user) {

        return res.status(401).json({

            success: false,

            message: "Unauthorized"

        });

    }


    // ------------------------------------------------------
    // Make logged-in user available to controllers
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

router.get(
    "/dairyProjects",
    controller.viewDairyProjects
);


// ----------------------------------------------------------
// STRUCTURES
// ----------------------------------------------------------

router.get(
    "/structures",
    controller.viewStructures
);


// ==========================================================
// DAIRY PROFILE
// ==========================================================

// GET
//
// /dairy/:id
//
// This displays either:
//
// • update.ejs
// • dairySet.ejs
//
// depending on the Dairy code.

router.get(
    "/dairy/:id",
    controller.viewPage
);


// ==========================================================
// SWITCH DAIRY FARM
// ==========================================================
//
// Used by dairy workers who have multiple assigned
// Dairy Farms.
//
// Example:
//
// /dairy/665abc123/switch
//
// ==========================================================

router.get(
    "/dairy/:id/switch",
    isAuth,
    controller.switchDairy
);


// ==========================================================
// GENERAL DAIRY COMMENTS
// ==========================================================
//
// Example:
//
// POST /dairy/:id/comment
//
// ==========================================================

router.post(
    "/dairy/:id/comment",
    isAuth,
    controller.comment
);


// ==========================================================
// PROFILE IMAGES
// ==========================================================
//
// A Dairy profile can have a maximum of 5 profile images.
//
// Field name:
//
// profileImages
//
// The middleware therefore uses:
//
// upload.array("profileImages", 5)
//
// Maximum:
//
// 5 profile images.
//
// The images are stored on the Dairy profile and can later
// be viewed as a swipeable profile-image gallery.
//
// ==========================================================

router.put(
    "/dairy/:id/image",
    isAuth,
    upload.array("profileImages", 5),
    controller.image
);


// ==========================================================
// UPDATE DAIRY PROFILE
// ==========================================================
//
// Updates editable profile information such as:
//
// • name
// • code
// • mass
// • dateOfBirth
//
// ==========================================================

router.put(
    "/dairy/:id/update",
    isAuth,
    controller.updateProfile
);


// ==========================================================
// CREATE POST
// ==========================================================
//
// A post can contain:
//
// • title
// • text
// • zero images
// • one image
// • multiple images
//
// The EJS form must use:
//
// name="images"
//
// The middleware therefore uses:
//
// upload.array("images", 10)
//
// Maximum:
//
// 10 images per post.
//
// ==========================================================

router.post(
    "/dairy/:id/post",
    isAuth,
    upload.array("images", 10),
    controller.createPost
);


// ==========================================================
// POST LIKE
// ==========================================================
//
// Example:
//
// POST /post/:id/like
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
// Example:
//
// POST /post/:id/comment
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
// Used by update types such as:
//
// • medical
// • maintenance
// • milk
// • other updates
//
// Example:
//
// POST /medical/:id/like
// POST /maintenance/:id/like
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
// Example:
//
// POST /medical/:id/comment
// POST /maintenance/:id/comment
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
// Example:
//
// DELETE /post/:id
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
// Example:
//
// DELETE /comment/:id
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

// ----------------------------------------------------------
// MARK MEDICAL
// ----------------------------------------------------------

router.post(
    "/dairy/:id/medical-mark",
    isAuth,
    controller.markMedical
);


// ----------------------------------------------------------
// UNMARK / CLEAR MEDICAL
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

router.post(
    "/dairy/:id/maintenance/mark",
    isAuth,
    controller.markMaintenance
);


// ----------------------------------------------------------
// CLEAR MAINTENANCE
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
// Example:
//
// DELETE /dairy/:id
//
// ==========================================================

router.delete(
    "/dairy/:id",
    isAuth,
    controller.deleteProfile
);


// ==========================================================
// EXPORT ROUTER
// ==========================================================

module.exports =
    router;