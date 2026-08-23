// ==========================================================
// controllers/update/contentItemController.js
// ==========================================================
//
// CONTENT ITEM CONTROLLER
//
// ROUTE
// ----------------------------------------------------------
//
//     /dairy/:contentItemId/:dwellNumber
//
// IDENTIFICATION
// ----------------------------------------------------------
//
//     contentItemId
//         = MongoDB _id of the content item
//
//     dwellNumber
//         = item's dwellNumber
//
// IMPORTANT
// ----------------------------------------------------------
//
// This controller does NOT resolve a Dairy Farm.
//
// The content item itself is identified directly by:
//
//     contentItemId
//     dwellNumber
//
// ==========================================================


const contentItemService =
    require("../../services/update/contentItemService");


// ==========================================================
// GET CONTENT ITEM PAGE
// ==========================================================
//
// GET:
//
//     /dairy/:contentItemId/:dwellNumber
//
// ==========================================================

exports.getContentItem =
    async function (
        req,
        res,
        next
    ) {

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
                dwellNumber === undefined
            ) {

                const error =
                    new Error(
                        "Content item ID and dwell number are required."
                    );

                error.status = 400;

                throw error;

            }


            // ==================================================
            // GET CONTENT ITEM
            // ==================================================

            const result =
                await contentItemService.getContentItem({

                    contentItemId,

                    dwellNumber

                });


            // ==================================================
            // RENDER CONTENT ITEM PAGE
            // ==================================================
            //
            // IMPORTANT:
            //
            // Do NOT return JSON here.
            //
            // The route is a page route.
            //
            // The EJS expects:
            //
            //     dairy
            //     storage
            //     item
            //     latestStockUpdate
            //
            // ==================================================

            return res.render(
                "update/content-item",
                {

                    dairy:
                        result.dairy,

                    storage:
                        result.storage,

                    item:
                        result.item,

                    latestStockUpdate:
                        result.latestStockUpdate

                }
            );

        }

        catch (error) {

            return next(error);

        }

    };


// ==========================================================
// UPDATE CONTENT ITEM
// ==========================================================
//
// POST:
//
//     /dairy/:contentItemId/:dwellNumber
//
// ==========================================================

exports.updateContentItem =
    async function (
        req,
        res,
        next
    ) {

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
                dwellNumber === undefined
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
                Array.isArray(
                    req.files
                )
                    ? req.files
                    : [];


            // ==================================================
            // UPDATE CONTENT ITEM
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
            // REDIRECT BACK TO CONTENT ITEM PAGE
            // ==================================================
            //
            // The POST route should not return the entire
            // database object as JSON.
            //
            // Redirect to:
            //
            //     /dairy/:contentItemId/:dwellNumber
            //
            // ==================================================

            return res.redirect(
                `/dairy/${contentItemId}/${dwellNumber}`
            );

        }

        catch (error) {

            return next(error);

        }

    };


// ==========================================================
// GET CONTENT ITEM UPDATE ACTION
// ==========================================================
//
// Returns the exact POST action used by the update form.
//
// ==========================================================

exports.getContentItemUpdateAction =
    function (
        req,
        res,
        next
    ) {

        try {

            const contentItemId =
                req.params.contentItemId;

            const dwellNumber =
                req.params.dwellNumber;


            // ==================================================
            // VALIDATE
            // ==================================================

            if (
                !contentItemId ||
                dwellNumber === undefined
            ) {

                const error =
                    new Error(
                        "Content item ID and dwell number are required."
                    );

                error.status = 400;

                throw error;

            }


            // ==================================================
            // ACTION
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

module.exports = {

    getContentItem:
        exports.getContentItem,

    updateContentItem:
        exports.updateContentItem,

    getContentItemUpdateAction:
        exports.getContentItemUpdateAction

};