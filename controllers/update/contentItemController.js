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
// The controller receives:
//
//     dairyId
//     storageId
//     itemId
//
// and passes the stock-update data to:
//
//     services/update/contentItemService.js
//
// The service is responsible for:
//
//     • locating the storage
//     • locating the content item
//     • validating the update
//     • updating the database
//     • recording stock-update history
//
// ==========================================================

const contentItemService =
    require("../../services/update/contentItemService");


// ==========================================================
// UPDATE CONTENT ITEM FROM CARD
// ==========================================================
//
// The route used by this controller should provide:
//
//     req.params.dairyId
//     req.params.storageId
//     req.params.itemId
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
            // IDS
            // ==================================================

            const dairyId =
                req.params.dairyId;

            const storageId =
                req.params.storageId;

            const itemId =
                req.params.itemId;


            // ==================================================
            // VALIDATE IDS
            // ==================================================

            if (
                !dairyId ||
                !storageId ||
                !itemId
            ) {

                const error =
                    new Error(
                        "Dairy ID, storage ID and content item ID are required."
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

            const result =
                await contentItemService.updateContentItem({

                    dairyId,

                    storageId,

                    itemId,

                    data,

                    images,

                    userId,

                    userName

                });


            // ==================================================
            // RESPONSE
            // ==================================================
            //
            // If the service returns a redirect target,
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
// Params:
//
//     dairyId
//     storageId
//     itemId
//
// ==========================================================

exports.getContentItem =
    async function (req, res, next) {

        try {

            const dairyId =
                req.params.dairyId;

            const storageId =
                req.params.storageId;

            const itemId =
                req.params.itemId;


            // ==================================================
            // VALIDATE IDS
            // ==================================================

            if (
                !dairyId ||
                !storageId ||
                !itemId
            ) {

                const error =
                    new Error(
                        "Dairy ID, storage ID and content item ID are required."
                    );

                error.status = 400;

                throw error;

            }


            // ==================================================
            // LOAD ITEM
            // ==================================================

            const result =
                await contentItemService.getContentItem({

                    dairyId,

                    storageId,

                    itemId

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
// This is useful when dairySet.ejs needs the action supplied
// by the controller rather than constructing a route itself.
//
// ==========================================================

exports.getContentItemUpdateAction =
    function (req, res, next) {

        try {

            const dairyId =
                req.params.dairyId;

            const storageId =
                req.params.storageId;

            const itemId =
                req.params.itemId;


            if (
                !dairyId ||
                !storageId ||
                !itemId
            ) {

                const error =
                    new Error(
                        "Dairy ID, storage ID and content item ID are required."
                    );

                error.status = 400;

                throw error;

            }


            const action =
                `/storage/${dairyId}/contents/${storageId}/update/${itemId}`;


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