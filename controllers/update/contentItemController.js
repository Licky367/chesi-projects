// ==========================================================
// controllers/update/contentItemController.js
// ==========================================================
//
// CONTENT ITEM CARD CONTROLLER
//
// PURPOSE
// ----------------------------------------------------------
//
// Receives updates submitted directly from the content-item
// card and passes them to:
//
//     services/update/contentItemService.js
//
// The service remains responsible for validating and updating
// the Dairy document.
//
// ==========================================================

const contentItemService =
    require("../../services/update/contentItemService");


// ==========================================================
// UPDATE CONTENT ITEM FROM CARD
// ==========================================================
//
// ROUTE EXAMPLE:
//
//     PUT /dairy/:id/content-item
//
// or:
//
//     PUT /dairy/:id/card
//
// The actual route can be attached to this controller by the
// update route file.
//
// Expected request body:
//
// {
//     name,
//     type,
//     description,
//     condition,
//     location,
//     buyingPrice,
//     sellingPrice,
//     currentWorth,
//     revenue,
//     acquisitionDate,
//     valuationDate,
//     status,
//     dwellNumber,
//
//     // animal fields
//     dateOfBirth,
//     mass,
//     isMilking
// }
//
// ==========================================================

exports.updateContentItem =
    async function (req, res, next) {

        try {

            // ==================================================
            // DAIRY ID
            // ==================================================

            const dairyId =
                req.params.id;


            if (
                !dairyId
            ) {

                const error =
                    new Error(
                        "Dairy ID is required."
                    );

                error.status = 400;

                throw error;

            }


            // ==================================================
            // REQUEST BODY
            // ==================================================

            const data =
                req.body || {};


            // ==================================================
            // CURRENT USER
            // ==================================================
            //
            // The service does not use userId to determine what
            // fields may be changed.
            //
            // It is passed through so the service can use it
            // later if audit/history functionality is added.
            //
            // ==================================================

            const userId =
                req.user
                    ? req.user._id
                    : null;


            // ==================================================
            // UPDATE
            // ==================================================

            const dairy =
                await contentItemService.updateContentItem({

                    dairyId,

                    data,

                    userId

                });


            // ==================================================
            // JSON RESPONSE
            // ==================================================

            return res.status(200).json({

                success: true,

                message:
                    "Content item updated successfully.",

                dairy

            });

        }

        catch (error) {

            // ==================================================
            // PASS TO EXPRESS ERROR HANDLER
            // ==================================================

            return next(error);

        }

    };


// ==========================================================
// UPDATE FROM CARD
// ==========================================================
//
// Alias.
//
// This allows the route to use:
//
//     controller.updateFromCard
//
// while both methods use exactly the same service operation.
//
// ==========================================================

exports.updateFromCard =
    async function (req, res, next) {

        try {

            const dairyId =
                req.params.id;


            if (
                !dairyId
            ) {

                const error =
                    new Error(
                        "Dairy ID is required."
                    );

                error.status = 400;

                throw error;

            }


            const data =
                req.body || {};


            const userId =
                req.user
                    ? req.user._id
                    : null;


            const dairy =
                await contentItemService.updateFromCard({

                    dairyId,

                    data,

                    userId

                });


            return res.status(200).json({

                success: true,

                message:
                    "Card updated successfully.",

                dairy

            });

        }

        catch (error) {

            return next(error);

        }

    };


// ==========================================================
// GET CONTENT ITEM
// ==========================================================
//
// Optional endpoint for loading the current card data.
//
// ROUTE:
//
//     GET /dairy/:id/content-item
//
// ==========================================================

exports.getContentItem =
    async function (req, res, next) {

        try {

            const dairyId =
                req.params.id;


            if (
                !dairyId
            ) {

                const error =
                    new Error(
                        "Dairy ID is required."
                    );

                error.status = 400;

                throw error;

            }


            const dairy =
                await contentItemService.getContentItem(
                    dairyId
                );


            return res.status(200).json({

                success: true,

                dairy

            });

        }

        catch (error) {

            return next(error);

        }

    };


// ==========================================================
// EXPORTS
// ==========================================================

module.exports.updateContentItem =
    exports.updateContentItem;


module.exports.updateFromCard =
    exports.updateFromCard;


module.exports.getContentItem =
    exports.getContentItem;