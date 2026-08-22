// ==========================================================
// controllers/update/storage/animalFeedsController.js
// ==========================================================
//
// AGROSTORE ANIMAL FEED / STOCK CONTROLLER
//
// RESPONSIBILITIES:
//
//     • Receive AgroStore._id
//     • Load the AgroStore
//     • Load its contents
//     • Load updates belonging to those contents
//     • Return stock/update data
//     • Receive stock quantity updates
//     • Receive additional stock information
//     • Return the user to the AgroStore page
//
// IMPORTANT:
//
//     req.params.id
//         = AgroStore._id
//
//     req.params.feedId
//         = individual CONTENT Dairy._id
//
// NEVER:
//
//     req.params.id
//         = parent Dairy ID
//
// The AgroStore is the page being viewed.
//
// ==========================================================


const animalFeedsService =
    require("../../../services/update/storage/animalFeedsService");


// ==========================================================
// GET AGROSTORE ANIMAL FEEDS
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

        // ==================================================
        // AGROSTORE ID
        // ==================================================

        const storageId =
            req.params.id;


        // ==================================================
        // LOAD AGROSTORE + CONTENTS + CONTENT UPDATES
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

                success: true,

                storageId,

                // ------------------------------------------
                // THE ACTUAL AGROSTORE
                // ------------------------------------------

                agroStore:
                    result.agroStore,

                // ------------------------------------------
                // CONTENTS OF THE AGROSTORE
                // ------------------------------------------

                feeds:
                    result.feeds,

                // ------------------------------------------
                // UPDATES OF THOSE CONTENTS
                // ------------------------------------------

                feedUpdates:
                    result.feedUpdates

            });

        }


        // ==================================================
        // NORMAL RESPONSE
        // ==================================================
        //
        // This route can independently render the
        // animal-feed page/card if required.
        //
        // ==================================================

        return res.render(

            "update/storage/animal-feed-card",

            {

                // ------------------------------------------
                // AGROSTORE
                // ------------------------------------------

                agroStore:
                    result.agroStore,

                // ------------------------------------------
                // AGROSTORE CONTENTS
                // ------------------------------------------

                feeds:
                    result.feeds,

                // ------------------------------------------
                // UPDATES BELONGING TO CONTENTS
                // ------------------------------------------

                feedUpdates:
                    result.feedUpdates,

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
        // CONTENT / STOCK ITEM ID
        // ==================================================

        const feedId =
            req.params.feedId;


        // ==================================================
        // FORM DATA
        // ==================================================

        const quantity =
            req.body.quantity;


        const stockUpdateNote =
            req.body.stockUpdateNote;


        // ==================================================
        // UPDATE CONTENT
        // ==================================================

        const result =
            await animalFeedsService.updateAnimalFeed(

                storageId,

                feedId,

                quantity,

                stockUpdateNote

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

                message:
                    "Stock updated successfully.",

                // ------------------------------------------
                // KEEP THE AGROSTORE ID
                // ------------------------------------------

                storageId,

                // ------------------------------------------
                // UPDATED CONTENT
                // ------------------------------------------

                feed:
                    result.feed

            });

        }


        // ==================================================
        // NORMAL RESPONSE
        // ==================================================
        //
        // IMPORTANT:
        //
        // Redirect back to:
        //
        //     /dairy/:agroStoreId
        //
        // NOT:
        //
        //     /dairy/:feedId
        //
        // NOT:
        //
        //     /dairy/:parentId
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