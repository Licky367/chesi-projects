// =========================================================
// routes/update.js
// ========================================================
//
// DAIRY PROFILE / UPDATE ROUTES
//
// ROUTER MOUNT
// ---------------------------------------------------------
//
// Mounted at:
//
//     /
//
// IMPORTANT STORAGE RULE
// ---------------------------------------------------------
//
// The content-item route:
//
//     /dairy/:contentItemId/:dwellNumber
//
// is ONLY allowed to reach getContentItem when the second
// parameter is an actual numeric dwellNumber.
//
// An unrelated URL must NEVER be interpreted as a
// dwellNumber request.
//
// ==========================================================


const express =
    require("express");


const router =
    express.Router();


// =========================================================
// CONTROLLER
// =========================================================

const controller =
    require("../controllers/update");


// =========================================================
// UPLOAD MIDDLEWARE
// =========================================================

const upload =
    require("../middleware/uploadMiddleware");


// =========================================================
// AUTHENTICATION
// =========================================================

function isAuth(
    req,
    res,
    next
) {

    if (
        !req.session ||
        !req.session.user
    ) {

        return res
            .status(401)
            .json({

                success: false,

                message:
                    "Unauthorized"

            });

    }


    req.user =
        req.session.user;


    next();

}


// =========================================================
// DWELL NUMBER GUARD
// =========================================================
//
// IMPORTANT:
//
// This middleware does NOT say that a negative dwellNumber
// is invalid.
//
// Negative dwellNumbers are allowed.
//
// The only question here is:
//
//     "Is this actually a numeric dwellNumber?"
//
// Valid examples:
//
//     -5
//     -1
//      0
//      1
//      25
//
// Invalid examples:
//
//     post
//     maintenance
//     mark
//     undefined
//     abc
//
// If it is not numeric, we call next() instead of returning
// "Invalid dwell number".
//
// This allows another matching router to handle the request
// rather than forcing it through getContentItem().
//
// =========================================================

function isValidDwellNumber(
    req,
    res,
    next
) {

    const value =
        req.params.dwellNumber;


    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return next();

    }


    const dwellNumber =
        Number(value);


    if (
        !Number.isFinite(
            dwellNumber
        )
    ) {

        return next();

    }


    /*
     * Preserve the numeric value for the controller.
     *
     * IMPORTANT:
     * Negative values remain completely valid.
     */

    req.dwellNumber =
        dwellNumber;


    next();

}


// =========================================================
// LIST PAGES
// =========================================================

router.get(
    "/dairyProjects",
    controller.viewDairyProjects
);


router.get(
    "/structures",
    controller.viewStructures
);


// =========================================================
// BOOLEAN MANAGEMENT
// =========================================================
//
// POST:
//
//     /dairy/:animalId/boolean/:field
//
// Example:
//
//     /dairy/64abc123/boolean/milking
//
// This is explicitly defined before the generic content-item
// route.
//
// =========================================================

router.post(
    "/dairy/:animalId/boolean/:field",
    isAuth,
    controller.toggleBoolean
);


// =========================================================
// BOOLEAN FIELD DEFINITIONS
// =========================================================

router.get(
    "/dairy/boolean/fields",
    isAuth,
    controller.getBooleanFields
);


// =========================================================
// DAIRY ADD-ONS
// =========================================================
//
// GET:
//
//     /dairy/:id/addOns
//
// PURPOSE:
//
//     Render:
//
//         views/update/addOns.ejs
//
// IMPORTANT:
//
// This explicit route MUST be defined before:
//
//     /dairy/:contentItemId/:dwellNumber
//
// Otherwise:
//
//     addOns
//
// could be interpreted as a dwellNumber parameter.
//
// =========================================================

router.get(
    "/dairy/:id/addOns",
    isAuth,
    controller.viewAddOns
);


// =========================================================
// GENERAL DAIRY FEED
// =========================================================
//
// GET:
//
//     /dairy/:id/general
//
// PURPOSE:
//
//     Render the feed-only General page:
//
//         views/updateGeneral.ejs
//
// IMPORTANT:
//
// This route MUST be defined before the generic:
//
//     /dairy/:contentItemId/:dwellNumber
//
// route.
//
// /general is not a dwellNumber.
//
// The content-item guard will also reject "general" because
// it is not numeric, but defining this route explicitly here
// makes the intended routing unambiguous.
//
// =========================================================

router.get(
    "/dairy/:id/general",
    controller.viewGeneral
);


// =========================================================
// DAIRY PROFILE
// =========================================================
//
// GET:
//
//     /dairy/:id
//
// =========================================================

router.get(
    "/dairy/:id",
    controller.viewPage
);


// =========================================================
// TOGGLE MILKING
// =========================================================
//
// POST:
//
//     /dairy/:id/toggle-milking
//
// IMPORTANT:
//
// This is NOT a content-item route.
//
// dwellNumber is not involved.
//
// =========================================================

router.post(
    "/dairy/:id/toggle-milking",
    isAuth,
    controller.toggleMilking
);


// =========================================================
// SWITCH DAIRY
// =========================================================
//
// GET:
//
//     /dairy/:id/switch
//
// =========================================================

router.get(
    "/dairy/:id/switch",
    isAuth,
    controller.switchDairy
);


