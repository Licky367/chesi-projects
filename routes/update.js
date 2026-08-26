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
// Used ONLY by:
//
//     /dairy/:contentItemId/:dwellNumber
//
// The second parameter MUST be numeric.
//
// Valid:
//
//     -5
//     -1
//      0
//      1
//      25
//
// Invalid:
//
//     assets
//     post
//     maintenance
//     mark
//     abc
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
// Must remain before /dairy/:id
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

// MARK MEDICAL

router.post(
    "/dairy/:id/medical-mark",
    isAuth,
    controller.markMedical
);


// UNMARK MEDICAL

router.post(
    "/dairy/:id/medical-unmark",
    isAuth,
    controller.unmarkMedical
);


// =========================================================
// MAINTENANCE
// =========================================================

// MARK MAINTENANCE

router.post(
    "/dairy/:id/maintenance/mark",
    isAuth,
    controller.markMaintenance
);


// CLEAR MAINTENANCE

router.post(
    "/dairy/:id/maintenance/clear",
    isAuth,
    controller.clearMaintenance
);


// =========================================================
// FINANCIAL ROUTES
// =========================================================

// RECORD LIABILITY

router.post(
    "/dairy/:id/liability",
    isAuth,
    controller.recordLiability
);


// RECORD REVENUE

router.post(
    "/dairy/:id/revenue",
    isAuth,
    controller.recordRevenue
);


// =========================================================
// ASSET PAGES
// =========================================================
//
// PRIMARY DAIRY PROFILE:
//
//     GET /dairy/:id
//
// ASSET PAGE:
//
//     GET /dairy/:id/assets
//
// IMPORTANT:
//
// These are TWO DIFFERENT CONTROLLER ACTIONS.
//
// /dairy/:id
//     -> controller.viewPage
//
// /dairy/:id/assets
//     -> controller.viewAssets
//
// viewAssets renders:
//
//     views/asset-page.ejs
//
// and passes:
//
//     dairy
//     assetDairies
//     user
//
// =========================================================


// ---------------------------------------------------------
// ASSET PAGE
// ---------------------------------------------------------
//
// GET:
//
//     /dairy/:id/assets
//
// RENDERS:
//
//     views/asset-page.ejs
//
// ---------------------------------------------------------

router.get(
    "/dairy/:id/assets",
    controller.viewAssets
);


// ---------------------------------------------------------
// PRIMARY DAIRY PROFILE
// ---------------------------------------------------------
//
// GET:
//
//     /dairy/:id
//
// RENDERS:
//
//     views/update.ejs
//     OR
//     views/dairySet.ejs
//
// depending on dairy.code
//
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
// These routes come AFTER all explicit Dairy routes.
//
// The strict dwell-number middleware means that:
//
//     /dairy/123/assets
//
// cannot reach the storage controller.
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

// POST LIKE

router.post(
    "/post/:id/like",
    isAuth,
    controller.likePost
);


// POST COMMENT

router.post(
    "/post/:id/comment",
    isAuth,
    controller.addPostComment
);


// =========================================================
// GENERIC UPDATE INTERACTIONS
// =========================================================

// GENERIC UPDATE LIKE

router.post(
    "/:type/:id/like",
    isAuth,
    controller.likePost
);


// GENERIC UPDATE COMMENT

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