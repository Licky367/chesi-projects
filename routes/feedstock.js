// ==========================================================
// routes/feedstock.js
// ==========================================================
//
// FEED STOCK / FEED STORE ROUTES
//
// ROUTER MOUNT
// ----------------------------------------------------------
//
// This router is mounted at:
//
//     /
//
// Therefore the routes below remain:
//
//     /dairy/feedstore/:dairyId
//     /dairy/:dairyId/feedstore/add
//     /dairy/:dairyId/feedstore/:stockId/update
//     /dairy/:dairyId/feedstore/:stockId/restock
//     /dairy/:dairyId/feedstore/:stockId
//
// ==========================================================

const express =
    require("express");

const router =
    express.Router();


// ==========================================================
// STORAGE CONTROLLER
// ==========================================================

const storageController =
    require("../controllers/update/storageController");


// ==========================================================
// UPLOAD MIDDLEWARE
// ==========================================================

const upload =
    require("../middleware/uploadMiddleware");


// ==========================================================
// AUTH MIDDLEWARE
// ==========================================================

function isAuth(
    req,
    res,
    next
) {

    if (
        !req.session ||
        !req.session.user
    ) {

        return res.status(
            401
        ).json({

            success:
                false,

            message:
                "Unauthorized"

        });

    }


    // ------------------------------------------------------
    // Make logged-in user available to controllers.
    // ------------------------------------------------------

    req.user =
        req.session.user;


    next();

}


// ==========================================================
// VIEW FEED STOCK
// ==========================================================
//
// GET:
//
//     /dairy/feedstore/:dairyId
//
// CONTROLLER:
//
//     storageController.getFeedStock
//
// ACCESS:
//
//     ADMIN
//     DAIRY WORKER
//
// ==========================================================

router.get(
    "/dairy/feedstore/:dairyId",
    isAuth,
    storageController.getFeedStock
);


// ==========================================================
// ADD STOCK PAGE
// ==========================================================
//
// GET:
//
//     /dairy/:dairyId/feedstore/add
//
// CONTROLLER:
//
//     storageController.getAddStock
//
// ACCESS:
//
//     ADMIN ONLY
//
// ==========================================================

router.get(
    "/dairy/:dairyId/feedstore/add",
    isAuth,
    storageController.getAddStock
);


// ==========================================================
// UPDATE STOCK PAGE
// ==========================================================
//
// GET:
//
//     /dairy/:dairyId/feedstore/:stockId/update
//
// CONTROLLER:
//
//     storageController.getUpdateStock
//
// ACCESS:
//
//     ADMIN
//     DAIRY WORKER
//
// ==========================================================

router.get(
    "/dairy/:dairyId/feedstore/:stockId/update",
    isAuth,
    storageController.getUpdateStock
);


// ==========================================================
// RESTOCK PAGE
// ==========================================================
//
// GET:
//
//     /dairy/:dairyId/feedstore/:stockId/restock
//
// CONTROLLER:
//
//     storageController.getRestock
//
// ACCESS:
//
//     ADMIN ONLY
//
// ==========================================================

router.get(
    "/dairy/:dairyId/feedstore/:stockId/restock",
    isAuth,
    storageController.getRestock
);


// ==========================================================
// GET ONE STOCK
// ==========================================================
//
// GET:
//
//     /dairy/:dairyId/feedstore/:stockId
//
// CONTROLLER:
//
//     storageController.getStock
//
// ACCESS:
//
//     ADMIN
//     DAIRY WORKER
//
// ==========================================================

router.get(
    "/dairy/:dairyId/feedstore/:stockId",
    isAuth,
    storageController.getStock
);


// ==========================================================
// ADD NEW STOCK
// ==========================================================
//
// POST:
//
//     /dairy/:dairyId/feedstore/add
//
// CONTROLLER:
//
//     storageController.addStock
//
// ACCESS:
//
//     ADMIN ONLY
//
// UPLOAD FIELD:
//
//     images
//
// MAXIMUM:
//
//     10 images
//
// ==========================================================

router.post(
    "/dairy/:dairyId/feedstore/add",
    isAuth,
    upload.array(
        "images",
        10
    ),
    storageController.addStock
);


// ==========================================================
// UPDATE EXISTING STOCK
// ==========================================================
//
// PUT:
//
//     /dairy/:dairyId/feedstore/:stockId/update
//
// CONTROLLER:
//
//     storageController.updateStock
//
// ACCESS:
//
//     ADMIN
//     DAIRY WORKER
//
// UPLOAD FIELD:
//
//     images
//
// MAXIMUM:
//
//     10 images
//
// ==========================================================

router.put(
    "/dairy/:dairyId/feedstore/:stockId/update",
    isAuth,
    upload.array(
        "images",
        10
    ),
    storageController.updateStock
);


// ==========================================================
// RESTOCK EXISTING STOCK
// ==========================================================
//
// POST:
//
//     /dairy/:dairyId/feedstore/:stockId/restock
//
// CONTROLLER:
//
//     storageController.restockStock
//
// ACCESS:
//
//     ADMIN ONLY
//
// UPLOAD FIELD:
//
//     images
//
// MAXIMUM:
//
//     10 images
//
// ==========================================================

router.post(
    "/dairy/:dairyId/feedstore/:stockId/restock",
    isAuth,
    upload.array(
        "images",
        10
    ),
    storageController.restockStock
);


// ==========================================================
// DELETE STOCK
// ==========================================================
//
// DELETE:
//
//     /dairy/:dairyId/feedstore/:stockId
//
// CONTROLLER:
//
//     storageController.deleteStock
//
// ACCESS:
//
//     ADMIN ONLY
//
// ==========================================================

router.delete(
    "/dairy/:dairyId/feedstore/:stockId",
    isAuth,
    storageController.deleteStock
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;