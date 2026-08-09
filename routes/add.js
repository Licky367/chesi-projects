const express =
    require("express");

const router =
    express.Router();


const addController =
    require("../controllers/addController");


const upload =
    require("../middleware/uploadMiddleware");


// ==========================================================
// GET /add
// ==========================================================

router.get(
    "/",
    addController.getAddPage
);


// ==========================================================
// POST /add
//
// Handles:
// - profileImage
// - all normal form fields
// ==========================================================

router.post(
    "/",
    upload.single("profileImage"),
    addController.createDairy
);


module.exports =
    router;