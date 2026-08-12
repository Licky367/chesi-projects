// ==========================================================
// routes/update.js
// ==========================================================

const express = require("express");

const router =
  express.Router();

const controller =
  require("../controllers/update");

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


  // --------------------------------------------------------
  // Make logged-in user available to controllers
  // --------------------------------------------------------

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
// SWITCH DAIRY FARM
//
// Used by dairy workers who have more than one
// assigned Dairy Farm.
//
// The controller MUST verify that the requested
// farm is actually assigned to the logged-in user.
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
// GENERAL COMMENTS
// ==========================================================

router.post(
  "/dairy/:id/comment",
  isAuth,
  controller.comment
);


// ==========================================================
// PROFILE IMAGE
// ==========================================================

router.put(
  "/dairy/:id/image",
  isAuth,
  upload.single("profileImage"),
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
// POSTS
// ==========================================================

router.post(
  "/dairy/:id/post",
  isAuth,
  upload.single("image"),
  controller.createPost
);


router.post(
  "/post/:id/like",
  isAuth,
  controller.likePost
);


router.post(
  "/post/:id/comment",
  isAuth,
  controller.addPostComment
);


// ==========================================================
// GENERIC LIKE / COMMENT
//
// Used for update items such as:
//
// - Medical
// - Maintenance
// - Milk
// - Other update types
// ==========================================================

router.post(
  "/:type/:id/like",
  isAuth,
  controller.likePost
);


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
// DELETE DAIRY PROFILE
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