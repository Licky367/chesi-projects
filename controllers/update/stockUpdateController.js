// ==========================================================
// controllers/update/stockUpdateController.js
// ==========================================================
//
// STOCK UPDATE CONTROLLER
//
// PURPOSE:
// ----------------------------------------------------------
// Handles requests related to animal-feed / agro-store
// stock updates.
//
// RESPONSIBILITIES:
//
//     • Receive stock-update requests
//     • Read route parameters
//     • Read authenticated user
//     • Pass request data to stock-update service
//     • Handle success / failure responses
//
// The controller does NOT:
//
//     • Calculate stock quantities
//     • Build Update documents
//     • Create feed cards
//     • Decide stock ownership
//     • Perform database business logic
//
// Those responsibilities belong to:
//
//     services/update/stockUpdateService.js
//
// ==========================================================


const stockUpdateService =
    require("../../services/update/stockUpdateService");


// ==========================================================
// CREATE STOCK UPDATE
// ==========================================================
//
// POST:
//
// /storage/:dairyId/contents/:storageId/update/:itemId
//
// IMPORTANT:
//
// The view submits:
//
//     quantity
//     unit
//     stockUpdateNote
//     images
//
// The resulting Update document uses:
//
//     type: "animalFeed"
//
// and:
//
//     animalFeed.feedId
//     animalFeed.storageId
//     animalFeed.feedName
//     animalFeed.feedType
//     animalFeed.roomNumber
//     animalFeed.quantity
//     animalFeed.unit
//     animalFeed.stockUpdateNote
//
// ==========================================================

exports.createStockUpdate =
async function(req, res) {

    try {

        // ==================================================
        // ROUTE PARAMETERS
        // ==================================================

        const {
            dairyId,
            storageId,
            itemId
        } = req.params;


        // ==================================================
        // AUTHENTICATED USER
        // ==================================================

        const user =
            req.user;


        // ==================================================
        // REQUEST BODY
        // ==================================================

        const {
            quantity,
            unit,
            stockUpdateNote
        } = req.body;


        // ==================================================
        // UPLOADED IMAGES
        // ==================================================

        const images =
            Array.isArray(req.files)
                ? req.files
                : [];


        // ==================================================
        // SERVICE
        // ==================================================

        const result =
            await stockUpdateService.createStockUpdate({

                dairyId,

                storageId,

                itemId,

                user,

                quantity,

                unit,

                stockUpdateNote,

                images

            });


        // ==================================================
        // SUCCESS
        // ==================================================

        /*
        ------------------------------------------------------
        Return the user to the item details page.

        The content-item.ejs view already expects:

            successMessage

        through the query/session handling layer.
        ------------------------------------------------------
        */

        return res.redirect(

            `/storage/${dairyId}` +
            `/contents/${storageId}` +
            `/details/${itemId}` +
            `?success=${encodeURIComponent(
                result.message ||
                "Stock updated successfully."
            )}`

        );

    } catch (error) {

        // ==================================================
        // ERROR LOG
        // ==================================================

        console.error(
            "STOCK UPDATE CONTROLLER ERROR:",
            error
        );


        // ==================================================
        // ERROR REDIRECT
        // ==================================================

        const {
            dairyId,
            storageId,
            itemId
        } = req.params;


        const errorMessage =

            error &&
            error.message

                ? error.message

                : "Unable to update stock.";


        return res.redirect(

            `/storage/${dairyId}` +
            `/contents/${storageId}` +
            `/details/${itemId}` +
            `?error=${encodeURIComponent(
                errorMessage
            )}`

        );

    }

};