// ==========================================================
// verrah/routes/profile.js
// VERRAH COSMETICS
// PROFILE ROUTES
// ==========================================================

const express =
    require("express");

const router =
    express.Router();

const profileController =
    require("../controllers/profile");


// ==========================================================
// PROFILE
// ==========================================================

// GET /profile
router.get(
    "/",
    profileController.showProfile
);


// ==========================================================
// UPDATE PERSONAL DETAILS
// ==========================================================

// POST /profile
router.post(
    "/",
    profileController.updateProfile
);


// ==========================================================
// CHANGE PASSWORD
// ==========================================================

// POST /profile/password
router.post(
    "/password",
    profileController.changePassword
);


module.exports =
    router;