// =========================================================
// GENERAL DAIRY COMMENT
// =========================================================
//
// POST:
//
//     /dairy/:id/comment
//
// =========================================================

router.post(
    "/dairy/:id/comment",
    isAuth,
    controller.comment
);


// =========================================================
// PROFILE IMAGES
// =========================================================
//
// PUT:
//
//     /dairy/:id/image
//
// =========================================================

router.put(
    "/dairy/:id/image",
    isAuth,
    upload.array(
        "profileImages",
        5
    ),
    controller.image
);


// =========================================================
// UPDATE DAIRY PROFILE
// =========================================================
//
// PUT:
//
//     /dairy/:id/update
//
// =========================================================

router.put(
    "/dairy/:id/update",
    isAuth,
    controller.updateProfile
);


// =========================================================
// CREATE GENERAL POST
// =========================================================
//
// POST:
//
//     /dairy/:id/post
//
// IMPORTANT:
//
// This route must remain independent from storage
// content-item handling.
//
// =========================================================

router.post(
    "/dairy/:id/post",
    isAuth,
    upload.array(
        "images",
        10
    ),
    controller.createPost
);


// =========================================================
// MEDICAL
// =========================================================
//
// These routes are explicit.
//
// They do NOT contain dwellNumber.
//
// =========================================================


// ---------------------------------------------------------
// MARK MEDICAL
// ---------------------------------------------------------

router.post(
    "/dairy/:id/medical-mark",
    isAuth,
    controller.markMedical
);


// ---------------------------------------------------------
// UNMARK MEDICAL
// ---------------------------------------------------------

router.post(
    "/dairy/:id/medical-unmark",
    isAuth,
    controller.unmarkMedical
);


// =========================================================
// MAINTENANCE
// =========================================================
//
// These routes are explicit.
//
// They do NOT contain dwellNumber.
//
// =========================================================


// ---------------------------------------------------------
// MARK MAINTENANCE
// ---------------------------------------------------------

router.post(
    "/dairy/:id/maintenance/mark",
    isAuth,
    controller.markMaintenance
);


// ---------------------------------------------------------
// CLEAR MAINTENANCE
// ---------------------------------------------------------

router.post(
    "/dairy/:id/maintenance/clear",
    isAuth,
    controller.clearMaintenance
);


// =========================================================
// STORAGE CONTENT ITEM
// =========================================================
//
// GET:
//
//     /dairy/:contentItemId/:dwellNumber
//
// POST:
//
//     /dairy/:contentItemId/:dwellNumber
//
// IMPORTANT:
//
// This is intentionally placed AFTER all known explicit
// Dairy routes.
//
// More importantly:
//
//     isValidDwellNumber
//
// prevents an arbitrary second URL segment from being
// treated as a dwellNumber.
//
//
//
// NEGATIVE DWELL NUMBERS ARE VALID.
//
// Examples:
//
//     /dairy/abc123/-1
//     /dairy/abc123/-5
//     /dairy/abc123/10
//
// are allowed to reach getContentItem/updateContentItem.
//
//
//
// But:
//
//     /dairy/abc123/post
//     /dairy/abc123/maintenance
//     /dairy/abc123/general
//     /dairy/abc123/addOns
//     /dairy/abc123/anything
//
// are NOT treated as content-item requests.
//
// =========================================================


// ---------------------------------------------------------
// VIEW STORAGE CONTENT ITEM
// ---------------------------------------------------------

router.get(
    "/dairy/:contentItemId/:dwellNumber",
    isAuth,
    isValidDwellNumber,
    controller.getContentItem
);


// ---------------------------------------------------------
// UPDATE STORAGE CONTENT ITEM
// ---------------------------------------------------------

router.post(
    "/dairy/:contentItemId/:dwellNumber",
    isAuth,
    isValidDwellNumber,
    upload.array(
        "images",
        10
    ),
    controller.updateContentItem
);


// =========================================================
// POST INTERACTIONS
// =========================================================
//
// These routes are independent of dwellNumber.
//
// =========================================================


// ---------------------------------------------------------
// POST LIKE
// ---------------------------------------------------------

router.post(
    "/post/:id/like",
    isAuth,
    controller.likePost
);


// ---------------------------------------------------------
// POST COMMENT
// ---------------------------------------------------------

router.post(
    "/post/:id/comment",
    isAuth,
    controller.addPostComment
);


// ---------------------------------------------------------
// GENERIC UPDATE LIKE
// ---------------------------------------------------------

router.post(
    "/:type/:id/like",
    isAuth,
    controller.likePost
);


// ---------------------------------------------------------
// GENERIC UPDATE COMMENT
// ---------------------------------------------------------

router.post(
    "/:type/:id/comment",
    isAuth,
    controller.addPostComment
);


// =========================================================
// DELETE POST
// =========================================================

router.delete(
    "/post/:id",
    isAuth,
    controller.deletePost
);


// =========================================================
// DELETE COMMENT
// =========================================================

router.delete(
    "/comment/:id",
    isAuth,
    controller.deleteComment
);


// =========================================================
// DELETE DAIRY
// =========================================================
//
// This is deliberately after the more specific:
//
//     /dairy/:id/...
//
// routes.
//
// =========================================================

router.delete(
    "/dairy/:id",
    isAuth,
    controller.deleteProfile
);


// =========================================================
// EXPORT
// =========================================================

module.exports =
    router;