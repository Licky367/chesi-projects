// ==========================================================
// controllers/update/contentItemController.js
// ==========================================================
//
// CONTENT ITEM CARD CONTROLLER
//
// PURPOSE
// ----------------------------------------------------------
//
// Handles updates submitted by the storage content-item card.
//
// ROUTE:
//
//     POST /dairy/:contentItemId/:dwellNumber
//
// ROUTE IDENTITY
// ----------------------------------------------------------
//
//     req.params.contentItemId
//         = ID of the actual content item
//
//     req.params.dwellNumber
//         = dwellNumber of the actual content item
//
// IMPORTANT
// ----------------------------------------------------------
//
// The dairy farm ID is NOT part of this route.
//
// The storage/agroStore ID is NOT part of this route.
//
// The relationship is resolved by the service:
//
//     content item.dwellNumber
//             = agroStore.roomNumber
//
// and:
//
//     agroStore.assetCode
//             = dairy.code
//
// ==========================================================


const contentItemService =
    require("../../services/update/contentItemService");


// ==========================================================
// UPDATE CONTENT ITEM FROM CARD
// ==========================================================
//
// ROUTE:
//
//     POST /dairy/:contentItemId/:dwellNumber
//
// PARAMETERS:
//
//     contentItemId
//     dwellNumber
//
// Expected body:
//
//     quantity
//     unit
//     stockUpdateNote
//
// Uploaded files:
//
//     req.files
//
// ==========================================================

exports.updateContentItem =
    async function (req, res, next) {

        try {

            // ==================================================
            // ROUTE PARAMETERS
            // ==================================================

            const contentItemId =
                req.params.contentItemId;

            const dwellNumber =
                req.params.dwellNumber;


            // ==================================================
            // VALIDATE PARAMETERS
            // ==================================================

            if (
                !contentItemId ||
                !dwellNumber
            ) {

                const error =
                    new Error(
                        "Content item ID and dwell number are required."
                    );

                error.status = 400;

                throw error;

            }


            // ==================================================
            // REQUEST DATA
            // ==================================================

            const data = {

                quantity:
                    req.body &&
                    req.body.quantity !== undefined
                        ? req.body.quantity
                        : null,

                unit:
                    req.body &&
                    req.body.unit !== undefined
                        ? req.body.unit
                        : "",

                stockUpdateNote:
                    req.body &&
                    req.body.stockUpdateNote !== undefined
                        ? req.body.stockUpdateNote
                        : ""

            };


            // ==================================================
            // CURRENT USER
            // ==================================================

            const userId =
                req.user
                    ? req.user._id
                    : null;


            const userName =
                req.user
                    ? (
                        req.user.name ||
                        req.user.email ||
                        "Unknown user"
                    )
                    : "Unknown user";


            // ==================================================
            // UPLOADED IMAGES
            // ==================================================

            const images =
                Array.isArray(req.files)
                    ? req.files
                    : [];


            // ==================================================
            // SERVICE UPDATE
            // ==================================================
            //
            // The service receives only the two route
            // identifiers required by the new route.
            //
            // It is responsible for finding:
            //
            //     content item
            //     agroStore
            //     dairy farm
            //
            // through their relationships.
            //
            // ==================================================

            const result =
                await contentItemService.updateContentItem({

                    contentItemId,

                    dwellNumber,

                    data,

                    images,

                    userId,

                    userName

                });


            // ==================================================
            // RESPONSE
            // ==================================================
            //
            // If the service supplies a redirect target,
            // use it.
            //
            // Otherwise return JSON.
            //
            // ==================================================

            if (
                result &&
                result.redirect
            ) {

                return res.redirect(
                    result.redirect
                );

            }


            return res.status(200).json({

                success:
                    true,

                message:
                    "Stock updated successfully.",

                result

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
// Used when the controller needs to load a content item.
//
// ROUTE:
//
//     GET /dairy/:contentItemId/:dwellNumber
//
// PARAMETERS:
//
//     contentItemId
//     dwellNumber
//
// ==========================================================

exports.getContentItem =
    async function (req, res, next) {

        try {

            // ==================================================
            // ROUTE PARAMETERS
            // ==================================================

            const contentItemId =
                req.params.contentItemId;

            const dwellNumber =
                req.params.dwellNumber;


            // ==================================================
            // VALIDATE PARAMETERS
            // ==================================================

            if (
                !contentItemId ||
                !dwellNumber
            ) {

                const error =
                    new Error(
                        "Content item ID and dwell number are required."
                    );

                error.status = 400;

                throw error;

            }


            // ==================================================
            // LOAD CONTENT ITEM
            // ==================================================
            //
            // The service resolves the farm and storage
            // relationships from the content item.
            //
            // ==================================================

            const result =
                await contentItemService.getContentItem({

                    contentItemId,

                    dwellNumber

                });


            // ==================================================
            // RESPONSE
            // ==================================================

            return res.status(200).json({

                success:
                    true,

                result

            });

        }

        catch (error) {

            return next(error);

        }

    };


// ==========================================================
// BUILD CARD UPDATE ACTION
// ==========================================================
//
// The action is:
//
//     /dairy/:contentItemId/:dwellNumber
//
// No dairy ID is inserted.
//
// No storage ID is inserted.
//
// ==========================================================

exports.getContentItemUpdateAction =
    function (req, res, next) {

        try {

            const contentItemId =
                req.params.contentItemId;

            const dwellNumber =
                req.params.dwellNumber;


            // ==================================================
            // VALIDATE PARAMETERS
            // ==================================================

            if (
                !contentItemId ||
                !dwellNumber
            ) {

                const error =
                    new Error(
                        "Content item ID and dwell number are required."
                    );

                error.status = 400;

                throw error;

            }


            // ==================================================
            // BUILD ACTION
            // ==================================================

            const action =
                `/dairy/${contentItemId}/${dwellNumber}`;


            // ==================================================
            // RESPONSE
            // ==================================================

            return res.status(200).json({

                success:
                    true,

                action

            });

        }

        catch (error) {

            return next(error);

        }

    };


// ==========================================================
// EXPORTS
// ==========================================================

module.exports =
    {

        updateContentItem:
            exports.updateContentItem,

        getContentItem:
            exports.getContentItem,

        getContentItemUpdateAction:
            exports.getContentItemUpdateAction

    };