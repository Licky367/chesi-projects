// =========================================================
// routes/update.js
// DAIRY PROFILE / UPDATE ROUTES
// =========================================================
//
// ROUTER MOUNT
// ---------------------------------------------------------
//
// Mounted at:
//
//     /
//
// IMPORTANT ROUTING RULE
// ---------------------------------------------------------
//
// Explicit Dairy routes are defined BEFORE the generic
// storage content-item route.
//
// STORAGE CONTENT:
//
//     /dairy/:contentItemId/:dwellNumber
//
// This route is ONLY allowed when dwellNumber is numeric.
//
// Valid dwellNumbers:
//
//     -5
//     -1
//      0
//      1
//      25
//
// Non-numeric values such as:
//
//     assets
//     post
//     maintenance
//     mark
//     abc
//
// MUST NEVER be interpreted as dwellNumbers.
//
// ASSET PAGE:
//
//     /dairy/:id
//     /dairy/:id/assets
//
// Both are explicitly handled by controller.viewPage.
//
// =========================================================


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


// =========================================================
// STRICT DWELL NUMBER GUARD
// =========================================================
//
// This middleware is ONLY used by:
//
//     /dairy/:contentItemId/:dwellNumber
//
// A numeric value is required.
//
// Negative values are valid.
//
// IMPORTANT:
//
// Unlike the previous version, a non-numeric value does
// NOT call next().
//
// It returns 404 immediately.
//
// This prevents:
//
//     /dairy/:id/assets
//
//     /dairy/:id/post
//
//     /dairy/:id/maintenance
//
// or any other unrelated two-segment URL from ever reaching
// the storage content-item controller.
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

        return res
            .status(404)
            .send(
                "Storage content item not found."
            );

    }


    /*
     * Strict numeric check.
     *
     * Number("25")  -> 25
     * Number("-5")  -> -5
     * Number("0")   -> 0
     *
     * Number("abc")     -> NaN
     * Number("assets")  -> NaN
     */

    const dwellNumber =
        Number(value);


    if (
        !Number.isFinite(
            dwellNumber
        )
    ) {

        return res
            .status(404)
            .send(
                "Storage content item not found."
            );

    }


    /*
     * Preserve the numeric value for the controller.
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
// BOOLEAN FIELD DEFINITIONS
// =========================================================
//
// IMPORTANT:
//
// This must remain before:
//
//     /dairy/:id
//
// =========================================================

router.get(
    "/dairy/boolean/fields",
    isAuth,
    controller.getBooleanFields
);


// =========================================================
// BOOLEAN MANAGEMENT
// =========================================================
//
// POST:
//
//     /dairy/:animalId/boolean/:field
//
// =========================================================

router.post(
    "/dairy/:animalId/boolean/:field",
    isAuth,
    controller.toggleBoolean
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
// FINANCIAL ROUTES
// =========================================================


// ---------------------------------------------------------
// RECORD LIABILITY
// ---------------------------------------------------------

router.post(
    "/dairy/:id/liability",
    isAuth,
    controller.recordLiability
);


// ---------------------------------------------------------
// RECORD REVENUE
// ---------------------------------------------------------

router.post(
    "/dairy/:id/revenue",
    isAuth,
    controller.recordRevenue
);


// =========================================================
// ASSET PAGE
// =========================================================
//
// PRIMARY:
//
//     GET /dairy/:id
//
// ASSET URL:
//
//     GET /dairy/:id/assets
//
// IMPORTANT:
//
// /dairy/:id/assets is deliberately defined BEFORE:
//
//     /dairy/:contentItemId/:dwellNumber
//
// Therefore:
//
//     /dairy/123/assets
//
// is NEVER sent to getContentItem().
//
// It goes directly to viewPage().
//
// The controller renders:
//
//     views/asset-page.ejs
//
// =========================================================


// ---------------------------------------------------------
// ASSET PAGE — EXPLICIT /assets URL
// ---------------------------------------------------------

router.get(
    "/dairy/:id/assets",
    controller.viewPage
);


// ---------------------------------------------------------
// ASSET PAGE — PRIMARY DAIRY URL
// ---------------------------------------------------------

router.get(
    "/dairy/:id",
    controller.viewPage
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
// These routes come AFTER:
//
//     /dairy/:id/assets
//     /dairy/:id
//     /dairy/:id/addOns
//     /dairy/:id/general
//     etc.
//
// AND the strict numeric guard ensures that only a numeric
// second parameter can reach the storage controller.
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
// DELETE:
//
//     /dairy/:id
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