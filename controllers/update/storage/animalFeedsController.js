// ==========================================================
// controllers/update/storage/animalFeedsController.js
// ==========================================================
//
// AGROSTORE ANIMAL FEED / STOCK CONTROLLER
//
// Responsibilities:
//
//     • Receive AgroStore ID
//     • Ask the service for the AgroStore
//     • Ask the service for updates belonging to Dairy
//       records located in that AgroStore's room
//     • Return feed/update data
//     • Receive quantity updates for individual stock items
//     • Receive additional stock information
//     • Return the user to the AgroStore page
//
// IMPORTANT:
//
//     req.params.id
//         = AgroStore._id
//
//     req.params.feedId
//         = individual stock item's Dairy._id
//
// FEED RELATIONSHIP:
//
//     AgroStore._id
//         ↓
//     AgroStore.roomNumber
//         ↓
//     Dairy.dwellingNumber
//         ↓
//     Matching Dairy records
//         ↓
//     Update.dairy
//         ↓
//     Feed cards
//
// The controller does NOT build this relationship.
// animalFeedsService.js is responsible for it.
//
// ==========================================================


const animalFeedsService =
    require("../../../services/update/storage/animalFeedsService");


// ==========================================================
// GET AGROSTORE FEED UPDATES
// ==========================================================
//
// GET:
//
//     /dairy/:id/animal-feeds
//
// :id
//     = AgroStore._id
//
// The service determines:
//
//     AgroStore.roomNumber
//
// and then finds:
//
//     Dairy.dwellingNumber === AgroStore.roomNumber
//
// The resulting Dairy records supply the Update records
// displayed by animal-feed-card.ejs.
//
// ==========================================================

async function getAnimalFeeds(
    req,
    res,
    next
) {

    try {

        // ==================================================
        // AGROSTORE ID
        // ==================================================

        const storageId =
            req.params.id;


        // ==================================================
        // VALIDATE PARAMETER
        // ==================================================

        if (!storageId) {

            const error =
                new Error(
                    "AgroStore ID is required."
                );

            error.status = 400;

            return next(error);

        }


        // ==================================================
        // GET FEED UPDATES
        // ==================================================
        //
        // IMPORTANT:
        //
        // The service receives ONLY the AgroStore ID.
        //
        // It is responsible for:
        //
        //     AgroStore
        //         ↓
        //     roomNumber
        //         ↓
        //     dwellingNumber
        //         ↓
        //     Dairy records
        //         ↓
        //     Updates
        //
        // ==================================================

        const result =
            await animalFeedsService.getAnimalFeeds(
                storageId
            );


        // ==================================================
        // JSON REQUEST
        // ==================================================

        if (
            req.xhr ||
            (
                req.headers.accept &&
                req.headers.accept.includes(
                    "application/json"
                )
            )
        ) {

            return res.json({

                success:
                    true,

                // ------------------------------------------
                // CURRENT AGROSTORE ID
                // ------------------------------------------

                storageId,

                // ------------------------------------------
                // CURRENT AGROSTORE
                // ------------------------------------------

                agroStore:
                    result.agroStore,

                // ------------------------------------------
                // FEED / UPDATE CARDS
                //
                // These are NOT the AgroStore itself.
                //
                // They are updates belonging to Dairy
                // records whose dwellingNumber matches
                // agroStore.roomNumber.
                // ------------------------------------------

                feeds:
                    result.feeds

            });

        }


        // ==================================================
        // NORMAL RESPONSE
        // ==================================================
        //
        // Render the reusable animal-feed-card component.
        //
        // ==================================================

        return res.render(

            "update/storage/animal-feed-card",

            {

                // ------------------------------------------
                // CURRENT AGROSTORE
                // ------------------------------------------

                agroStore:
                    result.agroStore,

                // ------------------------------------------
                // FEED / UPDATE CARDS
                // ------------------------------------------

                feeds:
                    result.feeds,

                // ------------------------------------------
                // AGROSTORE ID
                // ------------------------------------------

                storageId

            }

        );

    } catch (error) {

        return next(error);

    }

}


// ==========================================================
// UPDATE AGROSTORE CONTENT
// ==========================================================
//
// POST:
//
//     /dairy/:id/animal-feeds/:feedId/update
//
// :id
//     = AgroStore._id
//
// :feedId
//     = individual stock item's Dairy._id
//
// Body:
//
//     quantity
//     stockUpdateNote
//
// ==========================================================

async function updateAnimalFeed(
    req,
    res,
    next
) {

    try {

        // ==================================================
        // AGROSTORE ID
        // ==================================================

        const storageId =
            req.params.id;


        // ==================================================
        // STOCK ITEM ID
        // ==================================================

        const feedId =
            req.params.feedId;


        // ==================================================
        // REQUEST BODY
        // ==================================================

        const quantity =
            req.body.quantity;


        const stockUpdateNote =
            req.body.stockUpdateNote;


        // ==================================================
        // VALIDATE PARAMETERS
        // ==================================================

        if (!storageId) {

            const error =
                new Error(
                    "AgroStore ID is required."
                );

            error.status = 400;

            return next(error);

        }


        if (!feedId) {

            const error =
                new Error(
                    "Stock item ID is required."
                );

            error.status = 400;

            return next(error);

        }


        // ==================================================
        // UPDATE THROUGH SERVICE
        // ==================================================
        //
        // The service verifies that feedId belongs to the
        // specified AgroStore before changing anything.
        //
        // ==================================================

        const result =
            await animalFeedsService.updateAnimalFeed(

                storageId,

                feedId,

                quantity,

                stockUpdateNote

            );


        // ==================================================
        // JSON RESPONSE
        // ==================================================

        if (
            req.xhr ||
            (
                req.headers.accept &&
                req.headers.accept.includes(
                    "application/json"
                )
            )
        ) {

            return res.json({

                success:
                    true,

                message:
                    "Stock updated successfully.",

                // ------------------------------------------
                // AgroStore remains the page context
                // ------------------------------------------

                storageId,

                // ------------------------------------------
                // UPDATED STOCK ITEM
                // ------------------------------------------

                feed:
                    result.feed

            });

        }


        // ==================================================
        // NORMAL PAGE RESPONSE
        // ==================================================
        //
        // Always return to the AgroStore page.
        //
        // /dairy/:id
        //
        // where :id remains:
        //
        //     AgroStore._id
        //
        // ==================================================

        return res.redirect(

            `/dairy/${storageId}?stockUpdated=1`

        );

    } catch (error) {

        return next(error);

    }

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getAnimalFeeds,

    updateAnimalFeed

};