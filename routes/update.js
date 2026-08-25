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
// DAIRY FINANCIAL ROUTES
// =========================================================
//
// These routes match the financial cards:
//
// LIABILITY:
//
//     POST /dairy/:id/liability
//
// REVENUE:
//
//     POST /dairy/:id/revenue
//
// The :id is the Dairy._id.
//
// These are explicit Dairy routes and therefore MUST be
// defined before the generic:
//
//     /dairy/:contentItemId/:dwellNumber
//
// route.
//
// =========================================================


// ---------------------------------------------------------
// RECORD LIABILITY
// ---------------------------------------------------------
//
// POST:
//
//     /dairy/:id/liability
//
// Form:
//
//     action="/dairy/<%= dairy._id %>/liability"
//     method="POST"
//
// ---------------------------------------------------------

router.post(
    "/dairy/:id/liability",
    isAuth,
    controller.recordLiability
);


// ---------------------------------------------------------
// RECORD REVENUE
// ---------------------------------------------------------
//
// POST:
//
//     /dairy/:id/revenue
//
// Form:
//
//     action="/dairy/<%= dairy._id %>/revenue"
//     method="POST"
//
// ---------------------------------------------------------

router.post(
    "/dairy/:id/revenue",
    isAuth,
    controller.recordRevenue
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
// Negative dwell numbers remain valid.
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
// This remains after the more specific:
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