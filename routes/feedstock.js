// ==========================================================
// routes/feedstock.js
// ==========================================================
//
// FEED STORE / STORAGE ROUTES
//
// ROUTER MOUNT
// ----------------------------------------------------------
//
// This router is mounted at:
//
//     /
//
// Therefore the actual routes are:
//
//     GET    /dairy/feedstore/:dairyId
//
//     GET    /dairy/:dairyId/feedstore/add
//     POST   /dairy/:dairyId/feedstore/add
//
//     GET    /dairy/:dairyId/feedstore/update/:stockId
//     PUT    /dairy/:dairyId/feedstore/update/:stockId
//
//     GET    /dairy/:dairyId/feedstore/restock/:stockId
//     POST   /dairy/:dairyId/feedstore/restock/:stockId
//
//     GET    /dairy/:dairyId/feedstore/:stockId
//     DELETE /dairy/:dairyId/feedstore/:stockId
//
// ==========================================================


const express =
    require("express");


const router =
    express.Router();


// ==========================================================
// CONTROLLER
// ==========================================================

const storageController =
    require("../controllers/update/storageController");


// ==========================================================
// UPLOAD MIDDLEWARE
// ==========================================================
//
// The add/update/restock forms use:
//
//     name="images"
//
// The middleware therefore uses:
//
//     upload.array("images", 10)
//
// ==========================================================

const upload =
    require("../middleware/uploadMiddleware");


// ==========================================================
// AUTHENTICATION
// ==========================================================
//
// Authentication is based on:
//
//     req.session.user
//
// The authenticated user is also copied to:
//
//     req.user
//
// The controller performs the actual role authorization.
//
// Roles currently used:
//
//     admin
//     dairyWorker
//
// ==========================================================

function isAuth(
    req,
    res,
    next
) {

    const session =
        req.session;


    const sessionUser =
        session &&
        session.user;


    // ------------------------------------------------------
    // No authenticated user
    // ------------------------------------------------------

    if (!sessionUser) {

        const acceptsJson =
            Boolean(

                req.xhr ||

                (
                    req.headers &&
                    typeof req.headers.accept === "string" &&
                    req.headers.accept.includes(
                        "application/json"
                    )
                )

            );


        if (acceptsJson) {

            return res
                .status(401)
                .json({

                    success: false,

                    message:
                        "Unauthorized."

                });

        }


        return res.redirect(
            "/login"
        );

    }


    // ------------------------------------------------------
    // Make authenticated user available consistently
    // ------------------------------------------------------

    req.user =
        sessionUser;


    return next();

}


// ==========================================================
// VIEW FEED STORE
// ==========================================================
//
// GET:
//
//     /dairy/feedstore/:dairyId
//
// CONTROLLER:
//
//     getFeedStock
//
// IMPORTANT:
//
//     The controller loads the Dairy document and reads:
//
//         dairy.feedStocks[]
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
//     getAddStock
//
// AUTHORIZATION:
//
//     Controller allows admin only.
//
// ==========================================================

router.get(

    "/dairy/:dairyId/feedstore/add",

    isAuth,

    storageController.getAddStock

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
//     addStock
//
// IMPORTANT:
//
//     This is a NEW stock item.
//
//     It must ultimately create a new subdocument inside:
//
//         Dairy.feedStocks[]
//
//     It must NOT create a separate FeedStock collection.
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
// UPDATE STOCK PAGE
// ==========================================================
//
// GET:
//
//     /dairy/:dairyId/feedstore/update/:stockId
//
// CONTROLLER:
//
//     getUpdateStock
//
// ==========================================================

router.get(

    "/dairy/:dairyId/feedstore/update/:stockId",

    isAuth,

    storageController.getUpdateStock

);


// ==========================================================
// UPDATE EXISTING STOCK
// ==========================================================
//
// PUT:
//
//     /dairy/:dairyId/feedstore/update/:stockId
//
// CONTROLLER:
//
//     updateStock
//
// IMPORTANT:
//
//     stockId refers to the _id of the feedStocks
//     subdocument inside the Dairy document.
//
//     It does NOT refer to a separate FeedStock model.
//
// ==========================================================

router.put(

    "/dairy/:dairyId/feedstore/update/:stockId",

    isAuth,

    upload.array(
        "images",
        10
    ),

    storageController.updateStock

);


// ==========================================================
// RESTOCK PAGE
// ==========================================================
//
// GET:
//
//     /dairy/:dairyId/feedstore/restock/:stockId
//
// CONTROLLER:
//
//     getRestock
//
// AUTHORIZATION:
//
//     Controller allows admin only.
//
// ==========================================================

router.get(

    "/dairy/:dairyId/feedstore/restock/:stockId",

    isAuth,

    storageController.getRestock

);


// ==========================================================
// RESTOCK EXISTING STOCK
// ==========================================================
//
// POST:
//
//     /dairy/:dairyId/feedstore/restock/:stockId
//
// CONTROLLER:
//
//     restockStock
//
// IMPORTANT:
//
//     This updates the existing:
//
//         dairy.feedStocks.$
//
//     subdocument.
//
//     It does NOT create a new top-level MongoDB document.
//
// ==========================================================

router.post(

    "/dairy/:dairyId/feedstore/restock/:stockId",

    isAuth,

    upload.array(
        "images",
        10
    ),

    storageController.restockStock

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
//     getStock
//
// IMPORTANT ROUTE ORDER:
//
//     This route comes AFTER:
//
//         /update/:stockId
//         /restock/:stockId
//
// so:
//
//     /update/ABC
//
// is not interpreted as:
//
//     stockId = "update"
//
// ==========================================================

router.get(

    "/dairy/:dairyId/feedstore/:stockId",

    isAuth,

    storageController.getStock

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
//     deleteStock
//
// IMPORTANT:
//
//     The controller removes the subdocument from:
//
//         dairy.feedStocks[]
//
//     and does not delete an unrelated collection document.
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