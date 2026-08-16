// ==========================================================
// routes/update.js
// ==========================================================
//
// DAIRY PROFILE / UPDATE ROUTES
//
// PROFILE IMAGE DESIGN
// ----------------------------------------------------------
// A Dairy document may contain:
//
//     profileImages
//         -> maximum 5 images
//
//     profileImage
//         -> the currently selected MAIN profile image
//
// The browser uploads the selected photos using:
//
//     name="profileImages"
//
// Therefore the upload middleware MUST use:
//
//     upload.array("profileImages", 5)
//
// The controller receives:
//
//     req.files
//
// and is responsible for:
//
//     1. storing the uploaded images
//     2. storing profileImages
//     3. determining profileImage
//
// ==========================================================

const express = require("express");

const router = express.Router();


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
    // Make the logged-in user available to controllers.
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
//
// GET:
//
//     /dairy/:id
//
// Displays the appropriate Dairy page.
//
// ==========================================================

router.get(
    "/dairy/:id",
    controller.viewPage
);


// ==========================================================
// SWITCH DAIRY FARM
// ==========================================================
//
// Used when a dairy worker has multiple assigned farms.
//
// Example:
//
//     GET /dairy/665abc123/switch
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
// Example:
//
//     POST /dairy/:id/comment
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
// IMPORTANT
// ----------------------------------------------------------
//
// The frontend sends:
//
//     FormData
//
// with:
//
//     profileImages = photo 1
//     profileImages = photo 2
//     profileImages = photo 3
//     profileImages = photo 4
//     profileImages = photo 5
//
// The browser may send fewer than five.
//
// The upload middleware therefore MUST use:
//
//     upload.array("profileImages", 5)
//
// NOT:
//
//     upload.single("profileImage")
//
// The controller receives:
//
//     req.files
//
// The controller is responsible for saving:
//
//     profileImages
//
// and determining:
//
//     profileImage
//
// where profileImage is the MAIN image.
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
// Updates normal editable profile information:
//
//     • name
//     • mass
//     • dateOfBirth
//     • other permitted profile fields
//
// The frontend sends JSON.
//
// Example:
//
//     PUT /dairy/:id/update
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
// A post may contain:
//
//     • title
//     • text
//     • zero images
//     • one image
//     • multiple images
//
// Frontend field:
//
//     images
//
// Maximum:
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
// Example:
//
//     POST /post/:id/like
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
//     POST /post/:id/comment
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
//     DELETE /post/:id
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
//     DELETE /comment/:id
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
// CLEAR MEDICAL
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
// Example:
//
//     DELETE /dairy/:id
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

module.exports = router;