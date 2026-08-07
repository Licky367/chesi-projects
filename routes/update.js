const express = require("express");
const router = express.Router();

const controller = require("../controllers/update");
const upload = require("../middleware/uploadMiddleware");

/* ====================.=====
   AUTH MIDDLEWARE
========================= */
function isAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });
  }

  req.user = req.session.user;
  next();
}

/* ======================.===================================
   LIST PAGES
========================================================= */

router.get("/dairyProjects", controller.viewDairyProjects);
router.get("/structures", controller.viewStructures);

/* =========================================================
   DAIRY PROFILE
========================================================= */

router.get("/dairy/:id", controller.viewPage);

/* =========================================================
   GENERAL COMMENTS
========================================================= */

router.post(
  "/dairy/:id/comment",
  isAuth,
  controller.comment
);

/* =========================================================
   PROFILE IMAGE
========================================================= */

router.put(
  "/dairy/:id/image",
  isAuth,
  upload.single("profileImage"),
  controller.image
);

/* =========================================================
   UPDATE DAIRY PROFILE
========================================================= */

router.put(
  "/dairy/:id/update",
  isAuth,
  controller.updateProfile
);

/* =========================================================
   POSTS
========================================================= */

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

// Generic like/comment for update items (medical, maintenance, milk, etc.)
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

router.delete(
  "/post/:id",
  isAuth,
  controller.deletePost
);

router.delete(
  "/comment/:id",
  isAuth,
  controller.deleteComment
);

/* =========================================================
   MEDICAL
========================================================= */

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

/* =========================================================
   MAINTENANCE
========================================================= */

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

/* =========================================================
   DELETE DAIRY PROFILE
========================================================= */

router.delete(
  "/dairy/:id",
  isAuth,
  controller.deleteProfile
);

module.exports = router;