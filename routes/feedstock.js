// ==========================================================
// routes/feedstock.js
// ==========================================================
//
// FEED STOCK / FEED STORE ROUTES
//
// RESPONSIBILITIES:
//
//     • View feed store
//     • View individual stock
//     • Open add-stock page
//     • Add new stock
//     • Open update-stock page
//     • Update existing stock
//     • Open restock page
//     • Restock existing stock
//     • Delete stock
//
// ROUTER MOUNT
// ----------------------------------------------------------
//
// This router is mounted at:
//
//     /
//
// Therefore:
//
//     GET  /dairy/feedstore/:dairyId
//     GET  /dairy/:dairyId/feedstore/add
//     POST /dairy/:dairyId/feedstore/add
//     GET  /dairy/:dairyId/feedstore/update/:stockId
//     PUT  /dairy/:dairyId/feedstore/update/:stockId
//     GET  /dairy/:dairyId/feedstore/restock/:stockId
//     POST /dairy/:dairyId/feedstore/restock/:stockId
//     GET  /dairy/:dairyId/feedstore/:stockId
//     DELETE /dairy/:dairyId/feedstore/:stockId
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
//
// The Dairy model allows a maximum of:
//
//     10 stock images
//
// The service also normalizes uploaded image paths.
//
// ==========================================================

const upload =
    require("../middleware/uploadMiddleware");


// ==========================================================
// AUTHENTICATION
// ==========================================================
//
// The application uses:
//
//     req.session.user
//
// as the authenticated user.
//
// The authenticated user is also exposed as:
//
//     req.user
//
// so controllers/services can consistently access it.
//
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

        // --------------------------------------------------
        // Browser requests are redirected to login.
        // API-style requests receive JSON.
        // --------------------------------------------------

        const acceptsJson =

            req.xhr ||

            (
                req.headers.accept &&
                req.headers.accept.includes(
                    "application/json"
                )
            );


        if (
            acceptsJson
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


        return res.redirect(
            "/login"
        );

    }


    // ------------------------------------------------------
    // Expose authenticated session user.
    // ------------------------------------------------------

    req.user =
        req.session.user;


    next();

}


// ==========================================================
// ROLE HELPERS
// ==========================================================
//
// Roles:
//
//     admin
//     dairyWorker
//
// The service itself handles stock/data validation.
//
// The router only establishes authentication.
//
// Controllers should enforce operation-specific
// authorization.
//
// ==========================================================


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
//     storageController.getFeedStock
//
// PURPOSE:
//
//     Display the feed store and its current inventory.
//
// ACCESS:
//
//     Authenticated users.
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
// PURPOSE:
//
//     Display the form for creating a new stock record.
//
// ACCESS:
//
//     Authenticated.
//
// Authorization should be enforced by the controller.
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
//     storageController.addStock
//
// SERVICE:
//
//     storageService.createStock()
//
// ACCESS:
//
//     Authenticated.
//
// UPLOAD FIELD:
//
//     images
//
// MAXIMUM:
//
//     10
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
//     storageController.getUpdateStock
//
// PURPOSE:
//
//     Display the existing stock update form.
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
//     storageController.updateStock
//
// SERVICE:
//
//     storageService.updateStock()
//
// BEHAVIOUR:
//
//     Quantity increased
//         → new purchase
//         → price required
//         → feedsAmount updated
//
//     Quantity decreased
//         → consumption/reduction
//         → price unchanged
//         → feedsAmount unchanged
//
//     Quantity unchanged
//         → informational update
//         → financial information unchanged
//
// UPLOAD FIELD:
//
//     images
//
// MAXIMUM:
//
//     10
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
//     storageController.getRestock
//
// PURPOSE:
//
//     Display the restock form.
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
//     storageController.restockStock
//
// SERVICE:
//
//     storageService.restockStock()
//
// BEHAVIOUR:
//
//     old quantity
//         +
//     quantityAdded
//         =
//     new quantity
//
// PURCHASE:
//
//     quantityAdded × unitPrice
//
// The latest purchase amount replaces the previous
// feedsAmount value for that stock record.
//
// initialQuantity is NOT changed.
//
// UPLOAD FIELD:
//
//     images
//
// MAXIMUM:
//
//     10
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
//     storageController.getStock
//
// IMPORTANT:
//
// This route is deliberately declared AFTER:
//
//     /update/:stockId
//     /restock/:stockId
//
// so those routes are not accidentally interpreted as
// stock IDs.
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
//     storageController.deleteStock
//
// PURPOSE:
//
//     Permanently remove the stock subdocument from
//     dairy.feedStocks[].
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