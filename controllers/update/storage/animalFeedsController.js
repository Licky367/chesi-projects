// ==========================================================
// controllers/update/storage/animalFeedsController.js
// ==========================================================
//
// AGROSTORE ANIMAL FEED / STOCK CONTROLLER
//
// Responsibilities:
//
//     • Receive AgroStore ID
//     • Load AgroStore contents
//     • Return stock data
//     • Receive quantity updates
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
// ==========================================================


const animalFeedsService =
    require("../../../services/update/storage/animalFeedsService");


// ==========================================================
// GET AGROSTORE FEEDS
// ==========================================================
//
// GET:
//
//     /dairy/:id/animal-feeds
//
// :id = AgroStore._id
//
// ==========================================================

async function getAnimalFeeds(
    req,
    res,
    next
) {

    try {

        const storageId =
            req.params.id;


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

                success: true,

                storageId,

                agroStore:
                    result.agroStore,

                feeds:
                    result.feeds

            });

        }


        // ==================================================
        // NORMAL RESPONSE
        // ==================================================
        //
        // This route can be used independently if needed.
        //
        // The main /dairy/:id page can also retrieve the same
        // service data and render the card there.
        //
        // ==================================================

        return res.render(

            "update/storage/animal-feed-card",

            {

                agroStore:
                    result.agroStore,

                feeds:
                    result.feeds,

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

        const storageId =
            req.params.id;


        const feedId =
            req.params.feedId;


        const quantity =
            req.body.quantity;


        const stockUpdateNote =
            req.body.stockUpdateNote;


        // ==================================================
        // UPDATE
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

                success: true,

                message:
                    "Stock updated successfully.",

                storageId,

                feed:
                    result.feed

            });

        }


        // ==================================================
        // NORMAL PAGE RESPONSE
        // ==================================================
        //
        // Return to the AgroStore's /dairy/:id page.
        //
        // IMPORTANT:
        //
        //     id remains the AgroStore._id.
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
