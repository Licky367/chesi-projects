// ==========================================================
// routes/feedstock.js
// ==========================================================
//
// FEED STORE / STORAGE ROUTES
//
// CANONICAL STORAGE:
//
//     Dairy.feedStocks[]
//
// CANONICAL STOCK ID:
//
//     stock._id
//
// CANONICAL STOCK NAME:
//
//     stock.name
//
// ROUTER MOUNT:
//
//     /
//
// ==========================================================


const express =
    require("express");


const router =
    express.Router();


const storageController =
    require("../controllers/update/storageController");


const upload =
    require("../middleware/uploadMiddleware");


// ==========================================================
// AUTHENTICATION
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

        const acceptsJson =
            req.xhr ||
            (
                req.headers.accept &&
                req.headers.accept.includes(
                    "application/json"
                )
            );


        if (acceptsJson) {

            return res.status(401).json({

                success: false,

                message:
                    "Unauthorized."

            });

        }


        return res.redirect(
            "/login"
        );

    }


    req.user =
        req.session.user;


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
// ==========================================================

router.get(

    "/dairy/:dairyId/feedstore/add",

    isAuth,

    storageController.getAddStock

);


// ==========================================================
// CREATE NEW STOCK
// ==========================================================
//
// POST:
//
//     /dairy/:dairyId/feedstore/add
//
// IMPORTANT:
//
// This calls:
//
//     storageController.addStock
//
// which calls:
//
//     storageService.createStock
//
// The new stock is therefore pushed directly into:
//
//     Dairy.feedStocks[]
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
// ==========================================================

router.get(

    "/dairy/:dairyId/feedstore/update/:stockId",

    isAuth,

    storageController.getUpdateStock

);


// ==========================================================
// UPDATE EXISTING STOCK — PUT
// ==========================================================
//
// PUT:
//
//     /dairy/:dairyId/feedstore/update/:stockId
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
// UPDATE EXISTING STOCK — POST COMPATIBILITY
// ==========================================================
//
// This allows the route to work even if the EJS form submits
// ordinary POST rather than relying on method-override.
//
// POST:
//
//     /dairy/:dairyId/feedstore/update/:stockId
//
// ==========================================================

router.post(

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
// GET INDIVIDUAL STOCK
// ==========================================================
//
// IMPORTANT:
//
// This MUST remain after:
//
//     /update/:stockId
//     /restock/:stockId
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